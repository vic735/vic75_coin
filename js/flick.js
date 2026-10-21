(function(G){
  const F=G.flick={width:360,height:520,radius:16,maxSpeed:850,stepSeconds:1/120};
  F.damage=(a,b)=>G.config.counters[a]===b?3:G.config.generates[b]===a?2:1;
  F.alive=(m,owner)=>m.coins.filter(c=>c.owner===owner&&c.hp>0);
  F.stats=(m,owner)=>{const c=F.alive(m,owner),values=c.map(c=>c.hp);return {sum:values.reduce((a,b)=>a+b,0),count:c.length,spread:c.length?Math.max(...values)-Math.min(...values):0};};
  F.first=(m,random=Math.random)=>{const a=F.stats(m,'player'),b=F.stats(m,'ai');for(const key of ['sum','count','spread'])if(a[key]!==b[key])return a[key]<b[key]?'player':'ai';return random()<.5?'player':'ai';};
  F.create=(data,random=Math.random)=>{
    const base=G.newMatch(data,random);
    const coins=['player','ai'].flatMap(owner=>base[owner].map((coin,i)=>{
      const side=random()<.5?'front':'back';return {id:owner+'-'+i,owner,coin,side,hp:G.face(coin,side).damage,x:80+i*100,y:owner==='player'?420:100,vx:0,vy:0};
    }));
    const m={coins,phase:'setup',round:1,order:[],action:0,flip:{player:true,ai:true},setupFlip:{player:false,ai:false},log:[],winner:null};
    // AI commits its opening flip before the player submits their choice.
    let best=0;m.aiOpening=null;
    for(const c of F.alive(m,'ai')){const gain=G.face(c.coin,G.otherSide(c.side)).damage-c.hp;if(gain>best){best=gain;m.aiOpening=c.id;}}
    return m;
  };
  const changeFace=c=>{c.side=G.otherSide(c.side);c.hp=G.face(c.coin,c.side).damage;};
  F.begin=(m,id=null,random=Math.random)=>{
    if(m.phase!=='setup')throw Error('已完成開場');
    if(id!==null){const c=m.coins.find(c=>c.id===id&&c.owner==='player');if(!c)throw Error('請選擇己方硬幣');changeFace(c);m.setupFlip.player=true;}
    if(m.aiOpening){changeFace(m.coins.find(c=>c.id===m.aiOpening));m.setupFlip.ai=true;}
    F.newRound(m,random);
  };
  F.newRound=(m,random=Math.random)=>{const first=F.first(m,random);m.order=[first,first==='player'?'ai':'player'];m.action=0;m.actor=first;m.phase='turn';m.message=`第 ${m.round} 回合 · ${first==='player'?'我方':'對手'}先攻`;};
  F.finishAction=(m,random=Math.random)=>{
    for(const c of m.coins){c.vx=0;c.vy=0;}
    if(!F.alive(m,'player').length||!F.alive(m,'ai').length){m.winner=F.alive(m,'player').length?'player':'ai';m.phase='finished';m.message=m.winner==='player'?'勝利！對手硬幣已全部退場':'落敗，我方硬幣已全部退場';return;}
    if(m.action===0){m.action=1;m.actor=m.order[1];m.phase='turn';}
    else{m.round++;F.newRound(m,random);}
  };
  F.flip=(m,id,random=Math.random)=>{
    const c=m.coins.find(c=>c.id===id&&c.hp>0);
    if(m.phase!=='turn'||!c||c.owner!==m.actor||!m.flip[m.actor])throw Error('目前不能翻面');
    changeFace(c);m.flip[m.actor]=false;m.message=(c.owner==='player'?'我方':'對手')+'翻面，血量變為 '+c.hp+'，本次行動結束';F.finishAction(m,random);
  };
  F.shoot=(m,id,vx,vy)=>{
    const c=m.coins.find(c=>c.id===id&&c.hp>0),speed=Math.hypot(vx,vy);
    if(m.phase!=='turn'||!c||c.owner!==m.actor||!Number.isFinite(speed)||speed<20)throw Error('請拖曳己方硬幣瞄準');
    const scale=Math.min(1,F.maxSpeed/speed);c.vx=vx*scale;c.vy=vy*scale;
    m.shot={id,hits:[],elapsed:0};m.phase='moving';m.message=(m.actor==='player'?'我方':'對手')+'彈射中';
  };
  F.step=(m,dt=F.stepSeconds,random=Math.random)=>{
    if(m.phase!=='moving')return;
    // Substep even if callers supply a long frame; prevent fast coins tunnelling.
    if(dt>F.stepSeconds+1e-8){let remaining=Math.min(dt,.1);while(remaining>1e-8&&m.phase==='moving'){const step=Math.min(remaining,F.stepSeconds);F.step(m,step,random);remaining-=step;}return;}
    const live=m.coins.filter(c=>c.hp>0),r=F.radius;
    for(const c of live){c.x+=c.vx*dt;c.y+=c.vy*dt;const drag=Math.exp(-1.45*dt);c.vx*=drag;c.vy*=drag;
      if(c.x<r){c.x=r;c.vx=Math.abs(c.vx)*.8;}if(c.x>F.width-r){c.x=F.width-r;c.vx=-Math.abs(c.vx)*.8;}
      if(c.y<r){c.y=r;c.vy=Math.abs(c.vy)*.8;}if(c.y>(m.height||F.height)-r){c.y=(m.height||F.height)-r;c.vy=-Math.abs(c.vy)*.8;}
    }
    for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){
      const a=live[i],b=live[j];if(a.hp<=0||b.hp<=0)continue;
      let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=2*r)continue;
      const nx=d>0?dx/d:1,ny=d>0?dy/d:0,overlap=(2*r-d)/2+.01;
      a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
      const approach=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
      if(approach>0){const impulse=approach*.9;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;}
      const striker=a.id===m.shot.id?a:b.id===m.shot.id?b:null,target=striker===a?b:a;
      if(striker&&striker.owner!==target.owner&&!m.shot.hits.includes(target.id)){
        const damage=F.damage(G.face(striker.coin,striker.side).element,G.face(target.coin,target.side).element);
        target.hp=Math.max(0,target.hp-damage);m.shot.hits.push(target.id);m.log.push({attacker:striker.id,target:target.id,damage,round:m.round});m.message=(striker.owner==='player'?'我方':'對手')+'命中，造成 '+damage+' 點傷害';
        if(target.hp===0){target.vx=0;target.vy=0;}
      }
    }
    for(const c of live){c.x=Math.max(r,Math.min(F.width-r,c.x));c.y=Math.max(r,Math.min((m.height||F.height)-r,c.y));}
    m.shot.elapsed+=dt;
    if(!F.alive(m,'player').length||!F.alive(m,'ai').length||m.shot.elapsed>8||live.every(c=>c.hp<=0||Math.hypot(c.vx,c.vy)<4))F.finishAction(m,random);
  };
  F.aiAct=m=>{
    if(m.phase!=='turn'||m.actor!=='ai')return;
    const own=F.alive(m,'ai'),targets=F.alive(m,'player');
    if(m.flip.ai){const heal=own.find(c=>G.face(c.coin,G.otherSide(c.side)).damage-c.hp>=3);if(heal){F.flip(m,heal.id);return;}}
    let best=null;
    for(const c of own)for(const t of targets){const d=Math.hypot(t.x-c.x,t.y-c.y),damage=F.damage(G.face(c.coin,c.side).element,G.face(t.coin,t.side).element),score=(t.hp<=damage?10:damage)/Math.max(d,30);if(!best||score>best.score)best={c,t,d,score};}
    if(best){const speed=Math.min(F.maxSpeed,Math.max(220,best.d*2.2));F.shoot(m,best.c.id,(best.t.x-best.c.x)/Math.max(best.d,1)*speed,(best.t.y-best.c.y)/Math.max(best.d,1)*speed);}
  };
})(CoinGame);
