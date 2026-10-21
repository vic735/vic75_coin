(function(G){
  const A=G.adventure={
    stageCount:100, chapterSize:10,
    // Per chapter: starting/ending base total, coating attack, maximum imbalance.
    difficulty:[
      {min:6,max:7,attack:0,faceCap:4}, {min:6,max:8,attack:0,faceCap:5},
      {min:7,max:8,attack:0,spread:1}, {min:8,max:9,attack:1,spread:1},
      {min:9,max:10,attack:1,spread:1}, {min:10,max:10,attack:2,spread:2},
      {min:10,max:11,attack:3,spread:2}, {min:11,max:12,attack:3,spread:2},
      {min:12,max:12,attack:4,spread:3}, {min:12,max:12,attack:5,spread:3}
    ]
  };
  A.modes={standard:'普通三局',death:'1V1 生死戰',squad:'3V3 齊擲',flick:'彈射對戰'};
  A.progress=(data,mode='standard')=>{
    if(!Object.hasOwn(A.modes,mode))throw Error('找不到此玩法');
    const target=mode==='standard'?data:(data.adventures||(data.adventures={})),key=mode==='standard'?'adventure':mode;
    return target[key]||(target[key]={cleared:[],wins:0,losses:0,draws:0});
  };
  A.unlocked=(data,stage,mode='standard')=>Number.isInteger(stage)&&stage>=1&&stage<=A.stageCount&&(stage===1||A.progress(data,mode).cleared.includes(stage-1));
  A.npc=(stage,mode='standard')=>{
    if(!Number.isInteger(stage)||stage<1||stage>A.stageCount)throw Error('找不到此關卡');
    const chapter=Math.floor((stage-1)/10),boss=stage%10===0;
    const elements=['金','木','水','火','土'],element=elements[chapter%5];
    const styles=['均衡','偏正面','偏反面'];
    const difficulty=A.difficulty[chapter];
    const total=difficulty.min+Math.round(((stage-1)%10)/9*(difficulty.max-difficulty.min));
    const style=chapter<2?0:stage%3;
    // Stable per NPC, so the preview and the actual encounter use the same roll.
    let seed=stage*7919+Math.max(0,Object.keys(A.modes).indexOf(mode))*104729;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const team=Array.from({length:3},(_,i)=>{
      const coinTotal=difficulty.faceCap?difficulty.min+Math.floor(random()*(difficulty.max-difficulty.min+1)):total;
      const middle=Math.floor(total/2),offset=Math.min(difficulty.spread,1+i);
      const low=Math.max(1,coinTotal-(difficulty.faceCap||11));
      const high=Math.min(difficulty.faceCap||11,coinTotal-1);
      const front=difficulty.faceCap?low+Math.floor(random()*(high-low+1)):style===0?middle:style===1?Math.ceil(total/2)+offset:middle-offset;
      const attack=difficulty.attack;
      return {id:`npc-${stage}-${i}`,name:`${element}系硬幣 ${i+1}`,front,back:coinTotal-front,
        coatings:{front:{element,attack},back:{element:elements[(chapter+i+1)%5],attack}}};
    });
    return {stage,chapter:chapter+1,boss,element,name:`${element}系${boss?'關主':'挑戰者'} ${String(stage).padStart(3,'0')}`,style:difficulty.faceCap?'多變配置':styles[style],team};
  };
  A.createMatch=(data,mode,team,random=Math.random,coinId)=>{
    if(mode==='death')return G.newMatch({...data,team:[coinId]},random,team.slice(0,1),'death');
    if(mode==='squad')return G.squad.create(data,random,team);
    if(mode==='flick')return G.flick.create(data,random,team);
    if(mode==='standard')return G.newMatch(data,random,team);
    throw Error('找不到此玩法');
  };
  A.start=(data,stage,random=Math.random,mode='standard',coinId)=>{
    if(!A.unlocked(data,stage,mode))throw Error('請先通過前一關');
    const npc=A.npc(stage,mode),match=A.createMatch(data,mode,npc.team,random,coinId);
    match.adventureStage=stage;match.journey={kind:'adventure',mode,stage};return match;
  };
  A.settle=(data,match)=>{
    if(!match.adventureStage||match.phase!=='finished'||match.adventureReward)return null;
    G.progression?.ensure(data);
    const mode=match.journey?.mode||'standard',p=A.progress(data,mode),stage=match.adventureStage,winner=['squad','flick'].includes(mode)?match.winner:G.summary(match).winner;
    const first=winner==='player'&&!p.cleared.includes(stage);
    if(winner==='player'){p.wins++;if(first)p.cleared.push(stage);}
    else if(winner==='ai')p.losses++;else p.draws++;
    const tokens=winner==='player'?(first?(stage%10===0?300:100):20):winner==='tie'?10:0;
    data.tokens+=tokens;
    match.adventureReward={kind:'adventure',tokens,points:0,first,stage,mode};
    return match.adventureReward;
  };
})(CoinGame);
