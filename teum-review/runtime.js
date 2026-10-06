let DEMO;
const copy=x=>JSON.parse(JSON.stringify(x));const resetDemo=()=>DEMO={users:copy(OFFLINE_SEED),matches:[],messages:{},likes:new Set(['outsider>adult']),decisions:{},blocks:new Set(),proposals:copy(OFFLINE_SEED.owner.plan.items),reports:[]};resetDemo();
for(const [user,row]of Object.entries(DEMO.users))for(const m of row.matches.items??[])if(!DEMO.matches.some(x=>x.id===m.id))DEMO.matches.push({id:m.id,pair:[user,m.person.id],closed:false});
const initialMatches=copy(DEMO.matches);const uuid=()=>{const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');};
const person=id=>{for(const u of Object.values(DEMO.users))for(const p of u.friends.items??[])if(p.id===id)return p;return {id,nickname:id==='adult'?'나루':'도윤',age:id==='adult'?23:25};};
const fail=(message,status=403)=>({status,data:{error:{message}}});const ok=data=>({status:200,data});
window.qaRequest=async({actor,method,path,body={}})=>{
 const user=DEMO.users[actor];if(!user)return fail('샘플 계정을 선택해 주세요.');
 if(path==='/lab/reset'){resetDemo();DEMO.matches=copy(initialMatches);return ok({reset:true});}
 if(path==='/api/v3/discovery/state')return ok(user.state);
 if(path==='/api/v3/spaces')return ok(user.spaces);
 if(path.endsWith('/events')&&path.includes('/spaces/'))return ok({items:user.spaces.items?.length?[{id:'11111111-1111-4111-8111-111111111111',title:'같은 노래 듣는 오후',region:'서울 마포구',startAt:'2026-10-10T05:00:00.000Z'}]:[]});
 if(path==='/api/v3/discovery/query'){
  if(body.mode==='DATE'&&!user.state.adult)return fail('샘플에서도 연애 기능은 성인 전용입니다.');
  const rows=copy(body.mode==='DATE'?user.date.items??[]:user.friends.items??[]).filter(p=>!DEMO.decisions[`${actor}:${body.mode??'FRIENDS'}:${p.id}`]&&!DEMO.blocks.has([actor,p.id].sort().join(':'))&&(!body.region||body.region===p.region)&&(!body.query||[p.nickname,...p.interests,...p.music].join(' ').includes(body.query)));
  return ok({items:rows});
 }
 if(path==='/api/v3/dating/preferences'){
  if(body.enabled&&!user.state.adult)return fail('성인 전용입니다.');user.state.preference={enabled:body.enabled,minAge:19,maxAge:99};if(!body.enabled)DEMO.matches.filter(m=>m.pair.includes(actor)).forEach(m=>m.closed=true);return ok({enabled:body.enabled});
 }
 if(path==='/api/v3/discovery/decisions'){
  if(body.mode==='DATE'&&!user.state.adult)return fail('성인 전용입니다.');DEMO.decisions[`${actor}:${body.mode}:${body.targetId}`]=true;
  if(body.action==='like'&&body.mode==='DATE'){DEMO.likes.add(`${actor}>${body.targetId}`);if(DEMO.likes.has(`${body.targetId}>${actor}`)){let m=DEMO.matches.find(m=>m.pair.includes(actor)&&m.pair.includes(body.targetId));if(!m){m={id:uuid(),pair:[actor,body.targetId],closed:false};DEMO.matches.push(m);}return ok({matched:!m.closed,matchId:m.id});}}
  return ok({matched:false});
 }
 if(path==='/api/v3/dating/matches')return ok({items:DEMO.matches.filter(m=>!m.closed&&m.pair.includes(actor)).map(m=>({id:m.id,person:person(m.pair.find(p=>p!==actor))}))});
 if(path.startsWith('/api/v3/dating/matches/')){
  const id=path.split('/')[5],m=DEMO.matches.find(m=>m.id===id&&!m.closed&&m.pair.includes(actor));if(!m)return fail('이 연결은 볼 수 없습니다.');
  if(method==='DELETE'){m.closed=true;return ok({closed:true});}
  const rows=DEMO.messages[id]??=[];if(method==='GET')return ok({items:rows.filter(r=>r.status==='published'||r.sender_id===actor)});
  const prior=rows.find(r=>r.clientId===body.clientId&&r.sender_id===actor);if(prior)return ok(prior);
  const message={id:uuid(),sender_id:actor,text:body.text,clientId:body.clientId,status:/https?:|010[ -]|누드/.test(body.text)?'review':'published',created_at:new Date().toISOString()};rows.push(message);return ok(message);
 }
 if(path==='/api/v3/discovery/reports'){DEMO.reports.push({id:uuid(),...body});return ok({id:DEMO.reports.at(-1).id,status:'open',offlineOnly:true});}
 if(path==='/api/v3/blocks'){DEMO.blocks.add([actor,body.targetId].sort().join(':'));DEMO.matches.filter(m=>m.pair.includes(actor)&&m.pair.includes(body.targetId)).forEach(m=>m.closed=true);return ok({blocked:true});}
 if(path==='/api/v3/admin/discovery-review'){if(actor!=='owner')return fail('샘플 운영자만 가능합니다.');return ok({proposals:DEMO.proposals.filter(p=>p.status==='proposed').map(p=>({...p,exact_venue:p.venue})),reports:DEMO.reports,heldMessages:[]});}
 if(path.startsWith('/api/v3/admin/venue-proposals/')){if(actor!=='owner')return fail('샘플 운영자만 가능합니다.');const p=DEMO.proposals.find(p=>p.id===path.split('/').at(-1));if(!p)return fail('없는 후보입니다.');p.status=body.action==='approve'?'approved':'rejected';return ok(p);}
 if(path==='/api/v3/admin/discovery-content'){if(actor!=='owner')return fail('샘플 운영자만 가능합니다.');DEMO.reports=DEMO.reports.filter(r=>r.id!==body.targetId);return ok({resolved:true});}
 if(path.includes('/events/')&&path.endsWith('/proposals')){
  if(!user.plan.items)return fail('이 샘플 계정은 모임 멤버가 아닙니다.');
  if(method==='GET'){const approved=user.plan.approved;return ok({...user.plan,items:DEMO.proposals.filter(p=>p.status!=='rejected').map(p=>({...p,venue:approved?p.venue:null,selected:DEMO.decisions[`vote:${actor}`]===p.id})),confirmed:DEMO.proposals.some(p=>p.status==='confirmed')});}
  if(!user.plan.approved)return fail('참가 승인 후 제안할 수 있습니다.');const p={id:uuid(),label:body.label,region:body.region,venue:body.venue,venueKind:body.venueKind,startAt:body.startAt,endAt:body.endAt,status:'proposed',votes:0,selected:false};DEMO.proposals.push(p);return ok(p);
 }
 if(path.endsWith('/venue-vote')){if(!user.plan.approved)return fail('참가 승인 후 투표할 수 있습니다.');const p=DEMO.proposals.find(p=>p.id===body.proposalId&&p.status==='approved');if(!p)return fail('확인된 후보만 투표할 수 있습니다.');const old=DEMO.proposals.find(p=>p.id===DEMO.decisions[`vote:${actor}`]);if(old)old.votes--;p.votes++;DEMO.decisions[`vote:${actor}`]=p.id;return ok({selected:p.id});}
 if(path.endsWith('/venue-confirmation')){if(actor!=='owner')return fail('모임장만 확정할 수 있습니다.');const p=DEMO.proposals.find(p=>p.id===body.proposalId&&p.status==='approved');if(!p)return fail('확인된 후보만 확정할 수 있습니다.');p.status='confirmed';Object.entries(DEMO.users).filter(([id])=>id!==actor).forEach(([,u])=>u.plan.approved=false);return ok({confirmed:true});}
 return fail('이 작업은 실제 계정·외부 서비스 연결이 필요합니다. 오프라인 샘플에서는 실행하지 않습니다.',501);
};

// Browser-memory sample, not authentication, server image processing or erasure verification.
const legacyRequest=window.qaRequest;let SAMPLE={};
function resetLifecycle(){SAMPLE={settings:{},photos:[],jobs:[],deleted:new Set()};for(const id of Object.keys(DEMO.users)){const p=person(id);SAMPLE.settings[id]={nickname:p.nickname,bio:p.bio??'같이 좋아하는 노래를 나누고 싶어.',region:'서울 마포구',interests:p.interests??['음악','사진','카페','공연','산책'],music:p.music??['디지코어','인디록','제이팝'],visibility:'EVERYONE',dmPolicy:'REQUEST_ONLY',status:'active',policyVersion:'teum-0.6'};}}resetLifecycle();
window.qaRequest=async q=>{const {actor,method,path,body={}}=q,s=SAMPLE.settings[actor];
 if(path==='/lab/reset'){const r=await legacyRequest(q);resetLifecycle();return r;}
 if(path==='/api/v3/account/deletion-status'){const job=SAMPLE.jobs.find(j=>j.id===body.receiptId&&j.user===actor);return job?ok({receiptId:job.id,state:job.state,applicationDataDeleted:job.state==='complete',externalAccountDeleted:false}):fail('내 샘플 접수번호만 확인할 수 있어요.',404);}
 if(path.startsWith('/api/v3/admin/')){
  if(actor!=='owner')return fail('샘플 운영자로 바꿔 주세요.');
  if(path==='/api/v3/admin/photos')return ok({items:SAMPLE.photos.filter(p=>p.status==='pending')});
  const photo=path.match(/^\/api\/v3\/admin\/photos\/([^/]+)(\/content)?$/);if(photo){const p=SAMPLE.photos.find(p=>p.id===photo[1]);if(!p)return fail('없는 샘플 사진',404);if(photo[2])return ok({contentType:'image/jpeg',base64:p.base64});if(p.user_id===actor)return fail('본인 사진은 직접 승인할 수 없어요.');p.status=body.action==='approve'?'approved':'rejected';return ok({status:p.status});}
  if(path==='/api/v3/admin/deletions')return ok({items:SAMPLE.jobs.filter(j=>j.state!=='complete')});
  const deletion=path.match(/^\/api\/v3\/admin\/deletions\/([^/]+)\/process$/);if(deletion){const j=SAMPLE.jobs.find(j=>j.id===deletion[1]);if(!j)return fail('없는 샘플 접수',404);j.state='complete';SAMPLE.photos=SAMPLE.photos.filter(p=>p.user_id!==j.user);delete SAMPLE.settings[j.user];return ok({state:'complete',offlineOnly:true});}
 }
 if(path==='/api/v3/account/settings'){
  if(!s)return fail('삭제된 샘플 계정이에요.',404);if(method==='GET')return ok(s);
  if(s.status!=='active')return fail('삭제 처리 중이에요.');if(!body.nickname?.trim()||body.interests?.length<5||body.music?.length<3)return fail('닉네임과 취향 개수를 확인해 주세요.',422);Object.assign(s,body);return ok({saved:true});
 }
 if(!s||s.status==='deleted')return fail('삭제된 샘플 계정이에요. 실제 서비스 계정이 아닙니다.');
 if(path==='/api/v3/account/photos'){if(method==='GET')return ok({items:SAMPLE.photos.filter(p=>p.user_id===actor&&p.status!=='deleted')});if(SAMPLE.photos.filter(p=>p.user_id===actor&&p.status!=='deleted').length>=6)return fail('샘플 사진은 최대 6장');const p={id:uuid(),user_id:actor,status:'pending',base64:body.base64,created_at:new Date().toISOString()};SAMPLE.photos.push(p);return ok({id:p.id,status:p.status,offlineOnly:true});}
 if(path.startsWith('/api/v3/account/photos/')&&method==='DELETE'){const id=path.split('/').at(-1);SAMPLE.photos=SAMPLE.photos.filter(p=>p.id!==id||p.user_id!==actor);return ok({storageDeleted:true,offlineOnly:true});}
 const content=path.match(/^\/api\/v3\/profile-photos\/([^/]+)\/content$/);if(content){const p=SAMPLE.photos.find(p=>p.id===content[1]&&(p.user_id===actor||p.status==='approved'));return p?ok({contentType:'image/jpeg',base64:p.base64}):fail('샘플 사진 비공개',404);}
 if(path==='/api/v3/account/export')return ok({items:body.section==='profile'?[s]:body.section==='photos'?SAMPLE.photos.filter(p=>p.user_id===actor).map(p=>({id:p.id,status:p.status})):[],nextAfter:null,offlineOnly:true});
 if(path==='/api/v3/account/deletion'){if(body.confirmation!=='계정 삭제')return fail('확인 입력 필요',422);const j={id:uuid(),user:actor,state:'queued'};SAMPLE.jobs.push(j);s.status='deleted';SAMPLE.deleted.add(actor);return ok({receiptId:j.id,state:j.state,offlineOnly:true});}
 const r=await legacyRequest(q);if(path==='/api/v3/discovery/query'&&r.status===200){r.data.items=r.data.items.filter(p=>!SAMPLE.deleted.has(p.id)).map(p=>({...p,nickname:SAMPLE.settings[p.id]?.nickname??p.nickname,photoId:SAMPLE.photos.find(x=>x.user_id===p.id&&x.status==='approved')?.id??null}));}return r;
};
let offlineActor='adult';window.fetch=async(path,options={})=>{const body=options.body?JSON.parse(options.body):{};let r;if(path==='/lab/session'){offlineActor=body.actor;r=ok({userId:offlineActor,operator:offlineActor==='owner',csrf:'offline-simulation-not-security',syntheticOnly:true});}else r=await window.qaRequest({actor:offlineActor,method:options.method??'GET',path,body});return {ok:r.status<400,status:r.status,json:async()=>r.data};};



let app,csrf='',identity=null,view='discover',generation=0;const actor=document.getElementById('actor'),status=document.getElementById('lab-status');
const request=async(method,path,body)=>{const r=await fetch(path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json',...(method==='GET'?{}:{'X-CSRF-Token':csrf})},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await r.json();if(!r.ok)throw Error(data.error?.message??'요청 실패');return data;};
function mount(){app?.destroy();if(!identity)return;document.getElementById('discover').setAttribute('aria-pressed',String(view==='discover'));document.getElementById('account').setAttribute('aria-pressed',String(view==='account'));const root=document.getElementById('workspace');if(view==='account')app=new AccountWorkspace(root,{userId:identity.userId,request,operator:identity.operator,onBack:()=>{view='discover';mount();},onDeleted:()=>{document.getElementById('discover').disabled=true;status.textContent='삭제 접수됨 · 이 가상 계정의 일반 기능 접근을 닫았어요.';}});else app=new DiscoveryWorkspace(root,{userId:identity.userId,request,operator:identity.operator,portrait:id=>id==='outsider'?"portrait.webp":null});}
async function signIn(){const gen=++generation;app?.destroy();identity=null;status.textContent='가상 테스트 세션을 열고 있어요.';try{const r=await fetch('/lab/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-TEUM-Lab-Intent':'synthetic-session'},body:JSON.stringify({actor:actor.value})});const value=await r.json();if(!r.ok)throw Error(value.error?.message??'세션 생성 실패');if(gen!==generation)return;identity=value;csrf=value.csrf;document.getElementById('reset').disabled=!identity.operator;document.getElementById('discover').disabled=false;status.textContent='샘플 계정 · 실제 본인 인증 아님';mount();}catch(e){status.textContent=e.message;}}
actor.addEventListener('change',()=>void signIn());document.getElementById('discover').onclick=()=>{view='discover';mount();};document.getElementById('account').onclick=()=>{view='account';mount();};document.getElementById('reset').onclick=async()=>{try{await request('POST','/lab/reset',{});status.textContent='가상 데이터만 초기화했어요.';mount();}catch(e){status.textContent=e.message;}};
window.addEventListener('pagehide',()=>app?.destroy());void signIn();
