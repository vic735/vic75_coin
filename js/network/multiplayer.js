(function(G,N){
  // Adapter to the existing single-player reducer. No second damage formula.
  N.initial=decks=>({decks:decks.map(N.deck),used:[[],[]],interference:[true,true],history:[],ties:[],attempt:1,last:null});
  N.resolve=(state,picks,sides,flips)=>{
    const s=JSON.parse(JSON.stringify(state));
    for(let i=0;i<2;i++)N.assert(Number.isInteger(picks[i])&&picks[i]>=0&&picks[i]<3&&!s.used[i].includes(s.decks[i][picks[i]].id)&&typeof flips[i]==='boolean'&&(!flips[i]||s.interference[i]),'硬幣或干涉已使用');
    const m={mode:'standard',roundsToWin:3,phase:'interfere',playerInterference:s.interference[0],aiInterference:s.interference[1],used:[...s.used[0],s.decks[0][picks[0]].id],aiUsed:[...s.used[1],s.decks[1][picks[1]].id],history:s.history,ties:s.ties,current:{player:s.decks[0][picks[0]],ai:s.decks[1][picks[1]],playerSide:sides[0],aiSide:sides[1],aiWillFlip:flips[1]}};
    G.resolveRound(m,flips[0]);
    return {...s,used:[m.used,m.aiUsed],interference:[m.playerInterference,m.aiInterference],history:m.history,ties:m.ties,last:m.current};
  };
  N.summary=s=>G.summary({history:s.history});
})(CoinGame,CoinGame.network);
