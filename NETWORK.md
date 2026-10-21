# WebRTC 區域連線 V1.0

實作日期：2026-10-21。離線資源版本：`coin-duel-shell-v30`。

## 使用與實際配對

1. 電腦與手機連到可互相訪問的區域網路。雙方開啟同一個已更新的 HTTPS 遊戲網址，或已完成快取的 PWA。
2. 在「編隊」選三枚硬幣，六個面都裝備鍍膜。
3. 首頁「連線對戰」或右上選單進入。A 選「建立房間」。等待收集完成，複製完整邀請 JSON，交給 B（例如貼進雙方可用的訊息工具）。
4. B 選「加入房間」，貼上邀請，按「產生連線回覆」。複製完整回覆交給 A，再按「已交付回覆，等待連線」。
5. A 貼上 B 回覆，按「完成配對」。只有可靠有序 DataChannel 已 open，且雙方 HELLO / HELLO_ACK、協定與規則版本檢查都完成，才會顯示「連線成功，可以開始對戰」。
6. 雙方確認自己的三枚硬幣後按「鎖定編隊並準備」。也可以先返回編隊調整；準備後鎖定本場快照。
7. 每局點選一枚硬幣並鎖定。雙方揭示後共同擲幣；看完數字，選擇「干涉翻面」或「保持原面」。兩邊決定都鎖定後才揭示。每場各一次干涉。
8. 看完本局結果，雙方按確認進入下一局。完成三個分出勝負的回合後結算。平手沿用現行普通模式：不計分、雙方收回硬幣重戰，已用干涉不退還。
9. 離開或中斷時不會自動判對方勝利。按「重新配對」建立新的房間、新的三局對戰。

瀏覽器若不允許 Clipboard API，一鍵複製會改為選取文字；可長按複製／貼上。不要截斷 JSON。完整 SDP 僅在記憶體及配對文字區，不寫入 localStorage 或 Cache Storage；握手後清除文字區。

## 檔案清單

新增正式資源：

- `js/network/protocol.js`：版本、訊息包裝驗證、確定性序列化、編隊驗證與快照。
- `js/network/signaling.js`：含版本的完整 SDP JSON 編解碼及大小、候選、類型驗證。
- `js/network/webrtc.js`：無 STUN/TURN 的 PeerConnection、完整 ICE 收集、可靠有序 DataChannel、連線監控。
- `js/network/commitReveal.js`：128-bit nonce、SHA-256 承諾與共同擲幣。
- `js/network/multiplayer.js`：純函式適配層，直接呼叫原 `G.resolveRound` / `G.summary`，沿用 `G.face` / `G.power`。
- `js/network/session.js`：握手、大廳、雙方承諾／揭示、狀態機、重複訊息、防止重複結算、驗證與逾時。
- `js/network/connectionUI.js`：配對、大廳、三局戰鬥與手機操作。
- `network.css`：延續現有配色與硬幣素材的手機版型。
- `tests/network.test.cjs`、`tests/network-browser.cjs`：協定及真實 Chrome/Edge DataChannel 測試。
- `NETWORK.md`：本文件。

修改：`index.html`（載入模組、選單）、`js/app.js`（首頁入口與路由）、`sw.js`（新增資源、快取版本）、`tests/browser-check.cjs`（測試入口）、`tests/pwa.test.cjs` / `tests/pwa-check.cjs`（版本、54 個快取資源）、`README.md`（使用文件連結）。

原 `manifest.webmanifest`、安裝方式、localStorage key、原本收藏結構與單人戰鬥公式沿用。網路模組不寫入單人存檔，也不提供排名或冒險獎勵。

## 協定與公平性

信令 JSON：`protocolVersion, rulesVersion, sessionId, type, sdp`。最多 128 KiB 字元，SDP 最多 120000 字元，必須包含 application、ICE credentials、SHA-256 fingerprint 及候選，排除 audio/video。ICE complete 後才輸出 `localDescription`。目前協定 1，規則 `standard-3-decisive-coating-v1`，遊戲版本 `V0.1 / LAN 1.0`。

每個房間只打一場；重新配對生成新的隨機 128-bit sessionId。A/B 是此房間內固定玩家識別。訊息包含 `protocolVersion, sessionId, messageId, senderId, type, payload`；重要訊息與心跳都有隨機唯一 ID。每則最多 32 KiB 字元。相同 ID 相同內容只處理一次，相同 ID 不同內容中斷。額外 ID 的重複操作由階段驗證攔截。

JSON 雜湊使用物件 key 排序、陣列保留順序、JSON 原始型別編碼，再以 UTF-8 計算 SHA-256。出幣及干涉的雜湊輸入固定為：

```text
["coin-duel-commit", protocolVersion, rulesVersion, sessionId,
 attempt, stage, senderId, choice, nonce]
```

`attempt` 每次對擲（包括平手重戰）增加，避免同局平手重放。nonce 是 `crypto.getRandomValues` 取得的 16 bytes，編為 32 個小寫 hex 字元。雙方承諾齊全後才揭示；揭示時驗證合法選擇、nonce 與原承諾。

共同擲幣輸入：

```text
["coin-duel-toss", protocolVersion, sessionId, attempt,
 ["A", A.choice, A.nonce], ["B", B.choice, B.nonce]]
```

SHA-256 第一個 byte 的 bit 0 決定 A、bit 1 決定 B；0 正面、1 反面。雙方傳送並驗證 FLIP_RESULT，無房主指定的權威隨機結果。

DECK_LOCK / READY 只同步本場三枚硬幣及六面鍍膜，包含鍍膜 +0～+5。驗證每面正整數、總和 6～12、獨立 ID、合法五行與鍍膜加成。雙方對同一份 canonical A/B 狀態結算，交換 ROUND_RESULT 與 STATE_SYNC 雜湊。三局後交換 MATCH_RESULT 及 summary，確認相同才顯示整場結果。STATE_SYNC 是驗證，不會盲目覆寫本機狀態。

事件：HELLO、HELLO_ACK、DECK_LOCK、READY、ROUND_COMMIT、ROUND_REVEAL、FLIP_RESULT、INTERFERE_COMMIT、INTERFERE_REVEAL、ROUND_RESULT、STATE_SYNC、MATCH_RESULT、NEXT、PING、PONG、LEAVE、ERROR。

## 異常與生命週期

- ICE 收集 15 秒逾時；A 接受回覆或 B 點開始等待後，連線 45 秒逾時。
- 通道開啟後握手最多 45 秒；對戰階段等待最多 180 秒。
- 每 5 秒心跳；25 秒無有效訊息或回前景時已逾時，標記中斷。SDP 手動交換期間不套用已連線的心跳限制，方便切換 App 傳送邀請。
- PeerConnection / ICE disconnected、failed、closed 或通道關閉會立即停止對戰操作。錯誤揭示、錯誤雜湊、錯誤版本、非法訊息也會中斷。
- 中斷時在目前頁面記憶體保留 `network.interrupted`（已驗證狀態、擲幣、原階段）；不會寫到單人存檔。不支援重載後恢復、ICE restart 或續接舊局。重新配對開始新局。
- 已完成且相互驗證的對戰，在後續斷線時仍註記完成；未完成對戰不判勝。

## 自動測試

在專案資料夾執行，需 Node.js（瀏覽器測試使用內建 WebSocket 的版本）：

```powershell
node --test --test-isolation=none tests/game.test.cjs tests/flick.test.cjs tests/pwa.test.cjs tests/network.test.cjs
node tests/browser-check.cjs
node tests/browser-check.cjs --network
node tests/browser-check.cjs --pwa
```

`--network` 以無頭 Chrome 和 Edge、獨立使用者資料夾、真實 RTCPeerConnection / RTCDataChannel 運行，沒有假通道或伺服器代替遊戲訊息。HTTP localhost 伺服器僅提供靜態檔案，網址包含 `/coin-duel/` 子路徑；手動 SDP 在測試中透過表單交換。預設 Windows Chrome / Edge 安裝路徑在測試檔內，其他系統需調整。一般與 PWA 測試可透過 `COIN_DUEL_CHROME` 指定 Chrome。

本機人工預覽可以在專案上層執行 `python -m http.server 8000 --bind 127.0.0.1`，電腦使用 `http://localhost:8000/coin-duel/`。手機請使用部署的 HTTPS 網址；手機開電腦區網 HTTP IP 通常不是安全來源，不可當作正式 WebRTC/PWA 測試方式。

## 驗收紀錄

| 項目 | 結果 |
| --- | --- |
| 單元與既有遊戲規則測試 | 52 項通過 |
| Chrome ↔ Edge 實際 SDP / DataChannel / 雙向協定 | 已通過，同一 Windows 電腦的兩個獨立瀏覽器程序 |
| 編隊鎖定、隱藏出幣／干涉、共同擲幣、三個決勝回合、雜湊一致 | 已通過 |
| 重複 ID、無效資料、版本不符、錯誤承諾／狀態雜湊、重用硬幣／干涉 | 已通過自動測試 |
| 錯誤邀請、重新配對、進行中實際斷線、保留收藏、回到單人模式 | 已通過 |
| 手機尺寸與桌面版型 | 320×568、390×700、430×800、1024×768 的配對至結算自動檢查；不等於實機手機驗收 |
| PWA manifest、54 個本機資源快取、完整瀏覽器重開、離線重載、存檔保留 | 已通過 |
| GitHub Pages Repository 子路徑 | 本機 `/coin-duel/` 模擬通過；正式部署後仍需驗收 |
| Chrome ↔ Android Chrome | 待實機驗收 |
| 電腦 ↔ iPhone Safari／已安裝 PWA | 待實機驗收 |
| 兩台 Android 同 Wi-Fi | 待實機驗收 |
| 兩台實體電腦 Chrome ↔ Edge 跨區網裝置 | 待實機驗收；同機雙瀏覽器已通過 |
| 正式 GitHub Pages 的更新與實際 LAN 配對 | 待使用者上傳本版後驗收 |

## GitHub Pages 部署

上傳 `index.html`、所有原有 CSS/JS/素材、`network.css`、整個 `js/network/`、`js/vendor/` 與 `sw.js`。保留現有 manifest、圖示與相對路徑；不用新增伺服器、環境變數、CDN、資料庫或帳號。測試與文件不屬於執行必要資源。

本版 Service Worker 名稱是 `coin-duel-shell-v30`。更新後關閉所有舊遊戲分頁與 PWA 視窗再重開，讓等待中的 SW 接手；不要為了更新清除網站資料。雙方都需載入相容版本才可開始遊戲。之後改動戰鬥規則必須同步更新 `rulesVersion`；改動傳輸格式更新 `protocolVersion`，每次正式資源異動也更新 SW 快取版本。

完整資源快取後，可無網際網路啟動單機遊戲。P2P 仍需要可互通的本地網路；如果用訊息 App 交換 SDP，該訊息工具可能另需網際網路，遊戲本身沒有依賴它。

## 已知限制與 QR 配對

只使用 `iceServers: []`、`iceTransportPolicy: 'all'`。Wi-Fi 用戶端隔離、訪客網路、企業防火牆、VPN、不同網段、不相容的 mDNS host candidate 行為都可能讓連線失敗。瀏覽器錯誤無法精確區分是哪一種網路原因，因此介面顯示可檢查項目，不假稱已找到原因。沒有 TURN 備援，不能保證跨網際網路或所有 Safari / 手機瀏覽器成功。

這是好友休閒模式。承諾／揭示阻止承諾後改選及一方指定擲幣，但不能阻止改造客戶端偽造合法範圍內的收藏、選擇性中斷、裝置被控制等情況。不提供排名、防作弊權威伺服器、舊局恢復、聊天室。

QR 配對已實作，保留文字交換作為備援：

1. A 建立房間，按「顯示 QR Code」。
2. B 加入房間，按「掃描 QR」→「開啟相機」，對準 A 的畫面直到分段全部收齊。也可匯入下載的 QR 圖片，支援多選。
3. B 按「產生連線回覆」，顯示回覆 QR；A 掃描收齊後按「完成配對」。
4. 等待 DataChannel 與遊戲握手完成才進入大廳。

長 SDP 使用每 1.6 秒輪播的多張 QR，可暫停、手動換頁、逐張下載。每段包含版本、房間、類型、段號、總數與完整資料 SHA-256；順序不限、重複不計，收齊並通過驗證才填入 SDP。掃到另一組資料會拒絕，可重設收集進度。QR 只改變資料搬運方式，不改動遊戲協定。

相機須瀏覽器允許權限；建議使用 GitHub Pages HTTPS。關閉掃描或進入背景會停止相機，回前景需再次按開啟相機。不支援相機或權限遭拒可匯入圖片／使用文字。所有 QR 程式與授權檔皆本機打包並加入離線快取，無執行時 CDN。QR 影像編解碼、分段驗證及 Chrome ↔ Edge 的雙向 QR 圖片配對已自動測試；實體手機鏡頭掃描、Safari 與跨裝置辨識速度仍待實機驗收。
參考官方 API 文件：[ICE gathering complete](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icegatheringstatechange_event)、[RTCDataChannel 範例](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Simple_RTCDataChannel_sample)。


## v30：壓縮 QR

完整 SDP 先以瀏覽器原生 gzip 壓縮，再切成 QR。讀取端收齊後解壓、驗證原始資料 SHA-256 與 SDP，資料不會被截短。測試中的 Chrome ↔ Edge 邀請與回覆各由 3 張減為 2 張；實際張數依裝置與候選位址而異。只有一張時會隱藏輪播按鈕。

新版能讀取 v1 未壓縮 QR 及 v2 gzip QR；舊版遊戲無法讀取壓縮 QR，雙方請更新至 v30。不支援原生壓縮的瀏覽器會產生原本的 QR；不能解壓時會提示使用文字配對。解壓有 128 KB 上限，損壞或過度膨脹的資料會被拒絕。無外部服務、無新增套件。