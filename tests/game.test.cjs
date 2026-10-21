const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function setup(ui=false,savedData=null){
  const memory=new Map(),events={},app={innerHTML:'',addEventListener:(name,fn)=>events[name]=fn};
  if(savedData)memory.set('coin-duel-v01',JSON.stringify(savedData));
  const elements={'#app':app,'#balance':{},'#toast':{classList:{add(){},remove(){}}}};
  const ctx=vm.createContext({console,Math,Date,location:{hash:'#home'},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},document:{querySelector:s=>elements[s],querySelectorAll:()=>[]},setTimeout:fn=>{fn();return 1;},clearTimeout(){}});
  ctx.window=ctx;ctx.addEventListener=(name,fn)=>events[name]=fn;ctx.scrollTo=()=>{};
  for(const name of ['config','data','gacha','battle','squad','flick','adventure','progression',...(ui?['presentation','app']:[])])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name+'.js'),'utf8'),ctx);
  return {G:ctx.CoinGame,ctx,memory,app,events,elements};
}
test('starter coins, coatings, team and save round trip',()=>{const {G}=setup(),d=G.initialData();assert.deepEqual(Array.from(d.coins,c=>[c.front,c.back]),[[3,3],[1,10],[5,7]]);assert.equal(G.validData(d),true);G.save(d);assert.equal(JSON.stringify(G.load()),JSON.stringify(d));});
test('single-face coating rolls one element and one attack',()=>{
  const {G}=setup();for(let attack=0;attack<=5;attack++){let calls=0;const values=[0,(attack+.1)/6];const m=G.rollCoating(()=>{calls++;return values.shift();});assert.equal(calls,2);assert.equal(m.element,'金');assert.equal(m.attack,attack);assert.equal(m.front,undefined);assert.equal(m.back,undefined);}
  G.config.coatingAttackWeights={5:1};assert.equal(G.rollCoating(()=>0).attack,5);
});
test('legacy dual-face save migrates once without losing equipment or power',()=>{
  const {G,memory}=setup();const old={version:1,tokens:1777,coins:[{id:'coin',name:'A',front:3,back:3,coatingId:'film'}],coatings:[{id:'film',name:'舊鍍膜',front:'火',back:'水',attack:5},{id:'spare',name:'備用',front:'土',back:'木'}],team:['coin']};
  memory.set(G.config.storageKey,JSON.stringify(old));const d=G.load();assert.equal(G.validData(d),true);assert.equal(d.version,2);assert.equal(d.tokens,1777);assert.equal(d.coatings.length,4);assert.equal(d.coins[0].frontCoatingId,'film');assert.equal(d.coatings.find(m=>m.id===d.coins[0].backCoatingId).element,'水');assert.equal(d.coatings[1].attack,5);assert.equal(d.coatings[2].attack,0);assert.equal(d.team[0],'coin');G.save(d);assert.equal(JSON.stringify(G.load()),JSON.stringify(d));
  for(const n of [-1,6,1.5,null]){d.coatings[0].attack=n;assert.equal(G.validData(d),false);}
});
test('each side uses its own coating; flip switches element and attack',()=>{
  const {G}=setup(),d=G.initialData();d.coatings[0].attack=5;d.coatings[1].attack=1;
  const m=G.newMatch(d,()=>0);d.coatings[0].attack=0;
  const c=m.player[0];assert.equal(G.face(c,'front').damage,8);assert.equal(G.face(c,'front').element,'火');assert.equal(G.face(c,'back').damage,4);assert.equal(G.face(c,'back').element,'水');
  G.selectCoin(m,c.id,()=>0);G.resolveRound(m,true);assert.equal(m.current.result.a,5);assert.equal(G.summary(m).power,0);assert.equal(m.current.tied,true);assert.equal(c.front,3);assert.equal(c.coatings.front.attack,5);
});
test('same film transfers between faces and coins without duplicates',()=>{
  const {G}=setup(),d=G.initialData(),id=d.coatings[0].id;
  G.equip(d,d.coins[0].id,'back',id);assert.equal(d.coins[0].frontCoatingId,null);assert.equal(d.coins[0].backCoatingId,id);
  G.equip(d,d.coins[1].id,'front',id);assert.equal(d.coins[0].backCoatingId,null);assert.equal(d.coins[1].frontCoatingId,id);
  assert.equal(G.validData(d),true);d.coins[2].backCoatingId=id;assert.equal(G.validData(d),false);
});
test('draw total first; every legal split at random boundaries',()=>{const {G}=setup();for(let total=6;total<=12;total++)for(let front=1;front<total;front++){let draws=[(total-6+.1)/7,(front-1+.1)/(total-1)];const c=G.rollCoin(()=>draws.shift());assert.equal(c.front,front);assert.equal(c.front+c.back,total);}const c=G.rollCoin(()=>.999999);assert.equal(c.front,11);assert.equal(c.back,1);});
test('10 draws charge correctly and duplicate configurations have unique IDs',()=>{const {G}=setup(),d=G.initialData();const result=G.draw(d,'coins',10,()=>0);assert.equal(d.tokens,2000);assert.equal(d.coins.length,13);assert.equal(new Set(result.map(c=>c.id)).size,10);G.draw(d,'coatings',10,()=>0);assert.equal(d.coatings.length,16);d.tokens=0;assert.throws(()=>G.draw(d,'coins',1));assert.equal(d.coins.length,13);});
test('coatings transfer exclusively and unequip without destroying items',()=>{const {G}=setup(),d=G.initialData(),id=d.coatings[0].id;G.equip(d,d.coins[1].id,'front',id);assert.equal(d.coins[0].frontCoatingId,null);assert.equal(d.coins[1].frontCoatingId,id);G.equip(d,d.coins[1].id,'front','');assert.equal(d.coins[1].frontCoatingId,null);assert.equal(d.coatings.length,6);assert.equal(G.validData(d),true);});
test('all 25 elemental matchups follow independently specified rules',()=>{const {G}=setup();const e=['金','木','水','火','土'];const expected={金:{金:[0,0],木:[2,0],水:[0,1],火:[0,2],土:[1,0]},木:{金:[0,2],木:[0,0],水:[1,0],火:[0,1],土:[2,0]},水:{金:[1,0],木:[0,1],水:[0,0],火:[2,0],土:[0,2]},火:{金:[2,0],木:[1,0],水:[0,2],火:[0,0],土:[0,1]},土:{金:[0,1],木:[0,2],水:[2,0],火:[1,0],土:[0,0]}};for(const a of e)for(const b of e){const r=G.power({damage:4,element:a},{damage:7,element:b});assert.deepEqual([r.a,r.b],[4+expected[a][b][0],7+expected[a][b][1]]);}});
test('incomplete or unequipped teams are rejected',()=>{const {G}=setup(),d=G.initialData();d.team.pop();assert.throws(()=>G.newMatch(d));d.team.push(d.coins[2].id);d.coins[0].frontCoatingId=null;assert.throws(()=>G.newMatch(d));});
test('100 full matches finish three rounds with no reused coins and one interference',()=>{const {G}=setup();for(let i=0;i<100;i++){const m=G.newMatch(G.initialData());for(let round=0;round<100&&m.phase!=='finished';round++){const c=m.player.find(c=>!m.used.includes(c.id));G.selectCoin(m,c.id);const locked=m.current.aiWillFlip;G.resolveRound(m,round===0);assert.equal(m.current.aiFlipped,locked);if(m.phase!=='finished')G.prepareRound(m);}assert.equal(m.phase,'finished');assert.equal(m.history.length,3);assert.equal(new Set(m.used).size,3);assert.equal(new Set(m.aiUsed).size,3);assert.equal([...m.history,...m.ties].filter(r=>r.playerFlipped).length,1);assert.ok([...m.history,...m.ties].filter(r=>r.aiFlipped).length<=1);assert.equal(G.summary(m).score+G.summary(m).aiScore,3);assert.throws(()=>G.resolveRound(m,false));}});
test('AI commitment identical regardless of player interference choice',()=>{const {G}=setup(),m=G.newMatch(G.initialData(),()=>.2);G.selectCoin(m,m.player[0].id,()=>.8);const clone=JSON.parse(JSON.stringify(m)),committed=m.current.aiWillFlip;G.resolveRound(m,true);G.resolveRound(clone,false);assert.equal(m.current.aiFlipped,committed);assert.equal(clone.current.aiFlipped,committed);assert.notEqual(m.current.playerSide,clone.current.playerSide);});
test('coin cannot be reused and consumed interference cannot be used twice',()=>{const {G}=setup(),m=G.newMatch(G.initialData());G.selectCoin(m,m.player[0].id);G.resolveRound(m,true);const tied=m.current.tied;G.prepareRound(m);if(!tied)assert.throws(()=>G.selectCoin(m,m.player[0].id));G.selectCoin(m,m.player[1].id);assert.throws(()=>G.resolveRound(m,true));G.resolveRound(m,false);});
test('ties return both coins, retain spent interference and replay even the third round',()=>{
 const {G}=setup(),m=G.newMatch(G.initialData());
 G.power=()=>({a:5,b:5,bonusA:0,bonusB:0,reasons:[]});
 const id=m.player[0].id;
 G.selectCoin(m,id);G.resolveRound(m,true);
 assert.equal(m.history.length,0);assert.equal(m.ties.length,1);assert.equal(m.used.length,0);assert.equal(m.aiUsed.length,0);assert.equal(m.playerInterference,false);assert.equal(G.summary(m).score,0);assert.equal(G.summary(m).aiScore,0);
 for(let i=0;i<2;i++){G.prepareRound(m);G.selectCoin(m,m.player.find(c=>!m.used.includes(c.id)).id);G.power=()=>({a:9,b:1,bonusA:0,bonusB:0,reasons:[]});G.resolveRound(m,false);}
 const used=[...m.used],aiUsed=[...m.aiUsed];
 G.prepareRound(m);G.selectCoin(m,m.player.find(c=>!m.used.includes(c.id)).id);G.power=()=>({a:4,b:4,bonusA:0,bonusB:0,reasons:[]});G.resolveRound(m,false);
 assert.equal(m.phase,'roundEnd');assert.equal(m.history.length,2);assert.deepEqual([...m.used],used);assert.deepEqual([...m.aiUsed],aiUsed);assert.equal(m.current.round,3);
 G.prepareRound(m);G.selectCoin(m,m.player.find(c=>!m.used.includes(c.id)).id);G.power=()=>({a:1,b:9,bonusA:0,bonusB:0,reasons:[]});G.resolveRound(m,false);
 assert.equal(m.phase,'finished');assert.equal(G.summary(m).score,2);assert.equal(G.summary(m).aiScore,1);assert.equal(m.ties.length,2);
});

test('invalid persistence recovers, unavailable storage reports failure',()=>{const {G,ctx,memory}=setup();memory.set(G.config.storageKey,'{bad');assert.equal(G.validData(G.load()),true);ctx.localStorage.setItem=()=>{throw Error('blocked');};assert.equal(G.save(G.initialData()),false);});
test('UI flow: ten-draw, equip, replace lineup, three rounds, settlement and reload',()=>{
  const {ctx,events,app,memory,G}=setup(true);
  const page=p=>{ctx.location.hash='#'+p;events.hashchange();};
  const click=dataset=>events.click({target:{closest:()=>({dataset,disabled:false})}});
  page('draw');click({draw:'10'});assert.match(app.innerHTML,/已存入收藏 · 10 件/);
  let d=JSON.parse(memory.get(G.config.storageKey));assert.equal(d.coins.length,13);
  page('team');click({action:'chooseCoin'});click({assign:d.coins[3].id});
  click({action:'chooseCoin'});click({assign:d.coins[0].id});
  click({editSide:'front'});click({film:d.coatings[0].id});
  page('battle');click({action:'start'});
  for(let i=0;i<100&&!app.innerHTML.includes('MATCH COMPLETE');i++){
    d=JSON.parse(memory.get(G.config.storageKey));click({action:'toss'});assert.match(app.innerHTML,/對手的干涉決定已鎖定/);click({action:i===0?'flip':'keep'});if(!app.innerHTML.includes('MATCH COMPLETE'))click({action:'next'});
  }
  assert.match(app.innerHTML,/MATCH COMPLETE/);assert.match(app.innerHTML,/累積最終戰力/);
  click({action:'battleHistory'});assert.match(app.innerHTML,/第 3 局/);click({action:'closeBattleInfo'});
  assert.equal(G.load().coins.length,13);assert.equal(G.load().tokens,2000);
  page('draw');click({action:'dismissDraw'});click({pool:'coatings'});click({draw:'1'});assert.doesNotMatch(app.innerHTML,/單面鍍膜/);assert.match(app.innerHTML,/攻擊 \+\d/);const film=G.load().coatings.at(-1);click({inspect:film.id});assert.doesNotMatch(app.innerHTML,/僅裝備面生效|coating-faces/);assert.match(app.innerHTML,/film-disc/);click({action:'closeInspection'});assert.equal(G.load().coatings.length,7);
  for(const p of ['home','coins','coatings','team','draw']){page(p);assert.ok(app.innerHTML.length>100);}
});
test('reference arena keeps enemy hidden until toss and used coins cannot be picked again',()=>{
  const {ctx,events,app,G}=setup(true);
  const click=dataset=>events.click({target:{closest:()=>({dataset,disabled:false})}});
  assert.match(app.innerHTML,/royal-hero/);assert.match(app.innerHTML,/冒險破關與好友連線/);
  const choose=G.selectCoin;let tosses=0;
  G.selectCoin=(...args)=>{tosses++;return choose(...args);};
  ctx.location.hash='#battle';events.hashchange();click({action:'start'});
  assert.match(app.innerHTML,/已秘密鎖定/);assert.match(app.innerHTML,/尚未擲幣/);
  const d=G.load();click({pick:d.team[1]});assert.equal(tosses,0);
  assert.match(app.innerHTML,/data-pick="[^"]+" aria-pressed="true"/);
  click({action:'toss'});assert.equal(tosses,1);assert.doesNotMatch(app.innerHTML,/hidden-fighter/);
  assert.match(app.innerHTML,/基礎傷害/);assert.match(app.innerHTML,/鍍膜攻擊/);assert.match(app.innerHTML,/五行加成/);
  G.power=()=>({a:8,b:4,bonusA:0,bonusB:0,reasons:[]});
  click({action:'keep'});click({action:'next'});click({pick:d.team[1]});
  assert.doesNotMatch(app.innerHTML,new RegExp('is-chosen[^<]*data-pick="'+d.team[1]+'"'));
  assert.match(app.innerHTML,/hidden-fighter/);assert.equal(tosses,1);
});
test('lineup editor swaps coins, equips one face, reports missing films and persists',()=>{
  const {ctx,events,app,G}=setup(true);
  const click=dataset=>events.click({target:{closest:()=>({dataset,disabled:false})}});
  ctx.location.hash='#team';events.hashchange();
  let d=G.load(),a=d.team[0],b=d.team[1];
  assert.equal((app.innerHTML.match(/data-slot=/g)||[]).length,3);
  assert.match(app.innerHTML,/金圈＝正面/);assert.match(app.innerHTML,/銀圈＝反面/);
  click({slot:'1'});click({action:'chooseCoin'});click({assign:a});
  d=G.load();assert.equal(d.team[0],b);assert.equal(d.team[1],a);assert.equal(new Set(d.team).size,3);
  const oldBack=d.coins.find(c=>c.id===a).backCoatingId;
  const film=d.coins.find(c=>c.id===b).frontCoatingId;
  click({editSide:'front'});assert.match(app.innerHTML,/選擇正面鍍膜/);
  const beforeEquip=JSON.stringify(G.load());click({film});assert.equal(JSON.stringify(G.load()),beforeEquip);
  click({slot:'0'});click({editSide:'front'});click({action:'unequipFace'});click({slot:'1'});click({editSide:'front'});click({film});d=G.load();
  assert.equal(d.coins.find(c=>c.id===a).frontCoatingId,film);
  assert.equal(d.coins.find(c=>c.id===a).backCoatingId,oldBack);
  assert.equal(d.coins.find(c=>c.id===b).frontCoatingId,null);
  assert.match(app.innerHTML,/還有 1 個面未裝備鍍膜/);
  assert.match(app.innerHTML,/coin front core-金/);assert.match(app.innerHTML,/coin back core-水/);
  click({editSide:'back'});click({action:'unequipFace'});
  d=G.load();assert.equal(d.coins.find(c=>c.id===a).backCoatingId,null);
  click({action:'removeCoin'});d=G.load();assert.equal(d.team.length,2);assert.equal(d.coins.length,3);
  click({slot:'2'});assert.match(app.innerHTML,/選擇一枚硬幣/);click({assign:a});
  d=G.load();assert.equal(d.team.length,3);assert.equal(d.team[2],a);assert.equal(G.validData(d),true);
});

test('unreadable save is preserved until explicit replacement',()=>{
  const {G,memory}=setup();memory.set(G.config.storageKey,'broken save');const d=G.load();
  assert.equal(G.save(d),false);assert.equal(memory.get(G.config.storageKey),'broken save');
  assert.equal(G.save(d,true),true);assert.equal(JSON.stringify(G.load()),JSON.stringify(d));
});
test('removed save page falls back home and automatic saves survive reload',()=>{
  const {G,ctx,events,app}=setup(true);
  events.click({target:{closest:()=>({dataset:{draw:'1'}})}});
  const saved=G.load();assert.equal(saved.tokens,2900);
  ctx.location.hash='#save';events.hashchange();assert.equal(app.className,'page-home');
  assert.doesNotMatch(app.innerHTML,/save-file|saveNow|confirmImport|exportSave/);
  const reopened=setup(true,saved);assert.equal(JSON.stringify(reopened.G.load()),JSON.stringify(saved));
});
test('draw animation saves once before reveal and blocks duplicate draws and pool changes',()=>{
 const {G,ctx,events,app}=setup(true),callbacks=[];ctx.setTimeout=fn=>{callbacks.push(fn);return callbacks.length;};ctx.location.hash='#draw';events.hashchange();
 const click=dataset=>events.click({target:{closest:()=>({dataset,disabled:false})}});
 click({draw:'1'});assert.match(app.innerHTML,/draw-summoning/);assert.equal((app.innerHTML.match(/class="draw-falling-coin"/g)||[]).length,24);assert.doesNotMatch(app.innerHTML,/id="draw-results"/);
 const stored=JSON.stringify(G.load());assert.equal(G.load().coins.length,4);assert.equal(G.load().tokens,2900);
 click({draw:'10'});click({pool:'coatings'});assert.equal(JSON.stringify(G.load()),stored);callbacks.shift()();assert.match(app.innerHTML,/id="draw-results"/);
 click({action:'dismissDraw'});click({pool:'coatings'});click({draw:'10'});assert.equal(G.load().coatings.length,16);assert.equal(G.load().tokens,1900);callbacks.shift()();assert.match(app.innerHTML,/已存入收藏 · 10 件/);
});

test('100 adventure opponents are stable, legal, and ramp in difficulty',()=>{
 const {G}=setup();for(let stage=1;stage<=100;stage++){
  const n=G.adventure.npc(stage);assert.equal(JSON.stringify(n),JSON.stringify(G.adventure.npc(stage)));
  assert.equal(n.team.length,3);for(const c of n.team){assert.ok(c.front>=1&&c.back>=1&&c.front+c.back>=6&&c.front+c.back<=12);for(const f of Object.values(c.coatings))assert.ok(f.attack>=0&&f.attack<=5);}
 }
 assert.equal(G.adventure.npc(1).team[0].coatings.front.attack,0);assert.equal(G.adventure.npc(100).team[0].coatings.front.attack,5);
});
test('adventure unlocks, first-clear ranking and rewards persist without duplicate payout',()=>{
 const {G}=setup(),d=G.initialData(),A=G.adventure;
 assert.throws(()=>A.start(d,2));assert.equal(G.progression.rank(d).name,'青銅');
 const finish=(stage,winner)=>{const m=A.start(d,stage,()=>0);m.phase='finished';m.history=Array.from({length:3},()=>({score:winner==='player'?1:winner==='ai'?0:.5,result:{a:5,b:5}}));return m;};
 let m=finish(1,'ai'),before=d.tokens;A.settle(d,m);assert.equal(d.tokens,before);assert.equal(A.unlocked(d,2),false);
 m=finish(1,'tie');A.settle(d,m);assert.equal(G.progression.rank(d).points,0);assert.equal(A.unlocked(d,2),false);
 for(let stage=1;stage<=100;stage++){
  m=finish(stage,'player');const reward=A.settle(d,m);assert.equal(reward.points,0);const saved=d.tokens;assert.equal(A.settle(d,m),null);assert.equal(d.tokens,saved);
 }
 assert.equal(G.progression.rank(d).name,'青銅');assert.equal(G.progression.rank(d).points,0);assert.equal(A.unlocked(d,101),false);
 m=finish(1,'player');assert.equal(A.settle(d,m).points,0);assert.equal(m.adventureReward.tokens,20);
 assert.equal(G.validData(d),true);G.save(d);assert.equal(JSON.stringify(G.load().adventure),JSON.stringify(d.adventure));
 d.adventure.cleared=[2];assert.equal(G.validData(d),false);
});
test('adventure UI plays three rounds, settles once and returns to campaign',()=>{
 const {G,ctx,events,app}=setup(true);ctx.location.hash='#adventure';events.hashchange();assert.match(app.innerHTML,/冒險破關/);
 const click=dataset=>events.click({target:{closest:()=>({dataset,disabled:false})}});
 click({action:'challenge'});assert.equal(ctx.location.hash,'#battle');
 for(let i=0;i<100&&!app.innerHTML.includes('MATCH COMPLETE');i++){click({action:'toss'});click({action:'keep'});if(!app.innerHTML.includes('MATCH COMPLETE'))click({action:'next'});}
 assert.match(app.innerHTML,/返回冒險/);const p=G.load().adventure;assert.equal(p.wins+p.losses+p.draws,1);
 events.hashchange();assert.equal(G.load().adventure.wins+p.losses+p.draws,1);
});

test('early adventure rolls varied legal coins within each face cap',()=>{
 const {G}=setup();
 for(let chapter=0;chapter<2;chapter++){
  const configs=new Set(),totals=new Set(),cap=chapter===0?4:5;
  for(let stage=chapter*10+1;stage<=chapter*10+10;stage++){
   for(const c of G.adventure.npc(stage).team){
    assert.ok(c.front>=1&&c.front<=cap&&c.back>=1&&c.back<=cap);
    assert.ok(c.front+c.back>=6&&c.front+c.back<=(chapter===0?7:8));
    assert.equal(c.coatings.front.attack,0);assert.equal(c.coatings.back.attack,0);
    configs.add(c.front+'/'+c.back);totals.add(c.front+c.back);
   }
  }
  assert.ok(configs.size>=3);assert.ok(totals.size>=2);
 }
});

test('death match uses one coin and only allows a simultaneous flip after a tie',()=>{
 const {G}=setup(),data=G.initialData();data.team=[];
 const m=G.newDeathMatch(data,data.coins[0].id,()=>0);
 assert.equal(m.player.length,1);assert.equal(m.ai.length,1);assert.equal(m.playerInterference,false);assert.equal(m.aiInterference,false);
 assert.throws(()=>G.deathTieFlip(m));
 G.selectCoin(m,m.player[0].id,()=>0);assert.equal(m.current.aiWillFlip,false);
 assert.throws(()=>G.resolveRound(m,true));
 G.power=()=>({a:5,b:5,bonusA:0,bonusB:0,reasons:[]});G.resolveRound(m,false);
 assert.equal(m.phase,'deathTie');assert.equal(m.history.length,0);
 const before=[m.current.playerSide,m.current.aiSide];G.deathTieFlip(m);
 assert.equal(m.current.playerSide,G.otherSide(before[0]));assert.equal(m.current.aiSide,G.otherSide(before[1]));
 assert.equal(m.phase,'roundEnd');assert.equal(m.used.length,0);assert.equal(m.aiUsed.length,0);assert.throws(()=>G.deathTieFlip(m));
 G.prepareRound(m);G.selectCoin(m,m.player[0].id);G.power=()=>({a:9,b:1,bonusA:0,bonusB:0,reasons:[]});G.resolveRound(m,false);
 assert.equal(m.phase,'finished');assert.equal(m.history.length,1);assert.equal(G.summary(m).winner,'player');
});
test('death UI waits for confirmation of both coins before resolving; tie-only flip',()=>{
 const {G,ctx,events,app}=setup(true);ctx.location.hash='#death';events.hashchange();
 const click=dataset=>events.click({target:{closest:()=>({dataset,disabled:false})}});
 click({action:'startDeath'});G.power=()=>({a:5,b:5,bonusA:0,bonusB:0,reasons:[]});click({action:'toss'});
 assert.match(app.innerHTML,/確認結果/);assert.doesNotMatch(app.innerHTML,/MATCH COMPLETE|雙方翻面決勝/);assert.match(app.innerHTML,/duel-fighter ally/);assert.match(app.innerHTML,/duel-fighter enemy/);click({action:'deathConfirm'});assert.match(app.innerHTML,/雙方翻面決勝/);assert.doesNotMatch(app.innerHTML,/data-action="flip"/);
 G.power=()=>({a:7,b:4,bonusA:0,bonusB:0,reasons:[]});click({action:'deathFlip'});assert.doesNotMatch(app.innerHTML,/MATCH COMPLETE/);assert.match(app.innerHTML,/查看結算/);click({action:'deathResult'});assert.match(app.innerHTML,/MATCH COMPLETE/);
 assert.equal(G.load().adventure,undefined);
});
test('battle result coins include their face coating, while preparation stays at base damage',()=>{
 const {G:base}=setup(),saved=base.initialData();saved.coatings.forEach(c=>c.attack=3);
 for(const mode of ['standard','death']){
  const {ctx,events,app}=setup(true,saved),click=dataset=>events.click({target:{closest:()=>({dataset,disabled:false})}});
  ctx.location.hash=mode==='death'?'#death':'#battle';events.hashchange();click({action:mode==='death'?'startDeath':'start'});click({action:'toss'});
  function check(add){for(const part of app.innerHTML.matchAll(/<article class="duel-fighter (?:ally|enemy)">([\s\S]*?)<\/article>/g)){
   const html=part[1],value=Number(html.match(/<strong>(\d+)<\/strong>/)[1]),damage=Number(html.match(/基礎傷害<\/dt><dd>(\d+)/)[1]),coating=Number(html.match(/鍍膜攻擊[\s\S]*?<dd>\+(\d+)/)[1]);
   assert.equal(value,damage+(add?coating:0));
  }}
  check(false);click({action:mode==='death'?'deathConfirm':'keep'});check(true);
 }
});
test('squad revealed coin numbers include coating attack and preserve pre-boost tie values',()=>{
 const {G:base}=setup(),saved=base.initialData();saved.coins.forEach(c=>{c.front=3;c.back=3;});saved.coatings.forEach(c=>c.attack=2);
 const {G,ctx,events,app}=setup(true,saved),create=G.squad.create;
 G.squad.create=(data)=>{const m=create(data);m.ai.forEach(c=>{c.front=3;c.back=3;c.coatings.front.attack=c.coatings.back.attack=2;});return m;};
 G.power=()=>({a:5,b:5,bonusA:0,bonusB:0,reasons:[]});ctx.location.hash='#squad';events.hashchange();
 const click=dataset=>events.click({target:{closest:()=>({dataset,disabled:false})}});click({action:'squadStart'});click({action:'squadReveal'});
 const numbers=[...app.innerHTML.matchAll(/class="coin [^"]+"[^>]*><strong>(\d+)<\/strong>/g)].map(m=>Number(m[1]));assert.deepEqual(numbers,[5,5,5,5,5,5]);
 assert.equal(G.load().coins[0].front,3);
});

test('squad commits AI flip before player decision and resolves all three elemental pairs once',()=>{
 const {G}=setup(),m=G.squad.create(G.initialData(),()=>.2);
 G.squad.toss(m,()=>.8);const original=[...m.playerSides],enemy=[...m.aiSides],locked=m.aiFlip;
 const clone=JSON.parse(JSON.stringify(m));assert.throws(()=>G.squad.reveal(m,3));assert.equal(m.phase,'decide');
 const expectedPlayer=[...original];expectedPlayer[1]=G.otherSide(expectedPlayer[1]);const expectedAi=[...enemy];if(locked!==null)expectedAi[locked]=G.otherSide(expectedAi[locked]);
 const expected=m.player.map((c,i)=>G.power(G.face(c,expectedPlayer[i]),G.face(m.ai[i],expectedAi[i])));
 const result=G.squad.reveal(m,1);G.squad.reveal(clone,null);
 assert.equal(result.a,expected.filter(p=>p.a>p.b).length);assert.equal(result.b,expected.filter(p=>p.b>p.a).length);
 assert.equal(result.aiFlip,clone.result.aiFlip);assert.equal(result.aiFlip,locked);
 assert.deepEqual([...result.playerSides],expectedPlayer);assert.equal(result.pairs.length,3);assert.throws(()=>G.squad.reveal(m,2));
});
test('squad repeated ties add +1 then +2 to both faces without modifying collection or revealed snapshots',()=>{
 const {G}=setup(),data=G.initialData(),original=JSON.stringify(data),m=G.squad.create(data,()=>.2);
 const before=m.player[0].front,back=m.player[0].back,enemy=m.ai[0].front;
 G.power=()=>({a:5,b:5,bonusA:0,bonusB:0,reasons:[]});
 G.squad.toss(m,()=>0);G.squad.reveal(m,null,()=>0);
 assert.equal(m.phase,'tie');assert.equal(m.ties,1);assert.equal(m.player[0].front,before+1);assert.equal(m.player[0].back,back+1);assert.equal(m.ai[0].front,enemy+1);
 assert.equal(m.result.player[0].front,before);assert.equal(m.boost.amount,1);
 G.squad.toss(m,()=>0);G.squad.reveal(m,2,()=>0);
 assert.equal(m.player[0].front,before+3);assert.equal(m.player[0].back,back+3);assert.equal(m.boost.amount,2);assert.equal(m.history[0].player[0].front,before);
 assert.equal(JSON.stringify(data),original);assert.equal(G.validData(data),true);
 G.power=()=>({a:6,b:4,bonusA:0,bonusB:0,reasons:[]});G.squad.toss(m);G.squad.reveal(m);assert.equal(m.phase,'finished');assert.equal(m.winner,'player');assert.throws(()=>G.squad.toss(m));
});
test('squad UI shows own toss while hiding enemy until confirmation',()=>{
 const {G,ctx,events,app}=setup(true);ctx.location.hash='#squad';events.hashchange();
 const click=dataset=>events.click({target:{closest:()=>({dataset,disabled:false})}});
 click({action:'squadStart'});assert.match(app.innerHTML,/己方擲幣完成/);assert.equal((app.innerHTML.match(/squad-hidden/g)||[]).length,3);assert.equal((app.innerHTML.match(/目前戰力 [0-9]/g)||[]).length,3);
 click({squadPick:'0'});click({squadPick:'2'});assert.equal((app.innerHTML.match(/aria-pressed="true"/g)||[]).length,1);
 assert.match(app.innerHTML,/翻轉第 3 枚/);click({action:'squadCancel'});assert.match(app.innerHTML,/全部保持/);
 G.power=()=>({a:6,b:3,bonusA:0,bonusB:0,reasons:[]});click({action:'squadReveal'});assert.doesNotMatch(app.innerHTML,/勝利！/);assert.match(app.innerHTML,/查看結算/);click({action:'squadResult'});assert.match(app.innerHTML,/勝利！/);assert.doesNotMatch(app.innerHTML,/尚未公開/);assert.equal((app.innerHTML.match(/戰力 [0-9]/g)||[]).length,6);
});

test('death preparation uses shared battle cards and paginates all eligible coins',async()=>{
 const fixture=setup(),G=fixture.G,d=G.initialData();
 const extra=G.makeCoin('第四枚',2,4),front=G.makeCoating('火片','火'),back=G.makeCoating('水片','水');
 d.coins.push(extra);d.coatings.push(front,back);G.equip(d,extra.id,'front',front.id);G.equip(d,extra.id,'back',back.id);
 const {ctx,events,app}=setup(true,d);
 const click=dataset=>events.click({target:{closest:()=>({dataset,disabled:false})}});
 ctx.location.hash='#death';events.hashchange();assert.doesNotMatch(app.innerHTML,/<select/);
 assert.equal((app.innerHTML.match(/data-death-pick=/g)||[]).length,3);
 click({deathPick:d.coins[1].id});assert.match(app.innerHTML,/已選：硬幣B/);
 click({deathPage:'1'});assert.equal((app.innerHTML.match(/data-death-pick=/g)||[]).length,1);assert.match(app.innerHTML,/第四枚/);
 click({deathPick:extra.id});assert.match(app.innerHTML,/已選：第四枚/);click({action:'startDeath'});assert.match(app.innerHTML,/第四枚/);
});
test('squad AI uses own face gain and does not consult opponent toss',()=>{
 const {G}=setup(),m=G.squad.create(G.initialData(),()=>0);
 m.ai.forEach((c,i)=>{c.front=2;c.back=i===1?9:3;c.coatings.front.attack=0;c.coatings.back.attack=0;});
 G.squad.toss(m,()=>0);assert.equal(m.aiFlip,1);
 const clone=JSON.parse(JSON.stringify(m));clone.phase='ready';clone.player.forEach(c=>{c.front=99;c.back=1;});G.squad.toss(clone,()=>0);assert.equal(clone.aiFlip,1);
});

test('squad winner follows individual wins regardless of total power; tied wins replay',()=>{
 const {G}=setup();
 for(const [scores,expected,a,b] of [
  [[[9,8],[9,8],[1,10]],'player',2,1],
  [[[8,9],[8,9],[10,1]],'ai',1,2],
  [[[5,4],[5,4],[2,4]],'player',2,1],
  [[[10,1],[1,2],[3,3]],null,1,1],
  [[[3,3],[5,4],[2,2]],'player',1,0]
 ]){
  const m=G.squad.create(G.initialData(),()=>0);G.squad.toss(m,()=>0);let i=0;
  G.power=()=>{const [a,b]=scores[i++];return {a,b,bonusA:0,bonusB:0,reasons:[]};};
  const r=G.squad.reveal(m,null,()=>0);assert.equal(r.a,a);assert.equal(r.b,b);
  assert.equal(m.phase,expected?'finished':'tie');if(expected)assert.equal(m.winner,expected);else assert.equal(m.boost.amount,1);
 }
});
