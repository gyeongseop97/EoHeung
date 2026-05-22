from pathlib import Path

p = Path('index.html')
text = p.read_text(encoding='utf-8')

old = '<div class="toolbar"><span id="userEmail" class="note"></span><button class="btn danger" id="signOutBtn">로그아웃</button></div>'
if old in text:
    text = text.replace(old, '')
else:
    print('legacy account toolbar markup not found')

old_show = "function showApp(){qs('authView').classList.add('hide');qs('appView').classList.remove('hide');qs('userEmail').textContent=state.user?.email||''}"
new_show = "function showApp(){qs('authView').classList.add('hide');qs('appView').classList.remove('hide');window.currentUserEmail=state.user?.email||'';const ue=qs('userEmail');if(ue)ue.textContent=window.currentUserEmail;document.dispatchEvent(new CustomEvent('user-email-updated',{detail:{email:window.currentUserEmail}}))}"
if old_show in text:
    text = text.replace(old_show, new_show)
else:
    print('showApp pattern not found')

old_bind = "qs('signOutBtn').onclick=async()=>{await state.client.auth.signOut();state.user=null;showAuth()};"
new_bind = "const legacySignOutBtn=qs('signOutBtn');if(legacySignOutBtn)legacySignOutBtn.onclick=async()=>{await state.client.auth.signOut();state.user=null;showAuth()};"
if old_bind in text:
    text = text.replace(old_bind, new_bind)
else:
    print('signOut binding pattern not found')

p.write_text(text, encoding='utf-8')
print('legacy account area removed')
