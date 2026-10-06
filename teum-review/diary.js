/* 메네라탈출일기 0.7.1. A presentation layer over the existing synthetic review app. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),el=(tag,text='',cls='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
const button=(text,fn,cls='md-primary')=>{const n=el('button',text,cls);n.type='button';n.onclick=fn;return n;};
const svg=(kind)=>{const n=document.createElementNS('http://www.w3.org/2000/svg','svg');n.setAttribute('viewBox','0 0 24 24');n.setAttribute('aria-hidden','true');const p=document.createElementNS(n.namespaceURI,'path');p.setAttribute('d',({arrow:'M4 12h15m-6-6 6 6-6 6',pin:'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0ZM9 10a3 3 0 1 0 6 0 3 3 0 1 0-6 0',home:'m3 10 9-7 9 7v10H3Zm6 10v-7h6v7',check:'m5 12 4 4L19 6'})[kind]);n.append(p);return n;};
const root=$('workspace'),head=$('stage-head'),settings=$('settings-dialog');
const originalMount=mount,names={adult:'나루',owner:'도윤',outsider:'유나',teen:'하루',younger:'민'};
const me=()=>identity?.userId,name=id=>SAMPLE.settings[id]?.nickname??names[id]??'가상 친구';
let findMode='FRIENDS',sheet=null,diary={},draft={},observerBusy=false;
const active=id=>Boolean(SAMPLE.settings[id]&&SAMPLE.settings[id].status==='active'&&!SAMPLE.deleted.has(id));
const canConnect=(a,b)=>Boolean(a!==b&&active(a)&&active(b)&&DEMO.users[a]?.state.adult&&DEMO.users[b]?.state.adult&&!DEMO.blocks.has([a,b].sort().join(':'))&&DEMO.matches.some(m=>!m.closed&&m.pair.includes(a)&&m.pair.includes(b)));
const arrivals=new ArrivalSession(canConnect);
function say(text){status.textContent=text;}
function closeSheet(){sheet?.close();sheet=null;}
function modal(title,fill){closeSheet();const focus=document.activeElement,d=el('dialog','','md-sheet');d.setAttribute('aria-label',title);const h=el('header');h.append(el('h2',title),button('×',()=>d.close(),'md-icon'));h.lastChild.setAttribute('aria-label','닫기');d.append(h);fill(d);d.addEventListener('close',()=>{d.remove();if(sheet===d)sheet=null;if(focus?.isConnected)focus.focus();});document.body.append(d);d.showModal();sheet=d;}
function go(page,mode){if(mode)findMode=mode;closeSheet();settings.close();view=page;mount();window.scrollTo({top:0,behavior:'instant'});}
function pageTitle(title,sub,back=false){const h=el('section','','md-page-head');if(back)h.append(button('‹ 오늘로',()=>go('home'),'md-back'));h.append(el('h1',title),el('p',sub));head.append(h);return h;}
function tabBar(h,items,selected){const row=el('div','','md-segments');for(const [text,key,fn]of items){const b=button(text,fn,'');b.setAttribute('aria-pressed',String(selected===key));row.append(b);}h.append(row);return row;}
function resetRoot(){app?.destroy();app=null;root.className='';root.replaceChildren();}
function updateNav(){document.body.dataset.page=view;for(const b of $('main-nav').children){const selected=b.dataset.page===(['friends','matches'].includes(view)?'friends':['discover'].includes(view)?'discover':'home');if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}}
function shortcut(title,sub,icon,fn){const b=button('',fn,'md-shortcut'),mark=el('span',icon),txt=el('span');txt.append(el('strong',title),el('small',sub));b.append(mark,txt,svg('arrow'));return b;}
function route(){const r=el('div','','md-route');for(const [text,icon]of [['내 소식','home'],['약속 장소','pin']]){const p=el('div','','md-place'),i=el('span','','md-pin');i.append(svg(icon));p.append(i,el('span',text));r.append(p);if(icon==='home')r.append(el('span','♡','md-route-heart'));}return r;}
function home(){resetRoot();const a=me(),s=arrivals.snapshot(a),home=el('div','','md-home'),hero=el('section','','md-hero');const title=el('h1');title.append(document.createTextNode('집착 말고,'),el('br'),el('em','도착 알림.'));hero.append(title,el('p','계속 묻지 않아도, 서로 정한 약속만.'),el('p','가까워져도, 나는 나.','md-signature'));home.append(hero);
 const card=el('section','','md-location'),top=el('div','','md-location-top');top.append(el('h2','어디야? 대신 도착했어.'),el('span',s?.phase==='active'?'체험 ON':s?'동의 대기':'체험 OFF','md-state'));card.append(top,route());
 const notice=s?.arrivals.find(x=>x.user!==a);if(notice){const note=el('div',`${name(notice.user)} · 약속 장소에 도착했어요. (가상)`,'md-note');note.role='status';card.append(note);}
 card.append(el('p',s?.phase==='active'?`${name(s.peer)}와 서로 동의했어. 1시간 뒤 끝나고, 언제든 바로 끌 수 있어.`:s?`${name(s.peer)}와의 요청이 대기 중이야. 두 사람 모두 동의해야 시작돼.`:'서로 동의한 동안, 약속 장소의 도착만 알려줘. 동선·방문 장소는 기록하지 않아.'));
 const b=button(s?'위치알림 확인하기':'위치알림 켜보기',openLocation);b.append(svg('arrow'));card.append(b,el('div','실제 GPS·푸시 없이, 화면 안에서만 체험','md-caption'));home.append(card);
 const links=el('div','','md-shortcuts');links.append(shortcut('취향 맞는 사람','카드 넘기기 · 친구 · 성인끼리 연애','♡',()=>go('discover')),shortcut('오늘, 같이 나가기','모임 · 게시판 · 장소와 시간 투표','↗',()=>go('groups')));home.append(links);
 const diaryButton=button('',()=>go('diary'),'md-diary-link'),text=el('span');text.append(el('strong','오늘 마음은, 여기 두고 가.'),el('small',diary[a]?'저장한 내 일기 이어보기':'공개하지 않는 나의 한 줄 일기'));diaryButton.append(text,el('span','✎'));home.append(diaryButton);root.append(home);
}
function connectedPeers(){return Object.keys(DEMO.users).filter(id=>canConnect(me(),id));}
async function switchActor(id){closeSheet();settings.close();actor.value=id;view='home';await signIn();say(`${name(id)}의 가상 화면으로 바꿨어요. 실제 로그인이 아니에요.`);}
function openLocation(){const a=me();if(!active(a))return;modal('위치알림',d=>{
 d.append(el('p','합의한 약속의 도착만. 실시간 좌표·동선·모텔 등 민감한 방문 장소는 공유하지 않아.','md-muted'));
 const s=arrivals.snapshot(a);
 const run=fn=>{if(me()!==a||!active(a)){closeSheet();return;}try{fn();mount();openLocation();}catch(e){say(e.message);}};
 if(!s){const peers=connectedPeers();if(!peers.length){d.append(el('p','검수본의 위치알림은 연결된 성인 가상 계정끼리만 체험할 수 있어. 나루·도윤 계정에는 가상 연결이 준비돼 있어.','md-note'),button('나루 가상 계정으로 체험',()=>void switchActor('adult')));return;}
 let peer=peers[0];const note=el('p',`${name(a)} ↔ ${name(peer)} · 예시 레코드 카페`,'md-note');d.append(note,el('p','내가 요청 → 상대가 수락 → 1시간 동안만 알림. 도착은 각 계정의 ‘가상 도착’ 버튼으로 재현해.'));
 const send=button(`${name(peer)}에게 요청하기`,()=>run(()=>arrivals.request(a,peer)));
 if(peers.length>1){const more=el('details'),summary=el('summary','다른 연결 선택'),select=el('select');select.setAttribute('aria-label','위치알림 상대');for(const id of peers){const o=el('option',name(id));o.value=id;select.append(o);}select.onchange=()=>{peer=select.value;note.textContent=`${name(a)} ↔ ${name(peer)} · 예시 레코드 카페`;send.textContent=`${name(peer)}에게 요청하기`;};more.append(summary,select);d.append(more);}
 d.append(send,el('p','요청 버튼은 내 동의만 기록해. 상대의 동의를 대신하지 않아. 요청은 10분 뒤 만료돼.','md-fine'));return;
 }
 if(s.phase==='pending'){
  if(s.to===a)d.append(el('p',`${name(s.from)}가 도착 알림을 요청했어.`,'md-note'),button('이 요청 수락하기',()=>run(()=>arrivals.accept(a))),button('거절하기',()=>run(()=>arrivals.stop(a)),'md-secondary'));
  else d.append(el('p',`${name(s.to)}의 동의를 기다리는 중`,'md-note'),button('상대 가상 화면으로 전환',()=>void switchActor(s.to)),button('요청 취소',()=>run(()=>arrivals.stop(a)),'md-secondary'));
 }else{
  const minutes=Math.max(1,Math.ceil((s.until-Date.now())/60000));d.append(el('p',`${name(s.peer)}와 알림 체험 중 · ${minutes}분 후 자동 종료`,'md-note'));
  const b=button('내 가상 도착 알림 보내기',()=>run(()=>arrivals.arrive(a)));b.disabled=s.arrivals.some(x=>x.user===a);if(b.disabled)b.textContent='내 도착 알림을 이미 보냈어';d.append(b,button('상대 가상 화면에서 확인',()=>void switchActor(s.peer),'md-secondary'),button('위치알림 즉시 끄기',()=>run(()=>arrivals.stop(a)),'md-secondary'));
 }
 d.append(el('p','언제든 종료 가능. 차단·연결 해제·계정 삭제·만료 시 체험 알림과 기록을 지워. 실제 위치와 브라우저 알림 권한은 요청하지 않아.','md-fine'));
 });}
function diaryPage(){resetRoot();const a=me(),h=pageTitle('오늘은 여기까지.','남에게 보여주지 않아도, 마음은 기록할 수 있어.',true),t=el('textarea','','md-entry');t.setAttribute('aria-label','나만의 일기');t.maxLength=1000;t.placeholder='사실 오늘 내 마음은…';t.value=draft[a]??diary[a]??'';const hint=el('div','','md-diary-status'),count=el('span',`${t.value.length} / 1000`);hint.append(el('span','이 탭 안에서만 · 새로고침하면 사라짐'),count);t.oninput=()=>{draft[a]=t.value;count.textContent=`${t.value.length} / 1000`;};const actions=el('div','','md-diary-actions');actions.append(button('내 일기에 남기기',()=>{if(me()!==a||!active(a))return;if(!t.value.trim()){say('한 줄이라도 적고 남겨 줘.');return;}diary[a]=t.value;draft[a]=t.value;say('이 탭의 내 일기에 남겼어. 다른 계정에는 보이지 않아.');}),button('일기 지우기',()=>{if(me()!==a||!active(a))return;modal('일기를 지울까?',d=>{d.append(el('p','이 가상 계정의 작성 중인 글과 저장한 글을 지워.'),button('내 일기 삭제',()=>{if(me()!==a)return;delete diary[a];delete draft[a];closeSheet();mount();}));});},'md-secondary'));root.append(t,hint,actions);}
function tidyAccount(){if(view!=='account'||observerBusy)return;observerBusy=true;try{const form=root.querySelector('form.aw-section');if(form&&!form.dataset.compact){form.dataset.compact='true';const labels=[...form.querySelectorAll(':scope > label')],details=el('details','','md-private-details');details.append(el('summary','취향 · 공개 범위 더 설정하기'));for(const l of labels.slice(2))details.append(l);const save=form.querySelector('button[type=submit]');form.insertBefore(details,save);}
 for(const section of root.querySelectorAll('.aw-body > .aw-section')){const title=section.querySelector('h3')?.textContent??'';if(/개인정보|내 데이터/.test(title)&&!section.closest('details')){const d=el('details','','md-private-details');d.append(el('summary','내 데이터 · 계정 삭제'));section.before(d);d.append(section);}}
 }finally{observerBusy=false;}}
mount=function(){if(!identity)return;closeSheet();head.replaceChildren();status.textContent='';if(!active(me())&&view!=='account')view='account';updateNav();
 if(view==='home'){home();return;}if(view==='diary'){diaryPage();return;}
 const requested=view;let h;
 if(requested==='discover'){
  h=pageTitle('취향은 비슷하게.','음악부터 말투까지, 결이 맞는 사람.');const modes=[['친구','FRIENDS',()=>go('discover','FRIENDS')]];if(DEMO.users[me()]?.state.adult)modes.push(['연애 19+','DATE',()=>go('discover','DATE')]);else findMode='FRIENDS';const row=tabBar(h,modes,findMode);row.append(button('필터',()=>app?.filters(),'md-filter'));originalMount();app.mode=findMode;app.tab='people';app.options.onGroups=()=>go('groups');void app.reload();
 }else if(requested==='plans'||requested==='matches'){
  h=pageTitle(requested==='plans'?'약속도, 우리답게.':'서로 마음이 닿았어.','실제 연락 없이 가상 계정끼리 확인해 봐.',requested==='plans');
  if(requested==='matches'){tabBar(h,[['친구 대화','friends',()=>go('friends')],['매칭 대화','matches',()=>go('matches')]],'matches');}
  view='discover';originalMount();view=requested;app.tab=requested==='plans'?'plans':'matches';app.mode='FRIENDS';void app.reload();
 }else{
  if(requested==='friends'){h=pageTitle('말 걸어도 괜찮아.','서로 수락한 대화만, 천천히.');const menu=[['친구 대화','friends',()=>go('friends')]];if(DEMO.users[me()]?.state.adult)menu.push(['매칭 대화','matches',()=>go('matches')]);tabBar(h,menu,'friends');}
  if(requested==='groups'){h=pageTitle('오늘, 혼자 말고.','같은 노래 듣는 모임부터 시작해.',true);h.append(button('모임 장소 · 시간 투표',()=>go('plans'),'md-primary'));}
  if(requested==='account')h=pageTitle('나의 작은 세계','프로필 사진부터 내 데이터까지.',true);
  originalMount();if(requested==='account')app.options.onBack=()=>go('home');
 }
 updateNav();tidyAccount();
};
new MutationObserver(tidyAccount).observe(root,{subtree:true,childList:true});
const previousRequest=window.qaRequest;window.qaRequest=async q=>{const r=await previousRequest(q);if(r.status===200){if(q.path==='/lab/reset'){arrivals.clear();diary={};draft={};}if(q.path==='/api/v3/account/deletion'){delete diary[q.actor];delete draft[q.actor];}arrivals.snapshot(me());}return r;};
$('brand-home').onclick=()=>go('home');for(const b of $('main-nav').children)b.onclick=()=>go(b.dataset.page);
$('settings-open').onclick=()=>{closeSheet();$('current-person').textContent=`${name(me())} · 가상 계정`;$('settings-links').replaceChildren(button('프로필 · 사진',()=>go('account'),''),button('나만의 일기',()=>go('diary'),''),button('모임 · 장소 투표',()=>go('groups'),''));if(identity?.operator)$('settings-links').append(button('운영자 검수 화면',()=>{go('account');say('아래 ‘사진 · 삭제 운영 검수’에서 확인해 줘.');},''));settings.showModal();};
$('settings-close').onclick=()=>settings.close();settings.addEventListener('close',()=>{$('settings-open').focus();});
// Reset is safe in this public review: it clears only the current tab's synthetic memory.
$('reset').onclick=async()=>{try{await request('POST','/lab/reset',{});view='home';settings.close();mount();say('이 탭의 샘플 데이터만 초기화했어요.');}catch(e){say(e.message);}};
actor.addEventListener('change',()=>{arrivals.snapshot(me());settings.close();view='home';});
const timer=setInterval(()=>{if(view==='home'&&identity){const old=root.querySelector('.md-state')?.textContent;const s=arrivals.snapshot(me());const next=s?.phase==='active'?'체험 ON':s?'동의 대기':'체험 OFF';if(old!==next)home();}},10000);
window.addEventListener('pagehide',()=>{clearInterval(timer);arrivals.clear();diary={};draft={};closeSheet();});window.addEventListener('pageshow',e=>{if(e.persisted){view='home';mount();}});
view='home';if(identity)mount();
})();
