const fs=require('fs');
const path=require('path');

const TEAM_CODES={SS:'삼성',WO:'키움',LG:'LG',KT:'KT',HH:'한화',LT:'롯데',NC:'NC',OB:'두산',HT:'KIA',SK:'SSG',SG:'SSG'};
const TEAM_ALIASES=['삼성','키움','LG','KT','한화','롯데','NC','두산','KIA','SSG'];

function kstDate(){
  const now=new Date();
  const kst=new Date(now.getTime()+9*60*60*1000);
  return kst.toISOString().slice(0,10);
}
function ymdCompact(ymd){return ymd.replace(/-/g,'')}
function decodeText(s){
  return String(s||'')
    .replace(/\\u([0-9a-fA-F]{4})/g,(_,h)=>String.fromCharCode(parseInt(h,16)))
    .replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&#39;/g,"'")
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/\s+/g,' ');
}
function stripTags(html){return decodeText(html).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
async function fetchText(url){
  const res=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 EoHeungBot/1.0','accept':'text/html,application/json'}});
  if(!res.ok)throw new Error(`${res.status} ${url}`);
  return await res.text();
}
function findGameId(scheduleHtml,dateKey){
  const ids=[...new Set([...scheduleHtml.matchAll(new RegExp(`${dateKey}[A-Z]{4}\\d+`,'g'))].map(m=>m[0]))];
  const ss=ids.find(id=>id.slice(8,12).includes('SS'));
  return ss||'';
}
function teamsFromGameId(gameId){
  const codes=gameId.slice(8,12);
  const awayCode=codes.slice(0,2),homeCode=codes.slice(2,4);
  return {away:{code:awayCode,team:TEAM_CODES[awayCode]||awayCode},home:{code:homeCode,team:TEAM_CODES[homeCode]||homeCode}};
}
function extractJsonScripts(html){
  const out=[];
  for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)){
    const body=m[1]||'';
    if(body.includes('__NEXT_DATA__')||body.includes('pageProps')||body.includes('lineup')||body.includes('Lineup')){
      const json=body.trim();
      if(json.startsWith('{')){try{out.push(JSON.parse(decodeText(json)))}catch(e){}}
    }
  }
  const next=html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if(next){try{out.push(JSON.parse(decodeText(next[1])))}catch(e){}}
  return out;
}
function walk(obj,fn,path=[]){
  if(!obj||typeof obj!=='object')return;
  fn(obj,path);
  if(Array.isArray(obj))obj.forEach((v,i)=>walk(v,fn,path.concat(i)));
  else Object.keys(obj).forEach(k=>walk(obj[k],fn,path.concat(k)));
}
function collectStrings(obj){
  const arr=[];
  function rec(v){
    if(v==null)return;
    if(typeof v==='string'||typeof v==='number')arr.push(String(v));
    else if(Array.isArray(v))v.forEach(rec);
    else if(typeof v==='object')Object.values(v).forEach(rec);
  }
  rec(obj);
  return arr;
}
function nameLike(v){return typeof v==='string'&&/^[가-힣]{2,5}$/.test(v)&&!TEAM_ALIASES.includes(v)}
function extractStartersFromObjects(jsons,teams){
  const result={home:'',away:''};
  jsons.forEach(j=>walk(j,obj=>{
    const keys=Object.keys(obj).join(' ').toLowerCase();
    const vals=collectStrings(obj).join(' ');
    const hasPitcher=/(pitcher|starter|선발|투수)/i.test(keys+' '+vals);
    if(!hasPitcher)return;
    ['home','away'].forEach(side=>{
      if(result[side])return;
      const team=teams[side].team;
      if(!vals.includes(team)&&!keys.includes(side))return;
      const names=collectStrings(obj).filter(nameLike);
      if(names.length)result[side]=names.find(n=>n!==team)||'';
    });
  }));
  return result;
}
function extractStarterFromText(text,team){
  const t=decodeText(text);
  const patterns=[
    new RegExp(`${team}.{0,120}선발.{0,60}?([가-힣]{2,5})`),
    new RegExp(`선발.{0,60}${team}.{0,60}?([가-힣]{2,5})`),
    new RegExp(`${team}.{0,80}투수.{0,60}?([가-힣]{2,5})`)
  ];
  for(const p of patterns){const m=t.match(p);if(m&&nameLike(m[1]))return m[1];}
  return '';
}
function normalizePosition(v){return String(v||'').replace(/\s+/g,'').replace('좌익수','LF').replace('중견수','CF').replace('우익수','RF').replace('포수','C').replace('투수','P').replace('1루수','1B').replace('2루수','2B').replace('3루수','3B').replace('유격수','SS').replace('지명타자','DH')}
function extractLineupsFromObjects(jsons,teams){
  const out={home:[],away:[]};
  function add(side,item){
    const name=item.name||item.playerName||item.batterName||item.personName||item.korName||item.nameKo;
    if(!nameLike(name))return;
    const order=Number(item.order||item.battingOrder||item.batOrder||item.seq||item.no||out[side].length+1);
    if(order<1||order>20)return;
    const position=normalizePosition(item.position||item.positionName||item.pos||item.posName||item.defensePosition||item.positionCode||'');
    if(!out[side].some(x=>x.name===name))out[side].push({order,name,position});
  }
  jsons.forEach(j=>walk(j,(obj,path)=>{
    if(Array.isArray(obj)&&obj.length>=6&&obj.length<=20){
      const blob=collectStrings(obj).join(' ');
      if(!/(lineup|라인업|batting|타순|batter)/i.test(path.join(' ')+' '+blob))return;
      let side='';
      const p=path.join(' ').toLowerCase();
      if(p.includes('home')||blob.includes(teams.home.team))side='home';
      if(p.includes('away')||blob.includes(teams.away.team))side=side||'away';
      if(!side)return;
      obj.forEach(v=>{if(v&&typeof v==='object')add(side,v)});
    }
  }));
  ['home','away'].forEach(side=>out[side].sort((a,b)=>a.order-b.order));
  return out;
}
function extractLineupFromText(text,team){
  const idx=text.indexOf(team);
  const around=idx>=0?text.slice(Math.max(0,idx-500),idx+3000):text;
  const rows=[];
  const re=/(?:^|\s)([1-9])\s*[번.]?\s*([가-힣]{2,5})\s*([A-Z]{1,2}|[가-힣]{1,4})?/g;
  for(const m of around.matchAll(re)){
    if(nameLike(m[2])&&!rows.some(x=>x.name===m[2]))rows.push({order:Number(m[1]),name:m[2],position:normalizePosition(m[3]||'')});
  }
  return rows.length>=6?rows.slice(0,10):[];
}
async function main(){
  const date=process.argv[2]||kstDate();
  const dateKey=ymdCompact(date);
  const scheduleUrl=`https://m.sports.naver.com/kbaseball/schedule/index?date=${date}`;
  let scheduleHtml='',previewHtml='',gameId='';
  try{scheduleHtml=await fetchText(scheduleUrl);gameId=findGameId(scheduleHtml,dateKey);}catch(e){console.error('schedule fetch failed',e.message)}
  let teams=gameId?teamsFromGameId(gameId):{home:{team:'삼성',code:'SS'},away:{team:'',code:''}};
  const previewUrl=gameId?`https://m.sports.naver.com/game/${gameId}/preview`:'';
  if(previewUrl){try{previewHtml=await fetchText(previewUrl)}catch(e){console.error('preview fetch failed',e.message)}}
  const jsons=[...extractJsonScripts(scheduleHtml),...extractJsonScripts(previewHtml)];
  const starterObj=extractStartersFromObjects(jsons,teams);
  const allText=stripTags(scheduleHtml+' '+previewHtml);
  const homeStarter=starterObj.home||extractStarterFromText(allText,teams.home.team)||'';
  const awayStarter=starterObj.away||extractStarterFromText(allText,teams.away.team)||'';
  let lineups=extractLineupsFromObjects(jsons,teams);
  if(!lineups.home.length)lineups.home=extractLineupFromText(allText,teams.home.team);
  if(!lineups.away.length)lineups.away=extractLineupFromText(allText,teams.away.team);
  const data={
    date,updatedAt:new Date().toISOString(),gameId,
    sourceSchedule:scheduleUrl,sourcePreview:previewUrl,
    message:gameId?'네이버 스포츠 기준 자동 수집':'오늘 삼성 경기 ID를 찾지 못했습니다.',
    home:{...teams.home,starter:homeStarter},
    away:{...teams.away,starter:awayStarter},
    lineupReady:!!(lineups.home.length||lineups.away.length),
    lineups
  };
  const out=path.join(process.cwd(),'data','today-game-info.json');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n','utf8');
  console.log(JSON.stringify(data,null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
