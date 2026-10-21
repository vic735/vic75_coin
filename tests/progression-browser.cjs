const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async({a,wait,click,sizes,delay,root})=>{
 await a.evaluate("CoinGame.tour.stop();CoinGame.help.visit=()=>{};location.hash='#adventure'");
 if(process.argv.includes('--switching')){
  const go=async hash=>{await a.evaluate(`location.hash=${JSON.stringify(hash)}`);await delay(100);};
  const before=await a.evaluate('CoinGame.load()');
  await go('#battle');await click(a,'[data-action=start]');await wait(a,'!!document.querySelector("[data-action=toss]")','Normal match');
  await go('#adventure');await click(a,'[data-progress-mode=flick]');await click(a,'[data-action=challenge]');await wait(a,'!!document.querySelector("[data-flick=begin]")','Flick while normal unfinished');
  assert.equal(await a.evaluate('CoinGame.flickUI.getMatch().phase'),'setup');
  await go('#adventure');await sizes(a,'Adventure with unfinished flick');await click(a,'[data-progress-mode=standard]');await click(a,'[data-action=challenge]');await wait(a,'!!document.querySelector("[data-action=toss]")','Normal adventure while flick unfinished');
  await go('#ranked');await click(a,'[data-progress-mode=squad]');await click(a,'[data-action=rankedStart]');await wait(a,'!!document.querySelector("[data-action=squadReveal]")','Ranked squad while other matches unfinished');
  await go('#death');await click(a,'[data-action=startDeath]');await wait(a,'!!document.querySelector("[data-action=toss]")','Death while normal unfinished');
  await go('#flick');assert.equal(await a.evaluate('CoinGame.flickUI.getMatch().phase'),'setup');await wait(a,'!!document.querySelector("[data-flick=begin]:not(:disabled)")','Retained flick');
  const after=await a.evaluate('CoinGame.load()');assert.equal(after.tokens,before.tokens);assert.deepEqual(after.coins,before.coins);assert.deepEqual(after.coatings,before.coatings);assert.deepEqual(after.ranked,before.ranked);assert.equal(after.adventure?.wins||0,0);
  console.log('PASS: unfinished normal/flick do not block adventure, ranked, squad or death; retained flick resumes; no unearned rewards or rating changes.');return;
 }
 const modes=['standard','death','squad','flick'];
 for(const kind of ['adventure','ranked'])for(const mode of modes){
  await a.evaluate(`location.hash='#${kind}'`);await wait(a,'!!document.querySelector(".progress-modes")','Mode selector');
  await click(a,`[data-progress-mode="${mode}"]`);await sizes(a,kind+' '+mode);
  const before=await a.evaluate('CoinGame.load()');
  await click(a,`[data-action="${kind==='adventure'?'challenge':'rankedStart'}"]`);
  if(mode==='death'){await wait(a,'!!document.querySelector("[data-action=startDeath]")','Death selection');await click(a,'[data-action=startDeath]');}
  if(mode==='flick'){
   await wait(a,'!!document.querySelector("[data-flick=begin]:not(:disabled)")','Flick setup');await sizes(a,'Flick setup');await click(a,'[data-flick=begin]');
   await a.evaluate(`(()=>{const F=CoinGame.flick,m=CoinGame.flickUI.getMatch();CoinGame.flickUI.unmount();let turns=0;while(m.phase!=='finished'&&turns++<500){if(m.phase==='moving'){for(let n=0;n<1100&&m.phase==='moving';n++)F.step(m);}else if(m.actor==='ai')F.aiAct(m);else{const p=F.alive(m,'player'),e=F.alive(m,'ai');let best;for(const c of p)for(const t of e){const distance=Math.hypot(c.x-t.x,c.y-t.y);if(!best||distance<best.distance)best={c,t,distance};}F.shoot(m,best.c.id,(best.t.x-best.c.x)/best.distance*700,(best.t.y-best.c.y)/best.distance*700);}}if(m.phase!=='finished')throw Error('Flick did not finish');window.dispatchEvent(new HashChangeEvent('hashchange'));})()`);
  }else{
   const route=mode==='squad'?'squad':'battle';await wait(a,`location.hash==='#${route}'`,'Battle route');
   for(let n=0;n<350;n++){
    if(await a.evaluate(`!!document.querySelector('#app a.royal-primary[href="#${kind}"]')`))break;
    const action=await a.evaluate(`(()=>{for(const name of ['toss','deathConfirm','deathFlip','deathResult','keep','next','squadReveal','squadToss','squadResult']){const b=document.querySelector('[data-action="'+name+'"]:not(:disabled)');if(b)return name;}return null;})()`);
    if(action)await click(a,`[data-action="${action}"]`);await delay(90);
   }
  }
  await wait(a,`!!document.querySelector('#app a.royal-primary[href="#${kind}"]')`,'Result return');await sizes(a,'Finished '+kind+' '+mode);
  const after=await a.evaluate('CoinGame.load()');
  if(kind==='adventure'){
   assert.deepEqual(after.ranked,before.ranked);const stats=mode==='standard'?after.adventure:after.adventures[mode];assert.equal(stats.wins+stats.losses+stats.draws,1);
  }else{
   for(const other of modes)if(other!==mode)assert.deepEqual(after.ranked[other],before.ranked[other]);
   const stats=after.ranked[mode];assert.equal(stats.wins+stats.losses+stats.draws,1);assert.deepEqual(after.adventure,before.adventure);assert.deepEqual(after.adventures,before.adventures);
  }
  await click(a,`#app a.royal-primary[href="#${kind}"]`);await wait(a,'!!document.querySelector(".progress-modes")','Return to progression');
  const saved=await a.evaluate('localStorage.getItem(CoinGame.config.storageKey)');await a.evaluate("window.dispatchEvent(new HashChangeEvent('hashchange'))");assert.equal(await a.evaluate('localStorage.getItem(CoinGame.config.storageKey)'),saved);
 }
 await sizes(a,'Ranked summary');const shot=await a.cdp('Page.captureScreenshot',{format:'png'});fs.mkdirSync(path.join(root,'.qa'),{recursive:true});fs.writeFileSync(path.join(root,'.qa/ranked.png'),Buffer.from(shot.data,'base64'));
 const saved=await a.evaluate('localStorage.getItem(CoinGame.config.storageKey)');await a.cdp('Page.reload');await wait(a,'!!document.querySelector(".progress-modes")','Reload');assert.equal(await a.evaluate('localStorage.getItem(CoinGame.config.storageKey)'),saved);
 console.log('PASS: four adventure + four ranked modes complete, isolated rewards/rating, return/reload no duplicate payout, mobile/desktop no overflow.');
};
