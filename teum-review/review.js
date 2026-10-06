// Synthetic review controls only. No network, authentication or production writes.
(()=>{
const make=(tag,text='',cls='')=>{const x=document.createElement(tag);x.textContent=text;x.className=cls;return x;};
const btn=(text,fn,cls='dw-button')=>{const b=make('button',text,cls);b.type='button';b.onclick=fn;return b;};
const uid=()=>identity?.userId;
const names={adult:'나루',owner:'도윤',outsider:'유나',teen:'하루',younger:'민',eighteen:'열여덟'};
const name=id=>SAMPLE.settings[id]?.nickname??names[id]??'가상 사용자';
const mainGroup='b2222222-2222-4222-8222-222222222222';
const init=()=>({requests:[],messages:{},groups:[{id:mainGroup,title:'같은 노래 듣는 모임',description:'좋아하는 노래와 플레이리스트를 나눠요. 샘플 모임입니다.',owner:'owner',members:['adult','teen','younger','owner','eighteen'],posts:[{id:'seed-post',author:'owner',text:'요즘 반복해서 듣는 노래 하나씩 알려줘!',time:new Date().toISOString()}]}]});
let social=init();let room=null;let selectedGroup=mainGroup;
const restricted=(a,b)=>['teen','younger','eighteen'].includes(a)!==['teen','younger','eighteen'].includes(b);
const blocked=(a,b)=>DEMO.blocks.has([a,b].sort().join(':'))||SAMPLE.deleted.has(a)||SAMPLE.deleted.has(b);
const previous=window.qaRequest;
window.qaRequest=async q=>{
 const {actor:a,method,path,body={}}=q;
 if(path==='/lab/reset'){const r=await previous(q);social=init();room=null;return r;}
 if(path==='/api/v3/contacts'&&method==='POST'){
  if(blocked(a,body.targetId)||a===body.targetId)return fail('이 샘플 연결은 사용할 수 없어요.');
  const g=social.groups.find(g=>g.id===body.spaceId&&g.members.includes(a)&&g.members.includes(body.targetId));
  if(!g)return fail('같은 샘플 모임의 멤버끼리 요청해 주세요.');
  if(restricted(a,body.targetId))return fail('검수본의 친구 대화는 청소년·성인 영역을 분리해요. 같은 영역의 가상 계정을 선택해 주세요.');
  if(!String(body.intro??'').trim())return fail('첫 인사를 입력해 주세요.',422);
  if(social.requests.some(r=>[r.from,r.to].includes(a)&&[r.from,r.to].includes(body.targetId)&&['pending','accepted'].includes(r.state)))return fail('이미 요청했어요. 친구 대화 메뉴에서 확인해 주세요.',409);
  const r={id:uuid(),from:a,to:body.targetId,state:'pending',intro:String(body.intro).slice(0,240),group:g.id};social.requests.push(r);return ok({id:r.id,status:r.state,offlineOnly:true});
 }
 if(path==='/api/v3/account/export'&&body.section==='messages')return ok({items:Object.values(social.messages).flat().filter(m=>m.author===a),nextAfter:null,offlineOnly:true});
 if(path==='/api/v3/account/export'&&body.section==='datingMessages')return ok({items:Object.values(DEMO.messages).flat().filter(m=>m.sender_id===a).map(m=>({id:m.id,text:m.text,created_at:m.created_at})),nextAfter:null,offlineOnly:true});
 if(path==='/api/v3/account/export'&&body.section==='posts')return ok({items:social.groups.flatMap(g=>g.posts).filter(p=>p.author===a),nextAfter:null,offlineOnly:true});
 const r=await previous(q);
 if(path==='/api/v3/account/deletion'&&r.status===200){social.requests.filter(x=>[x.from,x.to].includes(a)).forEach(x=>x.state='closed');DEMO.matches.filter(x=>x.pair.includes(a)).forEach(x=>x.closed=true);}
 return r;
};
const nav=document.querySelector('.lab-feature-nav');nav.style.flexWrap='wrap';
const friendsButton=btn('친구 대화',()=>{view='friends';mount();});friendsButton.id='friends';
const groupsButton=btn('모임 · 게시판',()=>{view='groups';mount();});groupsButton.id='groups';nav.append(groupsButton,friendsButton);
for(const b of nav.children){b.style.flex='1 1 42%';b.style.padding='8px';}
const note=text=>{status.textContent=text;};
function panel(title){app?.destroy();app=null;const root=document.getElementById('workspace');root.className='dw';root.replaceChildren(make('h2',title),make('p','샘플 계정을 바꿔 양쪽 화면을 확인해 봐. 입력 내용은 이 탭에서만 처리돼.','dw-intro'));return root;}
function card(root,title,text){const box=make('article','','aw-section');box.append(make('h3',title),make('p',text));root.append(box);return box;}
function isCurrent(a){return uid()===a&&!SAMPLE.deleted.has(a);}
function friends(){
 const a=uid(),root=panel('친구 대화');if(!isCurrent(a)){root.append(make('p','삭제된 샘플 계정이에요. 다른 테스트 계정을 선택해 주세요.'));return;}
 const requests=social.requests.filter(r=>[r.from,r.to].includes(a)&&!blocked(r.from,r.to));
 if(room){const r=requests.find(r=>r.id===room&&r.state==='accepted');if(!r)room=null;else{
  root.append(btn('친구 대화 목록',()=>{room=null;friends();}));const peer=r.from===a?r.to:r.from;root.append(make('h3',`${name(peer)}님과의 친구 대화`));
  for(const m of social.messages[r.id]??[])card(root,m.author===a?'나':name(m.author),m.text);
  const form=make('form','','aw-section'),text=make('textarea');text.setAttribute('aria-label','친구 메시지');text.maxLength=1000;text.rows=3;text.style.cssText='width:100%;background:#261d2b;color:#fff0f6;border:1px solid #594158;border-radius:12px;padding:12px;font:inherit';
  const send=btn('친구 메시지 보내기',()=>{},'dw-primary');send.type='submit';form.append(text,send);form.onsubmit=e=>{e.preventDefault();if(!isCurrent(a)||r.state!=='accepted'||blocked(a,peer))return;if(!text.value.trim())return;const m={id:uuid(),author:a,text:text.value.trim().slice(0,1000),time:new Date().toISOString()};(social.messages[r.id]??=[]).push(m);friends();note('샘플 메모리에 저장했어요. 상대 가상 계정으로 바꾸면 볼 수 있어요.');};root.append(form);return;
 }}
 if(!requests.length)root.append(make('p','아직 친구 요청이 없어. 사람 카드나 모임 멤버에서 대화를 요청해 봐.','dw-empty'));
 for(const r of requests){const peer=r.from===a?r.to:r.from;const box=card(root,name(peer),`${{pending:'요청 대기',accepted:'서로 수락한 친구',rejected:'거절됨',closed:'종료됨'}[r.state]} · ${r.intro}`);
  if(r.to===a&&r.state==='pending')box.append(btn('친구 요청 수락',()=>{if(isCurrent(a)){r.state='accepted';friends();}} ,'dw-primary'),btn('친구 요청 거절',()=>{if(isCurrent(a)){r.state='rejected';friends();}}));
  if(r.state==='accepted')box.append(btn('친구 대화 열기',()=>{room=r.id;friends();},'dw-primary'));
 }
}
function groups(){
 const a=uid(),root=panel('취향 모임');if(!isCurrent(a)){root.append(make('p','다른 테스트 계정을 선택해 주세요.'));return;}
 const chosen=social.groups.find(g=>g.id===selectedGroup);root.append(make('p','모임에 참여하고 게시판에 글을 남겨 봐. 장소·시간 투표는 사람·약속 메뉴에서 확인할 수 있어.','dw-muted'));
 for(const g of social.groups){const box=card(root,g.title,`${g.description} · ${g.members.length}명`);box.append(btn(g.members.includes(a)?'게시판 보기':'모임 참여',()=>{if(!isCurrent(a))return;if(!g.members.includes(a))g.members.push(a);selectedGroup=g.id;groups();},'dw-primary'));}
 if(chosen?.members.includes(a)){
  const area=card(root,`${chosen.title} 게시판`,'모든 글은 샘플 메모리에만 보관돼요.');
  for(const p of chosen.posts.filter(p=>!blocked(a,p.author)))card(area,name(p.author),p.text);
  const form=make('form','','aw-section'),text=make('textarea');text.setAttribute('aria-label','모임 게시글');text.maxLength=1000;text.rows=3;text.style.cssText='width:100%;background:#261d2b;color:#fff0f6;border:1px solid #594158;border-radius:12px;padding:12px;font:inherit';
  const submit=btn('게시글 올리기',()=>{},'dw-primary');submit.type='submit';form.append(text,submit);form.onsubmit=e=>{e.preventDefault();if(isCurrent(a)&&text.value.trim()){chosen.posts.push({id:uuid(),author:a,text:text.value.trim(),time:new Date().toISOString()});groups();note('샘플 게시글을 저장했어요.');}};area.append(form);
  area.append(make('h3','모임 멤버'));
  for(const id of chosen.members.filter(id=>id!==a&&!blocked(a,id))){const row=card(area,name(id),'공통 모임에서 취향을 나누는 가상 멤버');if(SAMPLE.settings[id]&&!restricted(a,id))row.append(btn('친구 대화 요청',async()=>{if(!isCurrent(a))return;try{await request('POST','/api/v3/contacts',{targetId:id,spaceId:chosen.id,intro:'같은 모임에서 취향 이야기를 나누고 싶어요.'});note('친구 요청을 보냈어요. 상대 테스트 계정의 친구 대화 메뉴에서 수락해 봐.');}catch(e){note(e.message);}}));}
 }
 const create=card(root,'새 모임 만들기','검수용 가상 모임만 생성합니다.'),title=make('input');title.setAttribute('aria-label','새 모임 이름');title.maxLength=60;title.placeholder='모임 이름';title.style.cssText='width:100%;background:#261d2b;color:#fff0f6;border:1px solid #594158;border-radius:12px;padding:12px;font:inherit';create.append(title,btn('샘플 모임 만들기',()=>{if(!isCurrent(a)||title.value.trim().length<2){note('모임 이름을 두 글자 이상 입력해 줘.');return;}const g={id:uuid(),title:title.value.trim(),description:'직접 만든 샘플 모임',owner:a,members:[a],posts:[]};social.groups.push(g);selectedGroup=g.id;groups();note('샘플 모임을 만들었어요.');},'dw-primary'));
}
const originalMount=mount;mount=function(){
 const a=uid();if(a&&SAMPLE.deleted.has(a)&&view!=='account'){view='account';}
 if(view==='friends')friends();else if(view==='groups')groups();else originalMount();
 for(const b of nav.children)b.setAttribute('aria-pressed',String(({discover:'discover',account:'account',friends:'friends',groups:'groups'})[b.id]===view));
};
// The labels match the selected synthetic identities, not a new age-verification claim.
const realReset=resetLifecycle;resetLifecycle=function(){realReset();for(const id of ['teen','younger'])if(SAMPLE.settings[id])SAMPLE.settings[id].nickname=names[id];};
for(const id of ['teen','younger'])if(SAMPLE.settings[id])SAMPLE.settings[id].nickname=names[id];
const hint=make('p','검수 순서: 나루 → 모임에서 도윤에게 친구 요청 → 도윤 계정으로 바꿔 수락. 사진은 나루가 등록하고 도윤이 승인.','lab-proof');document.querySelector('.lab-controls').append(hint);
})();
