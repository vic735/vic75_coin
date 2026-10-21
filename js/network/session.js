(function(N){
  class Session{
    constructor(sessionId,id,send,onChange=()=>{},onStop=()=>{}){
      this.sessionId=sessionId;this.id=id;this.index=id==='A'?0:1;this.other=this.index^1;this.sendRaw=send;this.onChange=onChange;this.onStop=onStop;
      this.phase='handshake';this.decks=[null,null];this.readyFlags=[false,false];this.seen=new Map();this.queue=Promise.resolve();this.lastSeen=Date.now();this.pendingPing=null;this.stopped=false;
    }
    emit(){this.onChange(this);}
    phaseTo(phase){if(this.stopped)return;this.phase=phase;this.deadline=phase==='finished'?Infinity:Date.now()+180000;this.emit();}
    enqueue(task){this.queue=this.queue.then(async()=>{if(!this.stopped)await task();}).catch(e=>this.abort(e.message));return this.queue;}
    send(type,payload){N.assert(!this.stopped,'本場已中斷');const m={protocolVersion:N.protocolVersion,sessionId:this.sessionId,messageId:N.random(),senderId:this.id,type,payload};this.sendRaw(JSON.stringify(m));}
    start(){
      this.deadline=Date.now()+45000;
      this.send('HELLO',{rulesVersion:N.rulesVersion,gameVersion:N.gameVersion});
      this.clock=setInterval(()=>{
        if(this.stopped)return;
        if(Date.now()-this.lastSeen>25000||Date.now()>this.deadline){this.abort('等待對方逾時，對戰未完成；請重新配對');return;}
        if(!this.pendingPing){this.pendingPing=N.random();try{this.send('PING',{token:this.pendingPing});}catch(e){this.abort(e.message);}}
      },5000);this.clock.unref?.();
    }
    checkForeground(){if(this.clock&&!this.stopped&&Date.now()-this.lastSeen>25000)this.abort('返回前景時連線已逾時，請重新配對');}
    abort(message,notify=true){
      if(this.stopped)return;
      if(notify)try{this.send('ERROR',{message:String(message).slice(0,180)});}catch{}
      this.completed=this.phase==='finished';const previousPhase=this.phase;
      this.stopped=true;this.error=this.completed?'對戰已完成，連線已結束':String(message).slice(0,220);this.phase='interrupted';clearInterval(this.clock);
      N.interrupted={sessionId:this.sessionId,phase:previousPhase,state:this.state?JSON.parse(JSON.stringify(this.state)):null,toss:this.toss?JSON.parse(JSON.stringify(this.toss)):null,error:this.error};this.emit();this.onStop();
    }
    leave(){if(!this.stopped)try{this.send('LEAVE',{});}catch{}this.abort('已離開房間，本場未完成',false);}
    receive(raw){return this.enqueue(async()=>{
      const m=N.parseMessage(raw);
      N.assert(m.sessionId===this.sessionId&&m.senderId===(this.id==='A'?'B':'A'),'訊息房間或玩家不符');
      const canonical=N.canonical(m);if(this.seen.has(m.messageId)){N.assert(this.seen.get(m.messageId)===canonical,'重複 ID 內容不同');return;}
      N.assert(this.seen.size<20000,'會話訊息數量超限，請重新配對');this.seen.set(m.messageId,canonical);this.lastSeen=Date.now();
      const p=m.payload;
      if(m.type==='ERROR'){this.abort('對方回報協定錯誤，對戰未完成',false);return;}
      if(m.type==='LEAVE'){this.abort('對方已離開，本場未完成',false);return;}
      if(m.type==='PING'){N.assert(N.isId(p.token),'心跳格式錯誤');this.send('PONG',{token:p.token});return;}
      if(m.type==='PONG'){N.assert(p.token===this.pendingPing,'心跳回覆不符');this.pendingPing=null;return;}
      if(m.type==='HELLO'){
        N.assert(this.phase==='handshake'&&!this.hello&&p.rulesVersion===N.rulesVersion&&p.gameVersion===N.gameVersion,'遊戲／規則版本不相容，請雙方更新 PWA');
        this.hello=true;this.send('HELLO_ACK',{rulesVersion:N.rulesVersion});this.handshaken();return;
      }
      if(m.type==='HELLO_ACK'){N.assert(this.phase==='handshake'&&!this.ack&&p.rulesVersion===N.rulesVersion,'握手確認不符');this.ack=true;this.handshaken();return;}
      N.assert(this.hello&&this.ack,'尚未完成協定握手');
      if(m.type==='DECK_LOCK'){
        N.assert(this.phase==='lobby'&&!this.decks[this.other],'編隊已鎖定或階段不符');
        this.decks[this.other]=N.deck(p.deck);this.emit();return;
      }
      if(m.type==='READY'){
        N.assert(this.phase==='lobby'&&this.decks[this.other]&&!this.readyFlags[this.other]&&p.deckHash===await N.hash(this.decks[this.other]),'準備資料或編隊雜湊不符');
        this.readyFlags[this.other]=true;this.maybeStart();return;
      }
      N.assert(this.state&&p.attempt===this.state.attempt,'對戰局次不符');
      if(m.type==='ROUND_COMMIT'||m.type==='INTERFERE_COMMIT'){
        const kind=m.type==='ROUND_COMMIT'?'coin':'interfere';N.assert(this.phase===(kind==='coin'?'select':'interfere'),'承諾階段錯誤');
        const st=this.stages[kind];N.assert(!st.commits[this.other]&&N.isHash(p.hash),'重複或無效承諾');st.commits[this.other]=p.hash;await this.progress(kind);return;
      }
      if(m.type==='ROUND_REVEAL'||m.type==='INTERFERE_REVEAL'){
        const kind=m.type==='ROUND_REVEAL'?'coin':'interfere',st=this.stages[kind];
        N.assert(this.phase===(kind==='coin'?'select':'interfere')&&st.commits.every(Boolean)&&!st.reveals[this.other]&&N.isId(p.nonce),'未承諾就揭示、重複揭示或 nonce 無效');
        this.validateChoice(kind,this.other,p.choice);
        N.assert(await N.commitment(this.sessionId,this.state.attempt,kind,m.senderId,p.choice,p.nonce)===st.commits[this.other],'揭示與承諾不符，對戰中斷');
        st.reveals[this.other]={choice:p.choice,nonce:p.nonce};await this.progress(kind);return;
      }
      if(m.type==='FLIP_RESULT'){
        N.assert(this.phase==='tossVerify'&&N.canonical(p.result)===N.canonical(this.toss),'擲幣共同驗證失敗');
        this.phaseTo('interfere');return;
      }
      if(m.type==='ROUND_RESULT'){
        N.assert(this.phase==='verify'&&!this.roundAck&&p.hash===this.stateHash,'單局結算雜湊不一致');this.roundAck=true;return;
      }
      if(m.type==='STATE_SYNC'){
        N.assert(this.phase==='verify'&&this.roundAck&&p.hash===this.stateHash,'狀態同步驗證失敗');
        if(this.state.history.length===3){this.phaseTo('matchVerify');this.send('MATCH_RESULT',{attempt:this.state.attempt,hash:this.stateHash,summary:N.summary(this.state)});}
        else this.phaseTo('roundEnd');return;
      }
      if(m.type==='MATCH_RESULT'){
        N.assert(this.phase==='matchVerify'&&p.hash===this.stateHash&&N.canonical(p.summary)===N.canonical(N.summary(this.state)),'整場結算驗證失敗');this.phaseTo('finished');return;
      }
      if(m.type==='NEXT'){
        N.assert(this.phase==='roundEnd'&&!this.nextFlags[this.other],'不能進入下一局');this.nextFlags[this.other]=true;this.maybeNext();return;
      }
      throw Error('不符合目前狀態的訊息');
    });}
    handshaken(){if(this.hello&&this.ack)this.phaseTo('lobby');}
    ready(data){return this.enqueue(async()=>{
      if(this.phase!=='lobby'||this.readyFlags[this.index])return;
      const deck=N.snapshot(data);this.decks[this.index]=deck;this.readyFlags[this.index]=true;
      this.send('DECK_LOCK',{deck});this.send('READY',{deckHash:await N.hash(deck)});this.maybeStart();
    });}
    maybeStart(){if(this.readyFlags.every(Boolean)){this.state=N.initial(this.decks);this.beginRound();}else this.emit();}
    beginRound(){this.stages={coin:{commits:[null,null],reveals:[null,null]},interfere:{commits:[null,null],reveals:[null,null]}};this.nextFlags=[false,false];this.roundAck=false;this.toss=null;this.phaseTo('select');}
    validateChoice(kind,index,choice){
      if(kind==='coin')N.assert(Number.isInteger(choice)&&choice>=0&&choice<3&&!this.state.used[index].includes(this.state.decks[index][choice].id),'選擇了無效或已使用硬幣');
      else N.assert(typeof choice==='boolean'&&(!choice||this.state.interference[index]),'干涉次數已用盡或選擇無效');
    }
    choose(kind,choice){return this.enqueue(async()=>{
      if(this.phase!==(kind==='coin'?'select':'interfere'))return;
      const st=this.stages[kind];if(st.commits[this.index])return;this.validateChoice(kind,this.index,choice);
      st.secret={choice,nonce:N.random()};st.commits[this.index]=await N.commitment(this.sessionId,this.state.attempt,kind,this.id,choice,st.secret.nonce);
      this.send(kind==='coin'?'ROUND_COMMIT':'INTERFERE_COMMIT',{attempt:this.state.attempt,hash:st.commits[this.index]});await this.progress(kind);
    });}
    async progress(kind){
      const st=this.stages[kind];
      if(st.commits.every(Boolean)&&!st.reveals[this.index]){
        st.reveals[this.index]=st.secret;
        this.send(kind==='coin'?'ROUND_REVEAL':'INTERFERE_REVEAL',{attempt:this.state.attempt,...st.secret});
      }
      if(st.reveals.every(Boolean)&&!st.done){
        st.done=true;
        if(kind==='coin'){
          this.toss=await N.toss(this.sessionId,this.state.attempt,st.reveals);this.phaseTo('tossVerify');
          this.send('FLIP_RESULT',{attempt:this.state.attempt,result:this.toss});
        }else{
          const picks=this.stages.coin.reveals.map(r=>r.choice),flips=st.reveals.map(r=>r.choice);
          this.state=N.resolve(this.state,picks,this.toss.sides,flips);this.stateHash=await N.hash(this.state);this.phaseTo('verify');
          this.send('ROUND_RESULT',{attempt:this.state.attempt,hash:this.stateHash});this.send('STATE_SYNC',{attempt:this.state.attempt,hash:this.stateHash});
        }
      }else this.emit();
    }
    next(){return this.enqueue(async()=>{if(this.phase!=='roundEnd'||this.nextFlags[this.index])return;this.nextFlags[this.index]=true;this.send('NEXT',{attempt:this.state.attempt});this.maybeNext();});}
    maybeNext(){if(this.nextFlags.every(Boolean)){this.state.attempt++;this.beginRound();}else this.emit();}
  }
  N.Session=Session;
})(CoinGame.network);
