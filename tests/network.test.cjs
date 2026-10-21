const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
function env(){const c=vm.createContext({console,crypto:webcrypto,TextEncoder,setInterval,clearInterval,Date,Math});c.window=c;for(const name of ['config','data','battle','network/protocol','network/signaling','network/commitReveal','network/multiplayer','network/session'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name+'.js'),'utf8'),c);return c.CoinGame;}
async function pair(){
 const G=env(),N=G.network,sid=N.random(),inbox=[],log=[];
 const A=new N.Session(sid,'A',raw=>{log.push(JSON.parse(raw));inbox.push([B,raw]);});
 const B=new N.Session(sid,'B',raw=>{log.push(JSON.parse(raw));inbox.push([A,raw]);});
 const pump=async()=>{for(let n=0;n<1000;n++){await A.queue;await B.queue;const item=inbox.shift();if(!item)return;await item[0].receive(item[1]);}throw Error('Protocol loop');};
 A.start();B.start();await pump();return {G,N,A,B,inbox,log,pump,close(){A.leave();B.leave();}};
}
test('canonical hash and random toss agree regardless of object key order',async()=>{const N=env().network;assert.equal(await N.hash({z:2,a:1}),await N.hash({a:1,z:2}));assert.match(N.random(),/^[a-f0-9]{32}$/);const r=[{choice:0,nonce:'a'.repeat(32)},{choice:1,nonce:'b'.repeat(32)}];const t=await N.toss('1'.repeat(32),1,r);const b=parseInt(t.hash.slice(0,2),16);assert.deepEqual([...t.sides],[b&1?'back':'front',b&2?'back':'front']);assert.notEqual(await N.commitment('1'.repeat(32),1,'coin','A',0,r[0].nonce),await N.commitment('1'.repeat(32),2,'coin','A',0,r[0].nonce));});
test('signaling rejects versions, types, huge text, missing ICE and wrong rooms',()=>{const N=env().network,sid='1'.repeat(32),d={type:'offer',sdp:'v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\na=ice-ufrag:test\r\na=ice-pwd:test\r\na=fingerprint:sha-256 AA\r\na=candidate:1 1 udp 1 127.0.0.1 9 typ host\r\n'};const raw=N.signaling.encode(sid,d);assert.equal(N.signaling.decode(raw,'offer').sessionId,sid);for(const text of ['null','{}','x'.repeat(131073),raw.replace('"protocolVersion":1','"protocolVersion":99'),raw.replace('a=candidate:','a=removed:')])assert.throws(()=>N.signaling.decode(text,'offer'));assert.throws(()=>N.signaling.decode(raw,'answer'));assert.throws(()=>N.signaling.decode(raw,'offer','2'.repeat(32)));});
test('deck validation and snapshot isolate collection mutations',()=>{const G=env(),N=G.network,d=G.initialData(),snap=N.snapshot(d);d.coins[0].front=99;assert.equal(snap[0].front,3);for(const mutate of [d=>d.pop(),d=>d[0].front=99,d=>d[0].back=0,d=>d[0].coatings.front.attack=6,d=>d[0].coatings.back.element='雷',d=>d[1].id=d[0].id]){const x=JSON.parse(JSON.stringify(snap));mutate(x);assert.throws(()=>N.deck(x));}});
test('two peers handshake, conceal choices, validate toss and finish three decisive rounds once',async()=>{
 const p=await pair(),{G,N,A,B,log,pump}=p;try{
 assert.equal(A.phase,'lobby');assert.equal(B.phase,'lobby');const a=G.initialData(),b=G.initialData(),original=JSON.stringify(a);
 await A.ready(a);await B.ready(b);await pump();assert.equal(A.phase,'select');a.coins[0].front=99;assert.equal(A.state.decks[0][0].front,3);
 for(let attempt=0;attempt<100&&A.phase!=='finished';attempt++){
  const picks=[A,B].map(s=>s.state.decks[s.index].findIndex(c=>!s.state.used[s.index].includes(c.id)));
  const offset=log.length;await A.choose('coin',picks[0]);await pump();const first=log.slice(offset).filter(m=>m.type.startsWith('ROUND_'));assert.deepEqual(first.map(m=>m.type),['ROUND_COMMIT']);assert.equal(first[0].payload.choice,undefined);assert.equal(first[0].payload.nonce,undefined);
  await B.choose('coin',picks[1]);await pump();assert.equal(A.phase,'interfere');assert.equal(N.canonical(A.toss),N.canonical(B.toss));
  const begin=log.length;await A.choose('interfere',A.state.interference[0]);await pump();assert.deepEqual(log.slice(begin).filter(m=>m.type.startsWith('INTERFERE')).map(m=>m.type),['INTERFERE_COMMIT']);
  await B.choose('interfere',B.state.interference[1]);await pump();assert.equal(A.stopped,false,A.error);assert.equal(B.stopped,false,B.error);assert.equal(await N.hash(A.state),await N.hash(B.state));
  const result=log.findLast(m=>m.type==='ROUND_RESULT'&&m.senderId==='B'),before=N.canonical(A.state);await A.receive(JSON.stringify(result));assert.equal(N.canonical(A.state),before);
  if(A.phase==='roundEnd'){await A.next();await B.next();await pump();}
 }
 assert.equal(A.phase,'finished');assert.equal(B.phase,'finished');assert.equal(A.state.history.length,3);assert.equal(new Set(A.state.used[0]).size,3);assert.equal(A.state.history.concat(A.state.ties).filter(r=>r.playerFlipped).length,1);assert.equal(G.initialData().coins[0].front,3);assert.equal(JSON.parse(original).coins[0].front,3);
 }finally{p.close();}
});
test('tampered reveal, invalid phase and disconnected peers stop without fabricated victory',async()=>{
 for(const kind of ['reveal','phase','disconnect']){const p=await pair();try{await p.A.ready(p.G.initialData());await p.B.ready(p.G.initialData());await p.pump();if(kind==='disconnect'){p.A.lastSeen=0;p.A.checkForeground();}else if(kind==='phase'){await p.A.receive(JSON.stringify({protocolVersion:1,sessionId:p.A.sessionId,messageId:p.N.random(),senderId:'B',type:'NEXT',payload:{attempt:1}}));}else{await p.A.choose('coin',0);await p.B.choose('coin',0);await p.A.queue;await p.B.queue;while(p.inbox.length){const [target,raw]=p.inbox.shift();const m=JSON.parse(raw);if(m.type==='ROUND_REVEAL'&&m.senderId==='B')m.payload.nonce='0'.repeat(32);await target.receive(JSON.stringify(m));}}assert.equal(p.A.phase,'interrupted');assert.equal(p.A.state.history.length,0);}finally{p.close();}}
});
test('incompatible handshake never opens the lobby',async()=>{
 const N=env().network,s=new N.Session(N.random(),'A',()=>{});
 await s.receive(JSON.stringify({protocolVersion:1,sessionId:s.sessionId,messageId:N.random(),senderId:'B',type:'HELLO',payload:{rulesVersion:'wrong',gameVersion:N.gameVersion}}));
 assert.equal(s.phase,'interrupted');assert.match(s.error,/版本不相容/);assert.equal(s.readyFlags.some(Boolean),false);
});
test('mismatched result hashes and reused interference interrupt the match',async()=>{
 const p=await pair();try{
  await p.A.ready(p.G.initialData());await p.B.ready(p.G.initialData());await p.pump();await p.A.choose('coin',0);await p.B.choose('coin',0);await p.pump();
  await p.A.choose('interfere',false);await p.B.choose('interfere',false);
  while(p.inbox.length){const [target,raw]=p.inbox.shift(),m=JSON.parse(raw);if(m.type==='ROUND_RESULT'&&m.senderId==='B')m.payload.hash='0'.repeat(64);await target.receive(JSON.stringify(m));}
  assert.equal(p.A.phase,'interrupted');assert.match(p.A.error,/雜湊不一致/);
  const state=p.N.initial([p.N.snapshot(p.G.initialData()),p.N.snapshot(p.G.initialData())]);state.interference[0]=false;
  assert.throws(()=>p.N.resolve(state,[0,0],['front','front'],[true,false]));state.used[0].push(state.decks[0][0].id);assert.throws(()=>p.N.resolve(state,[0,0],['front','front'],[false,false]));
 }finally{p.close();}
});

