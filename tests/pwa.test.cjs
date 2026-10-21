const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
test('manifest and cached files resolve under a GitHub Pages project path',async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'./index.html');assert.equal(manifest.scope,'./');
 for(const icon of manifest.icons){assert.ok(fs.existsSync(path.join(root,icon.src)));const bytes=fs.readFileSync(path.join(root,icon.src));assert.equal(bytes.readUInt32BE(16),parseInt(icon.sizes));}
 const handlers={};let assets=[];
 vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),{self:{addEventListener:(type,fn)=>handlers[type]=fn},caches:{open:async()=>({addAll:async list=>assets=Array.from(list)})}});
 let install;handlers.install({waitUntil:p=>install=p});await install;
 for(const asset of assets){assert.ok(fs.existsSync(path.join(root,asset)));assert.ok(new URL(asset,'https://example.github.io/coin-duel/').pathname.startsWith('/coin-duel/'));}
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const match of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g))assert.ok(assets.includes('./'+match[1]),match[1]+' is cached');
});
test('offline fetch uses cache; activation keeps unrelated caches',async()=>{
 const handlers={},deleted=[];let claimed=false;
 const hit={offline:true};
 vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),{URL,self:{registration:{scope:'https://example.github.io/coin-duel/'},clients:{claim:async()=>claimed=true},addEventListener:(type,fn)=>handlers[type]=fn},caches:{keys:async()=>['other-game','coin-duel-shell-v0','coin-duel-shell-v25'],delete:async k=>deleted.push(k),open:async()=>({match:async()=>hit})},fetch:()=>{throw Error('offline');}});
 let work;handlers.activate({waitUntil:p=>work=p});await work;assert.deepEqual(deleted,['coin-duel-shell-v0']);assert.equal(claimed,true);
 handlers.fetch({request:{method:'GET',url:'https://example.github.io/coin-duel/index.html'},respondWith:p=>work=p});assert.equal(await work,hit);
});
