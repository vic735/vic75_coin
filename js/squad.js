(function(G){
  const S=G.squad={};
  S.create=(data,random=Math.random)=>{
    const base=G.newMatch(data,random);
    return {player:base.player,ai:base.ai,phase:'ready',ties:0,history:[],boost:null};
  };
  S.toss=(m,random=Math.random)=>{
    if(!['ready','tie'].includes(m.phase))throw Error('目前不能擲幣');
    m.playerSides=m.player.map(()=>random()<.5?'front':'back');
    m.aiSides=m.ai.map(()=>random()<.5?'front':'back');
    // Commit using only the AI's own visible toss, before the player decides.
    const gains=m.ai.map((coin,i)=>G.face(coin,G.otherSide(m.aiSides[i])).damage-G.face(coin,m.aiSides[i]).damage);
    const best=Math.max(...gains);m.aiFlip=best>0?gains.indexOf(best):null;
    m.phase='decide';
  };
  S.reveal=(m,flipIndex=null,random=Math.random)=>{
    if(m.phase!=='decide')throw Error('已公開結果，不能再次翻面');
    if(flipIndex!==null&&(!Number.isInteger(flipIndex)||flipIndex<0||flipIndex>2))throw Error('只能選擇一枚硬幣');
    if(flipIndex!==null)m.playerSides[flipIndex]=G.otherSide(m.playerSides[flipIndex]);
    if(m.aiFlip!==null)m.aiSides[m.aiFlip]=G.otherSide(m.aiSides[m.aiFlip]);
    const pairs=m.player.map((c,i)=>G.power(G.face(c,m.playerSides[i]),G.face(m.ai[i],m.aiSides[i])));
    const a=pairs.reduce((sum,p)=>sum+p.a,0),b=pairs.reduce((sum,p)=>sum+p.b,0);
    // Preserve the revealed values before a tie boosts the next toss.
    const result={pairs,a,b,playerFlip:flipIndex,aiFlip:m.aiFlip,
      player:JSON.parse(JSON.stringify(m.player)),ai:JSON.parse(JSON.stringify(m.ai)),
      playerSides:[...m.playerSides],aiSides:[...m.aiSides]};
    m.history.push(result);m.result=result;
    if(a===b){
      m.ties++;
      const playerIndex=Math.floor(random()*3),aiIndex=Math.floor(random()*3);
      for(const [team,index] of [[m.player,playerIndex],[m.ai,aiIndex]]){
        team[index].front+=m.ties;team[index].back+=m.ties;
      }
      m.boost={amount:m.ties,playerIndex,aiIndex};m.phase='tie';
    }else{m.phase='finished';m.winner=a>b?'player':'ai';}
    return result;
  };
})(CoinGame);
