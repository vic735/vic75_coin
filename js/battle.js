(function(G) {
  G.power = (a,b) => {
    let bonusA=0,bonusB=0; const reasons=[];
    if(G.config.counters[a.element]===b.element){bonusA+=2;reasons.push(`${a.element}剋${b.element}：我方 +2`);}
    if(G.config.counters[b.element]===a.element){bonusB+=2;reasons.push(`${b.element}剋${a.element}：對手 +2`);}
    if(G.config.generates[a.element]===b.element){bonusB+=1;reasons.push(`${a.element}生${b.element}：對手 +1`);}
    if(G.config.generates[b.element]===a.element){bonusA+=1;reasons.push(`${b.element}生${a.element}：我方 +1`);}
    return {a:a.damage+bonusA,b:b.damage+bonusB,bonusA,bonusB,reasons};
  };
  G.face = (coin,side) => ({baseDamage:coin[side],coatingAttack:coin.coatings[side].attack ?? 0,damage:coin[side]+(coin.coatings[side].attack ?? 0),element:coin.coatings[side].element});
  G.otherSide = side => side==='front'?'back':'front';
  G.newMatch = (data,random=Math.random,opponent=null,mode='standard') => {
    const count=mode==='death'?1:3;
    if(data.team.length!==count)throw Error('請先選擇'+count+'枚硬幣。');
    const player=data.team.map(id=>data.coins.find(c=>c.id===id));
    if(player.some(c=>!c || (!c.frontCoatingId || !c.backCoatingId)))throw Error('出戰的三枚硬幣正反兩面都必須裝備鍍膜。');
    const match={mode,roundsToWin:count,player:player.map(c=>({...c,coatings:{front:{...data.coatings.find(m=>m.id===c.frontCoatingId)},back:{...data.coatings.find(m=>m.id===c.backCoatingId)}}})),ai:opponent?JSON.parse(JSON.stringify(opponent)):Array.from({length:count},()=>({...G.rollCoin(random),coatings:{front:G.rollCoating(random),back:G.rollCoating(random)}})),used:[],aiUsed:[],playerInterference:mode!=='death',aiInterference:mode!=='death',history:[],ties:[],phase:'select'};
    G.prepareRound(match,random); return match;
  };
  G.prepareRound = (m,random=Math.random) => {
    const available=m.ai.filter(c=>!m.aiUsed.includes(c.id));
    m.aiChoice=available[Math.floor(random()*available.length)].id;
    m.phase='select';
  };
  G.selectCoin = (m,id,random=Math.random) => {
    if(m.phase!=='select' || m.used.includes(id))throw Error('這枚硬幣不能出戰');
    const coin=m.player.find(c=>c.id===id); if(!coin)throw Error('硬幣不在隊伍中');
    m.current={player:coin,ai:m.ai.find(c=>c.id===m.aiChoice),playerSide:random()<.5?'front':'back',aiSide:random()<.5?'front':'back'};
    const r=m.current, p=G.face(r.player,r.playerSide), ai=G.face(r.ai,r.aiSide), alt=G.face(r.ai,G.otherSide(r.aiSide));
    const now=G.power(p,ai), flipped=G.power(p,alt);
    // Commit before exposing the interference controls. No player decision is input here.
    r.aiWillFlip=m.aiInterference && flipped.b-flipped.a>now.b-now.a && (now.b<=now.a || m.history.length===2);
    m.used.push(id);m.aiUsed.push(m.aiChoice);m.phase='interfere'; return r;
  };
  G.resolveRound = (m,flip) => {
    if(m.phase!=='interfere' || (flip && (m.mode==='death'||!m.playerInterference)))throw Error('無法執行干涉');
    const r=m.current;
    r.playerFlipped=!!flip;r.aiFlipped=r.aiWillFlip;
    if(flip){r.playerSide=G.otherSide(r.playerSide);m.playerInterference=false;}
    if(r.aiWillFlip){r.aiSide=G.otherSide(r.aiSide);m.aiInterference=false;}
    r.result=G.power(G.face(r.player,r.playerSide),G.face(r.ai,r.aiSide));
    if(m.mode==='death'&&r.result.a===r.result.b&&!r.deathFlipped){
      r.tied=true;r.round=1;m.phase='deathTie';return r;
    }
    r.tied=r.result.a===r.result.b;
    r.round=m.history.length+1;
    if(r.tied){
      r.score=0;
      m.used=m.used.filter(id=>id!==r.player.id);
      m.aiUsed=m.aiUsed.filter(id=>id!==r.ai.id);
      m.ties.push(r);m.phase='roundEnd';return r;
    }
    r.score=r.result.a>r.result.b?1:0;
    m.history.push(r);m.phase=m.history.length===(m.roundsToWin||3)?'finished':'roundEnd';return r;
  };
  G.newDeathMatch=(data,id,random=Math.random)=>G.newMatch({...data,team:[id]},random,null,'death');
  G.deathTieFlip=m=>{
    if(m.mode!=='death'||m.phase!=='deathTie'||m.current.deathFlipped)throw Error('只有生死模式平手時可翻面一次');
    const r=m.current;r.deathFlipped=true;
    r.playerSide=G.otherSide(r.playerSide);r.aiSide=G.otherSide(r.aiSide);
    m.phase='interfere';return G.resolveRound(m,false);
  };
  G.summary = m => {
    const score=m.history.reduce((s,r)=>s+r.score,0), aiScore=m.history.length-score;
    const power=m.history.reduce((s,r)=>s+r.result.a,0),aiPower=m.history.reduce((s,r)=>s+r.result.b,0);
    return {score,aiScore,power,aiPower,winner:score!==aiScore?(score>aiScore?'player':'ai'):power!==aiPower?(power>aiPower?'player':'ai'):'tie'};
  };
})(CoinGame);
