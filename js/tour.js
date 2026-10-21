(function(G){
  const step=(title,text,target,action=null,route=null)=>({title,text,target,action,route});
  const battle=[
    step('選擇出戰硬幣','點選本局要出戰的硬幣。分出勝負後，這枚硬幣本場就不能再用。','.reserve-grid','[data-pick]:not(:disabled)'),
    step('開始擲幣','點亮起的按鈕。雙方同時公開，正反面各有 50% 機率。','[data-action="toss"]','[data-action="toss"]'),
    step('比較雙方戰力','看看基礎傷害、鍍膜攻擊和五行加成。普通模式每場只有一次干涉，翻面後會重新計算。','.duel-arena'),
    step('決定是否翻面','可選擇干涉翻面，或按下方按鈕保持原面。對手早已鎖定選擇，不會偷看你的決定。','.duel-intervention,.battle-bottom','[data-action="keep"]:not(:disabled),[data-action="flip"]:not(:disabled)'),
    step('繼續這場對戰','平手不計分，收回硬幣重戰，已用干涉不退還。完成三個分出勝負的回合後結算。','.round-outcome,.royal-result,.battle-bottom')
  ];
  const recipes={
    beginner:[
      step('跟著畫面學會遊戲','這次會直接帶你操作。抽卡會花測試代幣，取得的收藏與裝備會保留；可隨時結束引導。','.royal-shortcuts',null,'home'),
      step('先領測試代幣','點這裡領取 1,000 代幣。測試版可不限次領取。','[data-action="refill"]','[data-action="refill"]','draw'),
      step('切換硬幣池','點「硬幣池」。每枚硬幣兩面基礎傷害總和為 6～12，分配不一定平均。','[data-pool="coins"]','[data-pool="coins"]'),
      step('試一次單抽','點單抽，花費 100 測試代幣。十連抽花費 1,000，會一次取得十件收藏。','[data-draw="1"]','[data-draw="1"]'),
      step('這是你的新硬幣','卡片上的兩個數字是正反面的基礎傷害。相同數值也能重複取得，每枚都是獨立收藏。','#draw-results'),
      step('收下抽卡結果','點「確定」，回到抽卡池。','[data-action="dismissDraw"]','[data-action="dismissDraw"]'),
      step('切換鍍膜池','每片鍍膜有一種五行屬性，提供攻擊 +0～+5，只能裝在硬幣的一個面。','[data-pool="coatings"]','[data-pool="coatings"]'),
      step('取得一片鍍膜','點單抽，花費 100 代幣。等等會把這片未使用的鍍膜裝上硬幣。','[data-draw="1"]','[data-draw="1"]'),
      step('看懂鍍膜','中央文字是屬性，下方是攻擊加成。基礎 3 加鍍膜 +2，該面攻擊就是 5。','#draw-results'),
      step('查看硬幣詳情','在收藏點選一枚硬幣，查看兩面與鍍膜配置。','.collection-grid','[data-inspect]','coins'),
      step('認識正反面','金框是正面，銀框是反面，裝飾圈代表五行。正反面需要各自裝備一片鍍膜。','.info-content'),
      step('關閉詳情','點右上角 ×，返回收藏。','[data-action="closeInspection"]','[data-action="closeInspection"]'),
      step('選擇隊伍位置','點一個位置來編輯。換入其他位置的硬幣會交換位置；移出隊伍不會刪除收藏。','.lineup','[data-slot]','team'),
      step('更換硬幣的位置','按「更換硬幣」可以從收藏換入。這一步先看位置，準備好就按下一步。','.editor-title'),
      step('選擇要裝備的面','現在點正面的鍍膜按鈕。正反面分開配置，翻面後數值和屬性也會改變。','[data-edit-side="front"]','[data-edit-side="front"]'),
      step('裝上未使用的鍍膜','點一片可使用的鍍膜。綠色是此面使用中，灰色是別處已裝備，需先卸下才能移用。','.film-options','[data-film]:not(:disabled)'),
      step('確認裝備結果','這裡顯示基礎、鍍膜加成與合計攻擊。三枚硬幣的六個面都裝備完成，即可進入三枚模式。','.face-editors'),
      step('進度自動保存','抽卡、裝備、編隊和冒險進度都會自動保存。請用相同網址與瀏覽器遊玩；進行中的對局不會在重開後保留。','.wallet',null,'home'),
      step('安裝到手機','使用 HTTPS 網址，這裡會顯示安裝方式。離線內容準備完成後可離線玩；安裝不會自動同步跨裝置存檔。','.install-panel,.panel',null,'install'),
      step('選擇你的玩法','普通對戰、冒險、1V1、3V3、彈射都有獨立引導。冒險可挑戰 100 位 NPC、累積首勝積分提升牌位。','.royal-shortcuts',null,'home'),
      step('隨時重看','點上方「教學」可重開引導；引導中的「完整說明」保留所有詳細規則。進入對戰後，上方另有「相剋表」。','[data-guide]')
    ],
    standard:[step('開始普通對戰','三枚硬幣、三個決勝回合，每場一次干涉。點開始；若未備齊六面鍍膜，先到編隊完成。','[data-action="start"]','[data-action="start"]'),...battle],
    adventure:[step('選擇冒險玩法','四種玩法各有獨立的 100 關，先選想挑戰的玩法。','.progress-modes','[data-progress-mode]'),step('選擇關卡','每章十關，通關後解鎖下一關。冒險不影響任何牌位積分。','.adventure-map','[data-stage]:not(:disabled)'),step('開始挑戰','依所選玩法的規則對戰。首勝得 100 代幣，關主 300；重打勝利 20。','.adventure-opponent')],
    ranked:[step('獨立的玩法牌位','先選玩法，每種玩法各有自己的牌位與戰績。','.progress-modes','[data-progress-mode]'),step('查看積分','勝利 +30，落敗 −15，最低 0 分。只有這裡開始的牌位對戰會改變積分。','.ranked-card'),step('挑戰牌位對手','對手是依牌位配置的 AI，沿用你選擇的玩法規則。','[data-action="rankedStart"]')],
    death:[step('挑一枚硬幣','點選一枚兩面已裝鍍膜的硬幣。收藏多時可翻頁尋找。','.death-roster','[data-death-pick]'),step('開始生死戰','點開始對決，只用選中的一枚硬幣。','[data-action="startDeath"]','[data-action="startDeath"]'),step('擲出結果','點開始擲幣，落定後先查看雙方硬幣與戰力，按「確認結果」才判定勝負，不能一般干涉。','[data-action="toss"]','[data-action="toss"]'),step('平手才翻面','初次平手可讓雙方強制翻面一次；仍平手則重擲，新次平手可再翻面。分出勝負後先看雙方數字，再按「查看結算」。','.duel-arena')],
    squad:[step('三枚同時出戰','點下方按鈕擲出三枚。自己的結果先顯示，對手保持隱藏。','[data-action="squadStart"]','[data-action="squadStart"]'),step('看自己的結果','可點一枚選擇翻面，再點可取消；也可全部保持。每張卡會顯示另一面的數字。','.squad-side:has([data-squad-pick])'),step('同時公開','準備好後按公開。AI 已鎖定選擇，雙方依相同位置計算五行加成，逐枚比較戰力；勝場較多者獲勝，單組平手不計勝場。','[data-action="squadReveal"]','[data-action="squadReveal"]'),step('平手會強化','雙方勝場相同時，各隨機一枚兩面 +1，下次平手 +2，依序累積再重擲。只影響這場，不改變收藏。分出勝負後先看公開數字，再按「查看結算」。','.squad-status')],
    flick:[step('開場擲幣','點開始擲幣，只有開場擲一次；後續回合保留位置與血量。','[data-flick="start"]','[data-flick="start"]'),step('秘密翻面','可點一枚選擇翻面，也可以全部保持。AI 的選擇已鎖定。正式對戰另外還有一次翻面。','.flick-opening'),step('進入戰場','按下按鈕，同時公開雙方。硬幣的血量包含該面的鍍膜攻擊。','[data-flick="begin"]','[data-flick="begin"]'),step('辨認行動方','藍點是我方、紅點是對手。名字加粗代表目前行動方。每回合總血量少者先攻，其次比較枚數少、血量差距小，仍相同隨機。','.flick-scores'),step('試著彈射','輪到我方時，先點選己方硬幣，再從戰場任意位置往後拉，再放開，朝箭頭方向射出。拉遠力道較強，碰牆反彈，停下後換人。','.flick-arena','drag'),step('翻面與退場','輕點硬幣後可用下方按鈕翻面，整場一次，會消耗此次行動。血量改成另一面完整數字，不扣回舊傷；血量歸零退場，全滅者敗。','.flick-actions')]
  };
  for(const name of ['standard','adventure','ranked','death','squad','flick'])recipes[name].splice(recipes[name].length-1,0,step('隨時查看相剋表','點上方相剋表。一般模式看雙方戰力加成，彈射則看命中扣血；看完按 × 回來繼續。','[data-table]','[data-table]'));
  const T=G.tour={active:false,pauses:false,start,stop,recipes,getState:()=>({key,index})};
  let key,index=0,root,ring,card,timer,queued=false,lastTarget=null,onFinish;
  function start(name='beginner',done){if(!recipes[name])name='beginner';if(T.active)stop(false);key=name;index=0;onFinish=done;T.active=true;root=document.createElement('div');root.className='walkthrough';root.innerHTML='<div class="walkthrough-ring"></div><section class="walkthrough-card" role="dialog" aria-label="操作引導"></section>';document.body.append(root);ring=root.firstElementChild;card=root.lastElementChild;timer=setInterval(position,180);enter();}
  function stop(record=true){if(!T.active)return;const done=onFinish;T.active=false;T.pauses=false;clearInterval(timer);root.remove();root=null;lastTarget=null;if(record)done?.(key);}
  function enter(){if(!T.active)return;const s=recipes[key][index];T.pauses=s.action!=='drag';lastTarget=null;if(s.route&&location.hash!=='#'+s.route)location.hash=s.route;card.innerHTML=`<div class="walkthrough-top"><strong>${G.help.lessons[key].title} · ${index+1}/${recipes[key].length}</strong><button data-tour-stop aria-label="結束引導">×</button></div><select class="walkthrough-select" aria-label="選擇引導">${Object.entries(G.help.lessons).map(([id,item])=>`<option value="${id}" ${id===key?'selected':''}>${item.title}</option>`).join('')}</select><h3>${s.title}</h3><p>${s.text}</p><small class="walkthrough-status" aria-live="polite"></small><div class="walkthrough-actions"><button data-tour-read>完整說明</button><button data-tour-next>${index===recipes[key].length-1?'完成':'下一步'}</button><button data-tour-stop>結束引導</button></div>`;card.querySelectorAll('[data-tour-stop]').forEach(b=>b.onclick=()=>stop());card.querySelector('select').onchange=e=>{const name=e.target.value;stop();location.hash=({beginner:'home',standard:'battle',adventure:'adventure',ranked:'ranked',death:'death',squad:'squad',flick:'flick'})[name];G.help.open(name);};card.querySelector('[data-tour-read]').onclick=()=>G.help.read(key);card.querySelector('[data-tour-next]').onclick=advance;position();}
  function advance(){if(!T.active)return;if(index===recipes[key].length-1){stop();return;}index++;enter();}
  function target(){const s=recipes[key][index];return [...document.querySelectorAll(s.target)].find(el=>el.getClientRects().length);}
  function position(){if(!T.active)return;const s=recipes[key][index],el=target();if(el&&el!==lastTarget){lastTarget=el;el.scrollIntoView({block:'center',behavior:'instant'});}const r=el?.getBoundingClientRect();ring.hidden=!r;const next=card.querySelector('[data-tour-next]'),status=card.querySelector('.walkthrough-status');const action=s.action&&s.action!=='drag'&&document.querySelector(s.action);next.disabled=!!(s.action&&el&&(s.action==='drag'||action));status.textContent=s.action?(s.action==='drag'?'請在亮起的場地操作；輪到對手時請等待。':action?'請點選亮起區域中的指定按鈕。':'目前沒有這個操作，可按下一步略過，或稍後重看。'):'';
    if(s.action==='drag'&&G.flickUI?.getMatch()?.phase==='moving'&&G.flickUI.getMatch().actor==='player'){scheduleAdvance();}
    const h=card.offsetHeight,w=Math.min(360,innerWidth-24);card.style.width=w+'px';card.style.left=Math.max(12,(innerWidth-w)/2)+'px';card.style.top=(r&&r.top>innerHeight-r.bottom?Math.max(12,r.top-h-14):Math.min(innerHeight-h-12,Math.max(12,(r?.bottom||50)+14)))+'px';
    if(r){const top=Math.max(0,r.top),left=Math.max(0,r.left);Object.assign(ring.style,{left:left+'px',top:top+'px',width:Math.min(r.width,innerWidth-left)+'px',height:Math.max(0,Math.min(r.bottom,innerHeight)-top)+'px'});}
  }
  function scheduleAdvance(){if(queued)return;queued=true;const savedKey=key,savedIndex=index;setTimeout(()=>{queued=false;if(T.active&&key===savedKey&&index===savedIndex)advance();},60);}
  document.addEventListener('click',e=>{if(!T.active||G.help?.dialogOpen()||root.contains(e.target))return;const s=recipes[key][index];if(s.action&&s.action!=='drag'&&e.target.closest(s.action)){scheduleAdvance();return;}if(!s.action&&target()?.contains(e.target))return;e.preventDefault();e.stopImmediatePropagation();},true);
  document.addEventListener('keydown',e=>{if(T.active&&e.key==='Escape'&&!G.help?.dialogOpen()){e.preventDefault();stop();}});
})(CoinGame);
