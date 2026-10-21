(function(N){
  N.signaling={
    encode(sessionId,description){return JSON.stringify({protocolVersion:N.protocolVersion,rulesVersion:N.rulesVersion,sessionId,type:description.type,sdp:description.sdp});},
    decode(raw,type,sessionId){
      N.assert(typeof raw==='string'&&raw.length>0&&raw.length<=N.maxSignal,'請貼上有效邀請／回覆（最多 128 KB）');
      let x;try{x=JSON.parse(raw);}catch{throw Error('連線資料不是有效 JSON');}
      N.assert(x&&x.protocolVersion===N.protocolVersion&&x.rulesVersion===N.rulesVersion,'版本不相容，雙方請更新 PWA 後重新配對');
      N.assert(N.isId(x.sessionId)&&(!sessionId||sessionId===x.sessionId)&&x.type===type,'房間或邀請／回覆類型不符');
      N.assert(typeof x.sdp==='string'&&x.sdp.length<120000&&/^v=0\r?\n/.test(x.sdp)&&/^m=application /m.test(x.sdp)&&/^a=ice-ufrag:/m.test(x.sdp)&&/^a=ice-pwd:/m.test(x.sdp)&&/^a=fingerprint:sha-256 /m.test(x.sdp)&&/^a=candidate:/m.test(x.sdp)&&!/^m=(audio|video) /m.test(x.sdp),'SDP 無效或缺少完整 ICE 候選資料');
      return {sessionId:x.sessionId,type:x.type,sdp:x.sdp};
    }
  };
})(CoinGame.network);
