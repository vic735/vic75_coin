// Optional local Chrome verification, using Node's built-in WebSocket/CDP support.
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const chrome=process.env.COIN_DUEL_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const output=path.join(root,'.qa');
fs.mkdirSync(output,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'coin-duel-browser-'));
const browser=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
const pending=new Map();let socket,nextId=0;
async function main(){
  const wsUrl=await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Chrome did not start within 15s')),15000);let log='';
    browser.on('error',reject);browser.on('exit',code=>reject(Error(`Chrome exited: ${code}`)));
    browser.stderr.on('data',chunk=>{log+=chunk;const match=log.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timeout);resolve(match[1]);}});
  });
  socket=new WebSocket(wsUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',event=>{const msg=JSON.parse(event.data);const task=pending.get(msg.id);if(task){clearTimeout(task.timeout);pending.delete(msg.id);msg.error?task.reject(Error(JSON.stringify(msg.error))):task.resolve(msg.result);}});
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++nextId;const timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},15000);pending.set(id,{resolve,reject,timeout});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const cdp=(method,params)=>send(method,params,sessionId);
  await cdp('Page.enable');await cdp('Runtime.enable');
  const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const viewport=async(width,height=960)=>{await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});};
  await viewport(390);
  const url=pathToFileURL(path.join(root,'index.html')).href;
  await cdp('Page.navigate',{url});
  await evaluate("new Promise(resolve=>{if(document.readyState==='complete')resolve();else window.addEventListener('load',()=>resolve(),{once:true});})");
  assert.equal(await evaluate("document.querySelectorAll('.royal-hero').length"),1);
  const screenshot=async name=>{const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(r.data,'base64'));};
  const checkWidth=async label=>assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),label+' has horizontal overflow');
  const navigate=async hash=>{await evaluate(`location.hash=${JSON.stringify(hash)};new Promise(resolve=>setTimeout(resolve,80))`);};
  const click=async selector=>{const clicked=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)return false;e.click();return true;})()`);assert.ok(clicked,'Cannot click '+selector);};
  const sizes=[[320,568],[360,640],[390,700],[390,844],[430,800],[1024,768]];
  const checkScreen=async label=>{
    const size=await evaluate("(()=>{const a=document.querySelector('#app');return {pageHeight:document.documentElement.scrollHeight,viewHeight:innerHeight,appHeight:a.clientHeight,contentHeight:a.scrollHeight};})()");
    assert.ok(size.pageHeight<=size.viewHeight+1,label+' page scrolls: '+JSON.stringify(size));
    assert.ok(size.contentHeight<=size.appHeight+1,label+' content does not fit: '+JSON.stringify(size));
    await checkWidth(label);
  };
  const checkSizes=async label=>{for(const [w,h] of sizes){await viewport(w,h);await checkScreen(label+' '+w+'x'+h);}await viewport(390,700);};
  await checkSizes('Home');await screenshot('home');
  await navigate('#battle');await checkSizes('Battle ready');await click('[data-action="start"]');
  assert.ok(await evaluate("!!document.querySelector('.hidden-fighter')"));
  for(let round=0;round<3;round++){
    await checkSizes('Select '+round);
    await click('.reserve-card:not(:disabled)');await click('[data-action="toss"]');
    assert.ok(await evaluate(`(()=>{
      const coins=[...document.querySelectorAll('.toss-coin')];
      return coins.length===2 && coins.every(c=>c.querySelector('.front')&&c.querySelector('.back')&&getComputedStyle(c.querySelector('.back')).backfaceVisibility==='hidden')
        && [...document.querySelectorAll('.power-sheet dd,.sheet-total strong')].every(n=>n.textContent==='—')
        && document.querySelector('[data-action="keep"]').disabled && document.querySelector('[data-action="flip"]').disabled;
    })()`),'Toss must render both faces and conceal power until landing');
    await evaluate('new Promise(resolve=>setTimeout(resolve,950))');
    assert.equal(await evaluate("document.querySelectorAll('.hidden-fighter').length"),0);
    assert.ok(await evaluate("[...document.querySelectorAll('.duel-fighter .coin')].every(c=>c.children.length===1&&c.firstElementChild.tagName==='STRONG')"));
    if(round===0){
      await checkSizes('Interference');
      assert.ok(await evaluate("(()=>{const r=document.querySelector('[data-action=keep]').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;})()"),'Battle action must stay on screen');
      await viewport(390,700);await screenshot('battle');
    }
    await click('[data-action="keep"]');
    await checkSizes(round<2?'Round end':'Settlement');
    if(round<2)await click('[data-action="next"]');
  }
  assert.equal(await evaluate("document.querySelectorAll('.royal-result').length"),1);await screenshot('settlement');
  await click('[data-action="battleHistory"]');assert.equal(await evaluate("document.querySelectorAll('.battle-info').length"),1);await click('[data-action="closeBattleInfo"]');
  await click('[data-action="battleRules"]');assert.ok(await evaluate("getComputedStyle(document.querySelector('#battle-info-title')).fontFamily.includes('system-ui')"));await click('[data-action="closeBattleInfo"]');
  // Retained views must remain functional under the new shared shell.
  for(const page of ['#team','#draw','#coins','#coatings']){await navigate(page);await checkWidth(page);}
  await navigate('#draw');await checkSizes('Draw');await screenshot('draw');
  await click('[data-draw="10"]');await checkSizes('Draw result');await screenshot('draw-results');
  await click('[data-inspect]');assert.equal(await evaluate("document.querySelectorAll('.battle-info').length"),1);await click('[data-action="closeInspection"]');
  await click('[data-action="dismissDraw"]');await click('[data-pool="coatings"]');await click('[data-draw="1"]');await click('[data-action="dismissDraw"]');
  await navigate('#coins');await screenshot('collection');await click('[data-inspect]');await click('[data-action="closeInspection"]');
  await navigate('#team');await screenshot('team');
  await navigate('#save');await checkWidth('Save management');
  await click('[data-action="saveNow"]');
  const persisted=await evaluate("localStorage.getItem(CoinGame.config.storageKey)");
  await evaluate(`(()=>{const file=new File([JSON.stringify({...JSON.parse(localStorage.getItem(CoinGame.config.storageKey)),tokens:4321})],'save.json',{type:'application/json'});const transfer=new DataTransfer();transfer.items.add(file);const input=document.querySelector('#save-file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await evaluate('new Promise(resolve=>setTimeout(resolve,100))');
  assert.equal(await evaluate("localStorage.getItem(CoinGame.config.storageKey)"),persisted);
  await click('[data-action="confirmImport"]');
  assert.equal(await evaluate("CoinGame.load().tokens"),4321);
  await cdp('Page.reload');await new Promise(resolve=>setTimeout(resolve,400));
  assert.equal(await evaluate("document.querySelector('#balance').textContent"),'4,321');
  console.log('Save import confirmation and reload persistence passed.');
  console.log('Browser checks passed: no page or main-content scroll at 320x568, 360x640, 390x700, 390x844, 430x800, 1024x768; all battle phases; full three-round UI flow; detail panels and system font; retained pages.');
  console.log('Screenshots: '+output);
  await send('Browser.close');socket.close();
}
main().catch(error=>{console.error(error);socket?.close();browser.kill();process.exitCode=1;});

