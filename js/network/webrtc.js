(function(N){
  class Peer{
    constructor(onState,onOpen,onData){
      N.assert(globalThis.isSecureContext&&globalThis.RTCPeerConnection&&globalThis.crypto?.subtle,'請用 HTTPS 遊戲網址或 localhost，以及支援 WebRTC 的瀏覽器');
      this.onState=onState;this.onOpen=onOpen;this.onData=onData;this.closed=false;
      this.pc=new RTCPeerConnection({iceServers:[],iceTransportPolicy:'all'});
      this.pc.ondatachannel=e=>{if(this.channel){this.fail('收到非預期的額外通道');return;}this.bind(e.channel);};
      this.pc.onconnectionstatechange=this.pc.oniceconnectionstatechange=()=>this.check();
    }
    fail(message){if(!this.closed)this.onState('failed',message);this.close();}
    check(){
      if(this.closed)return;
      if(this.pc.connectionState==='failed'||this.pc.iceConnectionState==='failed')this.fail('連線失敗；請確認同一區域網路、Wi-Fi 用戶端隔離及防火牆設定後重新配對');
      else if(['closed','disconnected'].includes(this.pc.connectionState)||['closed','disconnected'].includes(this.pc.iceConnectionState)){this.onState('interrupted','對手連線中斷，請重新配對');this.close();}
    }
    bind(channel){
      if(!channel.ordered||channel.maxRetransmits!==null||channel.maxPacketLifeTime!==null||channel.label!=='coin-duel-v1'){this.fail('DataChannel 設定不相容');return;}
      this.channel=channel;
      channel.onopen=()=>{if(this.closed)return;clearTimeout(this.connectTimer);this.onOpen();};
      channel.onmessage=e=>{if(!this.closed)this.onData(e.data);};
      channel.onclose=()=>this.fail('對手連線中斷');channel.onerror=()=>this.fail('資料通道傳輸失敗');
    }
    async gather(description){
      await this.pc.setLocalDescription(description);
      await new Promise((resolve,reject)=>{
        const done=error=>{clearTimeout(timer);this.pc.removeEventListener('icegatheringstatechange',check);this.cancelGather=null;error?reject(error):resolve();};
        const check=()=>{if(this.pc.iceGatheringState==='complete')done();};
        const timer=setTimeout(()=>done(Error('ICE 收集逾時，請重新產生邀請')),15000);
        this.cancelGather=()=>done(Error('已取消配對'));this.pc.addEventListener('icegatheringstatechange',check);check();
      });
      N.assert(!this.closed&&/^a=candidate:/m.test(this.pc.localDescription.sdp),'無可用的區域網路候選位址，請檢查瀏覽器及網路設定');
      return this.pc.localDescription;
    }
    connecting(){this.onState('connecting');this.connectTimer=setTimeout(()=>this.fail('連線逾時；同一 Wi-Fi 也可能因用戶端隔離或瀏覽器限制而無法互通'),45000);}
    async offer(){this.bind(this.pc.createDataChannel('coin-duel-v1',{ordered:true}));return this.gather(await this.pc.createOffer());}
    async answer(signal){await this.pc.setRemoteDescription({type:'offer',sdp:signal.sdp});const description=await this.gather(await this.pc.createAnswer());return description;}
    async accept(signal){await this.pc.setRemoteDescription({type:'answer',sdp:signal.sdp});this.connecting();}
    send(raw){N.assert(!this.closed&&this.channel?.readyState==='open','資料通道尚未開啟');N.assert(this.channel.bufferedAmount<262144,'傳送佇列過大，請重新配對');this.channel.send(raw);}
    close(){if(this.closed)return;this.closed=true;clearTimeout(this.connectTimer);this.cancelGather?.();this.channel?.close();this.pc.close();}
  }
  N.Peer=Peer;
})(CoinGame.network);
