/* Integration regression: real modules and real input, with deterministic simulation time.
   Run: npm run test:service3d:browser
   Optional TEST_URL points at an already-running server or private hosted preview. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const url=process.env.TEST_URL||'http://127.0.0.1:8991';
const server=process.env.TEST_URL?null:spawn(process.execPath,['serve.js','8991'],{stdio:['ignore','pipe','inherit']});
if(server) await once(server.stdout,'data');
const browser=await chromium.launch({headless:true,channel:'chromium',args:[
  '--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
const errors=[], results=[];
const output=process.env.TEST_ARTIFACTS||'test-artifacts/service3d';
await mkdir(output,{recursive:true});
const context=await browser.newContext({viewport:{width:1280,height:720}});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
const check=async(name,fn)=>{await fn();results.push(name);console.log('OK:',name);};
const reset=async()=>page.evaluate(()=>{
  Net.role='solo';Net.me='p1';Net.peer=false;
  __test.newSeason();__api.startDay();__test.setManualTime(true);
  render3D(0);
});
const park=async(x,z)=>page.evaluate(async({x,z})=>{
  getPlayerMesh().position.set(x,0,z);
  const controls=await import('./controls-3d.js?v=28.17.0-online-web');
  controls.CONTROLS3D.currentAction=null;
  render3D(0);
},{x,z});
const action=page.locator('#btn-action-main');
const step=async ms=>page.evaluate(ms=>advanceTime(ms),ms);
const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify({
  money:Game.money,stock:Game.stock,service:Game.service3D,
  stats:Game.dayStats,speed:Game.speed,hour:Game.hour,mode:Game.mode
})));
async function pour(){
  await park(-3.8,1.3);
  assert.equal(await page.locator('#action-lbl').textContent(),'TIRAR CAÑA');
  const box=await action.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();
  await step(1080);
  await page.mouse.move(20,200); // pointer capture must keep the release working
  await page.mouse.up();
}
async function stageCustomer(order){
  return page.evaluate(order=>{
    __test.spawnCustomer('local');
    const c=Game.customers.at(-1);
    Object.assign(c,{state:'queue',spot:0,x:434,y:600,table:null,
      order,itemSt:order.map(()=>0),inPrep:0,served:[],missing:0,
      partT:{},subs:{},patience:1000,maxPatience:1000,personality:'tranquilo'});
    Game.customers=[c];render3D(0);
    return c.id;
  },order);
}
async function approach(id){
  const pos=await page.evaluate(async id=>{
    const {customerInteractionPosition}=await import('./render-3d-customers.js?v=28.17.0-online-web');
    return customerInteractionPosition(Game.customers.find(c=>c.id===id));
  },id);
  await park(pos.x+.8,pos.z);
}
try{
  const testUrl=new URL(url);testUrl.searchParams.set('debug','1');
  await page.goto(testUrl.href);
  await page.waitForFunction(()=>window.__api&&window.is3DReady?.());
  await page.evaluate(async()=>{window.render3D=(await import('./render-3d.js?v=28.17.0-online-web')).render3D;});
  assert.equal(await page.getAttribute('html','data-version'),'v28.17.0-online-web');
  await check('title, new game and planning tabs',async()=>{
    await page.locator('#btn-start').click();
    await page.getByRole('button',{name:'Nueva partida',exact:true}).click();
    for(const name of ['Personal','Compras']){
      await page.getByRole('tab',{name,exact:true}).click();
    }
    await page.locator('#btn-open').click();
    await page.evaluate(()=>__test.setManualTime(true));
  });
  await check('beer uses one stock unit, no money before delivery, release outside button',async()=>{
    await reset();await pour();
    const s=await state();
    assert.equal(s.stock.cerveza,14);assert.equal(s.money,400);
    assert.equal(s.service.trays.p1.length,1);
    assert.equal(s.service.trays.p1[0].quality,'perfect');
    assert.equal(s.stats.tips,0);
    await page.screenshot({path:output+'/beer-tray-desktop.png',timeout:60000});
  });
  await check('mixed order: actual prepared delivery, no legacy slot, one recorded payment',async()=>{
    const id=await stageCustomer(['cerveza','barraquito']);
    await approach(id);assert.equal(await page.locator('#action-lbl').textContent(),'ENTREGAR');
    await action.click();
    let s=await state();assert.equal(s.money,400);assert.equal(s.service.trays.p1.length,0);
    assert.deepEqual(await page.evaluate(id=>Game.customers.find(c=>c.id===id).itemSt,id),[2,0]);
    await park(-1.4,1.3);await action.click();await step(1200);
    s=await state();assert.equal(s.stock.barraquito,14);assert.equal(s.service.trays.p1[0].id,'barraquito');
    await approach(id);await action.click();
    s=await state();
    const expected=await page.evaluate(()=>Game.prices.cerveza+Game.prices.barraquito+.5);
    assert.equal(s.money,400+expected);
    assert.equal(s.stats.revenue,expected);
    assert.equal(s.stats.served,1);assert.equal(s.stats.tipsQuality,.5);
    assert.equal(s.stock.cerveza,14);assert.equal(s.stock.barraquito,14);
    assert.equal(await page.evaluate(()=>Game.slots.some(s=>s.cust)),false);
    const before=s.money;
    await page.evaluate(async id=>{
      const {deliverPreparedItem}=await import('./sim/service.js?v=28.17.0-online-web');
      if(deliverPreparedItem(Game.customers.find(c=>c.id===id)))throw Error('Duplicate delivery accepted');
    },id);
    assert.equal((await state()).money,before);
  });
  await check('grill rejects raw collection, pauses, continues to burnt after ready',async()=>{
    await reset();await park(-.1,1.3);await action.click();await action.click();
    assert.equal((await state()).service.trays.p1.length,0);
    await step(1500);assert.equal((await state()).service.stations.grill.state,'done');
    await page.getByRole('button',{name:'Pausa',exact:true}).click();
    const before=await state();
    await step(5000);await page.keyboard.down('d');
    const position=await page.evaluate(async()=>{
      const x=getPlayerMesh().position.x;render3D(.1);return {x,after:getPlayerMesh().position.x};
    });
    await page.keyboard.up('d');
    assert.equal(position.x,position.after);
    assert.equal((await state()).service.stations.grill.progress,before.service.stations.grill.progress);
    assert.equal((await state()).hour,before.hour);
    await page.getByRole('button',{name:'Velocidad normal',exact:true}).click();
    await step(1500);assert.equal((await state()).service.stations.grill.state,'burnt');
    await park(-.1,1.3);await action.click();
    assert.equal((await state()).service.trays.p1[0].quality,'burnt');
  });
  await check('held beer cancels on blur and refunds once without reward',async()=>{
    await reset();await park(-3.8,1.3);
    await page.keyboard.down('Space');await step(300);
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    await page.keyboard.up('Space');
    const s=await state();
    assert.equal(s.stock.cerveza,15);assert.equal(s.service.trays.p1.length,0);
    assert.equal(s.service.stations.beer.state,'idle');
  });
  await check('opposite movement inputs and speed controls share simulation scale',async()=>{
    await reset();
    const open=await page.evaluate(async()=>{
      const {check3DCollision}=await import('./render-3d.js?v=28.17.0-online-web');
      for(let x=-8;x<=-6;x+=.5) for(let z=3.2;z<4.5;z+=.4){
        if(Array.from({length:15},(_,i)=>(i-7)*.1).every(d=>!check3DCollision(x+d,z)&&!check3DCollision(x,z+d)))return {x,z};
      }
      throw Error('No open movement test area');
    });
    await park(open.x,open.z);
    for(const [positive,negative,axis] of [['ArrowRight','ArrowLeft','x'],['ArrowDown','ArrowUp','z']]){
      const before=await page.evaluate(axis=>getPlayerMesh().position[axis],axis);
      await page.keyboard.down(positive);
      await page.evaluate(()=>render3D(.1));
      await page.keyboard.up(positive);
      const after=await page.evaluate(axis=>getPlayerMesh().position[axis],axis);
      assert.ok(after>before,`${positive}: ${before} -> ${after}`);
      await page.keyboard.down(negative);
      await page.evaluate(()=>render3D(.1));
      await page.keyboard.up(negative);
      assert.ok(Math.abs((await page.evaluate(axis=>getPlayerMesh().position[axis],axis))-before)<1e-6);
    }
    await park(-.1,1.3);await action.click();
    await page.locator('[data-speed="2"]').click();
    await step(500);
    assert.ok(Math.abs((await state()).service.stations.grill.progress-1/2.1)<1e-6);
    await page.locator('[data-speed="3"]').click();
    await step(100);
    assert.ok(Math.abs((await state()).service.stations.grill.progress-1.3/2.1)<1e-6);
    await page.getByRole('button',{name:'Velocidad normal',exact:true}).click();
  });
  await check('target identity refreshes; failed delivery preserves tray',async()=>{
    await reset();await pour();const id=await stageCustomer(['papas']);
    await approach(id);
    await page.evaluate(async id=>{
      const {deliverTrayItemToCustomer}=await import('./stations-3d.js?v=28.17.0-online-web');
      if(deliverTrayItemToCustomer(Game.customers.find(c=>c.id===id)))throw Error('Wrong item accepted');
      const {CONTROLS3D,updateContextualProximity}=await import('./controls-3d.js?v=28.17.0-online-web');
      const {customerInteractionPosition}=await import('./render-3d-customers.js?v=28.17.0-online-web');
      const a=Game.customers[0],b={...a,id:a.id+100,spot:3};
      Game.customers=[a,b];
      // No mesh exists for the added fixture; queue fallback must match the renderer.
      updateContextualProximity(customerInteractionPosition(a));
      if(CONTROLS3D.currentAction.customer?.id!==a.id)throw Error('First target wrong');
      updateContextualProximity({x:-5.5,z:4.85});
      if(CONTROLS3D.currentAction.customer?.id!==b.id)throw Error('Stale target retained');
    },id);
    assert.equal((await state()).service.trays.p1.length,1);
  });
  await check('washing preserves food; duplicate cleaning requests do not add plates',async()=>{
    await reset();await pour();
    await page.evaluate(async()=>{
      const {addDirtyUnit}=await import('./service-3d-model.mjs');
      addDirtyUnit(Game,'p1');
    });
    await park(-1.4,-.9);await action.click();
    assert.deepEqual((await state()).service.trays.p1.map(u=>u.id),['cerveza']);
    await page.evaluate(async()=>{
      const {cleanTable}=await import('./sim.js?v=28.17.0-online-web');
      const t=Game.tables[0];t.state='dirty';
      cleanTable(t,false,'p1');cleanTable(t,false,'p1');cleanTable(t,false,'p1');
      if(Game.floor.tasks.filter(t=>t.kind==='clean').length!==1)throw Error('Duplicate task');
    });
    assert.deepEqual((await state()).service.trays.p1.map(u=>u.id),['cerveza']);
  });
  await check('host commands deduplicate, validate service and round-trip shared station state',async()=>{
    await reset();
    await page.evaluate(async()=>{
      const {applyAct,snapshot,applyState}=await import('./net-sync.js?v=28.17.0-online-web');
      Net.role='host';Net.peer=true;
      Game.stock.refresco=3;
      const command={a:'service3d',q:7,command:{type:'coffee'},serviceId:Game.floor.id};
      applyAct(command);applyAct(command);
      if(Game.stock.barraquito!==14)throw Error('Command debited twice');
      applyAct({...command,q:8,serviceId:'previous-day',command:{type:'cooler'}});
      if(Game.stock.refresco!==3)throw Error('Stale service accepted');
      const snap=JSON.parse(JSON.stringify(snapshot()));
      Net.role='guest';Net.me='p2';Net.lastMode='service';
      applyState(snap);
      if(Game.service3D.stations.coffee.owner!=='p2')throw Error('Ownership lost');
      const {requestService3DCommand}=await import('./service-3d.js');
      const stock=Game.stock.barraquito;
      requestService3DCommand({type:'coffee'});
      if(Game.stock.barraquito!==stock)throw Error('Guest mutated stock');
      Net.role='solo';Net.me='p1';Net.peer=false;
    });
  });
  await check('day reset, service controls, responsive resize and report remain usable',async()=>{
    await reset();await pour();
    await page.evaluate(()=>__api.startDay());
    assert.equal((await state()).service.trays.p1.length,0);
    await page.locator('#stock-toggle').click();await page.locator('#stock-toggle').click();
    await page.locator('#btn-sound').click();await page.locator('#btn-sound').click();
    await page.locator('#btn-delivery').click();
    await page.locator('[data-del-close]').click();
    for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1280,height:720}]){
      await page.setViewportSize(viewport);
      await page.screenshot({path:output+`/service-${viewport.width}.png`,timeout:60000});
    }
    await page.evaluate(()=>__api.endDay());
    assert.equal((await state()).mode,'report');
    await page.screenshot({path:output+'/report.png',timeout:60000});
  });
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:results.length,checks:results,pageErrors:errors},null,2));
}finally{
  await browser.close();
  server?.kill();
}
