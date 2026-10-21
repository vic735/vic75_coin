(function(G){
 const A=G.adventure,P=G.progression={winPoints:30,lossPoints:15,modes:A.modes};
 P.ranks=[{name:'青銅',points:0},{name:'白銀',points:150},{name:'黃金',points:450},{name:'白金',points:900},{name:'鑽石',points:1500},{name:'大師',points:2250},{name:'傳說',points:3000}];
 P.ensure=data=>{
  if(!data.ranked){
   data.ranked={};for(const mode of Object.keys(P.modes))data.ranked[mode]={points:0,wins:0,losses:0,draws:0};
  }
  return data.ranked;
 };
 P.rank=(data,mode='standard')=>{
  if(!Object.hasOwn(P.modes,mode))throw Error('找不到此玩法');
  const stats=P.ensure(data)[mode],index=P.ranks.findLastIndex(r=>stats.points>=r.points);
  return {...stats,...P.ranks[index],points:stats.points,index,next:P.ranks[index+1]||null};
 };
 P.start=(data,kind,mode,stage=1,coinId=null,random=Math.random)=>{
  P.ensure(data);
  if(kind==='adventure')return A.start(data,stage,random,mode,coinId);
  if(kind!=='ranked')throw Error('找不到此挑戰');
  const rank=P.rank(data,mode),chapter=Math.min(9,Math.floor(rank.index*9/6));
  const npc=A.npc(chapter*10+1+Math.floor(random()*10),mode),m=A.createMatch(data,mode,npc.team,random,coinId);
  m.journey={kind,mode};return m;
 };
 P.settle=(data,m)=>{
  if(!m||m.phase!=='finished')return null;
  if(m.adventureStage)return A.settle(data,m);
  if(m.journey?.kind!=='ranked'||m.rankReward)return null;
  const mode=m.journey.mode,stats=P.ensure(data)[mode],before=P.rank(data,mode),winner=['squad','flick'].includes(mode)?m.winner:G.summary(m).winner;
  if(winner==='player'){stats.wins++;stats.points+=P.winPoints;}else if(winner==='ai'){stats.losses++;stats.points=Math.max(0,stats.points-P.lossPoints);}else stats.draws++;
  const after=P.rank(data,mode);
  m.rankReward={kind:'ranked',points:stats.points-before.points,rank:after.name,promoted:after.index>before.index,demoted:after.index<before.index,mode};return m.rankReward;
 };
 P.rewardText=m=>{
  const r=m?.adventureReward||m?.rankReward;if(!r)return '';
  return r.kind==='adventure'?`${r.first?'首次通關 · ':''}代幣 +${r.tokens}`:`積分 ${r.points>=0?'+':''}${r.points} · ${r.promoted?'晉升 ':r.demoted?'降至 ':''}${r.rank}`;
 };
 P.returnLink=m=>m?.journey?`#${m.journey.kind}`:m?.adventureStage?'#adventure':'#home';
})(CoinGame);
