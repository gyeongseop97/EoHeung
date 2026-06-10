(function(){
  const URL='https://chaddxsntnokjjcrwiyb.supabase.co';
  const KEY='sb_publishable_NiKj0BxbW3VauGK_kkflbg_OqMXPpCT';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const low=s=>String(s||'').trim().toLowerCase();
  let client=null,user=null,members=[];
  function c(){if(!client&&window.supabase)client=window.supabase.createClient(URL,KEY);return client}
  function msg(t){const el=document.getElementById('toast');if(el){const d=document.createElement('div');d.textContent=t;el.appendChild(d);setTimeout(()=>d.remove(),2600)}else console.warn(t)}
  function role(m){return m?.member_role||'associate'}
  function me(){const uid=String(user?.id||''),email=low(user?.email);return members.find(m=>String(m.auth_user_id||'')===uid)||members.find(m=>low(m.email)===email)||null}
  function admin(){const m=me();if(m&&role(m)==='admin')return true;return !members.some(x=>role(x)==='admin')}
  function regular(){const m=me();return !!m&&role(m)==='regular'}
  function byId(id){return members.find(m=>String(m.id)===String(id))}
  function canCheck(id){const m=byId(id);if(admin())return !!m&&role(m)==='regular';const mine=me();return regular()&&mine&&String(mine.id)===String(id)}
  async function load(){const cl=c();if(!cl)return;const s=await cl.auth.getSession();user=s.data.session?.user||null;if(!user)return;const r=await cl.from('members').select('id,name,email,auth_user_id,member_role').order('name');if(!r.error)members=r.data||[];apply()}
  function applyAttendance(){const root=$('#dateDetail');if(!root||!members.length)return;$$('.member-checks',root).forEach(box=>{const rows=$$('.check-row',box);if(!rows.length)return;let visible=0;rows.forEach(row=>{const input=row.querySelector('input[data-member]');if(!input)return;const ok=canCheck(input.dataset.member);if(ok){input.disabled=false;row.style.display='';visible++}else{row.style.display='none';input.disabled=true}});let note=box.querySelector('.role-attendance-note');if(!visible){if(!note){note=document.createElement('div');note.className='permission-banner warn role-attendance-note';note.style.cssText='border:1px solid #fed7aa;background:#fff7ed;color:#9a3412;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:800;margin:8px 0';box.appendChild(note)}note.textContent=admin()?'체크 가능한 정회원이 없습니다. 회원관리에서 정회원 권한을 부여해 주세요.':'준회원은 직관 체크 권한이 없습니다. 정회원은 본인 이름만 체크할 수 있습니다.'}else if(note){note.remove()}})}
  function applyAbout(){const a=admin();const sel='[data-cmd-toggle],[data-cmd-save],[data-cmd-reset],.eo-about-edit button,.eo-about-edit textarea,.eo-about-edit input,.eo-about-edit select,[data-about-edit],[data-about-save]';$$(sel).forEach(el=>{el.style.display=a?'':'none';if('disabled'in el)el.disabled=!a});if(!a)$('#eoCmdEdit')?.classList.remove('show')}
  function apply(){applyAttendance();applyAbout()}
  document.addEventListener('change',e=>{const cb=e.target.closest('input[type="checkbox"][data-game][data-member]');if(cb&&!canCheck(cb.dataset.member)){e.preventDefault();e.stopImmediatePropagation();cb.checked=!cb.checked;msg(admin()?'관리자는 정회원만 직관 체크할 수 있습니다.':'정회원은 본인 이름만 체크할 수 있고, 준회원은 체크할 수 없습니다.')}},true);
  document.addEventListener('click',e=>{if(admin())return;if(e.target.closest('[data-cmd-toggle],[data-cmd-save],[data-cmd-reset],.eo-about-edit button,[data-about-edit],[data-about-save]')){e.preventDefault();e.stopImmediatePropagation();msg('모임 소개와 십계명 수정은 관리자만 가능합니다.')}},true);
  function boot(){load();setInterval(apply,400);setInterval(load,30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
