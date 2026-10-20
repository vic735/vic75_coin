(function(G){
  const paths={
    swords:'m5 3 6 6-2 2-6-6V3h2Zm14 0-6 6 2 2 6-6V3h-2ZM4 14l6 6m-7-1 6-6m11 1-6 6m7-1-6-6M8 16l7-7m1 7-7-7',
    cards:'m8 3 12 3-4 16-12-3L8 3ZM6 5 3 6 1 20l10 1m2-13v7m-3-4 6 1',
    coin:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 5l2 4 4 .5-3 3 .7 4.5-3.7-2-3.7 2 .7-4.5-3-3L10 9l2-4Z',
    team:'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 10v-3a6 6 0 0 1 12 0v3M4 11a3 3 0 1 1 0-6m16 6a3 3 0 1 0 0-6M2 21v-4a4 4 0 0 1 3-4m17 8v-4a4 4 0 0 0-3-4',
    film:'m12 2 9 10-9 10L3 12 12 2Zm0 5v10M7 12h10',
    gift:'M3 10h18v11H3V10Zm-1-5h20v5H2V5Zm10 0v16m0-16C4 6 4 0 8 2l4 3Zm0 0c8 1 8-5 4-3l-4 3Z',
    home:'m2 11 10-9 10 9M5 9v12h5v-7h4v7h5V9',
    menu:'M4 6h16M4 12h16M4 18h16',
    flip:'M20 7a8 8 0 0 0-14-2L3 8m0-5v5h5m-4 9a8 8 0 0 0 14 2l3-3m0 5v-5h-5',
    arrow:'m9 5 7 7-7 7',
    check:'m5 12 4 4L19 6'
  };
  const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]||paths.coin}"/></svg>`;
  const seal=side=>`<div class="sunmoon-seal seal-${side}" aria-hidden="true"><div class="seal-inset">${side==='sun'?'<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="19"/>'+Array.from({length:12},(_,i)=>`<path d="M46 25 50 7 54 25Z" transform="rotate(${i*30} 50 50)"/>`).join('')+'</svg>':'<svg viewBox="0 0 100 100"><path d="M72 19A35 35 0 1 0 75 77 30 30 0 0 1 72 19Z"/></svg>'}</div></div>`;
  const coin=(value,side,element,large=false)=>`<div class="coin ${side} core-${element||'none'} ${large?'large':''}"><i class="coin-center" aria-hidden="true"></i><i class="coin-coating" aria-hidden="true"></i><i class="coin-frame" aria-hidden="true"></i><strong>${value}</strong></div>`;
  const images={},names={金:'metal',木:'wood',水:'water',火:'fire',土:'earth'};
  const imageFor=name=>{if(!images[name]){const img=new Image();img.src='assets/coins/'+name+'.png';images[name]=img;}return images[name];};
  const paintCoin=(ctx,x,y,r,side,element)=>{
    const face=side==='front'?'light':'dark';
    const layer=(name,outer,inner,sx,sy,sw)=>{const img=imageFor(name);if(!img.complete||!img.naturalWidth)return;ctx.save();ctx.beginPath();ctx.arc(x,y,r*outer,0,Math.PI*2);if(inner)ctx.arc(x,y,r*inner,0,Math.PI*2,true);ctx.clip('evenodd');ctx.drawImage(img,sx,sy,sw,sw,x-r*outer,y-r*outer,r*outer*2,r*outer*2);ctx.restore();};
    ctx.fillStyle=side==='front'?'#b69a62':'#55565a';ctx.beginPath();ctx.arc(x,y,r*.98,0,Math.PI*2);ctx.fill();
    layer('center-'+face,names[element] ? .55 : .83,0,76,62,1095);
    if(names[element])layer(names[element],.84,.52,18,18,476);
    layer('frame-'+face,1,.80,16,8,1216);
  };
  G.presentation={icon,seal,coin,paintCoin,loadCoins:()=>Promise.all(['center-light','center-dark','frame-light','frame-dark',...Object.values(names)].map(name=>{const img=imageFor(name);return img.decode().catch(()=>{});} ))};
})(CoinGame);
