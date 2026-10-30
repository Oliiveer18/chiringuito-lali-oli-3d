/* Real scene support regression. Optional TEST_URL also validates GitHub Pages. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const base=new URL(process.env.TEST_URL||'http://127.0.0.1:8994/');
base.searchParams.set('debug','1');
const out=process.env.TEST_ARTIFACTS||'test-artifacts/terrain3d';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chromium',args:[
  '--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
const errors=[];
try {
  for(const mobile of [false,true]) {
    const context=await browser.newContext({
      viewport:mobile?{width:390,height:844}:{width:1440,height:900},
      ...(mobile?{isMobile:true,hasTouch:true,
        userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'}:{}),deviceScaleFactor:1
    });
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base.href);
    await page.waitForFunction(()=>window.__api&&window.is3DReady?.());
    assert.equal(await page.getAttribute('html','data-version'),'v28.17.2-flat-sand');
    await page.locator('#btn-start').click();
    await page.getByRole('button',{name:'Nueva partida',exact:true}).click();
    await page.locator('#btn-open').click();
    await page.evaluate(async()=>{
      __test.setManualTime(true);
      window.terrainModules={
        THREE:await import('./lib/three.module.js'),
        coast:await import('./coast-materials.js?v=28.17.2-flat-sand'),
        render:await import('./render-3d.js?v=28.17.2-flat-sand'),
        world:await import('./world.js?v=28.17.2-flat-sand')
      };
      Object.assign(Game.upgrades,{mesas:2,terraza:2,hamacas:2,escenario:1,
        showHoy:1,redes:1,algodonera:1,sombrillas:1});
      Object.assign(Game.staff,{camarero:true,cocinero:true,limpiador:true,terraza:true});
      terrainModules.world.buildTables();
      terrainModules.render.render3D(0);
    });
    const geometry=await page.evaluate(()=>{
      const {THREE,coast}=terrainModules, scene=window.scene3D, problems=[];
      scene.updateMatrixWorld(true);
      const box=o=>new THREE.Box3().setFromObject(o);
      const deck=scene.getObjectByName('kiosk-deck'),db=box(deck);
      const floor=(o,expected,label)=>{
        const b=box(o);
        if(Math.abs(b.min.y-expected)>.001) problems.push(`${label} minY=${b.min.y}, expected=${expected}`);
        return b;
      };
      floor(deck,0,'kiosk foundation');
      if(Math.abs(db.max.y-coast.KIOSK_DECK.height)>.001) problems.push('deck top');
      const stage=scene.getObjectByName('stage-deck'),sb=floor(stage,0,'stage foundation');
      let tables=0,chairs=0,feet=0;
      scene.traverse(o=>{
        if(o.name.startsWith('terrace-table-')) tables++;
        if(o.name==='table-base'||o.name.startsWith('chair-support-')){
          const b=floor(o,0,o.name);
          if(o.name.startsWith('chair-support-'))chairs++;
          const overlap=(a,b)=>a.min.x<b.max.x&&a.max.x>b.min.x&&a.min.z<b.max.z&&a.max.z>b.min.z;
          if(overlap(b,db)||overlap(b,sb)) problems.push('terrace support intersects a deck');
        }
        if(o.name==='hamaca-foot'){floor(o,0,'lounger foot');feet++;}
      });
      const sign=scene.getObjectByName('up_redes');
      if(sign) floor(sign,coast.sampleWalkableHeight(-7,4.4),'sign');
      const cotton=scene.getObjectByName('up_algodonera');
      if(cotton) floor(cotton,coast.KIOSK_DECK.height,'cotton cart');
      const staff=scene.getObjectByName('chiringuito_staff_3d');
      for(const s of staff.children){
        const want=coast.sampleWalkableHeight(s.position.x,s.position.z)+.015;
        if(Math.abs(s.position.y-want)>.001)problems.push('staff support '+s.name);
      }
      return {problems,tables,chairs,feet,deck:db.min.y,stage:sb.min.y,
        sandProfile:coast.getCoastGeometryProfile().coarse};
    });
    assert.deepEqual(geometry.problems,[]);
    assert.equal(geometry.tables,10);assert.equal(geometry.chairs,20);assert.equal(geometry.feet,32);
    assert.equal(geometry.sandProfile,mobile);
    console.log('OK:',mobile?'mobile':'desktop','ten tables, twenty chairs, 32 lounger feet, decks, sign, cart and staff',geometry);
    await page.evaluate(()=>{
      const c=window.CAM3D;c.followPlayer=false;c.dist=c.targetDist=31;
      c.pitch=c.targetPitch=.72;c.yaw=c.targetYaw=-.08;
      c.panOffset.set(5.5,-1);c.targetPanOffset.set(5.5,-1);
      c.target.set(5.5,1.4,-1);c.targetGoal.copy(c.target);c.isInteracting=true;
      terrainModules.render.render3D(0);
    });
    await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-all-upgrades.png`});
    await context.close();
  }
  assert.deepEqual(errors,[]);
  console.log('OK: terrain scene regression, zero page errors');
} finally {await browser.close();}
