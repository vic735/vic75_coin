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
async function launch(url){
 const child=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
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
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}/coin-duel/index.html`;
 let browser;
 try{
  browser=await launch(url);
  await browser.evaluate("CoinGame.tour?.stop();localStorage.setItem('coin-duel-help-v2',JSON.stringify({beginner:true}))");
  await browser.evaluate('navigator.serviceWorker.ready.then(()=>true)');
  const manifest=await browser.evaluate('fetch("manifest.webmanifest").then(r=>r.json())');
  assert.equal(manifest.start_url,'./index.html');assert.equal(manifest.display,'standalone');
  await browser.evaluate(`location.hash='#draw'`);await new Promise(r=>setTimeout(r,100));
  await browser.evaluate(`document.querySelector('[data-draw="10"]').click()`);
  const saved=await browser.evaluate('localStorage.getItem(CoinGame.config.storageKey)');assert.equal(JSON.parse(saved).coins.length,13);
  const cache=await browser.evaluate('caches.open("coin-duel-shell-v44").then(c=>c.keys()).then(keys=>keys.map(k=>k.url))');assert.equal(cache.length,56);
  await browser.close();browser=null;
  browser=await launch(url);
  assert.equal(await browser.evaluate('localStorage.getItem(CoinGame.config.storageKey)'),saved,'Data survives full Chrome shutdown');
  assert.equal(await browser.evaluate('document.querySelector("#balance").textContent'),'2,000');
  await browser.cdp('Network.enable');
  await browser.cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await browser.cdp('Page.reload');await new Promise(r=>setTimeout(r,500));
  assert.equal(await browser.evaluate('document.querySelector("#balance").textContent'),'2,000');
  assert.equal(await browser.evaluate('CoinGame.load().coins.length'),13);
  const installability=await browser.cdp('Page.getInstallabilityErrors');assert.deepEqual(installability.installabilityErrors,[]);
  console.log('PWA passed: GitHub-style subpath, manifest/installability, full browser restart retains 13 coins and 2,000 tokens, offline reload, all assets cached.');
 }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
