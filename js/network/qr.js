(function(N){
  const Q=N.qr={},chunkSize=480,maxParts=384;
  // Bound output while reading so a compressed QR cannot expand without limit.
  async function transform(bytes,Stream){
    const reader=new Blob([bytes]).stream().pipeThrough(new Stream('gzip')).getReader();
    const chunks=[];let length=0;
    try{for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;N.assert(length<=N.maxSignal,'解壓資料超過大小限制');chunks.push(value);}}
    catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
    const result=new Uint8Array(length);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
  }
  Q.pack=async raw=>{
    const signal=JSON.parse(raw);N.signaling.decode(raw,signal.type);
    const bytes=new TextEncoder().encode(raw);N.assert(bytes.length<=N.maxSignal,'資料太大，請使用文字配對');
    let payload=bytes,compressed=false;
    if(typeof CompressionStream!=='undefined'&&typeof DecompressionStream!=='undefined'){
      try{const zipped=await transform(bytes,CompressionStream);if(zipped.length<bytes.length){payload=zipped;compressed=true;}}catch{/* Older browsers keep the original uncompressed QR format. */}
    }
    let binary='';for(const byte of payload)binary+=String.fromCharCode(byte);
    const size=compressed?720:chunkSize;
    const encoded=btoa(binary),total=Math.ceil(encoded.length/size),hash=await N.hash(raw);
    N.assert(total<=maxParts,'QR 分段過多，請使用文字配對');
    return Array.from({length:total},(_,index)=>JSON.stringify({qr:'coin-duel',version:compressed?2:1,...(compressed?{encoding:'gzip'}:{}),sessionId:signal.sessionId,type:signal.type,hash,total,index,data:encoded.slice(index*size,(index+1)*size)}));
  };
  Q.collector=(type,sessionId)=>{
    let meta=null,parts=new Map();
    return {async add(raw){
      N.assert(typeof raw==='string'&&raw.length<=1200,'不是有效的硬幣對決 QR');
      let p;try{p=JSON.parse(raw);}catch{throw Error('不是有效的硬幣對決 QR');}
      N.assert(p&&p.qr==='coin-duel'&&(p.version===1||(p.version===2&&p.encoding==='gzip'))&&N.isId(p.sessionId)&&N.isHash(p.hash)&&p.type===type&&(!sessionId||p.sessionId===sessionId),'QR 版本、房間或邀請／回覆類型不符');
      N.assert(p.version!==2||typeof DecompressionStream!=='undefined','此瀏覽器不支援壓縮 QR，請更新瀏覽器或改用文字配對');
      N.assert(Number.isInteger(p.total)&&p.total>=1&&p.total<=maxParts&&Number.isInteger(p.index)&&p.index>=0&&p.index<p.total&&typeof p.data==='string'&&p.data.length>0&&p.data.length<=(p.version===2?720:chunkSize)&&/^[A-Za-z0-9+/]*={0,2}$/.test(p.data),'QR 分段資料無效');
      const key=JSON.stringify([p.version,p.encoding,p.sessionId,p.type,p.hash,p.total]);N.assert(!meta||meta===key,'掃到另一組 QR；請先重設掃描');meta=key;
      N.assert(!parts.has(p.index)||parts.get(p.index)===p.data,'同一分段內容不一致');parts.set(p.index,p.data);
      if(parts.size<p.total)return {received:parts.size,total:p.total};
      const encoded=Array.from({length:p.total},(_,i)=>parts.get(i)).join('');N.assert(encoded.length<=Math.ceil(N.maxSignal/3)*4,'QR 資料超過大小限制');
      let result;try{const binary=atob(encoded);let bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));if(p.version===2)bytes=await transform(bytes,DecompressionStream);result=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw Error('QR 內容損壞或解壓超過限制，請重新掃描');}
      N.assert(await N.hash(result)===p.hash,'QR 完整性驗證失敗');N.signaling.decode(result,type,p.sessionId);
      return {received:parts.size,total:p.total,raw:result};
    }};
  };
  Q.draw=(canvas,text)=>{
    const code=qrcode(0,'M');code.addData(text,'Byte');code.make();
    const count=code.getModuleCount(),scale=4,pad=4;canvas.width=canvas.height=(count+pad*2)*scale;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#000';
    for(let y=0;y<count;y++)for(let x=0;x<count;x++)if(code.isDark(y,x))ctx.fillRect((x+pad)*scale,(y+pad)*scale,scale,scale);
  };
  Q.decode=canvas=>{const ctx=canvas.getContext('2d',{willReadFrequently:true}),pixels=ctx.getImageData(0,0,canvas.width,canvas.height);return jsQR(pixels.data,pixels.width,pixels.height,{inversionAttempts:'attemptBoth'})?.data||null;};
  let closeCurrent=null;
  Q.close=()=>closeCurrent?.();
  Q.open=async({raw,type,sessionId,onRead})=>{
    Q.close();
    const dialog=document.createElement('dialog');dialog.className='net-qr-dialog';
    dialog.innerHTML=`<div class="net-qr-title"><h2>${raw?'出示 QR Code':'掃描配對 QR'}</h2><button data-qr-close aria-label="關閉 QR">✕</button></div><div class="net-qr-body"></div><p class="net-qr-progress" role="status">準備中…</p>`;document.body.append(dialog);dialog.showModal();
    let alive=true,stream=null,timer=null,cameraEpoch=0,reading=false,collector=Q.collector(type,sessionId);
    const body=dialog.querySelector('.net-qr-body'),status=dialog.querySelector('.net-qr-progress');
    const stopCamera=()=>{cameraEpoch++;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());stream=null;const video=dialog.querySelector('video');if(video)video.srcObject=null;};
    const visibility=()=>{if(document.hidden&&!raw){stopCamera();if(alive)status.textContent='相機已暫停，回來後可重新開啟。';}};
    const cleanup=()=>{if(!alive)return;alive=false;stopCamera();document.removeEventListener('visibilitychange',visibility);dialog.remove();closeCurrent=null;};
    closeCurrent=()=>{dialog.close();cleanup();};dialog.onclose=cleanup;dialog.querySelector('[data-qr-close]').onclick=()=>Q.close();document.addEventListener('visibilitychange',visibility);
    try{
      if(raw){
        const frames=await Q.pack(raw);if(!alive)return;
        let index=0,auto=true;
        body.innerHTML='<canvas class="net-qr-code" aria-label="配對 QR Code"></canvas><div class="net-buttons"><button data-prev>上一張</button><button data-auto>暫停輪播</button><button data-next>下一張</button></div><button data-download>下載這張 QR</button>';
        const canvas=body.querySelector('canvas');
        const paint=()=>{Q.draw(canvas,frames[index]);status.textContent=frames.length===1?'掃描這一張即可取得完整連線資料':`第 ${index+1} / ${frames.length} 張 · 請對方掃齊所有分段`;};
        const tick=()=>{if(!alive)return;if(auto&&!document.hidden){index=(index+1)%frames.length;paint();}timer=setTimeout(tick,1600);};
        body.querySelector('[data-prev]').onclick=()=>{index=(index+frames.length-1)%frames.length;paint();};body.querySelector('[data-next]').onclick=()=>{index=(index+1)%frames.length;paint();};
        body.querySelector('[data-auto]').onclick=e=>{auto=!auto;e.target.textContent=auto?'暫停輪播':'繼續輪播';clearTimeout(timer);timer=setTimeout(tick,1600);};
        body.querySelector('[data-download]').onclick=()=>{const a=document.createElement('a');a.download=`coin-duel-${JSON.parse(raw).type}-${index+1}-of-${frames.length}.png`;a.href=canvas.toDataURL('image/png');a.click();};
        paint();if(frames.length===1)body.querySelector('.net-buttons').style.display='none';else timer=setTimeout(tick,1600);return;
      }
      body.innerHTML='<p>掃描對方的邀請／回覆。分段順序不限，重複掃描不會重複計算。</p><video autoplay muted playsinline></video><div class="net-buttons"><button data-camera>開啟相機</button><button data-image>匯入 QR 圖片</button></div><input type="file" accept="image/*" multiple hidden><button data-reset>重設收集進度</button>';
      status.textContent='可用相機掃描，或選取一張／多張 QR 圖片。';
      const work=document.createElement('canvas');
      const accept=async text=>{if(!alive||reading)return;reading=true;try{const r=await collector.add(text);if(!alive)return;status.textContent=`已收集 ${r.received} / ${r.total} 張`;if(r.raw){onRead(r.raw);Q.close();}}catch(e){if(alive)status.textContent=e.message;}finally{reading=false;}};
      const decode=async source=>{const w=source.videoWidth||source.naturalWidth||source.width,h=source.videoHeight||source.naturalHeight||source.height;if(!w||!h)return;const scale=Math.min(1,1280/Math.max(w,h));work.width=Math.round(w*scale);work.height=Math.round(h*scale);work.getContext('2d',{willReadFrequently:true}).drawImage(source,0,0,work.width,work.height);const text=Q.decode(work);if(text)await accept(text);else if(source.tagName!=='VIDEO')status.textContent='圖片中找不到 QR，請使用清楚且完整的圖片。';};
      body.querySelector('[data-camera]').onclick=async()=>{
        stopCamera();const epoch=cameraEpoch;
        try{N.assert(navigator.mediaDevices?.getUserMedia,'目前瀏覽器不能開啟相機，請改用 HTTPS 或匯入圖片');status.textContent='請允許相機權限…';const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false});if(!alive||epoch!==cameraEpoch){media.getTracks().forEach(t=>t.stop());return;}stream=media;const video=body.querySelector('video');video.srcObject=stream;await video.play();if(!alive||epoch!==cameraEpoch)return;status.textContent='請對準對方的 QR，等待所有分段收齊。';const scan=async()=>{if(!alive||epoch!==cameraEpoch)return;try{if(video.readyState>=2)await decode(video);}catch(e){if(alive)status.textContent=e.message;}if(alive&&epoch===cameraEpoch)timer=setTimeout(scan,220);};scan();}
        catch(e){if(alive&&epoch===cameraEpoch){stopCamera();status.textContent=e.name==='NotAllowedError'?'相機權限未允許，請改用匯入圖片或文字配對。':e.name==='NotFoundError'?'找不到相機，請改用匯入圖片。':e.message;}}
      };
      const input=body.querySelector('input');body.querySelector('[data-image]').onclick=()=>{stopCamera();input.click();};
      input.onchange=async()=>{for(const file of Array.from(input.files||[])){if(!alive)break;try{N.assert(file.size<=12*1024*1024,'圖片超過 12 MB，請縮小圖片');const url=URL.createObjectURL(file),img=new Image();try{img.src=url;await img.decode();N.assert(img.naturalWidth*img.naturalHeight<=40000000,'圖片尺寸過大');if(alive)await decode(img);}finally{URL.revokeObjectURL(url);}}catch(e){if(alive)status.textContent=e.message;}}input.value='';};
      body.querySelector('[data-reset]').onclick=()=>{collector=Q.collector(type,sessionId);status.textContent='收集進度已重設';};
    }catch(e){if(alive)status.textContent=e.message;}
  };
})(CoinGame.network);
