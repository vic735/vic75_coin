(function(G){
  const KEY='coin-duel-help-v2',elements=['金','木','水','火','土'];
  const lessons={
    beginner:{title:'新手教學',steps:[
      ['歡迎來到硬幣對決','你已獲得三枚硬幣、六片鍍膜與 3,000 測試代幣。這是單機遊戲，所有對手都是 AI。','先熟悉抽卡、收藏與編隊，再選擇喜歡的對戰模式。'],
      ['看懂一枚硬幣','每枚硬幣都有兩面：金色外框是正面、銀色外框是反面；內圈裝飾代表該面的鍍膜屬性。','收藏中的數字是基礎傷害，正反面合計 6～12，兩面可以不平均。每次擲幣各有 50% 機率。'],
      ['鍍膜如何增加攻擊','每片鍍膜只有一種五行屬性與攻擊 +0～+5，裝備在硬幣的一個面。','例如基礎 3 加上攻擊 +2 的鍍膜，該面的攻擊就是 5。另一面需要另一片鍍膜；翻面後會改用另一面的屬性和數字。'],
      ['抽卡與代幣','在「抽卡」切換硬幣池或鍍膜池。單抽 100、十連抽 1,000 代幣；結果會自動加入收藏。','代幣可透過冒險通關取得。機率與規則可以展開查看；重複配置仍是不同的收藏實例。'],
      ['收藏與詳情','在「收藏」切換硬幣和鍍膜，點一張卡查看詳情。硬幣卡顯示兩面基礎數字，鍍膜卡顯示屬性圖示和攻擊加成。','詳情中的「前往編隊裝備」可繼續配置。'],
      ['三枚硬幣編隊','到「編隊」點選位置，再按「更換硬幣」選擇收藏。選到其他位置的硬幣時，會交換位置。','選擇正面或反面的「更換鍍膜」，點一片鍍膜即可裝備。三枚硬幣的六個面都裝備完成，就能進入三枚模式。'],
      ['更換與卸下鍍膜','每片鍍膜只能裝在一個面；灰色標記的鍍膜已被使用，不能重複選取；請先到顯示的原位置卸下，再裝備到新位置。','更換與卸下都免費。鍍膜選擇區的「卸下此面鍍膜」可取下；「移出此位置」會將硬幣移出隊伍。收藏仍會保留。'],
      ['五行與相剋表','普通對戰中，剋制對手的一方 +2；相生時，被生出的一方 +1。同屬性不加成。光暗沒有額外加成。','每個模式上方都有「相剋表」。彈射採用不同的碰撞傷害表，開啟時會自動顯示適用的規則。'],
      ['選擇遊戲模式','普通模式：三局選幣對決。冒險：各玩法獨立挑戰 100 關。牌位：各玩法分開累積積分。生死戰：一枚硬幣決勝。','3V3：三枚同時擲出，同位置逐枚比較，勝場多者勝。彈射：拖曳硬幣碰撞扣血。第一次進入各模式都會出現專屬教學。'],
      ['自動儲存','收藏、代幣、編隊和冒險進度會自動保存在目前瀏覽器。進行中的對局不會在重新整理後保留。','請固定使用相同遊戲網址與瀏覽器，進度不會自動同步到其他裝置。'],
      ['安裝到手機與更新','使用 HTTPS 遊戲網址，從選單的「安裝到手機」依瀏覽器提示安裝。準備好離線內容後，也能離線遊玩。','上傳新版後，連網開啟遊戲並關閉所有遊戲分頁／APP，再重開以切換新版。不要清除網站資料，以免刪除本機存檔。'],
      ['準備好了','隨時按上方「教學」可以重看完整教學或選擇模式教學。「相剋表」也可在對戰中查看。','建議先到編隊確認六面鍍膜，再進入普通模式試一場。']
    ]},
    standard:{title:'普通對戰',steps:[
      ['選出本局硬幣','準備三枚六面均已裝備的硬幣。每局點選一枚尚未使用的硬幣，再按「開始擲幣」。','對手已秘密選好硬幣；雙方同時公開並擲出正反面。'],
      ['觀察後決定干涉','戰力＝當前面基礎傷害＋鍍膜攻擊＋五行加成。每方整場只有一次干涉，能將本局硬幣強制翻面。','選「干涉翻面」或保持原面。AI 事先鎖定決定，不會看了你的選擇才決定。上方「相剋表」可協助判斷。'],
      ['完成三局','戰力高者得 1 分，已分出勝負的硬幣不能再次上場。平手不計分，雙方收回硬幣重新選擇，已使用的干涉不退還。','完成三個分出勝負的回合後，比較總勝分結算；若總分相同則比較累積最終戰力，仍相同為平手。']
    ]},
    adventure:{title:'冒險破關',steps:[
      ['選擇玩法','普通三局、1V1 生死戰、3V3 齊擲、彈射各有獨立 100 關。先選玩法，再選章節與關卡。','前期敵人較弱，每章逐步提升，沿用各玩法的戰鬥規則。'],
      ['通關與獎勵','勝利解鎖下一關。首次通關 100 代幣，章節關主 300；再次勝利 20。','冒險只記錄通關和獎勵，完全不增加或扣除牌位積分。進度自動儲存。']
    ]},
    ranked:{title:'牌位對戰',steps:[
      ['各玩法分別爬分','選擇普通三局、1V1 生死戰、3V3 齊擲或彈射。各自有獨立牌位、積分與戰績，初始都是 0 分。','對手為按目前牌位配置的 AI，使用所選玩法原本的規則。'],
      ['牌位對戰才計分','勝利 +30 分，落敗 −15 分，最低 0 分。達到門檻晉級，低於門檻降級。','冒險、自由對戰與好友連線不影響牌位。完成對戰只結算一次，積分自動儲存。']
    ]},
    death:{title:'1V1 生死戰',steps:[
      ['挑選唯一的硬幣','在可出戰卡片中點選一枚，正反面都需要裝備鍍膜。收藏較多時，用翻頁按鈕尋找。','進入對戰後擲幣，先查看雙方硬幣、面向、鍍膜和戰力，按「確認結果」後才判定勝負。一般情況不能主動翻面。'],
      ['平手才追加翻面','首次比較平手時，按「翻面決勝」，雙方都強制翻到另一面一次，再比較戰力。','如果仍平手，收回同一枚硬幣重新擲出。重新擲出後若又平手，可再使用該次的平手翻面；分出勝負後先查看雙方硬幣與數字，按「查看結算」才進入結算畫面。']
    ]},
    squad:{title:'3V3 齊擲',steps:[
      ['三枚一起擲出','使用編隊中的三枚硬幣，按「三枚一起擲出」。你會看到自己的三枚結果，對手的結果暫時隱藏。','對手的干涉選擇會預先鎖定。'],
      ['選擇一枚翻面或全部保持','點選一枚要翻面的硬幣，再按公開；再次點選可取消，也可以直接全部保持。','公開後，依相同位置一對一計算五行加成並比較戰力，獲勝組數較多者獲勝。單組平手不計勝場；雙方勝場相同則整次對擲平手。先查看雙方公開結果，按「查看結算」再看勝負。'],
      ['平手後強化重擲','平手時雙方各隨機一枚，兩面同時增加數字：第一次 +1、第二次 +2，依序增加並累積。','按再次擲出繼續。每次重擲都可選擇翻一枚；加成只限這場，不會改變收藏。']
    ]},
    flick:{title:'彈射對戰',steps:[
      ['開場擲幣與秘密翻面','三枚硬幣只在開場擲一次。看到自己的結果後，可選一枚翻面，或全部保持；再同時公開雙方。','每枚血量＝當前面基礎傷害＋鍍膜攻擊。正式對戰每方另外有一次翻面機會。'],
      ['拖曳與彈射','藍色小點是我方，紅色是對手。輪到誰行動，上方名字就會加粗。先點選己方硬幣，再從戰場任意位置往後拉，放開後向箭頭方向彈射。','拉得越遠力道越大，但有上限；碰牆會反彈。所有硬幣停下後才換人，未命中也消耗本次行動。'],
      ['碰撞與屬性傷害','一般命中扣 1；打向生出自己的屬性扣 2；剋制對手扣 3。例如水打金扣 2，水打火扣 3。','只有射出的硬幣能傷害敵人，每次彈射對同一枚敵幣最多傷害一次，可以命中多枚。友軍與間接連鎖碰撞不扣血。上方「相剋表」顯示完整傷害表。'],
      ['每回合決定先後攻','每回合雙方各行動一次，不重骰，位置與剩餘血量會保留。下一回合總血量較少者先攻。','總血量相同時，依序比較硬幣枚數較少、最大最小血量差距較小；完全相同則隨機。'],
      ['翻面與勝負','輕點己方硬幣後，按下方翻面按鈕。正式對戰每方整場只能使用一次，會取代自己的彈射行動。','翻面後直接使用另一面的完整數字作為血量，不扣回之前的傷勢。硬幣血量歸零就退場，先清空對方場上硬幣的一方獲勝。']
    ]}
  };
  let seen={};try{const value=JSON.parse(localStorage.getItem(KEY)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))seen=value;}catch{}
  let mode=null,dialog=null,lesson=null,step=0,tableMode=null;
  const H=G.help={lessons,isOpen:()=>!!dialog?.open||!!G.tour?.pauses,dialogOpen:()=>!!dialog?.open,read:openLesson,visit(next){mode=lessons[next]&&next!=='beginner'?next:null;tableButton.hidden=!mode;if(dialog?.open||G.tour?.active)return;if(!seen.beginner)guided('beginner');else if(mode&&!seen[mode])guided(mode);},open:guided,table:openTable};
  function guided(key='beginner'){G.tour.start(key,finished=>{seen[finished]=true;try{localStorage.setItem(KEY,JSON.stringify(seen));}catch{}});}
  function remember(){if(lesson){seen[lesson]=true;try{localStorage.setItem(KEY,JSON.stringify(seen));}catch{}}}
  function shell(){if(dialog?.open){dialog.remove();}dialog=document.createElement('dialog');dialog.className='guide-dialog';dialog.setAttribute('aria-labelledby','guide-title');document.body.append(dialog);dialog.addEventListener('cancel',()=>remember());const panel=dialog;dialog.addEventListener('close',()=>{if(dialog!==panel){panel.remove();return;}remember();panel.remove();dialog=null;lesson=null;if(!G.tour?.active&&mode&&!seen[mode])guided(mode);});dialog.showModal();}
  function openLesson(key='beginner'){if(!lessons[key])key='beginner';lesson=key;step=0;tableMode=null;shell();renderLesson();}
  function controls(){dialog.querySelector('[data-close]').onclick=()=>dialog.close();}
  function renderLesson(){const item=lessons[lesson],content=item.steps[step];dialog.innerHTML=`<header class="guide-heading"><h2 id="guide-title">${item.title}</h2><button data-close aria-label="關閉教學">×</button></header><label class="guide-select">教學章節<select aria-label="選擇教學">${Object.entries(lessons).map(([key,value])=>`<option value="${key}" ${key===lesson?'selected':''}>${value.title}</option>`).join('')}</select></label><div class="guide-progress">${step+1} / ${item.steps.length}<progress max="${item.steps.length}" value="${step+1}"></progress></div><section class="guide-content" tabindex="-1"><h3>${content[0]}</h3><p>${content[1]}</p><p>${content[2]}</p></section><div class="guide-buttons"><button data-prev ${step===0?'disabled':''}>上一步</button><button class="primary" data-next>${step===item.steps.length-1?'完成教學':'下一步'}</button></div><button class="guide-skip" data-close>稍後再看</button>`;dialog.querySelector('select').onchange=e=>{remember();lesson=e.target.value;step=0;renderLesson();};dialog.querySelector('[data-prev]').onclick=()=>{step--;renderLesson();};dialog.querySelector('[data-next]').onclick=()=>{if(step===item.steps.length-1)dialog.close();else{step++;renderLesson();dialog.querySelector('.guide-content').focus();}};dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());}
  function openTable(){lesson=null;tableMode=mode==='flick'?'flick':'standard';shell();renderTable();}
  function renderTable(){const flick=tableMode==='flick';dialog.innerHTML=`<header class="guide-heading"><h2 id="guide-title">${flick?'彈射傷害表':'五行相剋表'}</h2><button data-close aria-label="關閉相剋表">×</button></header><div class="guide-table-tabs"><button data-kind="standard" aria-pressed="${!flick}">一般對戰</button><button data-kind="flick" aria-pressed="${flick}">彈射</button></div><p>${flick?'列＝攻擊方，欄＝受擊方。數字是每次命中扣除的血量。':'列＝我方，欄＝對手。每格為「我方加成／對手加成」，加在當前面的攻擊上。'}</p><table class="element-matrix"><caption>${flick?'碰撞扣血':'普通、冒險、生死戰、3V3 適用'}</caption><thead><tr><th scope="col">${flick?'攻／受':'我／敵'}</th>${elements.map(e=>`<th scope="col">${e}</th>`).join('')}</tr></thead><tbody>${elements.map(a=>`<tr><th scope="row">${a}</th>${elements.map(b=>{const p=G.power({damage:0,element:a},{damage:0,element:b});return `<td>${flick?'−'+G.flick.damage(a,b):'+'+p.bonusA+'/+'+p.bonusB}</td>`;}).join('')}</tr>`).join('')}</tbody></table><div class="guide-relations"><p>相剋：金 → 木 → 土 → 水 → 火 → 金</p><p>相生：金 → 水 → 木 → 火 → 土 → 金</p><p>${flick?'相剋扣 3，打向生出自己的屬性扣 2，其餘扣 1。水打金 −2，水打火 −3。':'剋制方 +2；相生的受益方 +1；同屬性 +0。例：水對火，我方 +2；水對金，我方 +1。'}</p></div>`;controls();dialog.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{tableMode=b.dataset.kind;renderTable();});}
  const actions=document.createElement('div');actions.className='guide-actions';actions.innerHTML='<button type="button" data-guide>教學</button><button type="button" data-table hidden>相剋表</button>';const tableButton=actions.querySelector('[data-table]');actions.querySelector('[data-guide]').onclick=()=>guided(mode||'beginner');tableButton.onclick=openTable;document.querySelector('.header-menu').before(actions);
})(CoinGame);
