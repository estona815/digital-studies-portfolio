/* Static review recovery only. No telemetry, cookies, network calls or automatic reload. */
(()=>{'use strict';let shown=false;
function show(){if(shown)return;shown=true;const root=document.getElementById('lab-status');if(!root)return;root.replaceChildren();const text=document.createElement('p');text.textContent='화면을 온전히 불러오지 못했어요. 새로고침하면 이 탭의 샘플 입력은 초기화돼요.';const retry=document.createElement('button');retry.type='button';retry.className='sx-button';retry.textContent='샘플 초기화 후 다시 열기';retry.onclick=()=>location.reload();root.append(text,retry);root.setAttribute('role','alert');}
window.addEventListener('error',e=>{if(e.target?.tagName==='SCRIPT')show();},true);
window.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{if(!window.MENHERA_REVIEW||!document.querySelector('#workspace > *'))show();},6000);},{once:true});
})();
