/* Review-only mutual arrival state. No geolocation, browser push, network or storage. */
(()=>{
class ArrivalSession {
 #session=null; #canConnect;
 constructor(canConnect){this.#canConnect=canConnect;}
 #check(now){const s=this.#session;if(s&&(now>=s.until||!this.#canConnect(s.from,s.to)))this.#session=null;}
 request(from,to,now=Date.now()){
  this.#check(now);
  if(this.#session)throw Error('진행 중인 요청을 먼저 종료해 주세요.');
  if(!from||!to||from===to||!this.#canConnect(from,to))throw Error('서로 연결된 성인 가상 계정이 필요해요.');
  this.#session={from,to,phase:'pending',until:now+600000,arrivals:[]};return this.snapshot(from,now);
 }
 accept(user,now=Date.now()){
  this.#check(now);const s=this.#session;
  if(!s||s.phase!=='pending'||user!==s.to)throw Error('요청받은 가상 계정에서만 수락할 수 있어요.');
  s.phase='active';s.until=now+3600000;return this.snapshot(user,now);
 }
 snapshot(user,now=Date.now()){
  this.#check(now);const s=this.#session;
  if(!s||![s.from,s.to].includes(user))return null;
  return {...s,arrivals:s.arrivals.map(x=>({...x})),peer:s.from===user?s.to:s.from};
 }
 arrive(user,now=Date.now()){
  this.#check(now);const s=this.#session;
  if(!s||s.phase!=='active'||![s.from,s.to].includes(user))throw Error('양쪽이 동의한 동안만 도착 알림을 체험할 수 있어요.');
  if(s.arrivals.some(x=>x.user===user))return {repeated:true};
  s.arrivals.push({user,at:now});return {repeated:false};
 }
 stop(user,now=Date.now()){
  this.#check(now);if(!this.#session)return false;
  if(![this.#session.from,this.#session.to].includes(user))throw Error('참여한 계정만 종료할 수 있어요.');
  this.#session=null;return true;
 }
 clear(){this.#session=null;}
}
window.ArrivalSession=ArrivalSession;
})();
