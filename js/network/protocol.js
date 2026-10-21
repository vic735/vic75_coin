(function(G){
  const N=G.network={protocolVersion:1,rulesVersion:'standard-3-decisive-coating-v1',gameVersion:'V0.1 / LAN 1.0',maxSignal:131072,maxMessage:32768};
  N.assert=(ok,message)=>{if(!ok)throw Error(message);};
  N.canonical=value=>{
    if(value===null||typeof value!=='object')return JSON.stringify(value);
    if(Array.isArray(value))return '['+value.map(N.canonical).join(',')+']';
    return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+N.canonical(value[k])).join(',')+'}';
  };
  N.hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  N.random=()=>N.hex(crypto.getRandomValues(new Uint8Array(16)));
  N.hash=async value=>N.hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(N.canonical(value)))));
  N.isId=v=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v);
  N.isHash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
  N.types=new Set(['HELLO','HELLO_ACK','DECK_LOCK','READY','ROUND_COMMIT','ROUND_REVEAL','FLIP_RESULT','INTERFERE_COMMIT','INTERFERE_REVEAL','ROUND_RESULT','MATCH_RESULT','STATE_SYNC','NEXT','PING','PONG','LEAVE','ERROR']);
  N.parseMessage=raw=>{
    N.assert(typeof raw==='string'&&raw.length<=N.maxMessage,'訊息格式錯誤或過大');
    const m=JSON.parse(raw);
    N.assert(m&&m.protocolVersion===N.protocolVersion,'連線協定不相容，請更新 PWA');
    N.assert(N.isId(m.sessionId)&&N.isId(m.messageId)&&['A','B'].includes(m.senderId)&&N.types.has(m.type)&&m.payload&&typeof m.payload==='object'&&!Array.isArray(m.payload),'不合法的連線訊息');
    return m;
  };
  N.deck=input=>{
    N.assert(Array.isArray(input)&&input.length===3,'編隊必須有三枚硬幣');
    const deck=input.map(c=>{
      N.assert(c&&typeof c.id==='string'&&c.id.length>0&&c.id.length<=100&&typeof c.name==='string'&&c.name.length<=60,'硬幣名稱或 ID 不合法');
      N.assert(Number.isInteger(c.front)&&Number.isInteger(c.back)&&c.front>=1&&c.back>=1&&c.front+c.back>=6&&c.front+c.back<=12,'硬幣傷害不合法');
      const coatings={};
      for(const side of ['front','back']){const f=c.coatings?.[side];N.assert(f&&Object.hasOwn(G.config.elementWeights,f.element)&&Number.isInteger(f.attack)&&f.attack>=0&&f.attack<=5,'鍍膜屬性或攻擊不合法');coatings[side]={element:f.element,attack:f.attack};}
      return {id:c.id,name:c.name,front:c.front,back:c.back,coatings};
    });
    N.assert(new Set(deck.map(c=>c.id)).size===3,'編隊不能重複使用同一枚硬幣');return deck;
  };
  N.snapshot=data=>N.deck(data.team.map(id=>{const c=data.coins.find(c=>c.id===id);return c&&{...c,coatings:Object.fromEntries(['front','back'].map(side=>[side,data.coatings.find(f=>f.id===c[side+'CoatingId'])]))};}));
})(CoinGame);
