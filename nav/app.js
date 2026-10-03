/* My Bible Camp · 교사 네비게이션 (인터넷 없이도 동작)
   #37 = 어린이 교재(인쇄본) 37쪽 · #L4 = 4차시 순서 · #A5 = 활동 5 · #home = 처음 */
(()=>{'use strict';
const ROOT=document.documentElement.dataset.root||'./';
const FIXED=document.body.dataset.route||'';
const app=document.getElementById('app');
const au=new Audio();au.preload='auto';
let DATA=null,lines=[],cur=-1,objUrl=null,playing=false,raf=0,ttsMode=false,ttsIdx=0,waitIdx=null,waitT0=0,waitIv=0,loadTok=0,userScrollT=0;
let autoPause=localStorage.getItem('nav_ap')!=='0';
const $=(s,el=document)=>el.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=p=>ROOT+p;
const WHO={'선생님':['t','👩‍🏫'],'엘라':['e','👧'],'내레이터':['n','🎙']};

fetch(url('nav/data.json')).then(r=>r.json()).then(d=>{DATA=d;route();})
 .catch(()=>{app.innerHTML='<p class="err">자료를 불러오지 못했어요. 와이파이에 한 번 연결한 뒤 다시 열어 주세요.</p>';});
addEventListener('hashchange',route);
if('serviceWorker' in navigator)navigator.serviceWorker.register(url('sw.js'),{scope:ROOT,updateViaCache:'none'}).catch(()=>{});
addEventListener('touchmove',()=>userScrollT=Date.now(),{passive:true});
addEventListener('wheel',()=>userScrollT=Date.now(),{passive:true});

function route(){
  stopAll();let h=decodeURIComponent(location.hash.slice(1));
  if(!h&&FIXED)h=FIXED;scrollTo(0,0);
  if(/^\d+$/.test(h))return viewPage(+h);
  if(/^L[1-5]$/.test(h))return viewLesson(+h[1]);
  if(/^A\d$/.test(h))return viewAct(+h.slice(1));
  viewHome();
}
function theme(c){document.documentElement.style.setProperty('--c',c);const m=$('meta[name=theme-color]');if(m)m.setAttribute('content',c);}
function head(color,small,title,sub,back,backLab){
  theme(color);
  return `<header class="top"><div class="row"><a class="back" href="${back}">${backLab}</a>${back==='#home'?'':`<a class="back" href="${url('index.html')}#home">⌂ 처음</a>`}</div>
  <small>${esc(small)}</small><h1>${esc(title)}</h1>${sub?`<p class="sub">${esc(sub)}</p>`:''}</header>`;
}
function footer(){return '<footer>Scripture taken from the New King James Version®. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved. · 한국어 성구: 개역한글 · Voice: ElevenLabs · Free copy — not for sale</footer>';}

/* ---------- 쪽 화면 ---------- */
function viewPage(no){
  const p=DATA.pages[no];if(!p)return viewHome();
  const L=p.day?DATA.lessons[p.day-1]:null,ps=L?L.pages:[],i=ps.indexOf(no);
  const prev=L?(i>0?ps[i-1]:null):(no>1?no-1:null),next=L?(i<ps.length-1?ps[i+1]:null):(no<64?no+1:null);
  let h=head(L?L.color:'#1F3B73',L?`${L.n}차시 · ${L.ko}`:'MY BIBLE CAMP',`어린이 교재 ${no}쪽`,p.en+(p.ko&&p.ko!==p.en?' · '+p.ko:''),L?`#L${L.n}`:'#home',L?'☰ 차시 순서':'☰ 처음');
  if(L)h+='<nav class="dots">'+ps.map(n=>`<a href="#${n}" class="${n===no?'on':''}${DATA.pages[n].audio?'':' na'}">${n}</a>`).join('')+'</nav>';
  if(p.step)h+=`<div class="step"><b>${esc(p.step)}</b>${p.min?` <span>· 약 ${p.min}분</span>`:''}${L?` <span class="of">${i+1}/${ps.length}</span>`:''}</div>`;
  if(p.patch)h+='<div class="note warn">📌 이 쪽은 <b>새 쪽(A4 라벨)을 덮어 붙인 쪽</b>이에요. 아직 안 붙였다면 콩·씨앗 내용은 건너뛰고, 아래 대본대로 진행하세요.</div>';
  if(p.todo)h+=`<div class="card todo"><div class="lab">지금 할 일</div>${esc(p.todo)}</div>`;
  h+=linesHtml(p.lines,!!p.audio);
  if(p.answer)h+=`<div class="card ans"><div class="lab">정답·확인</div>${esc(p.answer)}</div>`;
  if(p.sum&&L)h+=summaryHtml(L);
  if(p.acts)h+=actsHtml(p.acts.concat(p.day===5?[7]:[]));
  const np=next?DATA.pages[next]:null;
  h+=`<div class="card nextcard" id="nextcard">${np?`다음 단계 → <a href="#${next}"><b>${next}쪽</b> · ${esc(np.step||np.en)}</a>`:(L?`이 차시의 마지막 쪽이에요. <a href="#L${L.n}">차시 순서 보기</a>`:'')}</div>`;
  h+=footer()+bar(prev!=null?`#${prev}`:null,next!=null?`#${next}`:null,p.lines.length&&p.lines[0].t0!==undefined||(!p.audio&&p.lines.some(l=>l.w)));
  app.innerHTML=h;bind(p.lines,p.audio);
}
function linesHtml(ls,timed){
  if(!ls||!ls.length)return '';
  return '<div class="lines">'+ls.map((l,i)=>{const w=WHO[l.w];
    return (l.s?`<div class="sec">${esc(l.s)}</div>`:'')+`<div class="ln${timed?' t':''}" data-i="${i}">`+
    (w?`<div class="who w${w[0]}">${w[1]} ${esc(l.w)}</div>`:'')+`<div class="en">${esc(l.en)}</div>`+(l.ko?`<div class="ko">${esc(l.ko)}</div>`:'')+
    (l.a?`<div class="act">${esc(l.a)}</div>`:'')+(l.wait?`<div class="wait">⏸ 여기서 음성이 멈춰요 · 아이들 활동 ${esc(l.wait)} → 다 되면 ▶</div>`:'')+'</div>';}).join('')+'</div>';
}
function bar(prevH,nextH,canPlay){
  return `<div id="bar"><div class="prog"><div id="pbar"></div></div><div class="btns">
  <a class="nav${prevH?'':' dis'}"${prevH?` href="${prevH}"`:''}>◀ 이전</a>
  ${canPlay?'<button id="b_back" aria-label="한 줄 앞">⏮</button><button id="b_play" class="play">▶ 재생</button><button id="b_fwd" aria-label="한 줄 뒤">⏭</button>':'<span class="noaudio">음성 없는 쪽</span>'}
  <a class="nav${nextH?'':' dis'}"${nextH?` href="${nextH}"`:''}>다음 ▶</a></div>
  ${canPlay?`<div class="opts"><label><input type="checkbox" id="o_ap"${autoPause?' checked':''}> 활동 칸에서 자동 멈춤</label><button id="b_speed">속도 1×</button></div>`:''}</div>`;
}

/* ---------- 음성 + 색칠 진행 ---------- */
function bind(ls,rel){
  lines=(ls||[]).map(l=>Object.assign({},l));cur=-1;waitIdx=null;
  document.querySelectorAll('.ln').forEach(el=>el.onclick=()=>seekLine(+el.dataset.i));
  const bp=$('#b_play');if(!bp)return;
  ttsMode=!rel;if(rel)loadAudio(rel);
  bp.onclick=toggle;$('#b_back').onclick=()=>seekLine(Math.max(0,cur-1));$('#b_fwd').onclick=()=>seekLine(Math.min(lines.length-1,cur+1));
  $('#o_ap').onchange=e=>{autoPause=e.target.checked;localStorage.setItem('nav_ap',autoPause?'1':'0');};
  $('#b_speed').onclick=e=>{const r=au.playbackRate>=1?0.85:1;au.playbackRate=r;e.target.textContent='속도 '+(r<1?'0.85×':'1×');};
}
function label(t){const b=$('#b_play');if(b)b.textContent=t;}
function loadAudio(rel){
  const tok=++loadTok;label('불러오는 중…');
  fetch(url(rel)).then(r=>{if(!r.ok)throw 0;return r.blob();}).then(b=>{
    if(tok!==loadTok)return;if(objUrl)URL.revokeObjectURL(objUrl);objUrl=URL.createObjectURL(b);au.src=objUrl;au.load();label('▶ 재생');
  }).catch(()=>{if(tok!==loadTok)return;ttsMode=true;label('▶ 재생 (휴대폰 음성)');});
}
function toggle(){
  if(ttsMode){if(speechSynthesis.speaking&&waitIdx===null){speechSynthesis.cancel();ttsIdx=Math.max(0,cur);label('▶ 재생');}else{hideWait();speakFrom(waitIdx!==null?ttsIdx:Math.max(0,cur));}return;}
  if(au.paused){hideWait();au.play().catch(()=>{});}else au.pause();
}
au.addEventListener('play',()=>{playing=true;label('⏸ 멈춤');loop();});
au.addEventListener('pause',()=>{playing=false;cancelAnimationFrame(raf);if(waitIdx===null)label('▶ 재생');});
au.addEventListener('ended',()=>{playing=false;label('▶ 다시');mark(-2);showNext();});
function loop(){tick();if(playing)raf=requestAnimationFrame(loop);}
function tick(){
  const t=au.currentTime,d=au.duration||1,pb=$('#pbar');if(pb)pb.style.width=(100*t/d)+'%';
  let i=-1;for(let k=0;k<lines.length;k++){if(lines[k].t0!==undefined&&t>=lines[k].t0-0.08)i=k;}
  if(i!==cur&&i>=0)mark(i);
  if(autoPause&&i>=0){const l=lines[i];if(l.wait&&!l._w&&t>=l.t1+0.15){l._w=true;au.pause();showWait(i);}}
}
function mark(i){
  const els=document.querySelectorAll('.ln');
  els.forEach((el,k)=>{el.classList.toggle('on',k===i);el.classList.toggle('done',i===-2||(i>=0&&k<i));});
  if(i>=0){cur=i;if(Date.now()-userScrollT>2500)els[i].scrollIntoView({block:'center',behavior:'smooth'});}
}
function seekLine(i){
  if(i<0||i>=lines.length)return;
  if(ttsMode){speechSynthesis.cancel();hideWait();speakFrom(i);return;}
  if(lines[i].t0===undefined)return;
  lines.forEach((l,k)=>{if(k>=i)l._w=false;});hideWait();au.currentTime=lines[i].t0;mark(i);if(au.paused)au.play().catch(()=>{});
}
function showWait(i){
  waitIdx=i;const el=document.querySelectorAll('.ln')[i];if(el)el.classList.add('waiting');waitT0=Date.now();
  let b=$('#waitbar');if(!b){b=document.createElement('div');b.id='waitbar';document.body.appendChild(b);}
  b.innerHTML=`⏸ 아이들 활동 시간 (${esc(lines[i].wait)}) · <span id="wt">0:00</span> 지남 · 다 되면 <b>▶ 계속</b>`;b.className='show';
  clearInterval(waitIv);waitIv=setInterval(()=>{const s=Math.floor((Date.now()-waitT0)/1000),w=$('#wt');if(w)w.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');},1000);
  label('▶ 계속');
}
function hideWait(){waitIdx=null;clearInterval(waitIv);const b=$('#waitbar');if(b)b.className='';document.querySelectorAll('.ln.waiting').forEach(e=>e.classList.remove('waiting'));}
function speakFrom(i){
  if(!('speechSynthesis' in window)){alert('이 휴대폰은 음성 읽기를 지원하지 않아요.');return;}
  ttsIdx=i;speakNext();
}
function speakNext(){
  if(ttsIdx>=lines.length){mark(-2);label('▶ 다시');showNext();return;}
  mark(ttsIdx);const u=new SpeechSynthesisUtterance(lines[ttsIdx].en);u.lang='en-US';u.rate=.9;
  const v=speechSynthesis.getVoices().find(v=>/^en(-|_)(US|GB|PH)/i.test(v.lang));if(v)u.voice=v;
  u.onend=()=>{const l=lines[ttsIdx];ttsIdx++;if(autoPause&&l&&l.wait){showWait(ttsIdx-1);return;}setTimeout(speakNext,500);};
  speechSynthesis.speak(u);label('⏸ 멈춤');
}
function showNext(){const n=$('#nextcard');if(n){n.classList.add('pulse');n.scrollIntoView({block:'center',behavior:'smooth'});}}
function stopAll(){++loadTok;try{au.pause();}catch(e){}playing=false;cancelAnimationFrame(raf);try{speechSynthesis.cancel();}catch(e){}hideWait();}

/* ---------- 차시 순서 ---------- */
function viewLesson(n){
  const L=DATA.lessons[n-1];
  let h=head(L.color,`${n}차시 · 진행 순서`,L.ko,L.en,'#home','☰ 처음');
  h+=`<a class="bigbtn" href="#${L.pages[0]}">▶ 1단계부터 시작 (어린이 교재 ${L.pages[0]}쪽)</a>`;
  h+=`<div class="card"><div class="lab">진행 순서 · 어린이 교재 ${L.pages[0]}–${L.pages[L.pages.length-1]}쪽 (수업 50분 + 활동)</div><ol class="steps">`+L.pages.map(no=>{const p=DATA.pages[no];
    return `<li><a href="#${no}"><span class="pg">${no}쪽</span><span class="st">${esc(p.step||'')}</span><span class="tt">${esc(p.en)}</span>${p.min?`<span class="mn">${p.min}분</span>`:''}${p.audio?'<span class="au">🔊</span>':''}${p.qr?'':'<span class="qr" title="인쇄본에 QR 없음 — 스티커">🏷</span>'}</a></li>`;}).join('')+'</ol><p class="muted">🔊 영어 음성 · 🏷 인쇄본에 QR이 없는 쪽(QR 스티커를 붙이세요)</p></div>';
  h+=`<div class="card"><div class="lab">학습 목표</div><ul>${L.goals.map(g=>`<li>${esc(g)}</li>`).join('')}</ul></div>`;
  h+=`<div class="card"><div class="lab">준비물</div>${esc(L.mats)}<p><b>오늘의 실물</b> · ${esc(L.object.replace('오늘의 실물: ',''))}</p></div>`;
  h+=`<div class="card"><div class="lab">도입 (5분)</div>${esc(L.intro)}<div class="lab">정리 (5분)</div>${esc(L.close)}</div>`;
  h+=summaryHtml(L)+actsHtml(L.acts);
  h+=`<div class="card"><div class="lab">이럴 때는</div>${L.tips.map(t=>`<p><b>${esc(t[0])}</b><br>${esc(t[1])}</p>`).join('')}<div class="lab">주의</div>${esc(L.care)}</div>`;
  app.innerHTML=h+footer();
}
function summaryHtml(L){
  return `<div class="card sum"><div class="lab">정리 문장</div><p class="en">${esc(L.big.en)}</p><p class="ko">${esc(L.big.ko)}</p>
  <div class="lab">암송 요절</div><p class="en">${esc(L.memory.nkjv)} <small>(${esc(L.memory.ref)}, NKJV)</small></p><p class="ko">${esc(L.memory.krv)} <small>(${esc(L.memory.ref_ko)}, 개역한글)</small></p>
  <div class="lab">선생님 반문</div><ul>${L.questions.map(q=>`<li>${esc(q)}</li>`).join('')}</ul>
  <div class="lab">영어 진행문 (선생님이 읽어 줄 말)</div><p class="en">${esc(L.english)}</p></div>`;
}
function actsHtml(ids){return '<div class="card acts"><div class="lab">활동 (활동지 QR과 같은 화면)</div>'+ids.map(k=>{const a=DATA.acts[k];return `<a class="actbtn" href="${url('activity/'+k+'.html')}">${k===7?'📦':'🎨'} ${esc(a.ko)}<small>${a.day}차시 · ${esc(a.en)}</small></a>`;}).join('')+'</div>';}

/* ---------- 활동 화면 ---------- */
function viewAct(n){
  const a=DATA.acts[n];if(!a)return viewHome();
  const L=DATA.lessons[a.day-1],others=L.acts.filter(k=>k!==n);
  let h=head(L.color,`${a.day}차시 활동${n===7?' · 2027년 10월 예산교회 선교팀':''}`,a.ko,a.en,`${url('index.html')}#${a.craft}`,`☰ ${a.craft}쪽(활동 시간)`);
  h+=`<div class="card todo"><div class="lab">자료</div>${esc(a.sheet)}${a.mat?'<br>'+esc(a.mat):''}</div>`;
  h+='<div class="card"><div class="lab">사용법</div>▶ 재생을 누르면 영어 음성이 나오고 <span class="hl">지금 읽는 줄</span>이 칠해져요. 회색 글씨는 한국어 뜻, 주황 줄은 선생님이 할 일. ⏸ 표시에서는 음성이 자동으로 멈춰요 — 아이들이 다 하면 ▶ 계속.</div>';
  h+=linesHtml(a.lines,!!a.audio);
  h+=`<details class="card"><summary>교사용 안내 (한국어) — 준비·진행·주의</summary>${a.teacher.map(t=>`<p><b>${esc(t[0])}</b><br>${esc(t[1])}</p>`).join('')}</details>`;
  if(n===5)h+=`<div class="card"><a href="${url('activity/7.html')}">📦 2027년 10월 여는 날 대본 →</a></div>`;
  if(n===7)h+=`<div class="card"><a href="${url('activity/5.html')}">← 봉인하는 날(5차시) 대본</a></div>`;
  h+=`<div class="card nextcard" id="nextcard">${others.length?'같은 차시 다른 활동 → '+others.map(k=>`<a href="${url('activity/'+k+'.html')}"><b>${esc(DATA.acts[k].ko)}</b></a>`).join(' · '):`활동 끝! <a href="${url('index.html')}#L${a.day}">${a.day}차시 순서로</a>`}</div>`;
  const nx=others.length?url('activity/'+others[0]+'.html'):`${url('index.html')}#L${a.day}`;
  app.innerHTML=h+footer()+bar(`${url('index.html')}#${a.craft}`,nx,true);bind(a.lines,a.audio);
}

/* ---------- 처음 화면 ---------- */
function viewHome(){
  theme('#1F3B73');
  let h=`<header class="top"><small>MY BIBLE CAMP · 교사 네비게이션</small><h1>필리핀 5일 성경학교</h1><p class="sub">${esc(DATA.book)} 기준 · 인터넷 없이도 사용</p></header>`;
  h+=`<div class="card"><div class="lab">사용법</div><ol class="howto"><li>어린이 교재 쪽 아래의 <b>QR</b>을 찍으면 그 쪽 화면이 열려요. QR이 없는 쪽은 QR 스티커를 붙이거나 아래 차시 버튼으로 들어가요.</li><li><b>▶ 재생</b>: 영어 음성이 나오고 <span class="hl">지금 읽는 줄</span>이 칠해져요. 줄을 누르면 거기부터 다시 들려요.</li><li>회색 글씨 = <b>한국어 뜻</b> · 주황 줄 = <b>선생님이 할 일</b> · ⏸ = 아이들이 답하거나 쓰는 시간(자동 멈춤 → 다 되면 ▶).</li><li>쪽이 끝나면 <b>다음 ▶</b> — 수업 순서대로 다음 쪽으로 가요.</li></ol></div>`;
  h+='<div class="lessons">'+DATA.lessons.map(L=>`<a class="lesson" style="--lc:${L.color}" href="#L${L.n}"><b>${L.n}차시</b> ${esc(L.ko)}<small>${esc(L.en)} · 어린이 교재 ${L.pages[0]}–${L.pages[L.pages.length-1]}쪽</small></a>`).join('')+'</div>';
  h+=actsHtml([1,2,3,6,4,5,7]);
  h+=`<div class="card"><div class="lab">인터넷 없이 쓰기</div><p>와이파이에서 아래 버튼을 한 번 누르면 모든 쪽·음성(약 ${Math.round((DATA.bytes||0)/1e6)}MB)이 이 휴대폰에 저장돼요. 저장한 휴대폰·브라우저(아이폰 Safari, 안드로이드 Chrome) 그대로 열어야 해요. 아이폰은 7일 넘게 안 열면 지워질 수 있으니 수업 전날 한 번 더 열어 두세요.</p><button id="save" class="bigbtn">⬇ 모두 저장 (오프라인)</button><p id="savest" class="muted"></p></div>`;
  h+='<div class="card"><div class="lab">쪽 번호로 바로 가기</div><div class="jump"><input id="jn" type="number" inputmode="numeric" min="1" max="64" placeholder="예: 37"><button id="jg">열기</button></div><p class="muted">인쇄된 어린이 교재(64쪽)의 쪽 번호예요.</p></div>';
  app.innerHTML=h+footer();
  $('#save').onclick=saveAll;checkSaved();
  $('#jg').onclick=()=>{const v=+$('#jn').value;if(v>=1&&v<=64)location.hash=String(v);};
}
async function saveAll(){
  const st=$('#savest');if(!('caches' in window)){st.textContent='이 브라우저는 저장을 지원하지 않아요.';return;}
  const c=await caches.open(DATA.cache),list=DATA.files;let n=0,fail=0;
  for(const f of list){
    try{const req=new Request(url(f));if(!(await c.match(req,{ignoreSearch:true}))){const r=await fetch(req,{cache:'reload'});if(!r.ok)throw 0;await c.put(req,r);}n++;}catch(e){fail++;}
    st.textContent=`저장 중… ${n}/${list.length}`+(fail?` · 실패 ${fail}`:'');
  }
  st.textContent=fail?`저장 ${n}/${list.length} · 실패 ${fail}개 — 와이파이에서 다시 눌러 주세요`:`✅ 저장 완료(${n}개). 이제 인터넷 없이도 열려요.`;
}
async function checkSaved(){
  const st=$('#savest');if(!st||!('caches' in window))return;
  try{const c=await caches.open(DATA.cache);let n=0;for(const f of DATA.files)if(await c.match(url(f),{ignoreSearch:true}))n++;
    st.textContent=n===DATA.files.length?'✅ 이 휴대폰에 모두 저장되어 있어요.':`저장된 파일 ${n}/${DATA.files.length}`;}catch(e){}
}
window.__nav={get lines(){return lines;},get cur(){return cur;},au,mark,tick};
})();
