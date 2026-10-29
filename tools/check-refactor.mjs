import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire('/tmp/refactor-deps/package.json');
const {chromium,webkit}=require('playwright');
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const results=[];
async function run(browser,url,viewport,coop){
  const context=await browser.newContext({viewport});
  await context.route('**/api.fontshare.com/**',r=>r.abort());
  await context.addInitScript(()=>{
    let seed=123456789;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    let uuidSequence=0;
    Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=> '00000000-0000-4000-8000-'+(++uuidSequence).toString(16).padStart(12,'0')});
    const OriginalDate=Date;globalThis.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[1700000000000]));}static now(){return 1700000000000;}};
    Object.defineProperty(performance,'now',{value:()=>0});
    const nativeRaf=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=fn=>fn.name==='frame'?0:nativeRaf(fn);
    window.__refIntervals=[];window.setInterval=(fn,ms,...args)=>{window.__refIntervals.push({fn,args});return window.__refIntervals.length;};
    window.clearInterval=id=>{window.__refIntervals[id-1]=null;};
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    const loaded=async()=>{
      try{
        await page.waitForFunction(()=>document.querySelector('#ver-title')?.textContent.includes('activas:'),null,{polling:100,timeout:30000});
        assert(!await page.locator('#ver-title').textContent().then(t=>t.includes('con error:')),'Application module failed to load');
      }catch(error){
        const detail=await page.evaluate(()=>({title:document.querySelector('#ver-title')?.textContent,errbox:document.querySelector('#errbox')?.textContent})).catch(()=>null);
        throw new Error('Application loading failed: '+JSON.stringify({url,errors,detail,reason:error.message}),{cause:error});
      }
    };
    await page.goto(url,{waitUntil:'domcontentloaded'});await loaded();
    await page.locator('#btn-start').click();await page.locator('.save-browser').getByRole('button',{name:'Nueva partida',exact:true}).click();
    const saved=await page.evaluate(()=>{
      window.__api.buyStock('papas',25);for(const timer of window.__refIntervals)if(timer&&timer.fn.name==='save')timer.fn(...timer.args);
      const fields=['day','money','rep','stock','prices','enabled','upgrades','staff','forecast','season','regulars','pendingPurchases'];
      return Object.fromEntries(fields.map(k=>[k,structuredClone(Game[k])]));
    });
    assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('lali-oli.3d.library.v2')||'[]').length>0),'Save fixture was not written');
    await page.reload({waitUntil:'domcontentloaded'});await loaded();await page.locator('#btn-start').click();await page.locator('.save-row').first().getByRole('button',{name:'Continuar',exact:true}).click();
    const restored=await page.evaluate(fields=>Object.fromEntries(fields.map(k=>[k,structuredClone(Game[k])])),Object.keys(saved));
    assert.deepEqual(restored,saved,'Existing-format save did not round-trip');
    const samples=await page.evaluate(async({coop})=>{
      const S=await import('./sim.js?v=27.1'),R=await import('./render.js?v=27.1');
      const {Game,Net}=await import('./state.js?v=27.1');
      const {showPlan}=await import('./ui.js?v=27.1');
      const samples=[];
      function capture(label){
        R.render();const seen=new WeakSet();
        const state=JSON.parse(JSON.stringify(Game,(_,v)=>{if(v instanceof Set)return {set:[...v]};if(v instanceof Map)return {map:[...v]};if(typeof v==='number'&&!Number.isFinite(v))return String(v);if(v&&typeof v==='object'){if(seen.has(v))return '[reference]';seen.add(v);}return v;}));
        samples.push({label,state,canvas:document.querySelector('#game').toDataURL(),storage:JSON.parse(localStorage.getItem('lali-oli.3d.library.v2')||'[]')});
      }
      const signatures=module=>Object.fromEntries(Object.keys(module).sort().map(k=>[k,typeof module[k]==='function'?{type:'function',name:module[k].name,length:module[k].length}:{type:typeof module[k]}]));
      samples.push({sim:signatures(S),render:signatures(R)});
      for(const day of [1,15,30]){
        S.newSeason();Net.role=coop?'host':'solo';Net.peer=false;Net.roles={p1:'barra',p2:'cocina'};Game.day=day;Game.money=5000;Game.staff={camarero:true,cocinero:true};Game.upgrades={luces:1,hamacas:1};Game.forecast[day-1]=day===1?'sol':day===15?'viento':'calima';showPlan();S.buyStock('papas',25);capture(day+'-plan');
        S.startDay();S.spawnCustomer('local');S.spawnCustomer('turista');S.spawnCustomer('surfista');capture(day+'-start');
        for(let step=0;step<360&&Game.mode==='service';step++){for(const slot of Game.slots)if(!slot.cust){const customer=Game.customers.find(c=>S.servable(c));if(customer)S.startPart(customer,slot);}S.update(.1);if(step===59||step===359)capture(day+'-step-'+step);}
        Game.hour=21;capture(day+'-night');S.beginClosing();for(let step=0;step<500&&Game.mode==='service';step++)S.update(.1);capture(day+'-closed');
      }
      return samples;
    },{coop});
    assert.deepEqual(errors,[],'Browser JavaScript errors');
    assert.equal(await page.locator('#errbox').textContent(),'','In-game error box is not empty');
    return {saved,samples};
  }finally{await context.close();}
}
try{
  for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
    const browser=await type.launch();try{for(const viewport of [{width:390,height:844},{width:844,height:390}])for(const coop of [false,true]){
      const before=await run(browser,'http://127.0.0.1:8765/',viewport,coop);
      const after=await run(browser,'http://127.0.0.1:8766/',viewport,coop);
      assert.deepEqual(after,before,'Behavior or pixels changed: '+JSON.stringify({engine,viewport,coop}));
      results.push({engine,viewport,coop,ok:true,saveRoundTrip:true,publicSignaturesEqual:true,snapshots:before.samples.length,sha256:digest(JSON.stringify(after))});
    }}finally{await browser.close();}
  }
  fs.writeFileSync('diagnostics/modular-refactor-tests.json',JSON.stringify({ok:true,results},null,2)+'\n');
}catch(error){fs.writeFileSync('diagnostics/modular-refactor-tests.json',JSON.stringify({ok:false,results,error:String(error.stack||error)},null,2)+'\n');throw error;}
