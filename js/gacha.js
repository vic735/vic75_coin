(function(G) {
  G.weighted = (weights, random=Math.random) => {
    const entries=Object.entries(weights).filter(([,w])=>w>0);
    let value=random()*entries.reduce((sum,[,w])=>sum+w,0);
    for(const [key,w] of entries) {value-=w; if(value<0)return key;}
    return entries.at(-1)[0];
  };
  G.rollCoin = (random=Math.random) => {
    const total=Number(G.weighted(G.config.totalWeights,random));
    const front=1+Math.floor(random()*(total-1));
    return G.makeCoin(`硬幣 ${front}·${total-front}`,front,total-front);
  };
  G.rollCoating = (random=Math.random) => {
    const element=G.weighted(G.config.elementWeights,random);
    const attack=Number(G.weighted(G.config.coatingAttackWeights,random));
    return G.makeCoating(`${element}鍍膜`,element,attack);
  };
  G.draw = (data,pool,count,random=Math.random) => {
    if(!['coins','coatings'].includes(pool) || ![1,10].includes(count))throw Error('無效抽卡請求');
    if(data.tokens<count*G.config.drawCost)throw Error('測試代幣不足，請領取免費補給。');
    const results=Array.from({length:count},()=>pool==='coins'?G.rollCoin(random):G.rollCoating(random));
    data.tokens-=count*G.config.drawCost; data[pool].push(...results); return results;
  };
})(CoinGame);
