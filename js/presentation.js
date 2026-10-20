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
  const names={金:'metal',木:'wood',水:'water',火:'fire',土:'earth'},images={};
  const sprite=(side,element)=>(side==='front'?'light':'dark')+'-'+(names[element]||'none');
  const coin=(value,side,element,large=false)=>`<div class="coin ${side} core-${element||'none'} ${large?'large':''}" style="--coin-image:url('assets/coins/composed/${sprite(side,element)}.png')"><strong>${value}</strong></div>`;
  const imageFor=name=>{if(!images[name]){const img=new Image();img.src='assets/coins/composed/'+name+'.png';images[name]=img;}return images[name];};
  const paintCoin=(ctx,x,y,r,side,element)=>{
    const img=imageFor(sprite(side,element));
    if(img.complete&&img.naturalWidth)ctx.drawImage(img,x-r,y-r,r*2,r*2);
  };
  G.presentation={icon,seal,coin,paintCoin,loadCoins:()=>Promise.all(['light','dark'].flatMap(face=>[...Object.values(names),'none'].map(element=>{const img=imageFor(face+'-'+element);return img.decode().catch(()=>{});} )))};
})(CoinGame);
