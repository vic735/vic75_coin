(function(G,N){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let root=null,peer=null,session=null,role=null,signal='',status='idle',error='',busy=false,generation=0,animation=null,animationTimer,seenToss='',seenResult='';
  const labels={idle:'尚未連線',gathering:'正在建立邀請／回覆',offer:'等待對方回覆',answer:'請將回覆交給玩家 A',connecting:'正在連線',handshake:'通道已開啟，正在驗證版本',connected:'已連線',failed:'連線失敗',interrupted:'連線中斷',left:'對方已離開'};
  const UI=G.connectionUI={mount(el){root=el;render();},unmount(){N.qr?.close();root=null;},getSession:()=>session,getPeer:()=>peer};
  function dispose(){N.qr?.close();generation++;clearTimeout(animationTimer);session?.leave();peer?.close();peer=null;session=null;signal='';role=null;error='';status='idle';busy=false;animation=null;seenToss='';seenResult='';}
  function update(){if(session?.hello&&session?.ack&&!session.stopped){status='connected';signal='';N.qr?.close();}if(session?.stopped){status=session.error.startsWith('對方已離開')?'left':status==='failed'?'failed':'interrupted';error=session.error;}render();}
  function create(id,sid){
    peer=new N.Peer((state,message)=>{status=state;error=message||'';if(state==='failed'||state==='interrupted')session?.abort(error,false);render();},()=>{status='handshake';session.start();render();},raw=>session.receive(raw));
    session=new N.Session(sid,id,raw=>peer.send(raw),update,()=>peer?.close());
  }
  async function perform(fn){if(busy)return;busy=true;error='';render();const epoch=generation;try{await fn();}catch(e){if(epoch===generation){error=e.message;status='failed';peer?.close();}}finally{if(epoch===generation){busy=false;render();}}}
  const disc=(c,side,large=false,settled=false)=>{const f=G.face(c,side);return G.presentation.coin(settled?f.damage:f.baseDamage,side,f.element,large);};
  function roster(deck){return `<div class="net-roster">${deck.map(c=>`<div><span>${esc(c.name)}</span><div>${disc(c,'front')}${disc(c,'back')}</div><small>鍍膜 +${c.coatings.front.attack} / +${c.coatings.back.attack}</small></div>`).join('')}</div>`;}
  function pairing(){
    if(!role)return `<div class="net-intro"><h2>同一網路，好友對決</h2><p>雙方連上可互通的區域網路，以邀請與回覆配對。三局規則沿用普通模式。</p><button class="primary" data-net="host">建立房間 · 玩家 A</button><button data-net="join">加入房間 · 玩家 B</button><p class="hint">好友休閒模式 · 無帳號、無伺服器<br>部分 Wi-Fi 會阻擋裝置互連。</p><a href="#home">返回主選單</a></div>`;
    if(busy)return '<div class="net-intro"><p>正在收集完整 ICE 連線資料…</p><button data-net="reset">取消配對</button></div>';
    let body='';
    if(signal)body+=`<label>${role==='A'?'① 複製邀請交給玩家 B':'② 複製回覆交給玩家 A'}<textarea readonly id="net-output" spellcheck="false">${esc(signal)}</textarea></label><div class="net-buttons"><button data-net="copy">${role==='A'?'複製邀請':'複製回覆'}</button><button data-net="showQR">顯示 QR Code</button></div>`;
    if(role==='A'&&status==='offer'||role==='B'&&!signal&&status==='idle')body+=`<label>${role==='A'?'③ 貼上玩家 B 的回覆':'① 貼上玩家 A 的邀請'}<textarea id="net-input" maxlength="131072" spellcheck="false" placeholder="貼上完整 JSON 連線資料"></textarea></label><div class="net-buttons"><button data-net="paste">貼上</button><button data-net="scanQR">掃描 QR</button><button class="primary" data-net="${role==='A'?'accept':'answer'}">${role==='A'?'完成配對':'產生連線回覆'}</button></div>`;
    if(role==='B'&&signal&&status==='answer')body+='<button class="primary" data-net="wait">已交付回覆，等待連線</button>';
    return body+'<div class="net-buttons"><button data-net="reset">重新配對</button><button data-net="leave">取消配對</button></div>';
  }
  function lobby(){
    let deck;try{deck=N.snapshot(G.load());}catch{}
    return `<p class="net-success">連線成功，可以開始對戰。</p><p class="hint">${esc(N.gameVersion)}<br>規則 ${esc(N.rulesVersion)}</p><div class="net-players">${['A','B'].map((id,i)=>`<div><strong>玩家 ${id}${id===role?'（你）':''}</strong><span>${session.readyFlags[i]?'已準備 · 編隊鎖定':'尚未準備'}</span></div>`).join('')}</div>${deck?roster(session.decks[session.index]||deck):'<p>請先選入三枚硬幣，並為六個面裝備鍍膜。</p>'}<div class="net-buttons"><a class="button" href="#team">編隊與裝備</a><button class="primary" data-net="ready" ${!deck||session.readyFlags[session.index]?'disabled':''}>${session.readyFlags[session.index]?'等待對方準備':'鎖定編隊並準備'}</button></div><p class="hint">鎖定後修改收藏不會改變本場數值。</p><button data-net="leave">離開房間</button>`;
  }
  function battle(){
    const s=session,state=s.state,me=s.index,other=s.other,summary=N.summary(state),done=['roundEnd','matchVerify','finished'].includes(s.phase),phase=s.phase;
    const score=me===0?[summary.score,summary.aiScore]:[summary.aiScore,summary.score];
    let body=`<div class="net-score"><b>你 ${score[0]} : ${score[1]} 對手</b><span>第 ${Math.min(state.history.length+(done&&!state.last?.tied?0:1),3)} / 3 局</span></div><div class="net-score"><small>我方干涉 ${+state.interference[me]}</small><small>對方干涉 ${+state.interference[other]}</small></div>`;
    if(phase==='select'){
      const locked=!!s.stages.coin.commits[me];
      body+=`<p>${locked?'已鎖定，等待對方選擇':'點選一枚硬幣並鎖定出戰'}</p><div class="net-selection">${state.decks[me].map((c,i)=>`<button data-coin="${i}" ${locked||state.used[me].includes(c.id)?'disabled':''}><span>${esc(c.name)}</span><div>${disc(c,'front')}${disc(c,'back')}</div><small>${state.used[me].includes(c.id)?'已出戰':locked?'已鎖定':'選擇並鎖定'}</small></button>`).join('')}</div><p class="hint">雙方都承諾後才揭示；平手收回硬幣重戰。</p>`;
    }else if(s.toss){
      const picks=s.stages.coin.reveals.map(r=>r.choice),sides=done?[state.last.playerSide,state.last.aiSide]:s.toss.sides;
      const fighters=[me,other].map(i=>state.decks[i][picks[i]]),p=G.power(G.face(fighters[0],sides[me]),G.face(fighters[1],sides[other]));
      if(!done&&seenToss!==state.attempt){seenToss=state.attempt;animation={kind:'toss',until:Date.now()+850};scheduleAnimation();}
      if(done&&seenResult!==state.attempt){seenResult=state.attempt;if(state.last.playerFlipped||state.last.aiFlipped){animation={kind:'flip',until:Date.now()+620};scheduleAnimation();}}
      const tossing=animation?.kind==='toss'&&Date.now()<animation.until;
      body+=`<div class="net-duel">${[me,other].map((i,j)=>{const c=fighters[j],f=G.face(c,sides[i]);return `<article data-fighter="${i}"><h3>${j===0?'我方':'對手'} · ${esc(c.name)}</h3><div class="net-disc">${tossing?`<div class="toss-coin" style="--landing-angle:${sides[i]==='front'?1080:1260}deg">${disc(c,'front',true)}${disc(c,'back',true)}</div>`:disc(c,sides[i],true,done)}</div><small>${tossing?'擲幣中…':(sides[i]==='front'?'正面':'反面')+' · '+f.element}</small><div class="net-power">${tossing?'—':`${f.baseDamage} + ${f.coatingAttack} + ${j===0?p.bonusA:p.bonusB}`}</div><strong>${tossing?'—':j===0?p.a:p.b}</strong></article>`;}).join('')}</div>`;
      if(phase==='interfere')body+=`<p>${s.stages.interfere.commits[me]?'已鎖定決定，等待對方揭示':'同時秘密決定是否干涉'}</p><div class="net-buttons"><button data-net="flip" ${!state.interference[me]||s.stages.interfere.commits[me]||tossing?'disabled':''}>干涉翻面</button><button class="primary" data-net="keep" ${s.stages.interfere.commits[me]||tossing?'disabled':''}>保持原面</button></div>`;
      else if(done){
        const tied=state.last.tied,won=me===0?state.last.score===1:state.last.score===0;
        body+=`<p class="net-success">${tied?'平手 · 收回硬幣再戰':won?'本局勝利':'本局落敗'}</p>`;
        if(phase==='roundEnd')body+=`<button class="primary" data-net="next" ${s.nextFlags[me]||animation?'disabled':''}>${s.nextFlags[me]?'等待對方確認':tied?'確認結果 · 重新選幣':'確認結果 · 下一局'}</button>`;
        if(phase==='finished'){const wonMatch=me===0?summary.winner==='player':summary.winner==='ai';body+=`<strong class="net-match">${wonMatch?'對戰勝利':'對戰落敗'} · ${score[0]} : ${score[1]}</strong><button data-net="reset">重新配對</button>`;}
      }else body+='<p>雙方驗證資料中…</p>';
    }else body+='<p>正在共同驗證擲幣…</p>';
    return body+'<div class="net-buttons"><button data-net="table">相剋表</button><button data-net="leave">離開房間</button></div>';
  }
  function scheduleAnimation(){clearTimeout(animationTimer);animationTimer=setTimeout(()=>{animation=null;render();},Math.max(0,animation.until-Date.now()));}
  function render(){
    if(!root)return;
    let content=session?.stopped?`<p class="net-error">${esc(error)}</p><p>${session.completed?'本場結果已經雙方驗證。':'本場中斷，不判定勝負。'}收藏與單人進度保留。</p><button class="primary" data-net="reset">重新配對</button><a href="#home">返回主選單</a>`:session?.phase==='lobby'?lobby():session?.state?battle():pairing();
    root.innerHTML=`<section class="net-page"><header><h1>連線對戰</h1><span role="status">${esc(labels[status]||status)}</span></header>${error&&!session?.stopped?`<p class="net-error" role="alert">${esc(error)}</p>`:''}${content}</section>`;
    if(animation?.kind==='flip'&&session?.state?.last){const r=session.state.last;for(const [i,c,side,flipped] of [[0,r.player,r.playerSide,r.playerFlipped],[1,r.ai,r.aiSide,r.aiFlipped]])if(flipped)G.presentation.flipCoin(root.querySelector(`[data-fighter="${i}"] .net-disc>.coin`),c,G.otherSide(side),side,G.face(c,G.otherSide(side)).baseDamage,G.face(c,side).damage);}
    root.querySelectorAll('[data-net],[data-coin]').forEach(el=>el.onclick=event=>{event.stopPropagation();if(el.disabled)return;act(el);});
  }
  async function act(el){
    const action=el.dataset.net;
    if(el.dataset.coin!==undefined){session.choose('coin',Number(el.dataset.coin));return;}
    if(action==='reset'||action==='leave'){dispose();if(action==='leave')location.hash='#home';else render();return;}
    if(action==='join'){role='B';render();return;}
    if(action==='host'){role='A';status='gathering';await perform(async()=>{const sid=N.random();create('A',sid);const d=await peer.offer();signal=N.signaling.encode(sid,d);status='offer';});return;}
    if(action==='answer'||action==='accept'){
      const text=root.querySelector('#net-input')?.value||'';
      await perform(async()=>{if(action==='answer'){const x=N.signaling.decode(text,'offer');status='gathering';create('B',x.sessionId);signal=N.signaling.encode(x.sessionId,await peer.answer(x));status='answer';}else{const x=N.signaling.decode(text,'answer',session.sessionId);await peer.accept(x);}});return;
    }
    if(action==='showQR'){N.qr.open({raw:signal});return;}
    if(action==='scanQR'){N.qr.open({type:role==='A'?'answer':'offer',sessionId:role==='A'?session.sessionId:undefined,onRead:text=>{const input=root?.querySelector('#net-input');if(input)input.value=text;}});return;}
    if(action==='wait'){peer.connecting();render();return;}
    if(action==='copy'){try{await navigator.clipboard.writeText(signal);el.textContent='已複製';}catch{root.querySelector('#net-output')?.select();el.textContent='請長按選取後複製';}return;}
    if(action==='paste'){try{root.querySelector('#net-input').value=(await navigator.clipboard.readText()).slice(0,N.maxSignal);}catch{el.textContent='請長按輸入框貼上';root.querySelector('#net-input')?.focus();}return;}
    if(action==='ready'){session.ready(G.load());return;}
    if(action==='flip'||action==='keep'){session.choose('interfere',action==='flip');return;}
    if(action==='next'){session.next();return;}
    if(action==='table')G.help?.table();
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){peer?.check();session?.checkForeground();}});
  window.addEventListener('pagehide',()=>{if(session&&!session.stopped)session.leave();});
})(CoinGame,CoinGame.network);
