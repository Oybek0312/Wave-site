const $=s=>document.querySelector(s);
const lib=[
{id:'t1',n:'Neon Drive',a:'Synth Rider',e:'🌆',c:['#7b2ff7','#f107a3'],tag:'energy',g:'Synthwave',bpm:104,root:57,bars:24,prog:[[0,[0,3,7]],[-4,[0,4,7]],[-2,[0,4,7]],[-5,[0,4,7]]],pad:'sawtooth',lead:'square',bass:'sawtooth',dr:'four'},
{id:'t2',n:'Дождь за окном',a:'Lo-fi Кот',e:'🌧️',c:['#2c5364','#0f2027'],tag:'chill',g:'Lo-fi',bpm:76,root:50,bars:20,prog:[[0,[0,3,7,10]],[-2,[0,4,7,11]],[-4,[0,4,7,11]],[-5,[0,4,7,10]]],pad:'triangle',lead:'sine',bass:'sine',dr:'lofi'},
{id:'t3',n:'Полночь',a:'Тихий океан',e:'🌌',c:['#0f0c29','#302b63'],tag:'chill',g:'Ambient',bpm:60,root:52,bars:16,prog:[[0,[0,3,7,10]],[-4,[0,4,7,11]],[-7,[0,4,7,11]],[-5,[0,3,7]]],pad:'sine',lead:'sine',bass:'sine',dr:'none'},
{id:'t4',n:'Рассвет',a:'Золотой час',e:'🌅',c:['#f7971e','#ffd200'],tag:'energy',g:'Поп',bpm:118,root:48,bars:24,prog:[[0,[0,4,7]],[-5,[0,4,7]],[-3,[0,3,7]],[-7,[0,4,7]]],pad:'triangle',lead:'triangle',bass:'triangle',dr:'four'},
{id:'t5',n:'Techno Pulse',a:'Бункер 128',e:'🔊',c:['#cb2d3e','#ef473a'],tag:'energy',g:'Techno',bpm:128,root:45,bars:32,prog:[[0,[0,3,7]],[0,[0,3,7]],[-2,[0,4,7]],[-4,[0,4,7]]],pad:'sawtooth',lead:'square',bass:'sawtooth',dr:'house'},
{id:'t6',n:'Глубокий фокус',a:'Тихий океан',e:'🧠',c:['#134e5e','#71b280'],tag:'chill',g:'Ambient',bpm:70,root:55,bars:16,prog:[[0,[0,4,7,11]],[-7,[0,4,7,11]],[-3,[0,3,7,10]],[-5,[0,4,7,10]]],pad:'sine',lead:'triangle',bass:'sine',dr:'none'}
];
let liked=new Set();try{liked=new Set(JSON.parse(localStorage.getItem('liked')||'[]'))}catch(e){}
let view='all',query='',cur=null,playing=false,shuffle=false,repeat=0,vol=.7;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const grad=t=>t.c?`linear-gradient(135deg,${t.c[0]},${t.c[1]})`:'linear-gradient(135deg,#444,#888)';
const covBg=t=>t.coverUrl?`url('${t.coverUrl}') center/cover`:grad(t);
const covEm=t=>t.coverUrl?'':t.e;
const fmt=s=>{s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const durOf=t=>t.file?(t.d||0):t.bars*16*(60/t.bpm/4);
const tagName={chill:'Расслабляющее',energy:'Энергичное',mine:'Мой файл'};

/* ---------- Audio engine ---------- */
const S={ctx:null,bus:null,tb:null,t0:0,si:0,nt:0,sd:0,timer:null,tr:null,noise:null};
let audio=null;
const hz=m=>440*Math.pow(2,(m-69)/12);
function initCtx(){
  if(S.ctx)return;
  S.ctx=new (window.AudioContext||window.webkitAudioContext)();
  const c=S.ctx;S.bus=c.createGain();S.bus.gain.value=vol;
  const comp=c.createDynamicsCompressor();S.bus.connect(comp);comp.connect(c.destination);
  const b=c.createBuffer(1,c.sampleRate,c.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;S.noise=b;
}
function tone(t,f,dur,type,v,att,cut){
  const c=S.ctx,o=c.createOscillator(),g=c.createGain();
  o.type=type;o.frequency.value=f;
  g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+(att||.01));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  let n=o;if(cut){const l=c.createBiquadFilter();l.type='lowpass';l.frequency.value=cut;o.connect(l);n=l}
  n.connect(g);g.connect(S.tb);o.start(t);o.stop(t+dur+.05);
}
function kick(t,v){const c=S.ctx,o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(40,t+.12);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.001,t+.3);o.connect(g);g.connect(S.tb);o.start(t);o.stop(t+.32)}
function noise(t,type,freq,dur,v){const c=S.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=S.noise;f.type=type;f.frequency.value=freq;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);s.connect(f);f.connect(g);g.connect(S.tb);s.start(t);s.stop(t+dur+.02)}
function step(i,t){
  const tr=S.tr,sd=S.sd,bar=Math.floor(i/16),s=i%16,ch=tr.prog[bar%tr.prog.length],r=tr.root+ch[0],iv=ch[1];
  const last=bar>=tr.bars-1,dr=bar>=2&&!last;
  if(s===0)iv.forEach(x=>tone(t,hz(r+x+12),sd*16,tr.pad,.045,.5,1400));
  if(tr.dr==='none'){if(s%4===0)tone(t,hz(r-12),sd*6,tr.bass,.14,.1)}
  else if(s%8===0||(tr.dr==='house'&&s%4===2)||(tr.dr==='lofi'&&s===10))tone(t,hz(r-12),sd*(tr.dr==='house'?2:4),tr.bass,tr.dr==='house'?.16:.22,.01,600);
  if(bar>=1&&s%2===0&&!last){const k=s/2,n=r+iv[k%iv.length]+12+((k%8>=4)?12:0);tone(t,hz(n),sd*(tr.dr==='none'?3.5:1.8),tr.lead,tr.dr==='none'?.05:.05,.01,tr.lead==='square'?2500:5000)}
  if(!dr)return;
  const d=tr.dr;
  if(d==='four'||d==='house'){if(s%4===0)kick(t,.9);if(d==='four'&&(s===4||s===12))noise(t,'bandpass',1800,.14,.3);if(d==='house'&&(s===4||s===12))noise(t,'highpass',1500,.12,.25);noise(t,'highpass',7000,.04,s%4===2?.22:(d==='four'&&s%2===0?.1:0.001))}
  else if(d==='lofi'){if(s===0||s===10)kick(t,.7);if(s===4||s===12)noise(t,'bandpass',1500,.18,.22);if(s%2===0)noise(t+(s%4===2?sd*.25:0),'highpass',6500,.05,.09)}
}
function sched(){const tr=S.tr,tot=tr.bars*16;while(S.si<tot&&S.nt<S.ctx.currentTime+.2){step(S.si,S.nt);S.si++;S.nt+=S.sd}}
function stopSynth(){clearInterval(S.timer);if(S.tb){const g=S.tb;g.gain.setTargetAtTime(0,S.ctx.currentTime,.03);setTimeout(()=>g.disconnect(),300);S.tb=null}}
function startSynth(tr,pos){
  initCtx();S.ctx.resume();stopSynth();
  S.tr=tr;S.sd=60/tr.bpm/4;S.tb=S.ctx.createGain();S.tb.connect(S.bus);
  S.t0=S.ctx.currentTime-pos;S.si=Math.ceil(pos/S.sd);S.nt=S.t0+S.si*S.sd;
  S.timer=setInterval(sched,40);sched();
}
const pos=()=>!cur?0:cur.file?(audio?audio.currentTime:0):(S.ctx&&S.tr===cur?S.ctx.currentTime-S.t0:0);
const dur=()=>cur?(cur.file&&audio&&audio.duration?audio.duration:durOf(cur)):0;

/* ---------- Player control ---------- */
function load(t,autoplay=true){
  if(audio){audio.pause();audio=null}stopSynth();cur=t;
  if(t.file){audio=new Audio(t.url);audio.volume=vol;audio.onloadedmetadata=()=>{t.d=audio.duration;render()};audio.onended=()=>advance(true);if(autoplay)audio.play().catch(()=>{})}
  else if(autoplay)startSynth(t,0);
  playing=autoplay;ui();render();
}
function toggle(){
  if(!cur){const l=visible();return load((l.length?l:lib)[0])}
  if(playing){playing=false;cur.file?audio.pause():S.ctx.suspend()}
  else{playing=true;cur.file?audio.play():(S.tr!==cur?startSynth(cur,0):S.ctx.resume())}
  ui();
}
function advance(auto){
  const l=visible().length?visible():lib;let i=l.findIndex(x=>x===cur);
  if(auto&&repeat===2)return load(cur);
  let n;if(shuffle&&l.length>1){do{n=Math.floor(Math.random()*l.length)}while(n===i)}else{n=i+1;if(n>=l.length){if(auto&&repeat===0){load(l[0],false);return}n=0}}
  load(l[n]);
}
function back(){if(pos()>3){seek(0);return}const l=visible().length?visible():lib;let i=l.findIndex(x=>x===cur);load(l[(i-1+l.length)%l.length])}
function seek(p){if(!cur)return;if(cur.file){if(audio)audio.currentTime=p}else if(playing||S.ctx){const c=S.ctx;S.t0=c.currentTime-p;S.si=Math.ceil(p/S.sd);S.nt=S.t0+S.si*S.sd;const old=S.tb;if(old){old.gain.setTargetAtTime(0,c.currentTime,.02);setTimeout(()=>old.disconnect(),200)}S.tb=c.createGain();S.tb.connect(S.bus)}}
setInterval(()=>{
  if(!cur)return;const p=pos(),d=dur();
  $('#cu').textContent=fmt(p);$('#du').textContent=fmt(d);
  if(!seeking){const v=d?p/d*1000:0;$('#sk').value=v;$('#sk').style.setProperty('--p',v/10+'%')}
  if(playing&&!cur.file&&S.si>=cur.bars*16&&p>=d)advance(true);
},200);
let seeking=false;
const sk=$('#sk');
sk.addEventListener('input',()=>{seeking=true;sk.style.setProperty('--p',sk.value/10+'%');$('#cu').textContent=fmt(sk.value/1000*dur())});
sk.addEventListener('change',()=>{seek(sk.value/1000*dur());seeking=false});
const vl=$('#vl');
vl.addEventListener('input',()=>{vol=vl.value/100;vl.style.setProperty('--p',vl.value+'%');if(S.bus)S.bus.gain.value=vol;if(audio)audio.volume=vol});
vl.style.setProperty('--p','70%');

/* ---------- UI ---------- */
function visible(){
  let l=lib;
  if(view==='liked')l=l.filter(t=>liked.has(t.id));else if(view!=='all')l=l.filter(t=>t.tag===view);
  const q=query.trim().toLowerCase();if(q)l=l.filter(t=>(t.n+' '+t.a+' '+t.g).toLowerCase().includes(q));
  return l;
}
function render(){
  const l=visible();
  $('#list').innerHTML=l.length?l.map((t,i)=>`<div class="row${t===cur?' cur':''}" data-id="${t.id}" tabindex="0"><span class="n">${t===cur&&playing?'♪':i+1}</span><div class="t"><div class="cov" style="background:${covBg(t)}">${covEm(t)}</div><div><b>${esc(t.n)}</b><small>${esc(t.a)}</small></div></div><span class="tag">${t.g}</span><span class="dur">${durOf(t)?fmt(durOf(t)):'–:––'}</span><span class="acts"><button class="info" data-i="${t.id}" aria-label="Открыть окно трека" title="Текст и настройки">⋯</button><button class="heart${liked.has(t.id)?' on':''}" data-h="${t.id}" aria-label="В любимое">${liked.has(t.id)?'♥':'♡'}</button>${t.file?`<button class="del" data-d="${t.id}" aria-label="Удалить трек" title="Удалить">✕</button>`:''}</span></div>`).join(''):`<div class="empty">${view==='liked'?'Здесь пока пусто. Нажмите ♡ рядом с треком, чтобы добавить его в любимое.':view==='mine'&&!query?'Здесь появятся ваши треки. Нажмите «＋ Добавить треки», чтобы загрузить свои файлы.':'Ничего не найдено. Попробуйте другой запрос.'}</div>`;
}
function ui(){
  $('#pp').textContent=playing?'⏸︎':'▶︎';$('#pp').setAttribute('aria-label',playing?'Пауза':'Играть');
  if(cur){$('#pn').textContent=cur.n;$('#pa').textContent=cur.a;$('#pc').style.background=covBg(cur);$('#pc').textContent=covEm(cur)}
  render();
}
function setView(v){
  view=v;document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  const names={all:'Добрый вечер',liked:'Любимое',mine:'Мои треки',chill:'Расслабляющее',energy:'Энергичное'};
  $('#title').textContent=names[v];$('#cardsWrap').style.display=v==='all'&&!query?'':'none';render();
}
function cards(){
  const items=[['liked','♥','Любимое','Ваши отметки',['#450af5','#8e8ee5']],['mine','📁','Мои треки','Ваши загруженные файлы',['#e8115b','#ff6437']],['chill','🌙','Расслабляющее','Lo-fi и ambient',['#2c5364','#203a43']],['energy','⚡','Энергичное','Synthwave и techno',['#cb2d3e','#ef473a']],['all','🎲','Все подряд','Включить случайный трек',['#1d976c','#93f9b9']]];
  $('#cards').innerHTML=items.map(x=>`<button class="card" data-go="${x[0]}"><div class="art" style="background:linear-gradient(135deg,${x[4][0]},${x[4][1]})">${x[1]}</div><b>${x[2]}</b><span>${x[3]}</span></button>`).join('');
}
document.addEventListener('click',e=>{
  const h=e.target.closest('[data-h]');
  if(h){e.stopPropagation();const id=h.dataset.h;liked.has(id)?liked.delete(id):liked.add(id);saveLiked();render();return}
  const inf=e.target.closest('[data-i]');if(inf){e.stopPropagation();openModal(inf.dataset.i);return}
  const dl=e.target.closest('[data-d]');if(dl){e.stopPropagation();removeTrack(dl.dataset.d);return}
  const r=e.target.closest('.row');
  if(r){const t=lib.find(x=>x.id===r.dataset.id);t===cur?toggle():load(t);return}
  const n=e.target.closest('.nav');if(n){setView(n.dataset.v);return}
  const c=e.target.closest('[data-go]');
  if(c){if(c.dataset.go==='all'){shuffle=true;$('#shuf').classList.add('on');load(lib[Math.floor(Math.random()*lib.length)])}else setView(c.dataset.go)}
});
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea'))return;
  if(e.target.classList.contains('row')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.click()}
  else if(e.code==='Space'&&!e.target.closest('button')){e.preventDefault();toggle()}
});
$('#pp').onclick=toggle;$('#next').onclick=()=>advance(false);$('#prev').onclick=back;
$('#shuf').onclick=e=>{shuffle=!shuffle;e.currentTarget.classList.toggle('on',shuffle)};
$('#rep').onclick=e=>{repeat=(repeat+1)%3;const b=e.currentTarget;b.classList.toggle('on',repeat>0);b.textContent=repeat===2?'🔂︎':'🔁︎'};
const q=$('#q');
q.oninput=()=>{query=q.value;$('#clr').classList.toggle('show',!!query);$('#cardsWrap').style.display=view==='all'&&!query?'':'none';render()};
$('#clr').onclick=()=>{q.value='';q.oninput();q.focus()};
$('#addTop').onclick=()=>$('#file').click();
/* ---------- Saved tracks (IndexedDB) ---------- */
let db=null;
const dbReady=new Promise(res=>{try{const r=indexedDB.open('wave',2);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('tracks'))d.createObjectStore('tracks',{keyPath:'id'});if(!d.objectStoreNames.contains('meta'))d.createObjectStore('meta',{keyPath:'id'})};r.onsuccess=()=>{db=r.result;res()};r.onerror=()=>res()}catch(e){res()}});
const idb=(fn,st='tracks')=>new Promise(res=>{if(!db)return res(null);try{const rq=fn(db.transaction(st,'readwrite').objectStore(st));rq.onsuccess=()=>res(rq.result);rq.onerror=()=>res(null)}catch(e){res(null)}});
const getDur=url=>new Promise(res=>{const a=new Audio(url);a.onloadedmetadata=()=>res(a.duration||0);a.onerror=()=>res(0)});
const mk=(id,n,url,d)=>({id,n,a:'Мой файл',e:'📁',tag:'mine',g:'Загружено',file:true,url,d});
let server=false;
function saveLiked(){
  try{localStorage.setItem('liked',JSON.stringify([...liked]))}catch(x){}
  if(server)fetch('/api/liked',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify([...liked])}).catch(()=>{});
}
async function addFile(f){
  const u0=URL.createObjectURL(f),d=await getDur(u0),n=f.name.replace(/\.[^.]+$/,'');
  if(server){
    try{
      const r=await fetch('/api/tracks?name='+encodeURIComponent(f.name)+'&d='+d,{method:'POST',body:f});
      if(!r.ok)throw 0;const rec=await r.json();
      lib.push(mk(rec.id,rec.n,'/api/audio/'+rec.id,rec.d));
    }catch(e){alert('Не удалось сохранить «'+f.name+'» на сервере. Проверьте, что сервер запущен.')}
    URL.revokeObjectURL(u0);render();return;
  }
  await dbReady;
  const id='f'+Date.now()+Math.random().toString(36).slice(2,6);
  lib.push(mk(id,n,u0,d));render();
  await idb(s=>s.put({id,n,d,blob:f,at:Date.now()}));
}
async function restore(){
  try{
    const r=await fetch('/api/library',{cache:'no-store'});
    if(r.ok){
      const L=await r.json();server=true;liked=new Set(L.liked||[]);
      (L.tracks||[]).sort((a,b)=>a.at-b.at).forEach(x=>lib.push(mk(x.id,x.n,'/api/audio/'+x.id,x.d)));
      Object.entries(L.meta||{}).forEach(([id,m])=>{const t=lib.find(x=>x.id===id);if(t)applyMeta(t,{...m,coverUrl:m.cover?'/api/cover/'+id+'?v='+(m.v||0):''})});
      const sm=document.querySelector('.up small');if(sm)sm.textContent='Сохраняются на вашем сервере';
      render();return;
    }
  }catch(e){}
  await dbReady;
  const rows=(await idb(s=>s.getAll()))||[];
  rows.sort((a,b)=>a.at-b.at).forEach(r=>lib.push(mk(r.id,r.n,URL.createObjectURL(r.blob),r.d)));
  ((await idb(s=>s.getAll(),'meta'))||[]).forEach(m=>{const t=lib.find(x=>x.id===m.id);if(t)applyMeta(t,m)});
  render();
}
async function persistMeta(t,cv){
  if(server){
    try{
      if(cv===null)await fetch('/api/cover/'+t.id,{method:'DELETE'});
      else if(cv)await fetch('/api/cover/'+t.id+'?type='+encodeURIComponent(cv.type),{method:'PUT',body:cv});
      await fetch('/api/meta/'+t.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({n:t.n,a:t.a,lyrics:t.lyrics})});
    }catch(e){alert('Сервер недоступен: изменения не сохранены.')}
    return;
  }
  await dbReady;await idb(s=>s.put({id:t.id,n:t.n,a:t.a,lyrics:t.lyrics,cover:t.cover||null}),'meta');
}
async function removeTrack(id){
  const i=lib.findIndex(x=>x.id===id);if(i<0)return;const t=lib[i];
  if(t===cur){if(audio){audio.pause();audio=null}cur=null;playing=false;$('#pn').textContent='Выберите трек';$('#pa').textContent='Нажмите ▶ на любом треке';$('#pc').style.background='var(--hover)';$('#pc').textContent='🎧';$('#pp').textContent='▶︎'}
  lib.splice(i,1);URL.revokeObjectURL(t.url);liked.delete(id);
  saveLiked();
  render();
  if(server){await fetch('/api/tracks/'+id,{method:'DELETE'}).catch(()=>{});return}
  await dbReady;await idb(s=>s.delete(id));await idb(s=>s.delete(id),'meta');
}
$('#file').onchange=async e=>{const fs=[...e.target.files];e.target.value='';setView('all');for(const f of fs)await addFile(f)};

/* ---------- Theme ---------- */
const root=document.documentElement;
try{const th=localStorage.getItem('theme');if(th)root.dataset.theme=th}catch(e){}
const isDark=()=>root.dataset.theme?root.dataset.theme==='dark':!matchMedia('(prefers-color-scheme: light)').matches;
const themeIcon=()=>{$('#theme').textContent=isDark()?'☀️':'🌙'};
$('#theme').onclick=()=>{const n=isDark()?'light':'dark';root.dataset.theme=n;try{localStorage.setItem('theme',n)}catch(e){}themeIcon()};
themeIcon();

/* ---------- Track window (cover, title, lyrics) ---------- */
function applyMeta(t,m){
  t.o=t.o||{n:t.n,a:t.a};
  if(m.n)t.n=m.n;if(m.a)t.a=m.a;t.lyrics=m.lyrics||'';
  if(m.coverUrl)t.coverUrl=m.coverUrl;
  else if(m.cover instanceof Blob){t.cover=m.cover;t.coverUrl=URL.createObjectURL(m.cover)}
}
let mt=null,mCover;
function openModal(id){const t=lib.find(x=>x.id===id);if(!t)return;mt=t;showView();$('#md').hidden=false;$('#mx').focus()}
function closeModal(){$('#md').hidden=true}
function showView(){
  const t=mt;$('#mcov').style.background=covBg(t);$('#mcov').textContent=covEm(t);
  $('#mt').textContent=t.n;$('#ma').textContent=t.a;
  const l=$('#ml');l.classList.toggle('none',!t.lyrics);
  l.textContent=t.lyrics||'Текста пока нет. Нажмите «Изменить» и вставьте текст песни.';
  $('#mview').hidden=false;$('#medt').hidden=true;$('#mcovBtns').hidden=true;
  $('#mplay').textContent=(t===cur&&playing)?'⏸ Пауза':'▶ Слушать';
}
$('#mx').onclick=closeModal;
$('#md').addEventListener('mousedown',e=>{if(e.target.id==='md')closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#md').hidden)closeModal()});
$('#openNow').onclick=()=>{cur?openModal(cur.id):toggle()};
$('.now').onclick=()=>{if(cur)openModal(cur.id)};
$('#mplay').onclick=()=>{mt===cur?toggle():load(mt);showView()};
$('#medit').onclick=()=>{
  $('#en').value=mt.n;$('#ea').value=mt.a;$('#el').value=mt.lyrics||'';mCover=undefined;
  $('#mview').hidden=true;$('#medt').hidden=false;$('#mcovBtns').hidden=false;$('#en').focus();
};
$('#mcancel').onclick=showView;
$('#mfile').onchange=e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  mCover=f;$('#mcov').style.background=`url("${URL.createObjectURL(f)}") center/cover`;$('#mcov').textContent='';
};
$('#mrm').onclick=()=>{mCover=null;$('#mcov').style.background=grad(mt);$('#mcov').textContent=mt.e};
function dropCover(t){if(t.coverUrl)URL.revokeObjectURL(t.coverUrl);t.cover=null;t.coverUrl=''}
$('#msave').onclick=async()=>{
  const t=mt;t.o=t.o||{n:t.n,a:t.a};
  t.n=$('#en').value.trim()||t.o.n;t.a=$('#ea').value.trim()||t.o.a;t.lyrics=$('#el').value.trim();
  if(mCover!==undefined){dropCover(t);if(mCover){t.cover=mCover;t.coverUrl=URL.createObjectURL(mCover)}}
  ui();showView();
  await persistMeta(t,mCover);
};
$('#mreset').onclick=async()=>{
  const t=mt;if(t.o){t.n=t.o.n;t.a=t.o.a}t.lyrics='';dropCover(t);
  ui();showView();
  if(server)await fetch('/api/meta/'+t.id,{method:'DELETE'}).catch(()=>{});
  else{await dbReady;await idb(s=>s.delete(t.id),'meta')}
};

cards();render();restore();
