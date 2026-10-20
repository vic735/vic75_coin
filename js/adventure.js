(function(G){
  const A=G.adventure={
    stageCount:100, chapterSize:10, firstClearPoints:30,
    // Per chapter: starting/ending base total, coating attack, maximum imbalance.
    difficulty:[
      {min:6,max:7,attack:0,faceCap:4}, {min:6,max:8,attack:0,faceCap:5},
      {min:7,max:8,attack:0,spread:1}, {min:8,max:9,attack:1,spread:1},
      {min:9,max:10,attack:1,spread:1}, {min:10,max:10,attack:2,spread:2},
      {min:10,max:11,attack:3,spread:2}, {min:11,max:12,attack:3,spread:2},
      {min:12,max:12,attack:4,spread:3}, {min:12,max:12,attack:5,spread:3}
    ],
    ranks:[
      {name:'青銅',points:0},{name:'白銀',points:150},{name:'黃金',points:450},
      {name:'白金',points:900},{name:'鑽石',points:1500},
      {name:'大師',points:2250},{name:'傳說',points:3000}
    ]
  };
  A.progress=data=>data.adventure||(data.adventure={cleared:[],wins:0,losses:0,draws:0});
  A.rank=data=>{
    const points=A.progress(data).cleared.length*A.firstClearPoints;
    const index=A.ranks.findLastIndex(r=>points>=r.points);
    return {...A.ranks[index],points,next:A.ranks[index+1]||null};
  };
  A.unlocked=(data,stage)=>Number.isInteger(stage)&&stage>=1&&stage<=A.stageCount&&(stage===1||A.progress(data).cleared.includes(stage-1));
  A.npc=stage=>{
    if(!Number.isInteger(stage)||stage<1||stage>A.stageCount)throw Error('找不到此關卡');
    const chapter=Math.floor((stage-1)/10),boss=stage%10===0;
    const elements=['金','木','水','火','土'],element=elements[chapter%5];
    const styles=['均衡','偏正面','偏反面'];
    const difficulty=A.difficulty[chapter];
    const total=difficulty.min+Math.round(((stage-1)%10)/9*(difficulty.max-difficulty.min));
    const style=chapter<2?0:stage%3;
    // Stable per NPC, so the preview and the actual encounter use the same roll.
    let seed=stage*7919;
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
  A.start=(data,stage,random=Math.random)=>{
    if(!A.unlocked(data,stage))throw Error('請先通過前一關');
    const npc=A.npc(stage),match=G.newMatch(data,random,npc.team);
    match.adventureStage=stage;return match;
  };
  A.settle=(data,match)=>{
    if(!match.adventureStage||match.phase!=='finished'||match.adventureReward)return null;
    const p=A.progress(data),stage=match.adventureStage,winner=G.summary(match).winner;
    const first=winner==='player'&&!p.cleared.includes(stage),before=A.rank(data).name;
    if(winner==='player'){p.wins++;if(first)p.cleared.push(stage);}
    else if(winner==='ai')p.losses++;else p.draws++;
    const tokens=winner==='player'?(first?(stage%10===0?300:100):20):winner==='tie'?10:0;
    data.tokens+=tokens;
    match.adventureReward={tokens,points:first?A.firstClearPoints:0,first,rank:A.rank(data).name,promoted:before!==A.rank(data).name};
    return match.adventureReward;
  };
})(CoinGame);
