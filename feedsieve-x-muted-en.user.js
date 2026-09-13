// ==UserScript==
// @name         FeedSieve → X Muted Words Manager (English Pack)
// @namespace    feedsieve-x-muted-en
// @version      4.1.0
// @description  English X muted-word Tampermonkey script: built-in pack, dedupe, 15-word batches, pause/resume, custom seconds and keyword manager
// @match        https://x.com/settings/muted_keywords*
// @match        https://x.com/settings/add_muted_keyword*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @run-at       document-idle
// @homepageURL  https://github.com/uumego/feedsieve-x-muted-words
// @supportURL   https://github.com/uumego/feedsieve-x-muted-words/issues
// ==/UserScript==
(()=>{'use strict';
const V='4.1.0',S='2026.09.13.2-en',P='fsxe',T={"ready":"Ready","scan":"Scanning existing X muted words…","active":"Active","batch":"Batch","next":"Next-batch interval","sec":"sec","min":"min","start":"Start / Resume","running":"Auto running","pause":"Pause","once":"Run one batch (15)","manage":"Manage keywords","scanbtn":"Scan existing muted words","local":"View local progress","mgr":"Keyword Manager","search":"Search keywords","customph":"Add custom keywords: one per line or comma-separated","add":"Add","export":"Export active TXT","reset":"Reset built-in defaults","close":"Close","defaulton":"Built-in · default on","defaultoff":"Built-in · default off","custom":"Custom","enable":"Enable","disable":"Disable","delete":"Delete","paused":"Paused; progress saved","all":"All enabled keywords have been processed","failpause":"Repeated failures; auto-paused","added":"Custom keywords added","resetq":"Reset all built-in keywords to defaults? Custom keywords will remain."},W=`free nudes
nude pics
nude pictures
nude videos
leaked nudes
exclusive nudes
private nudes
free nude video
free nude videos
uncensored nudes
uncensored video
uncensored videos
explicit content
adult content
18+ content
nsfw content
xxx videos
porn videos
free porn
free porn videos
sex videos
sex video
sex tape
leaked sex tape
private sex tape
hardcore video
hardcore videos
cam girl
cam girls
camgirl
camgirls
live cam girl
private cam
private cam show
live sex cam
adult webcam
webcam sex
nude cam
nude chat
sex chat
video sex chat
private video chat
sexting now
private sexting
dirty chat
adult chat
hot private chat
private content
premium content
exclusive content
vip content
uncensored content
full video in bio
full video on profile
watch full video in bio
watch full video on profile
more in my bio
more on my profile
link in bio for nudes
link in bio for more
link in bio 18+
link in bio nsfw
check bio for nudes
check my bio for nudes
check my bio for more
click my bio
click bio link
see my bio
see bio link
visit my profile for more
check my profile for more
full content in bio
exclusive content in bio
private content in bio
uncensored in bio
nudes in bio
free nudes in bio
free videos in bio
dm for nudes
dm me for nudes
dm for private content
dm for private video
dm for hookup
dm me to meet
message me for nudes
message me for private content
message me to meet
telegram for nudes
telegram in bio
snap in bio
snapchat in bio
whatsapp in bio
contact in bio
free onlyfans
onlyfans leak
onlyfans leaks
onlyfans leaked
onlyfans promo
onlyfans discount
onlyfans sale
onlyfans free trial
free onlyfans trial
subscribe to my onlyfans
my onlyfans in bio
onlyfans link in bio
fansly link in bio
subscribe to my fansly
fansly promo
fansly discount
fansly free trial
free fansly
manyvids link
chaturbate link
stripchat link
local hookup
local hookups
hookup tonight
hook up tonight
meet tonight for fun
available tonight for fun
available now for fun
nearby hookup
nearby hookups
private meetup tonight
discreet meetup
discreet fun tonight
casual encounter tonight
no strings attached hookup
nsa hookup
fwb hookup
looking for fun tonight
looking to hook up
ready to meet tonight
real girl available
girls available now
girl available tonight
escort available
escort available now
escort service
private escort
incall available
outcall available
incall and outcall
massage with happy ending
happy ending massage
full service massage
private massage available
book me tonight
booking open tonight
same day booking
available for booking
available near you
gang bang video
gangbang video
blowjob video
anal sex video
hardcore sex video
rough sex video
creampie video
cumshot video
facial cumshot
deepthroat video
threesome video
lesbian sex video
milf porn
teen porn
amateur porn
homemade porn
leaked porn
celebrity nudes
leaked celebrity nudes
usdt giveaway
usdc giveaway
btc giveaway
eth giveaway
sol giveaway
trx giveaway
tron giveaway
crypto giveaway
bitcoin giveaway
giweaway
giv3away
claim on tron
claim on tron network
instant claim on tron
claim your share now
follow to claim
airdrop claim now
free crypto now
win usdt
dm to claim
repost to claim
retweet to claim
claim free usdt
claim free btc
claim free eth
claim free sol
free bitcoin giveaway
free ethereum giveaway
free solana giveaway
limited crypto giveaway
limited airdrop
airdrop ends soon
giveaway ends soon
connect wallet to claim
connect your wallet to claim
verify wallet to claim
wallet verification required
claim reward now
claim your reward now
claim your crypto now
double your crypto
double your bitcoin
send btc get btc
send eth get eth
send usdt get usdt
send 1 btc get 2 btc
send 1 eth get 2 eth
instant crypto reward
free crypto reward
crypto reward waiting
follow and retweet to win
like and retweet to win
follow and repost to win
repost to enter giveaway
dm to receive prize
dm to receive your prize
claim your prize now
winner claim now
you have won crypto
you won usdt
you won bitcoin
you won ethereum
selected winner claim
congratulations you won crypto
adult
nsfw
nudes
nude
porn
xxx
sexy
horny
onlyfans
fansly
manyvids
chaturbate
stripchat
escort
hookup
hookups
sugar daddy
sugar baby
sexting
incall
outcall
no kyc
act fast
times ticking
500 usdt
giveaway
airdrop
free bitcoin
free crypto
link in bio`.split('\n').filter(Boolean),D=new Set(`adult
nsfw
nudes
nude
porn
xxx
sexy
horny
onlyfans
fansly
manyvids
chaturbate
stripchat
escort
hookup
hookups
sugar daddy
sugar baby
camgirl
camgirls
sexting
incall
outcall
no kyc
act fast
times ticking
500 usdt
giveaway
airdrop
free bitcoin
free crypto
link in bio`.split('\n').map(n));
const C={B:15,d1:3500,d2:5500,def:300,min:60,max:86400,wait:1300,tries:2,rounds:220,scanwait:700,nonew:10},K=x=>P+'_'+x;
let busy=false,loop=null;const sl=m=>new Promise(r=>setTimeout(r,m)),cl=s=>String(s||'').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\u00A0/g,' ').replace(/\s+/g,' ').trim(),n=s=>cl(s).toLowerCase(),uniq=a=>[...new Map((a||[]).map(x=>[n(x),cl(x)]).filter(x=>x[0])).values()];
const gs=(k,d)=>GM_getValue(K(k),d),ss=(k,v)=>GM_setValue(K(k),v),del=k=>GM_deleteValue(K(k)),sets=k=>new Set((gs(k,[])||[]).map(n));
function keys(s){let o=String(s||'').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\u00A0/g,' ').trim(),z=new Set([n(o)]),a=o.split(/\s{2,}/)[0],b=o.split(/[｜|—–：:]+/)[0];if(a)z.add(n(a));if(b)z.add(n(b));return[...z].filter(Boolean)}
function interval(v){v=parseInt(v,10);return Number.isFinite(v)?Math.max(C.min,Math.min(C.max,v)):C.def}function geti(){let v=interval(gs('int',C.def));ss('int',v);return v}function seti(v){v=interval(v);ss('int',v);if(gs('auto',false)&&gs('next',0)>Date.now())ss('next',Date.now()+v*1000);draw();return v}
function state(w){let k=n(w),off=sets('off'),on=sets('on');return D.has(k)?on.has(k):!off.has(k)}function toggle(w,on){let k=n(w),a=sets('off'),b=sets('on');if(D.has(k)){on?b.add(k):b.delete(k);a.delete(k)}else{on?a.delete(k):a.add(k);b.delete(k)}ss('off',[...a]);ss('on',[...b])}
function custom(){return uniq(gs('custom',[]))}function active(){let m=new Map;for(let w of W)if(state(w))m.set(n(w),w);for(let w of custom())m.set(n(w),w);return[...m.values()]}function success(){return uniq(gs('ok',[]))}function saveok(a){ss('ok',uniq(a))}
function btn(re){return[...document.querySelectorAll('button,[role="button"],a')].find(e=>re.test(cl(e.innerText||e.textContent||e.getAttribute('aria-label'))))}function setv(e,v){let p=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,s=Object.getOwnPropertyDescriptor(p,'value')?.set;s?s.call(e,v):e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}
function visible(){let m=new Map,x=document.querySelector('main');if(!x)return m;for(let d of x.querySelectorAll('div')){let l=String(d.innerText||'').split('\n').map(cl).filter(Boolean);if(l.length===2&&/^(永久|forever)$/i.test(l[1])&&l[0].length<=120)m.set(n(l[0]),l[0])}return m}
async function scan(cb){if(location.pathname.includes('/settings/add_muted_keyword')){history.back();await sl(1800)}await sl(1100);let m=new Map,last=0,no=0;scrollTo(0,0);await sl(700);for(let i=0;i<C.rounds;i++){for(let [k,v]of visible())m.set(k,v);no=m.size===last?no+1:0;last=m.size;cb?.(`${T.scan}\n${m.size}`);if(no>=C.nonew)break;let b=scrollY;scrollBy(0,Math.max(650,innerHeight*.8));await sl(C.scanwait);if(Math.abs(scrollY-b)<3)no++}return m}
async function addpage(){if(location.pathname.includes('/settings/add_muted_keyword'))return;let a=document.querySelector('a[href="/settings/add_muted_keyword"]')||btn(/^(添加|新增|add|\+)$/i);if(!a)throw Error('Add button not found');a.click();await sl(C.wait)}function input(){return document.querySelector('input[name="keyword"]')||[...document.querySelectorAll('input,textarea')].find(e=>/word|phrase|keyword|字词|关键词/i.test((e.placeholder||'')+' '+(e.getAttribute('aria-label')||'')))}
async function one(w){await addpage();let i=input();if(!i)throw Error('Keyword input not found');i.focus();setv(i,w);await sl(400);let s=btn(/^(保存|save)$/i);if(!s||s.disabled||s.getAttribute('aria-disabled')==='true')throw Error('Save button unavailable');s.click();await sl(1500);if(/出了点问题|稍后再试|try again|something went wrong|rate limit|too many/i.test(document.body.innerText||''))throw Error('X may be rate-limiting changes')}
function status(s){let e=document.getElementById(P+'-status');if(e)e.innerText=s;console.log('[FSX]',s)}function already(x){let s=new Set;for(let w of x.values())for(let k of keys(w))s.add(k);for(let w of success())for(let k of keys(w))s.add(k);return s}
async function batch(auto=false){if(busy)return{busy:true};busy=true;draw();try{status(T.scan+'\n'+T.active+': '+active().length);let x=await scan(status),a=already(x),p=active().filter(w=>!keys(w).some(k=>a.has(k)));if(!p.length){status(T.all);return{done:true}}let q=p.slice(0,C.B),f=0,ok=0,errs=gs('bad',[]);for(let j=0;j<q.length;j++){if(auto&&!gs('auto',false))return{pause:true};let w=q[j];status(`${j+1}/${q.length} · ${w}`);try{await one(w);ok++;f=0;for(let k of keys(w))a.add(k);saveok([...success(),w])}catch(e){f++;errs.push({word:w,error:e.message,time:new Date().toISOString()});ss('bad',errs);if(f>=C.tries){ss('auto',false);del('next');status(T.failpause+'\n'+e.message);return{stop:true}}}if(j<q.length-1)await sl(C.d1+Math.random()*(C.d2-C.d1))}return{done:p.length-ok<=0}}catch(e){status('Error: '+e.message);if(auto)ss('auto',false);return{stop:true}}finally{busy=false;draw()}}
async function autoloop(){while(gs('auto',false)){let r=await batch(true);if(r.done){ss('auto',false);del('next');status(T.all);break}if(r.stop||r.pause||!gs('auto',false))break;ss('next',Date.now()+geti()*1000);while(gs('auto',false)&&gs('next',0)>Date.now()){status(`${T.running}\n${Math.ceil((gs('next',0)-Date.now())/1000)} ${T.sec}`);await sl(1000)}del('next')}}
function start(){ss('auto',true);if(!loop)loop=autoloop().finally(()=>{loop=null;draw()});draw()}function pause(){ss('auto',false);del('next');status(T.paused);draw()}
const eh=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function manager(){document.getElementById(P+'-mgr')?.remove();let o=document.createElement('div');o.id=P+'-mgr';o.style='position:fixed;inset:0;background:#000b;z-index:10000000;display:flex;align-items:center;justify-content:center';o.innerHTML=`<div style="width:min(820px,94vw);height:min(780px,90vh);background:#111;color:#fff;border-radius:16px;padding:16px;display:flex;flex-direction:column"><div style="display:flex;justify-content:space-between"><b>${T.mgr}</b><button id="${P}-close">${T.close}</button></div><input id="${P}-search" placeholder="${T.search}" style="margin:10px 0;padding:8px;background:#000;color:#fff;border:1px solid #444"><div style="display:flex;gap:8px"><textarea id="${P}-addtext" placeholder="${T.customph}" style="flex:1;height:65px;background:#000;color:#fff"></textarea><button id="${P}-add">${T.add}</button></div><div style="margin:8px 0"><button id="${P}-export">${T.export}</button> <button id="${P}-reset">${T.reset}</button></div><div id="${P}-stats" style="font-size:12px;color:#aaa"></div><div id="${P}-list" style="flex:1;overflow:auto"></div></div>`;document.body.appendChild(o);
function render(){let q=n(document.getElementById(P+'-search').value),rows=W.map(w=>({w,src:'b',on:state(w),d:D.has(n(w))})).concat(custom().map(w=>({w,src:'c',on:true,d:false}))).filter(r=>!q||n(r.w).includes(q));document.getElementById(P+'-stats').textContent=`${W.length} built-in · ${D.size} default off · ${custom().length} custom · ${active().length} active`;document.getElementById(P+'-list').innerHTML=rows.map(r=>`<div style="display:flex;padding:6px;border-bottom:1px solid #222;opacity:${r.on?1:.45}"><span style="flex:1">${eh(r.w)} <small>${r.src==='c'?T.custom:(r.d?T.defaultoff:T.defaulton)}</small></span><button data-w="${eh(r.w)}" data-s="${r.src}">${r.src==='c'?T.delete:(r.on?T.disable:T.enable)}</button></div>`).join('');document.querySelectorAll('#'+P+'-list button').forEach(b=>b.onclick=()=>{let w=b.dataset.w;if(b.dataset.s==='c')ss('custom',custom().filter(x=>n(x)!==n(w)));else toggle(w,!state(w));render();draw()})}
document.getElementById(P+'-close').onclick=()=>o.remove();document.getElementById(P+'-search').oninput=render;document.getElementById(P+'-add').onclick=()=>{let e=document.getElementById(P+'-addtext'),a=e.value.split(/[\n,，;；]+/).map(cl).filter(Boolean),b=custom();ss('custom',uniq([...b,...a]));e.value='';status(T.added);render();draw()};document.getElementById(P+'-export').onclick=()=>{let a=document.createElement('a'),u=URL.createObjectURL(new Blob([active().join('\n')],{type:'text/plain;charset=utf-8'}));a.href=u;a.download='x-muted-en-'+S+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};document.getElementById(P+'-reset').onclick=()=>{if(confirm(T.resetq)){del('off');del('on');render();draw()}};render()}
function draw(){let e=document.getElementById(P+'-panel');if(!e)return;let a=gs('auto',false),s=document.getElementById(P+'-start'),p=document.getElementById(P+'-pause'),i=document.getElementById(P+'-int');s.textContent=a?T.running:T.start;s.disabled=a||busy;p.disabled=!a;if(i&&document.activeElement!==i)i.value=geti();document.getElementById(P+'-meta').textContent=`v${V} · ${T.active} ${active().length} · ${T.batch} ${C.B}`}
function panel(){if(document.getElementById(P+'-panel'))return;let e=document.createElement('div');e.id=P+'-panel';e.style='position:fixed;right:22px;bottom:22px;width:340px;padding:15px;z-index:9999999;border-radius:16px;background:#111;color:#fff;font-family:Arial,sans-serif;box-shadow:0 8px 30px #0006';e.innerHTML=`<b>FeedSieve → X v${V}</b><div id="${P}-meta" style="font-size:11px;color:#888;margin:4px 0"></div><div id="${P}-status" style="white-space:pre-line;font-size:13px;margin:8px 0">${T.ready}</div><div style="display:flex;gap:7px;align-items:center"><span>${T.next}</span><input id="${P}-int" type="number" min="${C.min}" max="${C.max}" style="width:75px"><span>${T.sec}</span></div><div style="display:flex;gap:7px;margin:8px 0"><button id="${P}-start" style="flex:1">${T.start}</button><button id="${P}-pause">${T.pause}</button></div><button id="${P}-once">${T.once}</button> <button id="${P}-manage">${T.manage}</button><div style="margin-top:7px"><button id="${P}-scan">${T.scanbtn}</button> <button id="${P}-local">${T.local}</button></div>`;document.body.appendChild(e);document.getElementById(P+'-start').onclick=start;document.getElementById(P+'-pause').onclick=pause;document.getElementById(P+'-once').onclick=()=>batch(false);document.getElementById(P+'-manage').onclick=manager;document.getElementById(P+'-scan').onclick=async()=>{if(busy)return;busy=true;try{let m=await scan(status);status(T.scanbtn+': '+m.size)}finally{busy=false;draw()}};document.getElementById(P+'-local').onclick=()=>status(`OK: ${success().length} · Failed: ${(gs('bad',[])||[]).length} · ${T.active}: ${active().length}`);let i=document.getElementById(P+'-int');i.value=geti();i.onchange=()=>{i.value=seti(i.value)};draw()}
panel();setInterval(panel,1500);setInterval(draw,1000);window.FSX={version:V,active,scan,start,pause,manager,setIntervalSeconds:seti,builtin:()=>[...W]};if(gs('auto',false))setTimeout(start,1800);
})();