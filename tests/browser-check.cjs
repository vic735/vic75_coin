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
    if(size.contentHeight>size.appHeight+1){console.log(await evaluate("[...document.querySelector('#app').children].map(e=>({c:e.className,h:e.getBoundingClientRect().height,margin:getComputedStyle(e).margin}))"));await screenshot('overflow');}
    assert.ok(size.contentHeight<=size.appHeight+1,label+' content does not fit: '+JSON.stringify(size));
    await checkWidth(label);
  };
  const checkSizes=async label=>{for(const [w,h] of sizes){await viewport(w,h);await checkScreen(label+' '+w+'x'+h);}await viewport(390,700);};
  await evaluate("CoinGame.presentation.loadCoins()");
  await evaluate("(()=>{const e=document.createElement('div');e.id='asset-preview';e.style='position:fixed;inset:0;background:#eeece6;z-index:100;padding:24px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px;align-content:center';e.innerHTML=['金','木','水','火','土'].flatMap(el=>['front','back'].map(side=>CoinGame.presentation.coin(12,side,el))).join('');document.body.append(e);e.querySelectorAll('.coin').forEach(c=>{c.style.width='140px';c.style.height='140px';c.querySelector('strong').style.fontSize='40px'})})()");
  await screenshot('coin-materials');await evaluate("document.querySelector('#asset-preview').remove()");
  await checkSizes('Home');await screenshot('home');
  await navigate('#battle');await checkSizes('Battle ready');await click('[data-action="start"]');
  assert.ok(await evaluate("!!document.querySelector('.hidden-fighter')"));
  await evaluate("window.originalPower=CoinGame.power;CoinGame.power=()=>({a:5,b:5,bonusA:0,bonusB:0,reasons:[]})");
  await click('[data-action="toss"]');await evaluate('new Promise(resolve=>setTimeout(resolve,950))');await click('[data-action="flip"]');
  assert.ok(await evaluate("document.querySelector('.round-outcome').textContent.includes('雙方收回硬幣')"));
  assert.ok(await evaluate("document.querySelector('[data-action=next]').textContent.includes('再戰一次')"));
  await checkSizes('Tie replay');
  await click('[data-action="battleHistory"]');assert.ok(await evaluate("document.querySelector('.info-content').textContent.includes('平手收回')"));await click('[data-action="closeBattleInfo"]');
  await click('[data-action="next"]');assert.equal(await evaluate("document.querySelectorAll('.reserve-card:not(:disabled)').length"),3);
  await evaluate('CoinGame.power=window.originalPower');
  for(let round=0;round<50;round++){
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
    assert.ok(await evaluate("[...document.querySelectorAll('.duel-fighter .coin')].every(c=>c.children.length===1&&c.firstElementChild.tagName==='STRONG'&&getComputedStyle(c).backgroundImage.includes('/composed/'))"));
    if(round===0){
      await checkSizes('Interference');
      assert.ok(await evaluate("(()=>{const r=document.querySelector('[data-action=keep]').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;})()"),'Battle action must stay on screen');
      await viewport(390,700);await screenshot('battle');
    }
    await click('[data-action="keep"]');
    await checkSizes(round<2?'Round end':'Settlement');
    if(await evaluate("!!document.querySelector('.royal-result')"))break;
    await click('[data-action="next"]');
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
  await navigate('#coatings');await evaluate("Promise.all([...document.querySelectorAll('.film-disc')].map(el=>{const img=new Image();img.src=getComputedStyle(el).backgroundImage.slice(5,-2);return img.decode()}))");await screenshot('coatings');assert.ok(await evaluate("[...document.querySelectorAll('.collection-tile .film-disc')].every(el=>['金','木','水','火','土'].includes(el.textContent))"));
  await navigate('#coins');await screenshot('collection');await click('[data-inspect]');await click('[data-action="closeInspection"]');
  await navigate('#team');await screenshot('team');
  await navigate('#adventure');await checkSizes('Adventure');await screenshot('adventure');
  await click('[data-action="challenge"]');
  for(let round=0;round<50;round++){
    await click('[data-action="toss"]');await evaluate('new Promise(resolve=>setTimeout(resolve,950))');
    await click('[data-action="keep"]');if(await evaluate("!!document.querySelector('.royal-result')"))break;await click('[data-action="next"]');
  }
  await checkSizes('Adventure settlement');
  assert.ok(await evaluate("document.querySelector('.adventure-reward').textContent.includes('積分')"));
  assert.equal(await evaluate('(()=>{const p=CoinGame.load().adventure;return p.wins+p.losses+p.draws;})()'),1);
  await navigate('#death');await checkSizes('Death preparation');
  await click('[data-action="startDeath"]');await checkSizes('Death select');
  await evaluate("window.deathOriginalPower=CoinGame.power;CoinGame.power=()=>({a:5,b:5,bonusA:0,bonusB:0,reasons:[]})");
  await click('[data-action="toss"]');await evaluate('new Promise(resolve=>setTimeout(resolve,950))');
  await checkSizes('Death tie');assert.equal(await evaluate("document.querySelectorAll('[data-action=flip]').length"),0);
  await click('[data-action="deathFlip"]');await checkSizes('Death tie replay');
  await click('[data-action="next"]');
  await evaluate("CoinGame.power=()=>({a:8,b:4,bonusA:0,bonusB:0,reasons:[]})");
  await click('[data-action="toss"]');await evaluate('new Promise(resolve=>setTimeout(resolve,950))');
  await checkSizes('Death settlement');assert.equal(await evaluate("document.querySelectorAll('.result-rounds>div').length"),1);
  await evaluate('CoinGame.power=window.deathOriginalPower');
  await navigate('#squad');await checkSizes('Squad ready');await click('[data-action="squadStart"]');await checkSizes('Squad hidden');
  assert.equal(await evaluate("document.querySelectorAll('.squad-hidden').length"),3);
  assert.ok(await evaluate("document.querySelector('.squad-side h2 strong').textContent==='—' && document.querySelectorAll('[data-squad-pick] .coin').length===3"));
  await click('[data-squad-pick="0"]');await click('[data-squad-pick="2"]');assert.equal(await evaluate("document.querySelectorAll('.squad-card.chosen').length"),1);await checkSizes('Squad flip selection');
  await evaluate("window.squadPower=CoinGame.power;CoinGame.power=()=>({a:5,b:5,bonusA:0,bonusB:0,reasons:[]})");
  await click('[data-action="squadReveal"]');await checkSizes('Squad tie');assert.ok(await evaluate("document.querySelector('.squad-status').textContent.includes('+1')"));
  await click('[data-action="squadToss"]');await click('[data-action="squadReveal"]');assert.ok(await evaluate("document.querySelector('.squad-status').textContent.includes('+2')"));
  await click('[data-action="squadToss"]');await evaluate("CoinGame.power=()=>({a:6,b:3,bonusA:0,bonusB:0,reasons:[]})");await click('[data-action="squadReveal"]');await checkSizes('Squad result');await screenshot('squad');
  assert.ok(await evaluate("document.querySelector('.squad-status').textContent.includes('勝利')"));await evaluate('CoinGame.power=window.squadPower');
  await navigate('#flick');await checkSizes('Flick ready');
  await click('[data-flick="start"]');await evaluate('new Promise(resolve=>setTimeout(resolve,950))');await checkSizes('Flick opening');
  assert.equal(await evaluate("document.querySelectorAll('[data-opening]').length"),3);
  await click('[data-opening="player-0"]');await click('[data-opening="player-2"]');
  assert.equal(await evaluate("document.querySelectorAll('.flick-opening .is-chosen').length"),1);
  await click('[data-flick="begin"]');await checkSizes('Flick arena');
  await evaluate("new Promise(resolve=>{const poll=()=>{const m=CoinGame.flickUI.getMatch();if(m.phase==='turn'&&m.actor==='player')resolve();else setTimeout(poll,100)};poll()})");
  const shot=await evaluate("(()=>{const c=CoinGame.flick.alive(CoinGame.flickUI.getMatch(),'player')[0],r=document.querySelector('canvas').getBoundingClientRect();return {x:r.left+c.x*r.width/360,y:r.top+c.y*r.height/520,dy:30*r.height/520}})()");
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:shot.x,y:shot.y,button:'left',clickCount:1});
  await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:shot.x,y:shot.y+shot.dy,button:'left',buttons:1});
  await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:shot.x,y:shot.y+shot.dy,button:'left',clickCount:1});
  assert.equal(await evaluate("CoinGame.flickUI.getMatch().phase"),'moving');
  await navigate('#home');await navigate('#flick');await checkSizes('Flick resumed');await screenshot('flick');
  await click('[data-flick="rules"]');assert.ok(await evaluate("document.querySelector('dialog').open"));await evaluate("document.querySelector('dialog').close()");
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

