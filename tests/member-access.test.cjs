const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../member-access.js');
const user={id:'regular-user',email:'member@example.test'};
const rows=[{id:1,auth_user_id:user.id,name:'회원',email:user.email,phone:'010-test',member_role:'regular'},{id:2,auth_user_id:'admin-user',name:'관리자',email:'admin@example.test',phone:'private',memo:'private',member_role:'admin'}];
test('administrator access fails closed for unloaded, unlinked and ordinary accounts',()=>{
 assert.equal(A.isAdmin([],user),false);assert.equal(A.isAdmin(rows,user),false);
 assert.equal(A.isAdmin(rows,{id:'stranger'}),false);assert.equal(A.isAdmin(rows,null),false);
 assert.equal(A.isAdmin(rows,{id:'admin-user'}),true);
 assert.equal(A.isAdmin([{...rows[1],auth_user_id:'different',email:user.email}],user),false);
});
test('directory keeps attendance names but strips other members contact fields',()=>{
 const result=A.sanitize(rows,user);assert.equal(result[0].phone,'010-test');
 assert.deepEqual(result[1],{id:2,name:'관리자',status:undefined,member_role:'admin'});
 assert.equal(A.sanitize(rows,{id:'admin-user'})[0].email,user.email);
});
test('account label uses name and never displays email as fallback',()=>{
 assert.equal(A.displayName(rows,user),'회원님');
 assert.equal(A.displayName([],{id:'new',email:'never-show@example.test'}),'회원님');
 assert.equal(A.displayName([],{id:'new',user_metadata:{name:'김삼성'}}),'김삼성님');
 assert.equal(A.displayName([],{id:'new',user_metadata:{name:'never@example.test'}}),'회원님');
});
test('ambiguous account links cannot grant administrative rights',()=>{
 assert.equal(A.isAdmin([{...rows[0],member_role:'admin'},{...rows[0],id:3}],user),false);
 assert.equal(A.self([{...rows[0],auth_user_id:null},{...rows[0],id:3,auth_user_id:null}],user),null);
});
test('member loader uses the restricted RPC and does not fall back to raw member rows',async()=>{
 let called=false;const result=await A.loadMembers({rpc:async name=>{called=true;assert.equal(name,'eo_member_directory');return{data:rows,error:null}}},user);
 assert.equal(called,true);assert.equal(result.data[1].phone,undefined);
 const error={message:'restricted'};assert.deepEqual(await A.loadMembers({rpc:async()=>({error})},user),{error});
});
