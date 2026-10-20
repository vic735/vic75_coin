(function(G) {
  let data=G.load();
  const app=document.querySelector('#app');
  let match=null, pool='coins', results=[], animating=false, timer;
  let selectedSlot=0, editingSide=null, choosingCoin=false, pendingCoinId=null, battleInfo=null, inspection=null, importedSave=null, saveStatus='';
  const {icon,seal}=G.presentation;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tag=e=>`<span class="element element-${e}">${e}</span>`;
  const toast=message=>{const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>el.classList.remove('show'),3500);};
  const save=()=>{const ok=G.save(data);saveStatus=ok?'已自動儲存於此瀏覽器':'本機儲存失敗，請匯出備份';if(!ok)toast(G.storageWarning||saveStatus);return ok;};
  const heading=(eyebrow,title,description)=>`<div class="page-heading"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${description}</p></div>`;
  function disc(value,side,element,large=false){return `<div class="coin ${side} core-${element || 'none'} ${large?'large':''}"><strong>${value}</strong></div>`;}
  const coatingFor=(c,side)=>c.coatings?.[side] || data.coatings.find(m=>m.id===c[side+'CoatingId']);
  const fullyEquipped=c=>c && c.frontCoatingId && c.backCoatingId;
  const sideName=side=>side==='front'?'正面':'反面';
  function ownerOf(id){for(const c of data.coins)for(const side of ['front','back'])if(c[side+'CoatingId']===id)return `${c.name} · ${sideName(side)}`;return '';}
  function coinCard(c,controls=''){
    const front=coatingFor(c,'front'),back=coatingFor(c,'back');
    return `<article class="card"><div class="card-top"><h3>${esc(c.name)}</h3><span class="muted">Σ ${c.front+c.back}</span></div><div class="coin-pair">${disc(c.front,'front',front?.element)}${disc(c.back,'back',back?.element)}</div><div class="card-foot">${['front','back'].map(side=>{const m=coatingFor(c,side);return `<div>${sideName(side)}：${m?tag(m.element)+' 攻擊 +'+m.attack:'未裝備'}</div>`;}).join('')}</div>${controls}</article>`;
  }
  function coatingCard(m){const owner=ownerOf(m.id);return `<article class="card coating-card"><div class="coating-symbol">◈</div><h3>${esc(m.name)}</h3><p class="coating-attack">攻擊 +${m.attack}<small>僅裝備面生效</small></p><div class="coating-faces">${tag(m.element)} 單面鍍膜</div><p class="muted">${owner?'裝備於 '+esc(owner):'可裝備於任一面'}</p></article>`;}
  function home(){
    const active=match && match.phase!=='finished';
    const equipped=data.team.filter(id=>fullyEquipped(data.coins.find(c=>c.id===id))).length;
    return `<section class="royal-hero"><div class="hero-heading"><h1><span>硬幣</span><em>對決</em></h1><p>三枚硬幣 · 三局對決 · 一次干涉</p></div><div class="royal-coins" aria-hidden="true"><div class="pedestal"></div>${seal('sun')}${seal('moon')}</div><a href="#battle" class="button royal-primary hero-battle">${icon('swords')}${active?'繼續對戰':'對戰'}${icon('arrow')}</a><p class="hero-note">${active?'返回進行中的對局':'與 AI 進行三局對戰'}</p></section><div class="royal-shortcuts"><a href="#draw">${icon('cards')}抽卡</a><a href="#coins">${icon('coin')}收藏</a><a href="#team">${icon('team')}編隊</a><a href="#coatings">${icon('film')}鍍膜</a><button data-action="refill">${icon('gift')}補給</button></div><a class="home-ready" href="#team"><span>出戰準備 <strong>${equipped} / 3</strong></span><span>${equipped===3?'隊伍已就緒':'完成硬幣與鍍膜配置'} ›</span></a>`;
  }
  function collectionTile(item){
    const isCoin=typeof item.front==='number';
    const front=isCoin?coatingFor(item,'front'):null,back=isCoin?coatingFor(item,'back'):null;
    return `<button class="collection-tile" data-inspect="${esc(item.id)}" aria-label="查看${esc(item.name)}詳情">${isCoin?disc(item.front,'front',front?.element):`<span class="film-disc core-${item.element}">${item.element}</span>`}<strong>${isCoin?item.front+' / '+item.back:'攻擊 +'+item.attack}</strong><small>${isCoin?'總和 '+(item.front+item.back):'單面鍍膜'}</small><span class="tile-elements">${isCoin?(front?tag(front.element):'—')+' / '+(back?tag(back.element):'—'):tag(item.element)}</span></button>`;
  }
  function inventoryDetail(){
    const item=[...data.coins,...data.coatings].find(i=>i.id===inspection);if(!item)return '';
    return `<div class="battle-info-backdrop"><section class="battle-info" role="dialog" aria-modal="true" aria-labelledby="item-title"><div class="info-title"><h2 id="item-title">${typeof item.front==='number'?'硬幣詳情':'鍍膜詳情'}</h2><button class="info-close" data-action="closeInspection" aria-label="關閉詳情">✕</button></div><div class="info-content">${typeof item.front==='number'?coinCard(item):coatingCard(item)}<a class="button primary detail-equip" href="#team">前往編隊裝備</a></div></section></div>`;
  }
  function drawPage(){if(results.length)return `<div class="draw-result-heading"><h1>抽卡結果</h1><span>已存入收藏 · ${results.length} 件</span></div><div id="draw-results" class="draw-result-grid" tabindex="-1">${results.map(collectionTile).join('')}</div><button class="primary result-confirm" data-action="dismissDraw">確定</button>`;return heading('THE WORKSHOP','召喚工坊','用測試代幣蒐集新的可能。每次抽取都會建立獨立收藏。')+`<div class="workshop"><section class="panel"><div class="tabs"><button data-pool="coins" class="${pool==='coins'?'active':''}">硬幣池</button><button data-pool="coatings" class="${pool==='coatings'?'active':''}">鍍膜池</button></div><div class="summon-art">${pool==='coins'?disc('?','front',null,true):'<div class="film-disc core-水 summon-film">水</div>'}</div><h2>${pool==='coins'?'雙面硬幣召喚':'五行鍍膜召喚'}</h2><p>${pool==='coins'?'先抽總傷害，再隨機分配兩面數值。':'每抽一片單面鍍膜：一種五行，攻擊 +0～+5。'}</p><div class="actions"><button class="primary" data-draw="1" ${data.tokens<G.config.drawCost?'disabled':''}>單抽 · ◉ ${G.config.drawCost}</button><button data-draw="10" ${data.tokens<G.config.drawCost*10?'disabled':''}>十連抽 · ◉ ${G.config.drawCost*10}</button></div><button class="text-button" data-action="refill">＋ 領取 1,000 免費代幣（不限次）</button></section><details class="panel pool-details"><summary>召喚機率與規則 <span>⌄</span></summary><p>可重複獲得相同配置，每個實例各自收藏。</p>${pool==='coins'?Object.entries(G.config.totalWeights).map(([n,w])=>`<div class="prob-row"><span>總傷害 ${n}</span><strong>${(w/Object.values(G.config.totalWeights).reduce((a,b)=>a+b,0)*100).toFixed(2)}%</strong></div>`).join(''):Object.entries(G.config.elementWeights).map(([e,w])=>`<div class="prob-row"><span>${tag(e)} 單片屬性</span><strong>${(w/Object.values(G.config.elementWeights).reduce((a,b)=>a+b,0)*100).toFixed(2)}%</strong></div>`).join('')}${pool==='coatings'?`<h3>單片鍍膜攻擊力</h3>${Object.entries(G.config.coatingAttackWeights).map(([n,w])=>`<div class="prob-row"><span>攻擊 +${n}</span><strong>${(w/Object.values(G.config.coatingAttackWeights).reduce((a,b)=>a+b,0)*100).toFixed(2)}%</strong></div>`).join('')}`:''}<p class="muted">無保底、無稀有度；十連與單抽使用相同機率。</p></details></div>${results.length?`<div id="draw-results" class="draw-results" tabindex="-1"><div class="section-title"><h2>✦ 召喚成功</h2><span>已存入收藏 · ${results.length} 件</span></div><div class="grid">${results.map(r=>typeof r.front==='number'?coinCard(r):coatingCard(r)).join('')}</div><a class="button" href="#team">前往裝備新收藏 ›</a></div>`:''}`;}
  function collection(type){return heading('YOUR COLLECTION',type==='coins'?'硬幣收藏':'鍍膜收藏',`共 ${data[type].length} 件 · 每個實例皆獨立保存`)+`<div class="collection-tabs"><a href="#coins" class="${type==='coins'?'active':''}">硬幣 ${data.coins.length}</a><a href="#coatings" class="${type==='coatings'?'active':''}">鍍膜 ${data.coatings.length}</a></div><div class="section-title"><p>${type==='coins'?'正面為光，反面為暗；數值是各面的基礎傷害。':'每片鍍膜只有一種五行與 +0～+5 攻擊力，同時只能裝備在一枚硬幣的一面。'}</p><a class="button" href="#team">管理編隊與裝備 ↗</a></div><div class="collection-grid">${data[type].map(collectionTile).join('')}</div>`;}
  function teamPage(){
    selectedSlot=Math.max(0,Math.min(selectedSlot,data.team.length,2));
    const coin=data.coins.find(c=>c.id===data.team[selectedSlot]);
    const ready=data.team.length===3 && data.team.every(id=>fullyEquipped(data.coins.find(c=>c.id===id)));
    const missing=data.team.reduce((n,id)=>{const c=data.coins.find(c=>c.id===id);return n+['front','back'].filter(side=>!c[side+'CoatingId']).length;},0);
    let html=heading('BUILD YOUR TEAM','我的出戰隊伍','① 點選位置　② 選擇硬幣　③ 配置兩面鍍膜');
    html+=`<div class="lineup" aria-label="選擇要編輯的隊伍位置">${[0,1,2].map(i=>{const c=data.coins.find(c=>c.id===data.team[i]);return `<button class="lineup-slot ${i===selectedSlot?'is-active':''}" data-slot="${i}" aria-pressed="${i===selectedSlot}" ${i>data.team.length?'disabled':''}><span class="slot-label">位置 ${i+1}</span>${c?`${disc(c.front,'front',coatingFor(c,'front')?.element)}<strong>${esc(c.name)}</strong><small class="${fullyEquipped(c)?'ready-state':'missing-state'}">${fullyEquipped(c)?'✓ 裝備完成':'! 需要鍍膜'}</small>`:'<span class="slot-empty">＋</span><strong>選擇硬幣</strong><small>點擊加入</small>'}</button>`;}).join('')}</div>`;
    html+=`<div class="coin-legend"><span><i class="rim-key light-key"></i>金圈＝正面</span><span><i class="rim-key dark-key"></i>紫圈＝反面</span><span>內色＝五行鍍膜</span></div>`;
    if(coin){
      html+=`<section class="panel coin-editor"><div class="editor-title"><div><span class="eyebrow">正在編輯 · 位置 ${selectedSlot+1}</span><h2>${esc(coin.name)}</h2></div><button data-action="chooseCoin">${choosingCoin?'收起選擇':'更換硬幣'}</button></div><div class="face-editors">${['front','back'].map(side=>{const m=coatingFor(coin,side);return `<article class="face-editor ${side}"><h3>${side==='front'?'☀ 正面 · 光':'☾ 反面 · 暗'}</h3>${disc(coin[side],side,m?.element,true)}<div class="equipped-coating">${m?`${tag(m.element)} <strong>${esc(m.name)}</strong><span>鍍膜攻擊 +${m.attack}</span>`:'<strong class="missing-state">尚未裝備</strong><span>選一片鍍膜完成此面</span>'}</div><div class="face-total"><small>基礎 ${coin[side]} ＋ 鍍膜 ${m?.attack ?? 0}</small><strong>${coin[side]+(m?.attack ?? 0)} <small>攻擊</small></strong></div><button data-edit-side="${side}" aria-expanded="${editingSide===side}">${editingSide===side?'正在選擇…':m?'更換鍍膜':'＋ 裝備鍍膜'}</button></article>`;}).join('')}</div><button class="remove-coin" data-action="removeCoin">移出此位置</button></section>`;
      if(editingSide){
        const current=coatingFor(coin,editingSide);
        html+=`<section class="panel coating-picker" id="coating-picker" tabindex="-1"><div class="section-title"><div><span class="eyebrow">只變更${sideName(editingSide)}</span><h2>選擇${sideName(editingSide)}鍍膜</h2></div><button data-action="closePicker" aria-label="關閉鍍膜選擇">✕</button></div><p>點選即裝備。使用中的鍍膜會移至此面，原位置將空出。</p><div class="film-options">${data.coatings.map(m=>{const owner=ownerOf(m.id),isCurrent=m.id===current?.id;return `<button class="film-option ${isCurrent?'is-equipped':''}" data-film="${esc(m.id)}" aria-pressed="${isCurrent}"><span class="film-swatch core-${m.element}">${m.element}</span><strong>攻擊 +${m.attack}</strong><small>${isCurrent?'✓ 此面已裝備':owner?'移自 '+esc(owner):'可裝備'}</small></button>`;}).join('')}</div><div class="picker-actions"><a href="#draw">召喚更多鍍膜 ›</a><button data-action="unequipFace" ${current?'':'disabled'}>卸下此面鍍膜</button></div></section>`;
      }
    }
    if(!coin || choosingCoin){html+=`<section class="coin-picker" id="coin-picker" tabindex="-1"><div class="section-title"><h2>${coin?'換入位置 '+(selectedSlot+1):'選擇一枚硬幣'}</h2><span>已入隊的硬幣會交換位置</span></div><div class="grid">${data.coins.map(c=>{const index=data.team.indexOf(c.id),selected=c.id===coin?.id;return coinCard(c,`<button data-assign="${esc(c.id)}" ${selected?'disabled':''}>${selected?'✓ 目前硬幣':index>=0?'與位置 '+(index+1)+' 交換':'換入此位置'}</button>`);}).join('')}</div></section>`;}
    html+=`<div class="lineup-ready ${ready?'is-ready':''}"><span>${ready?'✓ 三枚硬幣已準備完成':data.team.length<3?'還需要 '+(3-data.team.length)+' 枚硬幣':'還有 '+missing+' 個面未裝備鍍膜'}</span>${ready?'<a class="button primary" href="#battle">前往對戰 ⚔</a>':'<button disabled>完成編隊後即可對戰</button>'}</div>`;
    return html;
  }
  function battleReserve(roster,used=[],selectable=false){
    return `<section class="reserve-panel"><div class="reserve-heading"><h2>我方備戰硬幣</h2><span>${selectable?'選擇本回合出戰硬幣':'每枚硬幣僅出戰一次'}</span></div><div class="reserve-grid">${roster.map(c=>{const spent=used.includes(c.id),chosen=selectable&&pendingCoinId===c.id;const front=coatingFor(c,'front'),back=coatingFor(c,'back');return `<button class="reserve-card ${chosen?'is-chosen':''} ${spent?'is-spent':''}" data-pick="${esc(c.id)}" aria-pressed="${chosen}" ${!selectable||spent?'disabled':''}><span class="reserve-name">${esc(c.name)}</span>${chosen?'<span class="chosen-check">✓</span>':''}${disc(c.front,'front',front?.element)}<span class="reserve-stats"><span>正面 <b>${c.front}</b></span><span>反面 <b>${c.back}</b></span></span><span class="reserve-elements"><span>${front?tag(front.element)+' +'+front.attack:'未裝備'}</span><span>${back?tag(back.element)+' +'+back.attack:'未裝備'}</span></span><small>${spent?'已出戰':chosen?'已選擇':'可出戰'}</small></button>`;}).join('')}</div></section>`;
  }
  function battleScore(round,s,playerInterference,aiInterference){return `<div class="round-ribbon"><i></i><h1>${round}</h1><i></i></div><div class="duel-scoreboard"><div class="interference-count ally"><span class="target-icon">◎</span><div>我方干涉<small>剩餘 <b>${playerInterference?1:0}</b> 次</small></div></div><div class="duel-scores"><div><small>我方得分</small><strong>${s.score}</strong></div>${icon('swords')}<div><small>敵方得分</small><strong>${s.aiScore}</strong></div></div><div class="interference-count enemy"><div>敵方干涉<small>剩餘 <b>${aiInterference?1:0}</b> 次</small></div><span class="target-icon">◎</span></div></div>`;}
  function battleFighter(c,side,who,bonus,flipped,preview=false){
    const f=G.face(c,side);
    if(animating){
      const front=G.face(c,'front'),back=G.face(c,'back');
      return `<article class="duel-fighter ${who}"><div class="battle-coin-holder tossing" aria-label="硬幣擲出中"><div class="toss-coin" style="--landing-angle:${side==='front'?1080:1260}deg" aria-hidden="true">${disc(front.baseDamage,'front',front.element,true)}${disc(back.baseDamage,'back',back.element,true)}</div></div><div class="power-sheet"><h2>${who==='ally'?'我方':'敵方'}擲幣中</h2><div class="face-pill">等待硬幣落定</div><dl><div><dt>基礎傷害</dt><dd>—</dd></div><div><dt>鍍膜攻擊</dt><dd>—</dd></div><div><dt>五行加成</dt><dd>—</dd></div></dl><div class="sheet-total"><span>最終戰力</span><strong>—</strong></div></div></article>`;
    }
    return `<article class="duel-fighter ${who}"><div class="battle-coin-holder ">${disc(f.baseDamage,side,f.element,true)}</div><div class="power-sheet ${side}"><h2>${who==='ally'?'我方':'敵方'}${preview?'出戰預覽':'擲幣結果'}</h2><div class="face-pill ${side}">${preview?'尚未擲幣':side==='front'?'正面（光）':'反面（暗）'}</div><dl><div><dt>基礎傷害</dt><dd>${f.baseDamage}</dd></div><div><dt>鍍膜攻擊 ${tag(f.element)}</dt><dd>+${f.coatingAttack}</dd></div><div><dt>五行加成</dt><dd>${preview?'—':'+'+bonus}</dd></div></dl><div class="sheet-total"><span>${preview?'正面預覽':'最終戰力'}</span><strong>${preview?'—':f.damage+bonus}</strong></div>${flipped?'<span class="flip-status">↻ 已干涉翻面</span>':''}</div></article>`;
  }
  function hiddenFighter(){return `<article class="duel-fighter enemy hidden-fighter"><div class="battle-coin-holder">${disc('?','back',null,true)}</div><div class="power-sheet back"><h2>敵方出戰硬幣</h2><div class="face-pill back">已秘密鎖定</div><p>雙方開始擲幣後<br>同時揭曉出戰硬幣</p><div class="sheet-total"><span>最終戰力</span><strong>—</strong></div></div></article>`;}
  function history(){return match.history.length?`<details class="panel history"><summary>對局紀錄 · 已完成 ${match.history.length} 局</summary>${match.history.map((r,i)=>`<div class="history-row"><span>第 ${i+1} 局</span><span>${esc(r.player.name)} ${r.playerSide==='front'?'光':'暗'}${tag(G.face(r.player,r.playerSide).element)}${r.playerFlipped?' ↻':''}</span><strong>${r.result.a} : ${r.result.b}</strong><span>${esc(r.ai.name)} ${r.aiSide==='front'?'光':'暗'}${tag(G.face(r.ai,r.aiSide).element)}${r.aiFlipped?' ↻':''}</span><b>${r.score===.5?'平手':r.score===1?'勝利':'落敗'}</b></div>`).join('')}</details>`:'';}
  function battlePage(){
    if(!match){
      const ready=data.team.length===3 && data.team.every(id=>fullyEquipped(data.coins.find(c=>c.id===id)));
      return battleScore('三局，決定勝負',{score:0,aiScore:0},true,true)+`<section class="battle-intro"><span class="eyebrow">LIGHT & SHADOW</span><div class="intro-seals" aria-hidden="true">${seal('sun')}<span>VS</span>${seal('moon')}</div><h2>一擲定勢，翻面逆轉。</h2><p>三枚硬幣 · 三局對決 · 一次干涉</p></section>`+battleReserve(data.team.map(id=>data.coins.find(c=>c.id===id)))+`<div class="battle-bottom"><a class="button back-button" href="#home" aria-label="返回首頁">←</a>${ready?`<button class="royal-primary" data-action="start">${icon('swords')}開始對決</button>`:'<a class="button royal-primary" href="#team">完成編隊 ›</a>'}</div><p class="duel-help">${ready?'選幣與干涉皆為秘密決定，對手不會讀取你的選擇。':'請選入三枚硬幣，並在六個面各裝備一片鍍膜。'}</p>`+battleExtras();
    }
    const s=G.summary(match),r=match.current,selecting=match.phase==='select';
    if(selecting&&!match.player.some(c=>c.id===pendingCoinId&&!match.used.includes(c.id)))pendingCoinId=match.player.find(c=>!match.used.includes(c.id))?.id;
    const round=match.phase==='finished'?'對戰結算':`第 ${Math.min(match.history.length+(match.phase==='roundEnd'?0:1),3)} / 3 回合`;
    let html=battleScore(round,s,match.playerInterference,match.aiInterference);
    if(selecting){
      const chosen=match.player.find(c=>c.id===pendingCoinId);
      html+=`<div class="duel-arena">${battleFighter(chosen,'front','ally',0,false,true)}<span class="duel-vs">VS</span>${hiddenFighter()}</div><p class="duel-help">對手已鎖定選擇。選好硬幣後，點擊開始擲幣。</p>`;
    }else{
      const power=r.result||G.power(G.face(r.player,r.playerSide),G.face(r.ai,r.aiSide));
      html+=`<div class="duel-arena">${battleFighter(r.player,r.playerSide,'ally',power.bonusA,r.playerFlipped)}<span class="duel-vs">VS</span>${battleFighter(r.ai,r.aiSide,'enemy',power.bonusB,r.aiFlipped)}</div><div class="duel-elements">${animating?'硬幣旋轉中，落定後揭曉戰力':(power.reasons.join(' · ')||'同屬性：雙方無五行加成')+(!r.result?' · 干涉後重新計算':'')}</div>`;
      if(match.phase==='interfere')html+=`<section class="duel-intervention"><button class="intervene-button" data-action="flip" ${animating||!match.playerInterference?'disabled':''}>${icon('flip')}<span>干涉翻面<small>${match.playerInterference?'剩餘 1 次':'本場已使用'}</small></span></button><p>對手的干涉決定已鎖定，<br>雙方決定同時生效。</p></section>`;
      if(match.phase==='roundEnd')html+=`<div class="round-outcome ${r.score===1?'won':''}"><strong>${r.score===.5?'本局平手 · 各得 0.5 分':r.score===1?'本局勝利 · 我方 +1 分':'本局落敗 · 對手 +1 分'}</strong><small>我方${r.playerFlipped?'使用干涉':'保持原面'} · 對手${r.aiFlipped?'使用干涉':'保持原面'}</small></div>`;
      if(match.phase==='finished')html+=`<section class="royal-result"><div class="simple-result-word">${s.winner==='player'?'WIN':s.winner==='ai'?'LOSE':'DRAW'}</div><span class="eyebrow">MATCH COMPLETE</span><h2>${s.winner==='player'?'你贏得了這場對決':s.winner==='ai'?'對手贏得這場對決':'勢均力敵，整場平手'}</h2><p class="result-score">${s.score} : ${s.aiScore}</p><div class="result-rounds">${match.history.map((h,i)=>`<div><span>第 ${i+1} 局</span><b>${h.score===1?'勝':h.score===.5?'平':'敗'}</b><strong>${h.result.a} <small>vs</small> ${h.result.b}</strong></div>`).join('')}</div><p>累積最終戰力 ${s.power} : ${s.aiPower}</p><small>${s.score===s.aiScore?(s.power===s.aiPower?'勝分與累積戰力皆相同。':'勝分相同，依累積最終戰力決勝。'):'依三局總勝分決勝。'}</small></section>`;
    }
    if(selecting)html+=battleReserve(match.player,match.used,true);
    html+=`<div class="battle-bottom"><a class="button back-button" href="#home" aria-label="返回首頁，保留本場對戰">←</a>${selecting?`<button class="royal-primary" data-action="toss" ${pendingCoinId?'':'disabled'}>${icon('swords')}開始擲幣</button>`:match.phase==='interfere'?`<button class="royal-primary" data-action="keep" ${animating?'disabled':''}>${animating?'擲幣中…':'保持 · 揭曉結果'}</button>`:match.phase==='roundEnd'?'<button class="royal-primary" data-action="next">下一回合 →</button>':'<button class="royal-primary" data-action="rematch">再次備戰 ↻</button>'}</div>`;
    return html+battleExtras();
  }
  function battleExtras(){
    let html=`<div class="duel-tools"><button data-action="battleRules">戰力與規則</button><span>·</span><button data-action="battleHistory">本場紀錄${match?' '+match.history.length+'/3':''}</button></div>`;
    if(battleInfo){
      const content=battleInfo==='history'?(match&&match.history.length?history().replace('<details','<details open'):'<p>尚未完成任何一局。</p>'):rules().replace('<details','<details open');
      html+=`<div class="battle-info-backdrop"><section class="battle-info" role="dialog" aria-modal="true" aria-labelledby="battle-info-title"><div class="info-title"><h2 id="battle-info-title">${battleInfo==='history'?'本場對局紀錄':'戰力與規則'}</h2><button class="info-close" data-action="closeBattleInfo" aria-label="關閉面板">✕</button></div><div class="info-content">${content}</div></section></div>`;
    }
    return html;
  }
  function rules(){return `<details class="panel rules"><summary>五行與對戰規則</summary><p>相剋（克制方 +2）：金 → 木 → 土 → 水 → 火 → 金</p><p>相生（受到相生方 +1）：金 → 水 → 木 → 火 → 土 → 金</p><p>同屬性無加成；光暗無加成。最終戰力 = 當前面基礎傷害 + 鍍膜攻擊力 + 五行加成。每片鍍膜提供固定 +0～+5 攻擊力，只對裝備的那一面生效；翻面後改用另一面的鍍膜屬性與攻擊力。</p><p>單局平手各得 0.5 分。打滿三局後，依序比較勝分、累積最終戰力，皆相同則整場平手。</p><p>AI 隨機選擇剩餘硬幣；若翻面能改善戰力差，且目前未領先或已是最後一局，就使用尚餘的干涉。</p><p>收藏與編隊自動儲存；進行中的對戰不儲存，重新整理會回到備戰。</p></details>`;}
  function installPage(){const p=G.pwa||{};return heading('APP','安裝到手機','從主畫面啟動，離線也能抽卡、編隊與對戰。')+`<section class="panel save-panel"><h2>${p.installed?'已從 App 模式開啟':'加入主畫面'}</h2><p>${esc(p.error||(p.ready?'離線內容已準備完成。':'正在準備離線內容，請保持連線。'))}</p>${p.canInstall?'<button class="primary" data-action="installApp">安裝硬幣對決</button>':''}${!p.installed&&!p.error?'<p>iPhone／iPad：使用 Safari 的分享選單 → 加入主畫面。<br>Android：使用 Chrome 選單 → 安裝應用程式或加入主畫面。</p>':''}<p>收藏、代幣和編隊會自動保存，不需要每次手動匯出。請固定使用相同遊戲網址與瀏覽器。</p><button data-action="durableStorage">保留此裝置的遊戲資料</button><p class="hint">是否允許長期保留由瀏覽器決定；手動清除網站資料仍會刪除進度。安裝不會同步不同裝置的存檔。</p></section>`;}
  function savePage(){return heading('SAVE','存檔管理','收藏、代幣、編隊與兩面鍍膜會在操作後自動儲存。')+`<section class="panel save-panel"><h2>本機存檔</h2><p role="status">${esc(G.storageWarning||saveStatus||'尚未確認儲存狀態')}</p><p>${data.coins.length} 枚硬幣 · ${data.coatings.length} 片鍍膜 · ${data.tokens.toLocaleString()} 代幣</p><button class="primary" data-action="saveNow">立即存檔</button><p class="hint">請使用同一瀏覽器與相同網址開啟。直接開啟 HTML、無痕模式或瀏覽器清理資料，可能讓存檔無法保留。進行中的對戰不會保存。</p></section><section class="panel save-panel"><h2>檔案備份</h2><p>匯出 JSON 到手機或電腦；重開後若進度消失，可選擇檔案恢復。</p><button class="primary" data-action="exportSave">匯出存檔</button><label for="save-file">匯入存檔檔案</label><input id="save-file" type="file" accept=".json,application/json">${importedSave?`<div class="import-preview"><p>即將載入：${importedSave.coins.length} 枚硬幣、${importedSave.coatings.length} 片鍍膜、${importedSave.tokens.toLocaleString()} 代幣。</p><p>確認後會取代目前收藏與編隊，並結束目前對戰。</p><button class="primary" data-action="confirmImport">確認載入此存檔</button><button data-action="cancelImport">取消</button></div>`:''}</section>`;}
  app.addEventListener('change',async e=>{
    if(e.target.id!=='save-file')return;
    importedSave=null;
    const file=e.target.files?.[0];if(!file)return;
    try{if(file.size>10*1024*1024)throw Error('檔案過大，請選擇 10 MB 以下的遊戲存檔');importedSave=G.parseSave(await file.text());render();}
    catch(error){render();toast('匯入失敗：'+error.message);}
  });
  function render(){const page=location.hash.slice(1)||'home';document.querySelector('#balance').textContent=data.tokens.toLocaleString();document.querySelectorAll('nav a').forEach(a=>{a.classList.toggle('active',a.hash==='#'+(page==='coatings'?'coins':page));if(a.hash==='#'+(page==='coatings'?'coins':page))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});const title=document.querySelector('.header-page-title');if(title)title.textContent=({home:'首頁',draw:'抽卡',coins:'收藏',coatings:'收藏',team:'編隊',battle:'對戰',save:'存檔管理',install:'安裝到手機'})[page]||'首頁';app.className='page-'+page+(page==='draw'&&results.length?' showing-draw-results':'')+(page==='battle'?' phase-'+(match?.phase||'ready'):'');app.innerHTML=page==='install'?installPage():page==='save'?savePage():page==='draw'?drawPage():page==='coins'||page==='coatings'?collection(page):page==='team'?teamPage():page==='battle'?battlePage():home();if(inspection)app.innerHTML+=inventoryDetail();}
  app.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;try{
    if(b.dataset.inspect)inspection=b.dataset.inspect;
    if(b.dataset.pool){pool=b.dataset.pool;results=[];}
    if(b.dataset.draw){results=G.draw(data,pool,Number(b.dataset.draw));save();toast(`成功召喚 ${results.length} 件收藏`);}
    if(b.dataset.slot!==undefined){selectedSlot=Number(b.dataset.slot);editingSide=null;choosingCoin=false;}
    if(b.dataset.editSide){editingSide=b.dataset.editSide;choosingCoin=false;}
    if(b.dataset.assign){
      const id=b.dataset.assign;
      if(!data.coins.some(c=>c.id===id))throw Error('找不到硬幣');
      const target=Math.min(selectedSlot,data.team.length,2),oldId=data.team[target],source=data.team.indexOf(id);
      if(source>=0){if(oldId){data.team[source]=oldId;data.team[target]=id;}else{data.team.splice(source,1);data.team.push(id);selectedSlot=data.team.length-1;}}
      else data.team[target]=id;
      choosingCoin=false;editingSide=null;save();toast('出戰隊伍已更新');
    }
    if(b.dataset.film){
      const coinId=data.team[selectedSlot];if(!coinId || !editingSide)throw Error('請先選擇要裝備的面');
      const previous=ownerOf(b.dataset.film);G.equip(data,coinId,editingSide,b.dataset.film);save();editingSide=null;toast(previous?'鍍膜已移至選擇的面':'鍍膜已裝備');
    }
    if(b.dataset.pick){if(!match||match.phase!=='select'||match.used.includes(b.dataset.pick)||!match.player.some(c=>c.id===b.dataset.pick))return;pendingCoinId=b.dataset.pick;}
    switch(b.dataset.action){
      case 'installApp':G.installApp?.().then(ok=>toast(ok?'已接受安裝，請依瀏覽器提示完成':'可從瀏覽器選單加入主畫面'));break;
      case 'durableStorage':G.requestDurableStorage?.().then(ok=>toast(ok?'已允許長期保留本機資料':'目前使用一般自動儲存；瀏覽器未授予長期保留'));break;
      case 'saveNow':toast(save()?'已儲存收藏、代幣與編隊':'無法寫入本機，請匯出存檔備份');break;
      case 'exportSave':{
        const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
        const link=document.createElement('a');link.href=url;link.download='coin-duel-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('已產生存檔，請保留下載的 JSON 檔');break;
      }
      case 'cancelImport':importedSave=null;break;
      case 'confirmImport':if(importedSave){
        const restored=importedSave,ok=G.save(restored,true);data=restored;importedSave=null;match=null;animating=false;pendingCoinId=null;selectedSlot=0;editingSide=null;choosingCoin=false;results=[];inspection=null;
        saveStatus=ok?'匯入成功，已儲存於此瀏覽器':'已載入，但本機寫入失敗；請保留備份檔';toast(saveStatus);
      }break;
      case 'closeInspection':inspection=null;break;
      case 'dismissDraw':results=[];break;
      case 'battleRules':battleInfo='rules';break;
      case 'battleHistory':battleInfo='history';break;
      case 'closeBattleInfo':battleInfo=null;break;
      case 'chooseCoin':choosingCoin=!choosingCoin;editingSide=null;break;
      case 'closePicker':editingSide=null;break;
      case 'removeCoin':data.team.splice(selectedSlot,1);selectedSlot=Math.min(selectedSlot,data.team.length,2);editingSide=null;choosingCoin=false;save();toast('硬幣已移出隊伍，收藏與鍍膜保留');break;
      case 'unequipFace':if(editingSide && data.team[selectedSlot]){G.equip(data,data.team[selectedSlot],editingSide,'');save();editingSide=null;toast('此面鍍膜已卸下');}break;
      case 'refill':data.tokens+=1000;save();toast('已領取 1,000 測試代幣');break;
      case 'start':match=G.newMatch(data);pendingCoinId=null;break;
      case 'toss':if(animating)return;G.selectCoin(match,pendingCoinId);animating=true;setTimeout(()=>{animating=false;render();},850);break;
      case 'keep':if(animating)return;G.resolveRound(match,false);break;
      case 'flip':if(animating)return;G.resolveRound(match,true);break;
      case 'next':G.prepareRound(match);pendingCoinId=null;break;
      case 'rematch':match=null;pendingCoinId=null;break;
    }
    render();
    if(b.dataset.inspect || ['battleRules','battleHistory'].includes(b.dataset.action))document.querySelector('.info-close')?.focus?.();
    if(b.dataset.editSide || b.dataset.action==='chooseCoin'){const picker=document.querySelector(b.dataset.editSide?'#coating-picker':'#coin-picker');picker?.scrollIntoView?.({behavior:'auto',block:'start'});picker?.focus?.({preventScroll:true});}
    if(b.dataset.draw){const result=document.querySelector('#draw-results');result?.scrollIntoView?.({behavior:'auto',block:'start'});result?.focus?.({preventScroll:true});}
    if(['start','toss','next','keep','flip','rematch'].includes(b.dataset.action))window.scrollTo(0,0);
  }catch(error){toast(error.message);}});
  window.addEventListener('pwa-status',()=>{if(location.hash==='#install')render();});
  window.addEventListener('keydown',event=>{if(event.key==='Escape'&&(battleInfo||inspection)){battleInfo=null;inspection=null;render();}});
  window.addEventListener('hashchange',()=>{document.querySelector('.header-menu')?.removeAttribute('open');battleInfo=null;inspection=null;render();window.scrollTo(0,0);});render();save();if(G.storageWarning)toast(G.storageWarning);
})(CoinGame);
