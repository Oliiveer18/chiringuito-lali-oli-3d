// Hosted publication regression: 3D must not read, migrate or overwrite 2D saves.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const target=new URL(process.env.TEST_URL||'https://oliiveer18.github.io/chiringuito-lali-oli-3d/');
target.searchParams.set('debug','1');
const local={
  'lali-oli.library.v2':'[{"id":"2d-do-not-import"}]',
  'lali-oli.library.v2.backup':'{"twoD":"backup-unchanged"}',
  'lali-oli.save.v1.solo':'{"twoD":"old-save-unchanged"}',
  'lali-oli.legacy.v1':'{"points":23,"owned":[],"keys":[]}',
  'lalioli-stockmini':'1'
};
const session={
  'lali-oli.cam':'mesas',
  'lali-oli.cam-beta':'mesas',
  'lali-oli.peerjs-cloud':'1',
  'lali-oli.peer-token':'2d-token-unchanged'
};
const browser=await chromium.launch({headless:true,channel:'chromium',args:[
  '--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
const context=await browser.newContext({viewport:{width:1280,height:720}});
await context.addInitScript(({local,session})=>{
  for(const [k,v] of Object.entries(local))if(localStorage.getItem(k)===null)localStorage.setItem(k,v);
  for(const [k,v] of Object.entries(session))if(sessionStorage.getItem(k)===null)sessionStorage.setItem(k,v);
},{local,session});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const artifact=process.env.TEST_ARTIFACTS||'test-artifacts/github-pages-storage';
await mkdir(artifact,{recursive:true});
async function unchanged(){
  const actual=await page.evaluate(({local,session})=>({
    local:Object.fromEntries(Object.keys(local).map(k=>[k,localStorage.getItem(k)])),
    session:Object.fromEntries(Object.keys(session).map(k=>[k,sessionStorage.getItem(k)]))
  }),{local,session});
  assert.deepEqual(actual,{local,session});
}
try{
  await page.goto(target.href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__api&&window.is3DReady?.());
  assert.equal(await page.title(),'Chiringuito de Lali y Oli 3D');
  await page.getByRole('button',{name:'Jugar en solitario',exact:true}).click();
  assert.equal(await page.locator('.save-row').count(),0);
  await page.getByRole('textbox',{name:'Nombre del kiosco para la nueva carrera'}).fill('QA 3D independiente');
  await page.getByRole('button',{name:'Nueva partida',exact:true}).click();
  await page.waitForFunction(()=>Game.mode==='plan'&&localStorage.getItem('lali-oli.3d.library.v2'));
  await unchanged();
  assert.equal(await page.evaluate(async()=>{
    const {loadLegacy}=await import('./career.js?v=28.17.2-flat-sand');return loadLegacy().points;
  }),0);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('lali-oli.3d.library.v2'))[0].id);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lali-oli.3d.library.v2'))[0].data.upgrades.kioskName),'QA 3D independiente');
  console.log('OK: separate 3D save and legacy; original 2D storage unchanged');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__api&&window.is3DReady?.());
  await page.getByRole('button',{name:'Jugar en solitario',exact:true}).click();
  assert.equal(await page.locator('.save-row').count(),1);
  assert.match(await page.locator('.save-row').textContent(),/QA 3D independiente/);
  await page.locator('.save-row').getByRole('button',{name:'Continuar',exact:true}).click();
  await page.waitForFunction(()=>Game.mode==='plan');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lali-oli.3d.library.v2'))[0].id),saved);
  await page.getByRole('tab',{name:'Personal',exact:true}).click();
  await page.locator('#btn-open').click();
  await page.waitForFunction(()=>Game.mode==='service');
  await page.locator('[data-speed="0"]').click();
  assert.equal(await page.evaluate(()=>Game.speed),0);
  await unchanged();
  console.log('OK: reload, continue, planning, service and pause on GitHub Pages');
  await page.screenshot({path:artifact+'/desktop.png'});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:artifact+'/portrait.png'});
  await page.setViewportSize({width:1280,height:720});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({url:target.origin+target.pathname,storageIsolated:true,reloadPassed:true,pageErrors:errors}));
}finally{await browser.close();}
