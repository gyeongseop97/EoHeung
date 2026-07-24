const fs=require('fs');
const path=require('path');

const SUPABASE_URL='https://chaddxsntnokjjcrwiyb.supabase.co';
const SUPABASE_KEY='sb_publishable_NiKj0BxbW3VauGK_kkflbg_OqMXPpCT';
const TEAM_CODE={한화:'HH',NC:'NC',KT:'KT',두산:'OB',LG:'LG',기아:'HT',KIA:'HT',롯데:'LT',SSG:'SK',키움:'WO',삼성:'SS'};
const CODE_TEAM={HH:'한화',NC:'NC',KT:'KT',OB:'두산',LG:'LG',HT:'KIA',LT:'롯데',SK:'SSG',WO:'키움',SS:'삼성'};
const TEAM_NAMES=Object.keys(TEAM_CODE);
const NAME_KEYS=/^(name|playerName|korName|nameKo|fullName|shortName|batterName)$/i;
const ORDER_KEYS=/^(order|battingOrder|batOrder|batterOrder|lineupOrder|seq|no|batNo)$/i;
const POS_KEYS=/^(position|positionName|posName|pos|positionCode|defensePosition)$/i;
const BAT_KEYS=/^(batsThrows|batType|bats|hitType)$/i;
const IMAGE_KEYS=/(image|img|photo|profile|thumbnail|thumb)/i;
const LINEUP_PATH=/(lineup|lineUp|line_up|batting|batter|starter|starting|선발|타순|라인업)/i;
const PITCHER_KEY=/(starter|starting|probable|pitcher|sp|선발|투수)/i;
const KBO_PLAYER_IMAGE_BASE='https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/person/middle';

function kstDate(){const now=new Date();const kst=new Date(now.getTime()+9*60*60*1000);return kst.toISOString().slice(0,10)}
function ymdCompact(d){return d.replace(/-/g,'')}
function year(d){return d.slice(0,4)}
function clean(s){return String(s||'').replace(/\\u([0-9a-fA-F]{4})/g,(_,h)=>String.fromCharCode(parseInt(h,16))).replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ')}
function strip(html){return clean(html).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
async function fetchText(url){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 EoHeungBot/1.0','accept':'text/html,application/json'}});if(!r.ok)throw new Error(`${r.status} ${url}`);return await r.text()}
async function fetchJson(url,headers={}){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 EoHeungBot/1.0','accept':'application/json,text/plain,*/*',...headers}});if(!r.ok)throw new Error(`${r.status} ${url}`);return await r.json()}
async function fetchTodayGameFromSupabase(date){try{const url=`${SUPABASE_URL}/rest/v1/games?select=*&game_date=eq.${date}&order=game_time.asc&limit=1`;const rows=await fetchJson(url,{apikey:SUPABASE_KEY,authorization:`Bearer ${SUPABASE_KEY}`});return rows&&rows[0]||null}catch(e){console.error('supabase schedule fetch failed:',e.message);return null}}
function makeGameId(date,awayCode,homeCode){return `${ymdCompact(date)}${awayCode}${homeCode}0${year(date)}`}
function scheduleToCodes(g){if(!g||!g.opponent)return null;const opp=TEAM_CODE[g.opponent]||TEAM_CODE[String(g.opponent).toUpperCase()];if(!opp)return null;return g.home_away==='HOME'?{awayCode:opp,homeCode:'SS'}:{awayCode:'SS',homeCode:opp}}
function teamsFromGameId(id){const away=id.slice(8,10),home=id.slice(10,12);return{away:{code:away,team:CODE_TEAM[away]||away},home:{code:home,team:CODE_TEAM[home]||home}}}
async function fetchNaverSchedule(date){const urls=[`https://api-gw.sports.naver.com/schedule/games?upperCategoryId=kbaseball&categoryId=kbo&fromDate=${date}&toDate=${date}&size=500`,`https://api-gw.sports.naver.com/schedule/games?fields=basic,schedule,score,relay&upperCategoryId=kbaseball&categoryId=kbo&fromDate=${date}&toDate=${date}&size=500`];for(const url of urls){try{return await fetchJson(url)}catch(e){console.error('schedule api failed:',url,e.message)}}return null}
function findSamsungGameInNaverSchedule(obj){let found=null;function walk(v){if(found||!v||typeof v!=='object')return;if(Array.isArray(v)){v.forEach(walk);return}const blob=JSON.stringify(v);if(blob.includes('삼성')||blob.includes('SAMSUNG')||blob.includes('SS')){const awayName=v.awayTeamName||v.awayTeamNameKo||v.awayTeam?.teamName||v.awayTeam?.name||v.awayTeamNameEng;const homeName=v.homeTeamName||v.homeTeamNameKo||v.homeTeam?.teamName||v.homeTeam?.name||v.homeTeamNameEng;const awayCode=v.awayTeamCode||v.awayTeam?.teamCode||v.awayTeamId||TEAM_CODE[awayName];const homeCode=v.homeTeamCode||v.homeTeam?.teamCode||v.homeTeamId||TEAM_CODE[homeName];if((awayCode==='SS'||homeCode==='SS'||awayName==='삼성'||homeName==='삼성')&&(awayCode||homeCode||awayName||homeName)){found={opponent:awayCode==='SS'||awayName==='삼성'?homeName:awayName,home_away:homeCode==='SS'||homeName==='삼성'?'HOME':'AWAY',naverGameId:v.gameId||v.gameIdOnAir||v.id||'',raw:v};return}}Object.values(v).forEach(walk)}walk(obj);return found}
function findGameIdInHtml(html,date){const d=ymdCompact(date);const ids=[...new Set([...html.matchAll(new RegExp(`${d}[A-Z]{4}0${year(date)}`,'g'))].map(x=>x[0]))];return ids.find(id=>id.slice(8,12).includes('SS'))||''}
function findGameIdByText(html,date){const text=strip(html);for(const team of TEAM_NAMES.filter(t=>t!=='삼성'&&t!=='KIA')){const code=TEAM_CODE[team];if(new RegExp(`${team}.{0,140}삼성`).test(text))return makeGameId(date,code,'SS');if(new RegExp(`삼성.{0,140}${team}`).test(text))return makeGameId(date,'SS',code)}return ''}
function parseNextJson(html){const m=html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);if(!m)return null;try{return JSON.parse(clean(m[1]))}catch(e){return null}}
function walkObj(o,fn,path=[]){if(!o||typeof o!=='object')return;fn(o,path);if(Array.isArray(o))o.forEach((v,i)=>walkObj(v,fn,path.concat(i)));else Object.keys(o).forEach(k=>walkObj(o[k],fn,path.concat(k)))}
function isName(s){return /^[가-힣]{2,5}$/.test(String(s||''))&&!TEAM_NAMES.includes(s)&&s!=='예정'}
function firstByKey(obj,re){if(!obj||typeof obj!=='object')return '';for(const [k,v] of Object.entries(obj)){if(re.test(k)&&v!=null&&typeof v!=='object')return String(v)}return ''}
function namesFromValue(v){const names=[];function add(x){if(isName(x)&&!names.includes(String(x)))names.push(String(x))}if(isName(v))add(v);walkObj(v,(obj)=>{if(!obj||typeof obj!=='object'||Array.isArray(obj))return;for(const [k,val] of Object.entries(obj)){if(NAME_KEYS.test(k))add(val)}});return names}
function normalizePosition(v){const s=String(v||'').replace(/\s+/g,'');const map={'0':'지명타자','1':'투수','2':'포수','3':'1루수','4':'2루수','5':'3루수','6':'유격수','7':'좌익수','8':'중견수','9':'우익수',P:'투수',C:'포수','1B':'1루수','2B':'2루수','3B':'3루수',SS:'유격수',LF:'좌익수',CF:'중견수',RF:'우익수',DH:'지명타자'};return map[s.toUpperCase()]||s}
function normalizeBat(v){const m=String(v||'').match(/(우타|좌타|양타)/);return m?m[1]:''}
function normalizeThrow(v){const m=String(v||'').match(/(우투|좌투|우언|좌언)/);return m?m[1]:''}
function playerImage(obj){let found='';walkObj(obj,(value,path)=>{if(found||typeof value!=='string'||!/^https?:\/\//i.test(value))return;const key=String(path[path.length-1]||'');if(IMAGE_KEYS.test(key)||/(player|sports-phinf|kbaseball)/i.test(value))found=value});return found}
function playerBase(obj){const name=firstByKey(obj,NAME_KEYS)||namesFromValue(obj)[0]||'';if(!isName(name))return null;const code=String(obj.playerCode||obj.pcode||'');const fallbackImage=code?`${KBO_PLAYER_IMAGE_BASE}/${new Date().getFullYear()}/${code}.jpg`:'';return{name,playerCode:code,position:normalizePosition(obj.positionName||obj.position||firstByKey(obj,POS_KEYS)),batsThrows:normalizeBat(firstByKey(obj,BAT_KEYS)),throws:normalizeThrow(firstByKey(obj,BAT_KEYS)),image:playerImage(obj)||fallbackImage}}
async function cachePlayerImages(data){
  const players=[
    ...(data.lineups?.away||[]),
    ...(data.lineups?.home||[]),
    ...(data.lineups?.reserves?.away?.fielders||[]),
    ...(data.lineups?.reserves?.away?.bullpen||[]),
    ...(data.lineups?.reserves?.home?.fielders||[]),
    ...(data.lineups?.reserves?.home?.bullpen||[]),
    data.lineups?.starters?.away,
    data.lineups?.starters?.home
  ].filter(Boolean);
  const unique=new Map(players.filter(p=>p.playerCode).map(p=>[String(p.playerCode),p]));
  const imageDir=path.join(process.cwd(),'data','player-images');
  fs.mkdirSync(imageDir,{recursive:true});
  for(const [code,player] of unique){
    const localPath=path.join(imageDir,`${code}.jpg`);
    const publicPath=`data/player-images/${code}.jpg`;
    if(fs.existsSync(localPath)){player.image=publicPath;continue}
    const candidates=[player.image,`${KBO_PLAYER_IMAGE_BASE}/${data.date.slice(0,4)}/${code}.jpg`].filter(Boolean);
    for(const url of [...new Set(candidates)]){
      try{
        const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 EoHeungBot/1.0','accept':'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'}});
        const type=r.headers.get('content-type')||'';
        if(!r.ok||!type.startsWith('image/'))continue;
        fs.writeFileSync(localPath,Buffer.from(await r.arrayBuffer()));
        player.image=publicPath;
        break;
      }catch(e){console.error('player image fetch failed:',code,url,e.message)}
    }
  }
}
function starterPairFromScheduleText(text,awayTeam,homeTeam){const t=clean(text);if(!awayTeam||!homeTeam)return{away:'',home:''};let m=t.match(new RegExp(`${awayTeam}\\s+([가-힣]{2,5}).{0,180}${homeTeam}\\s+([가-힣]{2,5})`));if(m&&isName(m[1])&&isName(m[2]))return{away:m[1],home:m[2]};m=t.match(new RegExp(`${homeTeam}\\s+([가-힣]{2,5}).{0,180}${awayTeam}\\s+([가-힣]{2,5})`));if(m&&isName(m[1])&&isName(m[2]))return{away:m[2],home:m[1]};return{away:'',home:''}}
function starterFromExplicitJsonSources(sources,side,team){let found='';if(!team)return '';const sideWords=side==='away'?/(away|visitor|원정)/i:/(home|홈)/i;for(const source of sources){if(found)break;walkObj(source,(obj,path)=>{if(found||!obj||typeof obj!=='object'||Array.isArray(obj))return;const pathText=path.join(' ');for(const [k,v] of Object.entries(obj)){if(found)break;if(PITCHER_KEY.test(String(k))&&sideWords.test(String(k)+' '+pathText)){const n=namesFromValue(v).find(x=>x!==team);if(n)found=n}}})}return found}
function starterFromText(text,team){if(!team)return '';const t=clean(text);const pats=[new RegExp(`${team}.{0,240}선발.{0,140}?([가-힣]{2,5})`),new RegExp(`선발.{0,140}${team}.{0,140}?([가-힣]{2,5})`)];for(const p of pats){const m=t.match(p);if(m&&isName(m[1]))return m[1]}return ''}
function parsePlayerRow(obj){if(!obj||typeof obj!=='object'||Array.isArray(obj))return null;const base=playerBase(obj);if(!base)return null;const order=Number(firstByKey(obj,ORDER_KEYS));if(!Number.isInteger(order)||order<1||order>9)return null;return{order,...base}}
function candidateSide(pathText,blob,teams){const p=pathText.toLowerCase();if(p.includes('away')||p.includes('visitor')||p.includes('ateam')||blob.includes(teams.away.team))return 'away';if(p.includes('home')||p.includes('hteam')||blob.includes(teams.home.team))return 'home';return ''}
function chooseBest(cands){cands.sort((a,b)=>b.score-a.score);return cands[0]?.rows||[]}
function lineupsFromJsonSources(sources,teams){const cands={away:[],home:[]};for(const source of sources){walkObj(source,(arr,path)=>{if(!Array.isArray(arr)||arr.length<9||arr.length>20)return;const pathText=path.join(' ');const blob=JSON.stringify(arr);const looksLineup=LINEUP_PATH.test(pathText+' '+blob);if(!looksLineup)return;const side=candidateSide(pathText,blob,teams);if(!side)return;const rows=[];const seen=new Set();arr.forEach(x=>{const r=parsePlayerRow(x);if(r&&!seen.has(r.order)&&!rows.some(v=>v.name===r.name)){seen.add(r.order);rows.push(r)}});const orders=rows.map(r=>r.order).sort((a,b)=>a-b).join(',');if(rows.length===9&&orders==='1,2,3,4,5,6,7,8,9'){rows.sort((a,b)=>a.order-b.order);const score=(LINEUP_PATH.test(pathText)?50:0)+rows.filter(r=>r.position).length*4+rows.filter(r=>r.batsThrows).length*2;cands[side].push({score,rows})}})}return{away:chooseBest(cands.away),home:chooseBest(cands.home),reserves:reservesFromJsonSources(sources),starters:startersFromJsonSources(sources)}}
function startersFromJsonSources(sources){
  const out={away:{name:'',throws:'',image:''},home:{name:'',throws:'',image:''}};
  for(const source of sources){
    walkObj(source,(obj)=>{
      if(!obj||typeof obj!=='object'||Array.isArray(obj))return;
      for(const side of ['away','home']){
        if(out[side].name)continue;
        const teamLineUp=obj[`${side}TeamLineUp`];
        const full=teamLineUp&&teamLineUp.fullLineUp;
        if(!Array.isArray(full))continue;
        const pitcher=full.find(x=>x&&/\uC120\uBC1C\uD22C\uC218/.test(String(x.positionName||''))&&!Number(x.batorder));
        if(!pitcher)continue;
        const player=playerBase(pitcher);
        if(player)out[side]={name:player.name,throws:player.throws,image:player.image};
      }
    });
  }
  return out;
}
function reservesFromJsonSources(sources){
  const out={away:{fielders:[],bullpen:[]},home:{fielders:[],bullpen:[]}};
  for(const source of sources){walkObj(source,(obj)=>{if(!obj||typeof obj!=='object'||Array.isArray(obj))return;for(const side of ['away','home']){const team=obj[`${side}TeamLineUp`];if(!team||typeof team!=='object')continue;const fielders=(Array.isArray(team.batterCandidate)?team.batterCandidate:[]).map(playerBase).filter(Boolean);const bullpen=(Array.isArray(team.pitcherBullpen)?team.pitcherBullpen:[]).map(playerBase).filter(Boolean);if(fielders.length+bullpen.length>out[side].fielders.length+out[side].bullpen.length)out[side]={fielders,bullpen}}})}
  return out;
}
function lineupsFromText(text,teams){const out={away:[],home:[]};const t=clean(text);function parse(side,team){if(!team)return[];const idx=t.indexOf(team);const seg=idx>=0?t.slice(idx,idx+5000):t;const rows=[];const seen=new Set();const re=/(?:^|\s)([1-9])\s*(?:번|[.)])?\s*([가-힣]{2,5})\s*(포수|투수|1루수|2루수|3루수|유격수|좌익수|중견수|우익수|지명타자|C|P|1B|2B|3B|SS|LF|CF|RF|DH)?/g;for(const m of seg.matchAll(re)){const order=Number(m[1]),name=m[2];if(order>=1&&order<=9&&isName(name)&&!seen.has(order)&&!rows.some(r=>r.name===name)){seen.add(order);rows.push({order,name,position:normalizePosition(m[3]||'')})}}rows.sort((a,b)=>a.order-b.order);return rows.length>=9?rows.slice(0,9):[]}out.away=parse('away',teams.away.team);out.home=parse('home',teams.home.team);return out}
async function fetchPageHtml(candidates,page){for(const id of candidates.filter(Boolean)){const url=`https://m.sports.naver.com/game/${id}/${page}`;try{return{id,url,html:await fetchText(url)}}catch(e){console.error(`${page} html failed:`,id,e.message)}}return{id:candidates[0]||'',url:candidates[0]?`https://m.sports.naver.com/game/${candidates[0]}/${page}`:'',html:''}}
async function fetchGameApis(gameId){const urls=[`https://api-gw.sports.naver.com/schedule/games/${gameId}/lineup`,`https://api-gw.sports.naver.com/schedule/games/${gameId}?fields=basic,schedule,score,relay,lineup,lineUp,preview,record`,`https://api-gw.sports.naver.com/schedule/games/${gameId}/preview`,`https://api-gw.sports.naver.com/schedule/games/${gameId}/record`];const out=[];for(const url of urls){try{out.push({url,json:await fetchJson(url)})}catch(e){console.error('game api failed:',url,e.message)}}return out}
async function main(){const date=process.argv[2]||kstDate();const scheduleUrl=`https://m.sports.naver.com/kbaseball/schedule/index?date=${date}`;let scheduleHtml='',source='',candidates=[],scheduleJson=null,ng=null;try{scheduleHtml=await fetchText(scheduleUrl);const id=findGameIdInHtml(scheduleHtml,date)||findGameIdByText(scheduleHtml,date);if(id){candidates=[id];source='naver-schedule-html'}}catch(e){console.error('schedule html fetch failed:',e.message)}scheduleJson=await fetchNaverSchedule(date);ng=findSamsungGameInNaverSchedule(scheduleJson);if(!candidates.length&&ng){if(ng.naverGameId)candidates.push(ng.naverGameId);const c=scheduleToCodes(ng);if(c)candidates.push(makeGameId(date,c.awayCode,c.homeCode));source='naver-schedule-api'}if(!candidates.length){const g=await fetchTodayGameFromSupabase(date);const c=scheduleToCodes(g);if(c)candidates.push(makeGameId(date,c.awayCode,c.homeCode));source='supabase'}candidates=[...new Set(candidates)];const preview=await fetchPageHtml(candidates,'preview');const gameId=preview.id||'';const lineupPage=await fetchPageHtml([gameId||candidates[0]].filter(Boolean),'lineup');const teams=gameId?teamsFromGameId(gameId):{away:{team:'',code:''},home:{team:'삼성',code:'SS'}};const apiResponses=gameId?await fetchGameApis(gameId):[];const jsonSources=[...apiResponses.map(x=>x.json),parseNextJson(lineupPage.html),parseNextJson(preview.html),scheduleJson,ng&&ng.raw,parseNextJson(scheduleHtml)].filter(Boolean);const scheduleText=strip(scheduleHtml+' '+JSON.stringify(scheduleJson||{}));const pair=starterPairFromScheduleText(scheduleText,teams.away.team,teams.home.team);const safeText=strip(scheduleHtml+' '+preview.html+' '+lineupPage.html);const starters=startersFromJsonSources(jsonSources);const awayStarter=starters.away.name||pair.away||starterFromExplicitJsonSources(jsonSources,'away',teams.away.team)||starterFromText(safeText,teams.away.team);const homeStarter=starters.home.name||pair.home||starterFromExplicitJsonSources(jsonSources,'home',teams.home.team)||starterFromText(safeText,teams.home.team);let lineups=lineupsFromJsonSources(jsonSources,teams);const textLineups=lineupsFromText(lineupPage.html,teams);if(!lineups.away.length)lineups.away=textLineups.away;if(!lineups.home.length)lineups.home=textLineups.home;const data={date,updatedAt:new Date().toISOString(),gameId,sourceSchedule:scheduleUrl,sourcePreview:preview.url,sourceLineup:lineupPage.url,checkedApis:apiResponses.map(x=>x.url),message:gameId?`네이버 스포츠 라인업 기준 자동 수집 (${source||'generated'})`:'오늘 삼성 경기 ID를 찾지 못했습니다.',away:{...teams.away,starter:awayStarter||'',starterThrows:starters.away.throws||''},home:{...teams.home,starter:homeStarter||'',starterThrows:starters.home.throws||''},lineupReady:lineups.away.length===9&&lineups.home.length===9,lineups};await cachePlayerImages(data);fs.mkdirSync(path.join(process.cwd(),'data'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'data','today-game-info.json'),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify(data,null,2))}
main().catch(e=>{console.error(e);process.exit(1)});
