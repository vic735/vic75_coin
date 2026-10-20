(function(G){
  const F=G.flick,colors={金:'#e3d1a0',木:'#b5d0b2',水:'#b8d8e8',火:'#e7b5a7',土:'#cdb799'};
  let m=null,root=null,data=null,selected=null,opening=null,drag=null,raf=0,timer=0,observer=null,tossUntil=0;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const disc=(c,side=c.side)=>{const f=G.face(c.coin,side);return `<div class="coin ${side} core-${f.element}"><strong>${side===c.side?c.hp:f.damage}</strong></div>`;};
  const UI=G.flickUI={mount(el,d){root=el;data=d;render();},unmount(){cancelAnimationFrame(raf);clearTimeout(timer);observer?.disconnect();root=null;drag=null;},reset(){UI.unmount();m=null;selected=null;opening=null;},getMatch:()=>m};
  function render(){
    if(!root)return;cancelAnimationFrame(raf);clearTimeout(timer);observer?.disconnect();
    let body='';
    if(!m){body=`<div class="flick-intro"><div class="intro-seals">${G.presentation.seal('sun')}${G.presentation.seal('moon')}</div><h2>瞄準，彈射，擊破。</h2><p>三枚硬幣 · 五行碰撞 · 血量歸零退場</p><p>沿用編隊中的三枚硬幣與鍍膜。</p></div><button class="royal-primary" data-flick="start">開始擲幣</button><a class="flick-home" href="#team">調整出戰隊伍 ›</a>`;}
    else if(m.phase==='setup'){
      const tossing=Date.now()<tossUntil;
      body=`<div class="flick-hidden">對手已鎖定開場選擇 <b>？　？　？</b></div><section class="reserve-panel flick-opening"><h2>我方擲幣結果</h2><div class="reserve-grid">${F.alive(m,'player').map(c=>`<button class="reserve-card ${opening===c.id?'is-chosen':''}" data-opening="${c.id}" ${tossing?'disabled':''} aria-pressed="${opening===c.id}"><span>${escape(c.coin.name)}</span>${tossing?`<div class="flick-toss" style="--land:${c.side==='front'?1080:1260}deg">${disc(c,'front')}${disc(c,'back')}</div>`:disc(c)}<small>${tossing?'擲幣中…':G.face(c.coin,c.side).element+' · 血量 '+c.hp}</small><small>${tossing?'等待落定':'另一面 '+G.face(c.coin,G.otherSide(c.side)).damage}</small><b>${opening===c.id?'已選翻面':'點選翻面'}</b></button>`).join('')}</div></section><p class="flick-hint">可以翻轉一枚，再同時公開雙方。<br>開場機會不保留；正式對戰另有一次翻面。</p><button class="royal-primary" data-flick="begin" ${tossing?'disabled':''}>${opening?'翻轉選中硬幣':'全部保持'} · 進入戰場</button>`;
    }else{
      const a=F.stats(m,'player'),b=F.stats(m,'ai'),c=m.coins.find(c=>c.id===selected&&c.hp>0&&c.owner==='player');
      const turn=m.phase==='turn'&&m.actor==='player';
      body=`<div class="flick-scores"><span>我方 <b>${a.sum}</b> / ${a.count} 枚 <small>翻面 ${+m.flip.player}</small></span><span>對手 <b>${b.sum}</b> / ${b.count} 枚 <small>翻面 ${+m.flip.ai}</small></span></div><div class="flick-turn" role="status">${m.phase==='finished'?m.message:`第 ${m.round} 回合 · ${m.actor==='player'?'我方':'對手'}${m.phase==='moving'?'彈射中':'行動'}`}</div><div class="flick-arena"><canvas width="720" height="1040" aria-label="彈射戰場，拖曳己方藍色標記硬幣後放開"></canvas></div><p class="flick-hint" aria-live="polite">${m.message||''}<br>${m.phase==='finished'?'所有敵方硬幣退場即獲勝':turn?'往後拉、放開彈射；輕點硬幣可選擇翻面。':m.actor==='player'?'等待硬幣停止移動':'等待對手完成行動'}</p><div class="flick-actions">${m.phase==='finished'?'<button class="royal-primary" data-flick="restart">再來一場</button>':`<button data-flick="flip" ${turn&&c&&m.flip.player?'':'disabled'}>↻ ${c?`翻面 ${c.hp} → ${G.face(c.coin,G.otherSide(c.side)).damage}`:'點選硬幣後翻面'}${m.flip.player?'':'（已用完）'}</button>`}</div>`;
    }
    root.innerHTML=`<div class="round-ribbon flick-heading"><a href="#home" aria-label="返回首頁">←</a><h1>彈射對戰</h1><button data-flick="rules" aria-label="查看規則">?</button></div>${body}<p class="flick-error" role="alert"></p>`;
    root.querySelectorAll('[data-flick],[data-opening]').forEach(el=>el.onclick=e=>{e.stopPropagation();try{
      if(el.dataset.opening){opening=opening===el.dataset.opening?null:el.dataset.opening;render();return;}
      switch(el.dataset.flick){
        case 'start':m=F.create(data);opening=null;tossUntil=Date.now()+850;break;
        case 'begin':F.begin(m,opening);break;
        case 'flip':F.flip(m,selected);selected=null;break;
        case 'restart':m=null;selected=null;break;
        case 'rules':showRules();return;
      }render();
    }catch(error){root.querySelector('.flick-error').textContent=error.message;}});
    if(m?.phase==='setup'&&Date.now()<tossUntil)timer=setTimeout(render,tossUntil-Date.now()+20);
    const canvas=root.querySelector('canvas');if(canvas){
      const fit=()=>{const box=canvas.parentElement,w=Math.max(1,Math.min(box.clientWidth,box.clientHeight*360/520));canvas.style.width=w+'px';canvas.style.height=w*520/360+'px';draw();};
      observer=new ResizeObserver(fit);observer.observe(canvas.parentElement);fit();bind(canvas);
      if(m.phase==='moving')animate();else if(m.phase==='turn'&&m.actor==='ai')timer=setTimeout(()=>{if(!root)return;F.aiAct(m);render();},650);
    }
  }
  function showRules(){
    const dialog=document.createElement('dialog');dialog.className='flick-rules';dialog.innerHTML=`<h2>彈射對戰規則</h2><p>每回合雙方各行動一次，不重擲。總血量小者先攻；相同則依序比較硬幣較少、血量差距較小，完全相同隨機。</p><p>往後拖曳己方硬幣，放開向反方向彈射。牆壁會反彈，友軍碰撞不扣血。只有射出的硬幣能造成傷害，每次彈射對同一敵幣最多傷害一次。</p><p>一般命中 −1；打向生出自己的屬性 −2；剋制對手 −3。例：水打金 −2、水打火 −3。</p><p>開場秘密翻面一次；正式對戰再翻面一次，取代該次彈射。翻面血量直接改成另一面完整數字（含鍍膜攻擊），不保留傷勢。血量歸零退場。</p><p>藍點是我方，紅點是對手；金圈正面、紫圈反面。內色：金黃、木綠、水藍、火紅、土棕。</p><button>知道了</button>`;document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();dialog.showModal();
  }
  function bind(canvas){
    const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*360/r.width,y:(e.clientY-r.top)*520/r.height};};
    canvas.onpointerdown=e=>{if(m.phase!=='turn'||m.actor!=='player'||drag)return;const p=point(e),c=F.alive(m,'player').find(c=>Math.hypot(p.x-c.x,p.y-c.y)<Math.max(F.radius+6,22*360/canvas.getBoundingClientRect().width));if(!c)return;e.preventDefault();selected=c.id;drag={id:c.id,start:{x:c.x,y:c.y},end:p,pointer:e.pointerId};canvas.setPointerCapture(e.pointerId);draw();};
    canvas.onpointermove=e=>{if(drag&&drag.pointer===e.pointerId){drag.end=point(e);draw();}};
    canvas.onpointerup=e=>{if(!drag||drag.pointer!==e.pointerId)return;const d=drag,p=point(e);drag=null;const vx=(d.start.x-p.x)*6,vy=(d.start.y-p.y)*6;if(Math.hypot(vx,vy)>=60)F.shoot(m,d.id,vx,vy);render();};
    canvas.onpointercancel=canvas.onlostpointercapture=()=>{if(drag){drag=null;render();}};
  }
  function animate(){let last=performance.now();const frame=now=>{if(!root)return;F.step(m,Math.min((now-last)/1000,.05));last=now;draw();if(m.phase==='moving')raf=requestAnimationFrame(frame);else render();};raf=requestAnimationFrame(frame);}
  function draw(){
    const canvas=root?.querySelector('canvas');if(!canvas)return;const ctx=canvas.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,360,520);ctx.fillStyle='#f9f7f1';ctx.fillRect(0,0,360,520);ctx.strokeStyle='#bdc6c6';ctx.lineWidth=2;ctx.strokeRect(2,2,356,516);ctx.setLineDash([5,8]);ctx.beginPath();ctx.moveTo(0,260);ctx.lineTo(360,260);ctx.stroke();ctx.setLineDash([]);
    ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillStyle='#9e7474';ctx.fillText('對手',180,22);ctx.fillStyle='#607c91';ctx.fillText('我方',180,508);
    for(const c of m.coins.filter(c=>c.hp>0)){
      const rim=c.side==='front'?'#98702f':'#675180';ctx.beginPath();ctx.arc(c.x,c.y,F.radius,0,Math.PI*2);ctx.fillStyle=colors[G.face(c.coin,c.side).element]||'#ddd';ctx.fill();ctx.lineWidth=4;ctx.strokeStyle=rim;ctx.stroke();
      if(c.id===selected){ctx.beginPath();ctx.arc(c.x,c.y,F.radius+6,0,Math.PI*2);ctx.lineWidth=2;ctx.strokeStyle='#526f83';ctx.stroke();}
      ctx.fillStyle=rim;ctx.font='bold 19px system-ui';ctx.textBaseline='middle';ctx.fillText(c.hp,c.x,c.y+1);ctx.textBaseline='alphabetic';ctx.beginPath();ctx.arc(c.x,c.y+F.radius+7,3,0,Math.PI*2);ctx.fillStyle=c.owner==='player'?'#477eab':'#b34f58';ctx.fill();
    }
    if(drag){const a=drag.start,dx=a.x-drag.end.x,dy=a.y-drag.end.y,len=Math.hypot(dx,dy),k=Math.min(1,140/Math.max(len,1)),x=a.x+dx*k,y=a.y+dy*k,angle=Math.atan2(dy,dx);ctx.strokeStyle='#35596e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(x,y);ctx.lineTo(x-10*Math.cos(angle-.5),y-10*Math.sin(angle-.5));ctx.moveTo(x,y);ctx.lineTo(x-10*Math.cos(angle+.5),y-10*Math.sin(angle+.5));ctx.stroke();}
  }
})(CoinGame);
