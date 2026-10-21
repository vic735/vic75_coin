const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function env(){const c=vm.createContext({Math,Date});c.window=c;for(const f of ['config','data','gacha','battle','squad','flick','adventure','progression'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',f+'.js'),'utf8'),c);return c.CoinGame;}
function finish(m,winner){m.phase='finished';m.winner=winner;m.history=Array.from({length:m.mode==='death'?1:3},()=>({score:winner==='player'?1:winner==='ai'?0:.5,result:{a:5,b:5}}));}
test('legacy adventure keeps progress and collection; every ranked ladder starts at zero',()=>{
 const G=env(),d=G.initialData();d.adventure={cleared:[1,2,3,4,5],wins:6,losses:2,draws:0};const original=JSON.stringify(d);
 const loaded=G.parseSave(original);G.progression.ensure(loaded);assert.equal(JSON.stringify(loaded.adventure),JSON.stringify(d.adventure));assert.equal(JSON.stringify(loaded.coins),JSON.stringify(d.coins));
 for(const mode of Object.keys(G.adventure.modes))assert.equal(loaded.ranked[mode].points,0);assert.equal(G.validData(loaded),true);
});
test('all four campaigns independently unlock 100 stages and never change ranked scores',()=>{
 const G=env(),d=G.initialData(),P=G.progression;P.ensure(d);d.ranked.standard.points=450;d.ranked.death.points=150;const ranks=JSON.stringify(d.ranked);
 for(const mode of Object.keys(P.modes)){
  assert.throws(()=>P.start(d,'adventure',mode,2,d.coins[0].id));
  for(let stage=1;stage<=100;stage++){
   const m=P.start(d,'adventure',mode,stage,d.coins[0].id,()=>.25);finish(m,'player');const before=d.tokens,r=P.settle(d,m);
   assert.equal(r.tokens,stage%10===0?300:100);assert.equal(d.tokens,before+r.tokens);assert.equal(P.settle(d,m),null);assert.equal(G.adventure.progress(d,mode).cleared.length,stage);
  }
  assert.equal(G.adventure.unlocked(d,101,mode),false);
  const repeat=P.start(d,'adventure',mode,1,d.coins[0].id);finish(repeat,'player');assert.equal(P.settle(d,repeat).tokens,20);
  assert.equal(JSON.stringify(d.ranked),ranks);
 }
 assert.equal(G.validData(d),true);assert.equal(JSON.stringify(G.parseSave(JSON.stringify(d))),JSON.stringify(d));
});
test('only selected ranked ladder changes; wins losses floor promotion and duplicate settlement',()=>{
 const G=env(),d=G.initialData(),P=G.progression;P.ensure(d);
 for(const mode of Object.keys(P.modes)){
  const other=JSON.stringify(Object.fromEntries(Object.entries(d.ranked).filter(([k])=>k!==mode))),tokens=d.tokens;
  for(let i=0;i<5;i++){const m=P.start(d,'ranked',mode,1,d.coins[0].id);assert.equal(P.settle(d,m),null);finish(m,'player');const r=P.settle(d,m);assert.equal(r.points,30);assert.equal(P.settle(d,m),null);}
  assert.equal(P.rank(d,mode).name,'白銀');let m=P.start(d,'ranked',mode,1,d.coins[0].id);finish(m,'ai');assert.equal(P.settle(d,m).demoted,true);assert.equal(P.rank(d,mode).points,135);
  for(let i=0;i<12;i++){m=P.start(d,'ranked',mode,1,d.coins[0].id);finish(m,'ai');P.settle(d,m);}assert.equal(P.rank(d,mode).points,0);
  assert.equal(JSON.stringify(Object.fromEntries(Object.entries(d.ranked).filter(([k])=>k!==mode))),other);assert.equal(d.tokens,tokens);
 }
 assert.equal(d.adventure,undefined);assert.equal(d.adventures,undefined);assert.equal(G.validData(d),true);
});
test('all modes use cloned chapter opponents and casual outcomes do not award progression',()=>{
 const G=env(),d=G.initialData(),P=G.progression;P.ensure(d);const original=JSON.stringify(d);
 for(const mode of Object.keys(P.modes)){
  const m=P.start(d,'adventure',mode,1,d.coins[0].id,()=>0),npc=G.adventure.npc(1,mode);
  const enemy=mode==='flick'?m.coins.filter(c=>c.owner==='ai').map(c=>c.coin):m.ai;
  assert.equal(enemy.length,mode==='death'?1:3);assert.equal(enemy[0].front,npc.team[0].front);enemy[0].front=99;assert.notEqual(G.adventure.npc(1,mode).team[0].front,99);
 }
 assert.equal(JSON.stringify(d),original);
 const m=G.newMatch(d);finish(m,'player');assert.equal(P.settle(d,m),null);assert.equal(JSON.stringify(d),original);
 d.ranked.death.points=-1;assert.equal(G.validData(d),false);
});
