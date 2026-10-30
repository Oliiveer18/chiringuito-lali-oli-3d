/* Real encrypted WSS smoke test. Two isolated profiles, no mocked transport.
   Cross-network test is separate; TEST_URL can target actual GitHub Pages. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const base=new URL(process.env.TEST_URL||'http://127.0.0.1:8992/');
base.searchParams.set('debug','1');
const server=process.env.TEST_URL?null:spawn(process.execPath,['serve.js','8992'],{stdio:['ignore','pipe','inherit']});
if(server)await once(server.stdout,'data');
const browser=await chromium.launch({headless:true,channel:'chromium',args:[
  '--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
const hostContext=await browser.newContext({viewport:{width:960,height:600},deviceScaleFactor:.5});
const guestContext=await browser.newContext({viewport:{width:960,height:600},deviceScaleFactor:.5});
const host=await hostContext.newPage(),guest=await guestContext.newPage();
const errors=[],checks=[];
for(const [label,page] of [['host',host],['guest',guest]]){
  page.on('pageerror',e=>errors.push(`${label}: ${e.message}`));
}
const output=process.env.TEST_ARTIFACTS||'test-artifacts/online3d';
await mkdir(output,{recursive:true});
const check=async(name,fn)=>{await fn();checks.push(name);console.log('OK:',name);};
async function boot(page){
  await page.goto(base.href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__api&&window.is3DReady?.());
  console.log('BOOT: game and WebGL ready');
  await page.evaluate(()=>{
    const Base=window.Peer;
    window.Peer=class extends Base{constructor(...args){super(...args);window.__qaPeer=this;}};
  });
  await page.locator('#btn-coop').click();
}
try{
  await boot(host);await boot(guest);
  await check('private room code uses a 130-bit secret and isolated 3D id',async()=>{
    await host.getByRole('button',{name:'Nueva partida',exact:true}).click();
    await host.locator('#lobby-name').fill('Anfitrión QA');
    await host.locator('#btn-create').click();
    await host.waitForFunction(()=>Net.signalingReady,{timeout:30000});
    const room=await host.evaluate(()=>({code:Net.code,id:__qaPeer.id}));
    assert.match(room.code,/^[A-Z2-7]{26}$/);
    assert.equal(room.id,'chiringuito-lali-oli-3d-'+room.code);
  });
  await check('two profiles join through a real encrypted WSS broker',async()=>{
    const code=await host.evaluate(()=>Net.code);
    await guest.getByRole('button',{name:'Unirme con código',exact:true}).click();
    await guest.locator('#lobby-name').fill('Invitado QA');
    await guest.locator('#lobby-join-code').fill(code);
    await guest.locator('#btn-join').click();
    await host.waitForFunction(()=>Net.peer,{timeout:45000});
    await guest.waitForFunction(()=>Net.peer,{timeout:45000});
    const transport=await guest.evaluate(()=>{
      const link=[...__qaPeer.links].find(l=>l.open);
      return {state:__qaPeer.socket.readyState,channel:link.raw.transport,broker:__qaPeer.socket.url};
    });
    assert.equal(transport.state,1);assert.equal(transport.channel,'encrypted-wss');
    assert.equal(transport.broker,'wss://broker.emqx.io:8084/mqtt');
    console.log('TRANSPORT',transport);
  });
  await check('both players enter planning and the same service after ready',async()=>{
    await host.locator('#btn-lobby-go').click();
    await guest.waitForFunction(()=>Game.mode==='plan');
    await host.locator('#btn-open').click();await guest.locator('#btn-open').click();
    await host.waitForFunction(()=>Game.mode==='service');
    await guest.waitForFunction(()=>Game.mode==='service');
    assert.equal(await host.evaluate(()=>Game.floor.id),await guest.evaluate(()=>Game.floor.id));
    assert.equal(await guest.evaluate(()=>getPlayerMesh().userData.trayOwner),'p2');
    assert.match(await guest.locator('#hud-money').textContent(),/400/);
    assert.match(await guest.locator('#hud-day').textContent(),/Día 1/);
  });
  await check('guest movement reaches host and host movement reaches guest avatar',async()=>{
    await guest.waitForFunction(()=>Game.speed>0&&!document.querySelector('#btn-action-main').classList.contains('hidden'));
    await guest.keyboard.down('ArrowLeft');
    try{await guest.waitForFunction(()=>getPlayerMesh().position.x<.3);}
    finally{await guest.keyboard.up('ArrowLeft');}
    await host.waitForFunction(()=>Game.service3D.players.p2.x<.3);
    await host.waitForFunction(()=>getPartnerMesh().position.x<.4);
    await host.keyboard.down('ArrowLeft');
    try{await host.waitForFunction(()=>getPlayerMesh().position.x< -2.1);}
    finally{await host.keyboard.up('ArrowLeft');}
    await guest.waitForFunction(()=>Game.service3D.players.p1.x< -2.1);
    await guest.waitForFunction(()=>getPartnerMesh().position.x< -2);
    for(const page of [host,guest]){
      await page.keyboard.down('ArrowUp');
      try{await page.waitForFunction(()=>getPlayerMesh().position.z<1.35,{timeout:10000});}
      finally{await page.keyboard.up('ArrowUp');}
    }
  });
  await check('stations, stock and both trays are shared without preparation-time money',async()=>{
    await host.waitForFunction(()=>document.querySelector('#action-lbl').textContent==='HACER CAFÉ');
    await host.locator('#btn-action-main').click();
    await guest.waitForFunction(()=>document.querySelector('#action-lbl').textContent==='PLANCHA');
    await guest.locator('#btn-action-main').click();
    await host.waitForFunction(()=>Game.service3D.stations.grill.owner==='p2');
    await guest.waitForFunction(()=>Game.service3D.trays.p1.some(u=>u.id==='barraquito'),{timeout:15000});
    await guest.waitForFunction(()=>['done','burnt'].includes(Game.service3D.stations.grill.state),{timeout:15000});
    await guest.locator('#btn-action-main').click();
    await host.waitForFunction(()=>Game.service3D.trays.p2.some(u=>u.id==='papas'));
    await guest.waitForFunction(()=>Game.service3D.trays.p2.some(u=>u.id==='papas'));
    for(const page of [host,guest]){
      assert.deepEqual(await page.evaluate(()=>({coffee:Game.stock.barraquito,papas:Game.stock.papas,money:Game.money})),
        {coffee:14,papas:14,money:400});
    }
  });
  await check('host rejects an out-of-range guest station command over the live connection',async()=>{
    const q=await guest.evaluate(async()=>{
      const {requestService3DCommand}=await import('./service-3d.js');
      requestService3DCommand({type:'cooler'});return Net.seq;
    });
    await guest.waitForFunction(q=>Net.ackLog.some(a=>a.q===q),q);
    assert.equal(await guest.evaluate(q=>Net.ackLog.find(a=>a.q===q).ok,q),false);
    assert.equal(await host.evaluate(()=>Game.service3D.stations.cooler.state),'idle');
  });
  await check('guest prepared delivery pays once and does not debit stock again',async()=>{
    // Customer/position fixture isolates delivery from path-finding; transport is still real.
    await guest.evaluate(()=>__test.setManualTime(true));
    await host.evaluate(async()=>{
      __test.setManualTime(true);
      __test.spawnCustomer('local');const c=Game.customers.at(-1);
      Object.assign(c,{state:'queue',spot:0,x:434,y:600,fromRight:false,table:null,floorTableId:null,
        order:['papas'],itemSt:[0],inPrep:0,served:[],missing:0,partT:{},subs:{},
        eat:false,patience:1000,maxPatience:1000,personality:'tranquilo'});
      Game.customers=[c];
      const r=await import('./render-3d.js?v=28.17.0-online-web');
      for(let i=0;i<300;i++)r.render3D(.1,false);
      const {customerInteractionPosition}=await import('./render-3d-customers.js?v=28.17.0-online-web');
      const pos=customerInteractionPosition(c),p=Game.service3D.players.p2;
      p.x=pos.x+1;p.z=pos.z+.7;p.seq++;p.correctionSeq=p.seq;
    });
    const customerId=await host.evaluate(()=>Game.customers[0].id);
    await guest.waitForFunction(id=>Game.customers.length===1&&Game.customers[0].id===id,customerId);
    assert.equal(await guest.evaluate(()=>Game.customers[0].fromRight),false);
    await guest.evaluate(async()=>{
      const r=await import('./render-3d.js?v=28.17.0-online-web');
      for(let i=0;i<300;i++)r.render3D(.1,false);
    });
    await guest.waitForFunction(()=>document.querySelector('#action-lbl').textContent==='ENTREGAR');
    const expected=await host.evaluate(()=>400+Game.prices.papas+Game.service3D.trays.p2.find(u=>u.id==='papas').bonusTip);
    await guest.locator('#btn-action-main').click();
    await host.waitForFunction(()=>Game.dayStats.served===1);
    await guest.waitForFunction(expected=>Game.money===expected,expected);
    assert.equal(await host.evaluate(()=>Game.stock.papas),14);
    assert.equal(await guest.evaluate(()=>Game.service3D.trays.p2.length),0);
    assert.equal(await host.evaluate(()=>Game.money),expected);
  });
  await check('guest pause and host resume synchronize',async()=>{
    await guest.locator('[data-speed="0"]').click();
    await host.waitForFunction(()=>Game.speed===0);await guest.waitForFunction(()=>Game.speed===0);
    await host.locator('[data-speed="1"]').click();
    await guest.waitForFunction(()=>Game.speed===1);
  });
  await check('real channel interruption pauses and reconnects to the same service',async()=>{
    const service=await host.evaluate(()=>Game.floor.id);
    await guest.evaluate(()=>__qaPeer.socket.close(4000,'QA actual network interruption'));
    await host.waitForFunction(()=>Game.speed===0,{timeout:15000});
    await guest.waitForFunction(()=>Net.peer&&[...__qaPeer.links].some(l=>l.open),{timeout:45000});
    await host.waitForFunction(()=>Net.peer&&Game.speed===1,{timeout:45000});
    assert.equal(await guest.evaluate(()=>Game.floor.id),service);
    await guest.locator('[data-speed="0"]').click();
    await host.waitForFunction(()=>Game.speed===0);
    await host.locator('[data-speed="1"]').click();
    await guest.waitForFunction(()=>Game.speed===1);
  });
  for(const [label,page] of [['host',host],['guest',guest]]){
    await page.screenshot({path:output+'/'+label+'.png',timeout:60000});
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:checks.length,checks,pageErrors:errors},null,2));
}catch(e){
  console.error('FAILED:',e.message,'page errors:',errors);
  for(const [label,page] of [['host',host],['guest',guest]]){
    console.error(label,await page.evaluate(()=>({mode:Game.mode,speed:Game.speed,role:Net.role,peer:Net.peer,code:Net.code,
      active:document.activeElement?.tagName,hidden:document.hidden,
      status:document.querySelector('#lobby-status')?.textContent,action:document.querySelector('#action-lbl')?.textContent,
      players:Game.service3D?.players,stations:Game.service3D?.stations,trays:Game.service3D?.trays,
      customers:Game.customers.map(c=>({id:c.id,state:c.state,order:c.order,itemSt:c.itemSt,fromRight:c.fromRight}))})).catch(()=>null));
  }
  throw e;
}finally{await browser.close();server?.kill();}
