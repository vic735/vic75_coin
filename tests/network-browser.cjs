const {spawn}=require('node:child_process');
const {createServer}=require('node:http');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'coin-duel-pwa-'));
const chrome=process.env.COIN_DUEL_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(!url.pathname.startsWith('/coin-duel/')){res.writeHead(404).end();return;}
 const file=path.resolve(root,url.pathname.slice('/coin-duel/'.length)||'index.html');
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.setHeader('Content-Type',types[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
async function launch(url,binary=chrome){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'coin-duel-lan-'));
 const child=spawn(binary,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 const closed=new Promise(resolve=>child.once('exit',resolve));
 const endpoint=await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(Error('Chrome startup timeout')),15000);child.on('error',reject);child.stderr.on('data',chunk=>{log+=chunk;const m=log.match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timer);resolve(m[1]);}});});
 const ws=new WebSocket(endpoint);await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));let serial=0;const pending=new Map();
 ws.addEventListener('message',event=>{const msg=JSON.parse(event.data),p=pending.get(msg.id);if(p){pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}});
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>reject(Error(method+' timeout')),15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,sessionId}));});
 const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const cdp=(method,params)=>send(method,params,sessionId);
 const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await cdp('Page.enable');await cdp('Page.navigate',{url});
 for(let i=0;i<100;i++){try{if(await evaluate('!!window.CoinGame && !!document.querySelector(".royal-hero")'))break;}catch{}await new Promise(r=>setTimeout(r,50));}
 return {evaluate,cdp,close:async()=>{await send('Browser.close');ws.close();await closed;},child};
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(browser,expression,label,timeout=20000){const until=Date.now()+timeout;while(Date.now()<until){if(await browser.evaluate(expression))return;await delay(50);}throw Error(label+' timed out: '+await browser.evaluate('JSON.stringify({phase:CoinGame.connectionUI.getSession()?.phase,error:CoinGame.connectionUI.getSession()?.error,text:document.querySelector("#app").textContent})'));}
async function click(b,selector){await b.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el||el.disabled)throw Error('Missing/disabled '+${JSON.stringify(selector)});el.click();})()`);}
async function transferQR(source,target,raw){
 await click(source,'[data-net=showQR]');await wait(source,'!!document.querySelector(".net-qr-code")','QR display');await click(source,'[data-auto]');
 const total=await source.evaluate(`CoinGame.network.qr.pack(${JSON.stringify(raw)}).then(x=>x.length)`),images=[];
 console.log('QR frames: '+total+' (previous uncompressed: '+Math.ceil(Buffer.byteLength(raw)*4/3/480)+')');
 for(let i=0;i<total;i++){images.push(await source.evaluate('document.querySelector(".net-qr-code").toDataURL()'));await click(source,'[data-next]');}
 await click(source,'[data-qr-close]');await click(target,'[data-net=scanQR]');
 await target.evaluate(`(async()=>{const dt=new DataTransfer();for(const [i,url] of ${JSON.stringify(images)}.entries()){const blob=await (await fetch(url)).blob();dt.items.add(new File([blob],i+'.png',{type:'image/png'}));}const input=document.querySelector('.net-qr-body input');input.files=dt.files;input.dispatchEvent(new Event('change'));})()`);
 await wait(target,`!document.querySelector('.net-qr-dialog') && document.querySelector('#net-input').value===${JSON.stringify(raw)}`,'QR image collection');
}
async function sizes(b,label){for(const [width,height] of [[320,568],[390,700],[430,800],[1024,768]]){await b.cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await delay(35);const box=await b.evaluate('(()=>{const a=document.querySelector("#app");return {view:innerHeight,page:document.documentElement.scrollHeight,w:innerWidth,sw:document.documentElement.scrollWidth,h:a.clientHeight,sh:a.scrollHeight};})()');assert.ok(box.page<=box.view+1&&box.sw<=box.w+1&&box.sh<=box.h+1,label+JSON.stringify(box));}await b.cdp('Emulation.setDeviceMetricsOverride',{width:390,height:700,deviceScaleFactor:1,mobile:true});}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/coin-duel/index.html`;
 let a,b;
 try{
  a=await launch(url);
  if(process.argv.includes('--progression')){await require('./progression-browser.cjs')({a,wait,click,sizes,delay,root});return;}
  b=await launch(url,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
  for(const browser of [a,b]){await browser.evaluate("CoinGame.tour.stop();localStorage.setItem('coin-duel-help-v2',JSON.stringify({beginner:true}));location.hash='#network'");await wait(browser,'!!document.querySelector("[data-net=host]")','entry');}
  const original=await a.evaluate('localStorage.getItem(CoinGame.config.storageKey)');await sizes(a,'Entry');
  await click(b,'[data-net=join]');await b.evaluate("document.querySelector('#net-input').value='{}'");await click(b,'[data-net=answer]');await wait(b,'!!document.querySelector(".net-error")','Invalid invitation');await click(b,'[data-net=reset]');
  await click(a,'[data-net=host]');await wait(a,'!!document.querySelector("#net-output")','Offer');await sizes(a,'Offer');
  const offer=await a.evaluate('document.querySelector("#net-output").value');assert.ok(JSON.parse(offer).sdp.includes('a=candidate:'));assert.equal(await a.evaluate('CoinGame.connectionUI.getPeer().pc.iceGatheringState'),'complete');
  await click(b,'[data-net=join]');await transferQR(a,b,offer);await click(b,'[data-net=answer]');await wait(b,'!!document.querySelector("#net-output")','Answer');
  const answer=await b.evaluate('document.querySelector("#net-output").value');assert.equal(await b.evaluate('CoinGame.connectionUI.getPeer().pc.iceGatheringState'),'complete');await sizes(b,'Answer');
  await transferQR(b,a,answer);await click(a,'[data-net=accept]');
  await wait(a,'CoinGame.connectionUI.getSession()?.phase==="lobby"','Chrome handshake');await wait(b,'CoinGame.connectionUI.getSession()?.phase==="lobby"','Edge handshake');
  for(const browser of [a,b]){assert.equal(await browser.evaluate('CoinGame.connectionUI.getPeer().channel.readyState'),'open');assert.deepEqual(await browser.evaluate('CoinGame.connectionUI.getPeer().pc.getConfiguration().iceServers'),[]);await sizes(browser,'Lobby');}
  await click(a,'[data-net=ready]');await click(b,'[data-net=ready]');await wait(a,'CoinGame.connectionUI.getSession().phase==="select"','Selection');await sizes(a,'Selection');
  let checks=0;
  for(let attempt=0;attempt<80;attempt++){
   if(await a.evaluate('CoinGame.connectionUI.getSession().phase==="finished"'))break;
   for(const browser of [a,b])await wait(browser,'CoinGame.connectionUI.getSession().phase==="select"','Next selection');
   await click(a,'[data-coin]:not(:disabled)');assert.equal(await b.evaluate('CoinGame.connectionUI.getSession().stages.coin.reveals[0]'),null);
   await click(b,'[data-coin]:not(:disabled)');
   for(const browser of [a,b])await wait(browser,'CoinGame.connectionUI.getSession().phase==="interfere" && !!document.querySelector("[data-net=keep]:not(:disabled)")','Toss');
   assert.deepEqual(await a.evaluate('CoinGame.connectionUI.getSession().toss'),await b.evaluate('CoinGame.connectionUI.getSession().toss'));
   if(checks++===0)await sizes(a,'Interference');
   for(const browser of [a,b])await click(browser,await browser.evaluate('!!document.querySelector("[data-net=flip]:not(:disabled)")')?'[data-net=flip]':'[data-net=keep]');
   for(const browser of [a,b])await wait(browser,'["roundEnd","finished"].includes(CoinGame.connectionUI.getSession().phase)','Result');
   assert.equal(await a.evaluate('CoinGame.network.canonical(CoinGame.connectionUI.getSession().state)'),await b.evaluate('CoinGame.network.canonical(CoinGame.connectionUI.getSession().state)'));
   if(checks===1)await sizes(a,'Round result');
   if(await a.evaluate('CoinGame.connectionUI.getSession().phase==="finished"'))break;
   for(const browser of [a,b]){await wait(browser,'!!document.querySelector("[data-net=next]:not(:disabled)")','Confirm result');await click(browser,'[data-net=next]');}
  }
  assert.equal(await a.evaluate('CoinGame.connectionUI.getSession().state.history.length'),3);assert.equal(await b.evaluate('CoinGame.connectionUI.getSession().phase'),'finished');await sizes(a,'Match result');
  const screenshot=await a.cdp('Page.captureScreenshot',{format:'png'});fs.mkdirSync(path.join(root,'.qa'),{recursive:true});fs.writeFileSync(path.join(root,'.qa/network-result.png'),Buffer.from(screenshot.data,'base64'));
  assert.equal(await a.evaluate('localStorage.getItem(CoinGame.config.storageKey)'),original);
  await b.evaluate('CoinGame.connectionUI.getPeer().close()');await wait(a,'CoinGame.connectionUI.getSession().stopped','Disconnect');assert.equal(await a.evaluate('localStorage.getItem(CoinGame.config.storageKey)'),original);await sizes(a,'Disconnected');
  // Re-pair and interrupt a live match, not just an already completed match.
  for(const browser of [a,b])await click(browser,'[data-net=reset]');
  await click(a,'[data-net=host]');await wait(a,'!!document.querySelector("#net-output")','Second offer');
  const offer2=await a.evaluate('document.querySelector("#net-output").value');await click(b,'[data-net=join]');await b.evaluate(`document.querySelector('#net-input').value=${JSON.stringify(offer2)}`);await click(b,'[data-net=answer]');await wait(b,'!!document.querySelector("#net-output")','Second answer');
  const answer2=await b.evaluate('document.querySelector("#net-output").value');await a.evaluate(`document.querySelector('#net-input').value=${JSON.stringify(answer2)}`);await click(a,'[data-net=accept]');
  for(const browser of [a,b]){await wait(browser,'CoinGame.connectionUI.getSession().phase==="lobby"','Re-paired lobby');await click(browser,'[data-net=ready]');}
  await wait(a,'CoinGame.connectionUI.getSession().phase==="select"','Live match');await b.evaluate('CoinGame.connectionUI.getPeer().close()');await wait(a,'CoinGame.connectionUI.getSession().stopped','Mid-match disconnect');
  assert.equal(await a.evaluate('CoinGame.connectionUI.getSession().state.history.length'),0);assert.equal(await a.evaluate('CoinGame.connectionUI.getSession().completed'),false);assert.equal(await a.evaluate('localStorage.getItem(CoinGame.config.storageKey)'),original);
  await a.evaluate("location.hash='#battle'");await wait(a,'!!document.querySelector("[data-action=start]")','Single player');await click(a,'[data-action=start]');assert.ok(await a.evaluate('!!document.querySelector("[data-action=toss]")'));
  console.log('PASS real Chrome ↔ Edge RTCDataChannel: complete ICE/manual SDP, handshake, decks, commit/reveal, equal tosses, three decisive rounds, hashes, disconnect, collection retained, single-player usable, phone layouts. Same-computer loopback, not physical-phone/LAN validation.');
 }finally{for(const browser of [a,b])if(browser)try{await browser.close();}catch{browser.child.kill();}server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
