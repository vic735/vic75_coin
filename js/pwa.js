(function(G) {
  const state=G.pwa={ready:false,installed:matchMedia('(display-mode: standalone)').matches || navigator.standalone===true,canInstall:false,error:''};
  let installPrompt;
  const update=()=>window.dispatchEvent(new Event('pwa-status'));
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();installPrompt=event;state.canInstall=true;update();
  });
  window.addEventListener('appinstalled',()=>{
    state.installed=true;state.canInstall=false;installPrompt=null;update();
  });
  G.requestDurableStorage=async()=>{
    try {return await navigator.storage?.persist?.() || false;}catch{return false;}
  };
  G.installApp=async()=>{
    if(!installPrompt)return false;
    const prompt=installPrompt;installPrompt=null;state.canInstall=false;
    await prompt.prompt();
    const choice=await prompt.userChoice;
    if(choice.outcome==='accepted')await G.requestDurableStorage();
    update();return choice.outcome==='accepted';
  };
  if(location.protocol==='file:'){
    state.error='目前是直接開啟檔案。請改從遊戲的 HTTPS 網址開啟，才能安裝到手機。';
  }else if(!isSecureContext || !('serviceWorker' in navigator)){
    state.error='請使用支援安裝的瀏覽器，從 HTTPS 遊戲網址開啟。';
  }else{
    navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{
      state.ready=true;update();
    }).catch(()=>{
      state.error='離線內容準備失敗，請連網後重開遊戲再試。';update();
    });
  }
})(CoinGame);
