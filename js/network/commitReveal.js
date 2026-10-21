(function(N){
  N.commitment=(sessionId,attempt,stage,senderId,choice,nonce)=>N.hash(['coin-duel-commit',N.protocolVersion,N.rulesVersion,sessionId,attempt,stage,senderId,choice,nonce]);
  N.toss=async(sessionId,attempt,reveals)=>{
    const hash=await N.hash(['coin-duel-toss',N.protocolVersion,sessionId,attempt,['A',reveals[0].choice,reveals[0].nonce],['B',reveals[1].choice,reveals[1].nonce]]);
    const byte=parseInt(hash.slice(0,2),16);
    return {hash,sides:[byte&1?'back':'front',byte&2?'back':'front']};
  };
})(CoinGame.network);
