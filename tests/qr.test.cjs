const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function env(compression=false){const c=vm.createContext({...(compression?{CompressionStream,DecompressionStream,Blob}:{}),crypto:require('node:crypto').webcrypto,TextEncoder,TextDecoder,btoa,atob,qrcode:require('../js/vendor/qrcode.js'),jsQR:require('../js/vendor/jsQR.js')});c.window=c;for(const name of ['config','network/protocol','network/signaling','network/qr'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name+'.js'),'utf8'),c);return c.CoinGame.network;}
function signal(N,type='offer',sid='1'.repeat(32)){return N.signaling.encode(sid,{type,sdp:'v=0\r\ns=硬幣對決\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\na=ice-ufrag:test\r\na=ice-pwd:test\r\na=fingerprint:sha-256 AA\r\n'+Array.from({length:12},(_,i)=>`a=candidate:${i} 1 udp 123 192.168.1.5 ${50000+i} typ host\r\n`).join('')});}
test('multipart QR collects out of order, ignores duplicates and only returns complete verified SDP',async()=>{const N=env(),raw=signal(N),frames=await N.qr.pack(raw),collector=N.qr.collector('offer');assert.ok(frames.length>1);let r=await collector.add(frames.at(-1));assert.equal(r.received,1);r=await collector.add(frames.at(-1));assert.equal(r.received,1);assert.equal(r.raw,undefined);for(const frame of frames.slice(0,-1).reverse())r=await collector.add(frame);assert.equal(r.raw,raw);});
test('QR rejects wrong role/session, mixed groups, excessive size and tampering',async()=>{const N=env(),frames=await N.qr.pack(signal(N));await assert.rejects(N.qr.collector('answer').add(frames[0]));await assert.rejects(N.qr.collector('offer','2'.repeat(32)).add(frames[0]));const c=N.qr.collector('offer');await c.add(frames[0]);const other=await N.qr.pack(signal(N,'offer','2'.repeat(32)));await assert.rejects(c.add(other[1]));const oversized=JSON.parse(frames[0]);oversized.total=9999;await assert.rejects(N.qr.collector('offer').add(JSON.stringify(oversized)));const broken=N.qr.collector('offer');await assert.rejects(async()=>{for(const f of frames){const p=JSON.parse(f);p.hash='0'.repeat(64);await broken.add(JSON.stringify(p));}});});
test('actual QR generator pixels decode using bundled jsQR',async()=>{
 const N=env(true),frames=await N.qr.pack(signal(N));const collector=N.qr.collector('offer');let last;
 for(const frame of frames){let data;const canvas={width:0,height:0,getContext(){return ctx;}};const ctx={fillStyle:'#fff',fillRect(x,y,w,h){if(!data)data=new Uint8ClampedArray(canvas.width*canvas.height*4).fill(255);const color=this.fillStyle==='#000'?0:255;for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=(yy*canvas.width+xx)*4;data[i]=data[i+1]=data[i+2]=color;}},getImageData(){return {data,width:canvas.width,height:canvas.height};}};N.qr.draw(canvas,frame);const decoded=N.qr.decode(canvas);assert.equal(decoded,frame);last=await collector.add(decoded);}
 assert.equal(last.raw,signal(N));
});
test('gzip QR reduces frames, restores exact SDP and accepts legacy uncompressed QR',async()=>{
 const legacy=env(),N=env(true),raw=signal(N),old=await legacy.qr.pack(raw),packed=await N.qr.pack(raw);
 assert.ok(packed.length<old.length);assert.equal(JSON.parse(packed[0]).version,2);
 for(const frames of [packed,old]){const c=N.qr.collector('offer');let result;for(const f of frames.slice().reverse())result=await c.add(f);assert.equal(result.raw,raw);}
 await assert.rejects(legacy.qr.collector('offer').add(packed[0]),/不支援壓縮/);
});
test('compressed QR rejects truncated gzip and excessive decompressed output',async()=>{
 const N=env(true),frames=await N.qr.pack(signal(N));const p=JSON.parse(frames[0]);
 p.total=1;p.index=0;p.data=Buffer.from('broken gzip').toString('base64');await assert.rejects(N.qr.collector('offer').add(JSON.stringify(p)),/損壞/);
 p.data=require('node:zlib').gzipSync(Buffer.alloc(N.maxSignal+1,65)).toString('base64');assert.ok(p.data.length<=480);await assert.rejects(N.qr.collector('offer').add(JSON.stringify(p)),/解壓超過限制/);
});

