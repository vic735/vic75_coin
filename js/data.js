(function(G) {
  let serial = 0;
  G.id = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${++serial}-${Math.random().toString(36).slice(2)}`;
  G.makeCoin = (name, front, back) => ({id: G.id(), name, front, back, frontCoatingId: null, backCoatingId: null});
  G.makeCoating = (name, element, attack = 0) => ({id: G.id(), name, element, attack});
  G.initialData = () => {
    const coins = [G.makeCoin('硬幣A',3,3),G.makeCoin('硬幣B',1,10),G.makeCoin('硬幣C',5,7)];
    const coatings = ['火','水','金','木','土','土'].map(e=>G.makeCoating(e+'鍍膜',e));
    coins.forEach((c,i) => {c.frontCoatingId=coatings[i*2].id;c.backCoatingId=coatings[i*2+1].id;});
    return {version:2, tokens:G.config.initialTokens, coins, coatings, team:coins.map(c=>c.id)};
  };
  G.validData = d => {
    if (!d || d.version !== 2 || !Number.isSafeInteger(d.tokens) || d.tokens < 0 || !Array.isArray(d.coins) || !Array.isArray(d.coatings) || !Array.isArray(d.team)) return false;
    if(d.adventure!==undefined){
      const a=d.adventure;
      if(!a||!Array.isArray(a.cleared)||new Set(a.cleared).size!==a.cleared.length||!a.cleared.every(n=>Number.isInteger(n)&&n>=1&&n<=100&&(n===1||a.cleared.includes(n-1)))||!['wins','losses','draws'].every(k=>Number.isSafeInteger(a[k])&&a[k]>=0)||a.wins<a.cleared.length)return false;
    }
    const modes=['standard','death','squad','flick'];
    if(d.adventures!==undefined){
      if(!d.adventures||typeof d.adventures!=='object'||Array.isArray(d.adventures))return false;
      for(const [mode,a] of Object.entries(d.adventures)){
        if(!modes.slice(1).includes(mode)||!a||!Array.isArray(a.cleared)||new Set(a.cleared).size!==a.cleared.length||!a.cleared.every(n=>Number.isInteger(n)&&n>=1&&n<=100&&(n===1||a.cleared.includes(n-1)))||!['wins','losses','draws'].every(k=>Number.isSafeInteger(a[k])&&a[k]>=0)||a.wins<a.cleared.length)return false;
      }
    }
    if(d.ranked!==undefined){
      if(!d.ranked||typeof d.ranked!=='object'||Array.isArray(d.ranked)||Object.keys(d.ranked).length!==4)return false;
      if(!modes.every(mode=>{const r=d.ranked[mode];return r&&['points','wins','losses','draws'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0);}))return false;
    }
    const ids = [...d.coins,...d.coatings].map(x=>x.id);
    if (ids.some(id=>typeof id !== 'string') || new Set(ids).size !== ids.length) return false;
    const elements = Object.keys(G.config.elementWeights);
    if (!d.coatings.every(c=>typeof c.name==='string' && elements.includes(c.element) && Number.isInteger(c.attack) && c.attack>=0 && c.attack<=5)) return false;
    if (!d.coins.every(c=>typeof c.name==='string' && Number.isInteger(c.front) && Number.isInteger(c.back) && c.front>=1 && c.back>=1 && c.front+c.back>=6 && c.front+c.back<=12 && ['front','back'].every(side=>c[side+'CoatingId']===null || d.coatings.some(m=>m.id===c[side+'CoatingId'])))) return false;
    const equipped = d.coins.flatMap(c=>[c.frontCoatingId,c.backCoatingId]).filter(Boolean);
    return new Set(equipped).size===equipped.length && d.team.length<=3 && new Set(d.team).size===d.team.length && d.team.every(id=>d.coins.some(c=>c.id===id));
  };
  G.parseSave = raw => {
      const data=JSON.parse(raw);
      if(data?.version===1 && Array.isArray(data.coatings) && Array.isArray(data.coins)) {
        const pairs=new Map();
        data.coatings=data.coatings.flatMap(m=>{
          const front={id:m.id,name:m.name+' · 原正面',element:m.front,attack:m.attack===undefined?0:m.attack};
          const back={...front,id:G.id(),name:m.name+' · 原反面',element:m.back};
          pairs.set(m.id,[front.id,back.id]);return [front,back];
        });
        data.coins.forEach(c=>{const pair=c.coatingId===null?[null,null]:pairs.get(c.coatingId);if(!pair)throw Error('invalid equipment');[c.frontCoatingId,c.backCoatingId]=pair;delete c.coatingId;});
        data.version=2;
      }
      if (!G.validData(data)) throw Error('存檔格式或內容無效'); return data;
  };
  G.load = () => {
    try {const raw=localStorage.getItem(G.config.storageKey);return raw?G.parseSave(raw):G.initialData();}
    catch {G.storageBlocked=true;G.storageWarning='無法讀取原存檔，已暫用測試資料；為保護原檔，暫停自動寫入。';return G.initialData();}
  };
  G.save = (data,replace=false) => {
    if(G.storageBlocked&&!replace)return false;
    try {localStorage.setItem(G.config.storageKey,JSON.stringify(data));G.storageBlocked=false;G.storageWarning='';return true;}catch{return false;}
  };

  G.equip = (data, coinId, side, coatingId) => {
    const coin=data.coins.find(c=>c.id===coinId);
    if (!coin || !['front','back'].includes(side) || (coatingId && !data.coatings.some(c=>c.id===coatingId))) throw Error('無效裝備');
    if (coatingId) data.coins.forEach(c=> {for(const face of ['front','back'])if(c[face+'CoatingId']===coatingId)c[face+'CoatingId']=null;});
    coin[side+'CoatingId']=coatingId || null;
  };
})(CoinGame);
