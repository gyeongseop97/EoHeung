(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EoAccess=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const app=()=>{try{return typeof state!=='undefined'?state:null}catch{return null}};
  function self(members,user){
    if(!user?.id)return null;
    const linked=(members||[]).filter(m=>m.auth_user_id&&String(m.auth_user_id)===String(user.id));
    if(linked.length)return linked.length===1?linked[0]:null;
    const email=String(user.email||'').trim().toLowerCase();if(!email)return null;
    const found=(members||[]).filter(m=>!m.auth_user_id&&String(m.email||'').trim().toLowerCase()===email);
    return found.length===1?found[0]:null;
  }
  function isAdmin(members=app()?.members,user=app()?.user){return self(members,user)?.member_role==='admin';}
  function displayName(members=app()?.members,user=app()?.user){
    const name=String(self(members,user)?.name||user?.user_metadata?.name||user?.user_metadata?.full_name||'').trim();
    return name&&!name.includes('@')?name+'님':'회원님';
  }
  function sanitize(members,user){
    if(isAdmin(members,user))return members;
    const mine=self(members,user);
    return (members||[]).map(m=>m===mine?m:{id:m.id,name:m.name,status:m.status,member_role:m.member_role});
  }
  async function loadMembers(client,user){
    const result=await client.rpc('eo_member_directory');
    const current=app();
    if(current&&String(current.user?.id)!==String(user?.id))return {data:null,error:{message:'Account changed during loading'}};
    if(result.error){if(current){current.members=[];current.memberAccessLoaded=false;applyUI();}return result;}
    const data=sanitize(Array.isArray(result.data)?result.data:[],user);
    if(current){current.memberAccessLoaded=true;current.members=data;applyUI();}
    return {data,error:null};
  }
  function applyUI(){
    if(typeof document==='undefined')return;
    const current=app(),admin=isAdmin();document.body.classList.toggle('eo-admin',admin);
    document.querySelectorAll('.nav [data-page="members"]').forEach(button=>{button.hidden=!admin;});
    if(!admin){const root=document.getElementById('memberRows');if(root?.children.length)root.replaceChildren();}
    if(current?.memberAccessLoaded&&location.pathname==='/members'&&typeof activatePage==='function')activatePage(admin?'members':'dashboard',{updateUrl:!admin,replaceUrl:true});
  }
  return {self,isAdmin,displayName,sanitize,loadMembers,applyUI};
});
