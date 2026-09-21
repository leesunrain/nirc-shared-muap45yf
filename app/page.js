'use client';
import {useEffect,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
const URL='https://qpoyhnwaqcsaeilcnewd.supabase.co';
const KEY='sb_publishable_QZ1yBnNTg8gj5aOHEEbsTw_1kIaiePt';
const supabase=createClient(URL,KEY);
const NAMES=['박영윤','김건욱','김진성','유성현','조효승','이기현','현주민','강준성','박주현','주혁','정혜영','이정관','강성현','남아름','이창승','윤원진','박수진','박선규','홍영노','신우섭','이창환','고은','이은지','성정현','권현웅','김병현','조수빈','김은숙','송기철','김미란','지나','이성민','김진우','김영환','신민경','강동우','김단','이선우'];
const ADMIN='8930'; const trend={up:'🔴 ↑ 상승',stable:'➖ 유지',down:'🔵 ↓ 하강',unknown:'⚪ ? 자료부족'};
// 기존 LT 앱에서 이관한 기준값. null 쪽은 짝이 있는 경우 17bpm 차이로 '참고 추정'만 표시한다.
const LEGACY_LT={
 '고은':{lt1:146,lt2:null},'김건욱':{lt1:157,lt2:169},'김진성':{lt1:155,lt2:178},'박선규':{lt1:159,lt2:182},
 '박영윤':{lt1:null,lt2:175},'신우섭':{lt1:null,lt2:175},'윤원진':{lt1:150,lt2:168},'이기현':{lt1:160,lt2:178},
 '이선우':{lt1:158,lt2:null},'이정관':{lt1:null,lt2:177},'조수빈':{lt1:158,lt2:168},'현주민':{lt1:160,lt2:177}
};
const LEGACY_TT={'고은':1356,'김건욱':1141,'김진성':1153,'박선규':1305,'박영윤':1107,'신우섭':1331,'윤원진':1285,'이기현':1176,'이정관':1263,'조수빈':1465,'현주민':1189};
// 5K TT는 LT 실측을 대체하지 않는다. 기존 LT+5K가 함께 있는 내부 기준군과 기록 차이를 비교해 참고 추정한다.
function latest5k(tts=[]){return [...tts].filter(x=>Number(x.distance_m)===5000&&Number(x.seconds)>0).sort((a,b)=>String(b.tt_date).localeCompare(String(a.tt_date)))[0]||null}
function ttForMember(all=[],m){return all.filter(x=>String(x.member_id)===String(m?.id))}
function ltBase(m,tts=[]){
 const old=LEGACY_LT[m?.name], latest=latest5k(tts);
 const db1=Number(m?.lt1_confirmed||m?.lt1)||null,db2=Number(m?.lt2_confirmed||m?.lt2)||null;
 const known1=old?.lt1??db1, known2=old?.lt2??db2;
 if(known1||known2){
   let l1=known1??(known2-17),l2=known2??(known1+17);
   const both=Boolean(known1&&known2);
   if(latest){
     const ref=LEGACY_TT[m?.name];
     const match=ref?Math.abs(Number(latest.seconds)-ref):0;
     return {lt1:l1,lt2:l2,confidence:both?(match<=45?'높음':'보통'):'보통',source:both?'기존 LT 측정값 + 5K TT 비교':'기존 LT + 5K TT 보조 추정',tt:latest.seconds};
   }
   return {lt1:l1,lt2:l2,confidence:both?'보통':'낮음',source:both?'기존 LT 측정값':'기존 LT + 참고 추정',tt:null};
 }
 if(latest){
   const refs=Object.entries(LEGACY_TT).filter(([n])=>LEGACY_LT[n]);
   const cand=refs.sort((a,b)=>Math.abs(a[1]-Number(latest.seconds))-Math.abs(b[1]-Number(latest.seconds)))[0]?.[0];
   const x=LEGACY_LT[cand];
   if(x){const l1=x.lt1??x.lt2-17,l2=x.lt2??x.lt1+17;return {lt1:l1,lt2:l2,confidence:'낮음',source:`5K TT 기반 참고 추정 · ${cand} 기준군 비교`,tt:latest.seconds};}
 }
 return {lt1:null,lt2:null,confidence:'자료부족',source:'심박 또는 5K TT 자료 필요',tt:null};
}

const fmt=s=>!s?'—':`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
function pinKey(n){return 'nrp_pin_'+n} function getPin(n){return localStorage.getItem(pinKey(n))||'0000'}
function wkKey(n){return 'nrp_workouts_'+n} function getLocalWorkouts(n){try{return JSON.parse(localStorage.getItem(wkKey(n))||'[]')}catch{return []}}
function raceRanges(m,tts=[]){const base=ltBase(m,tts),a=base.lt1,b=base.lt2;if(!a||!b)return null;return {'5K':[b,b+3,b+6],'10K':[b-2,b,b+4],'HALF':[b-8,b-5,b-2],'FULL':[a+5,Math.min(b-10,a+10),Math.min(b-6,a+14)]}}
export default function App(){
 const [screen,setScreen]=useState('choose'),[me,setMe]=useState(null),[members,setMembers]=useState([]),[err,setErr]=useState(''),[sel,setSel]=useState(null),[tts,setTts]=useState([]),[workouts,setWorkouts]=useState([]),[previews,setPreviews]=useState([]),[files,setFiles]=useState([]),[rpe,setRpe]=useState(5),[analysisResult,setAnalysisResult]=useState(null),[showGraphs,setShowGraphs]=useState(false),[allTts,setAllTts]=useState([]);
 async function fetchMembers(){const [r,t]=await Promise.all([supabase.from('members').select('id,name,status,role,lt1,lt2,lt1_confirmed,lt2_confirmed,trend,confidence').order('name'),supabase.from('tt_results').select('*').order('tt_date')]); if(!r.error&&r.data?.length)setMembers(r.data); else setMembers(NAMES.map((name,i)=>({id:String(i),name,status:'active',trend:'unknown',confidence:'D'}))); if(!t.error)setAllTts(t.data||[]);}
 useEffect(()=>{fetchMembers()},[]);
 async function loadHistory(m){setSel(m); const a=await supabase.from('tt_results').select('*').eq('member_id',m.id).order('tt_date'); setTts(a.data||[]); const b=await supabase.from('workouts').select('*').eq('member_id',m.id).order('workout_date',{ascending:false}); setWorkouts((b.data?.length?b.data:getLocalWorkouts(m.name))||[]);}
 function personal(e){e.preventDefault();setErr('');const f=new FormData(e.currentTarget),n=f.get('name').trim(),p=f.get('pin');if(!NAMES.includes(n)&&!members.some(x=>x.name===n)){setErr('등록된 회원 이름이 아닙니다.');return}if(p!==getPin(n)){setErr('이름 또는 비밀번호를 확인하세요.');return}const m=members.find(x=>x.name===n)||{name:n,trend:'unknown',confidence:'D'};setMe(m);loadHistory(m);setScreen('home')}
 function admin(e){e.preventDefault();setErr('');const p=new FormData(e.currentTarget).get('pin');if(p!==ADMIN){setErr('관리자 비밀번호를 확인하세요.');return}fetchMembers();setScreen('admin')}
 function changePin(e){e.preventDefault();const f=new FormData(e.currentTarget),a=f.get('old'),b=f.get('new'),c=f.get('confirm');if(a!==getPin(me.name)){setErr('현재 비밀번호가 맞지 않습니다.');return}if(!/^\d{4}$/.test(b)||b!==c){setErr('새 비밀번호는 같은 숫자 4자리로 입력하세요.');return}localStorage.setItem(pinKey(me.name),b);setErr('');alert('비밀번호가 변경되었습니다.');setScreen('home')}
 function resetPin(n){localStorage.removeItem(pinKey(n));alert(`${n}님의 비밀번호를 0000으로 초기화했습니다.`)}
 function pickImages(e){const fs=[...e.target.files];setFiles(fs);setPreviews(fs.map(x=>URL.createObjectURL(x)))}
 function removeImage(i){URL.revokeObjectURL(previews[i]);setFiles(v=>v.filter((_,j)=>j!==i));setPreviews(v=>v.filter((_,j)=>j!==i))}
 async function saveWorkout(e){
  e.preventDefault();setErr('');setAnalysisResult(null);
  const f=new FormData(e.currentTarget),target=sel||me;
  const base=ltBase(target,tts),currentLt1=base.lt1,currentLt2=base.lt2;
  const feeling=f.get('feeling')||'',todayRpe=+f.get('rpe');
  const row={member_id:target.id,workout_date:f.get('date'),rpe:todayRpe,feeling,confidence:base.confidence,
    analysis:(currentLt1&&currentLt2)?`현재 누적 LT 기준을 유지합니다. 오늘 RPE ${todayRpe}와 훈련 메모를 새 근거로 저장했습니다.`:'심박 수치 판독 자료가 부족하여 LT bpm을 새로 확정하지 않았습니다.',
    lt1_est:currentLt1,lt2_est:currentLt2};
  let saved=null;
  const ins=await supabase.from('workouts').insert(row).select().single();
  if(!ins.error)saved=ins.data;
  if(saved&&files.length){
    for(const file of files){
      const path=`uploads/${target.id}/${saved.id}/${crypto.randomUUID()}-${file.name}`;
      const up=await supabase.storage.from('workout-images').upload(path,file);
      if(!up.error)await supabase.from('workout_images').insert({workout_id:saved.id,storage_path:path});
    }
  }
  const result={date:row.workout_date,rpe:todayRpe,lt1:currentLt1,lt2:currentLt2,confidence:row.confidence,source:base.source,
    title:(currentLt1&&currentLt2)?'현재 LT 참고값':'추가 심박자료 필요',
    explanation:(currentLt1&&currentLt2)
      ?`기존 누적자료의 LT1 ${currentLt1} bpm · LT2 ${currentLt2} bpm을 기준으로 오늘 운동을 기록했습니다. RPE ${todayRpe}${feeling?` · “${feeling.slice(0,80)}${feeling.length>80?'…':''}”`:''}를 다음 비교에 반영합니다.`
      :`오늘 자료는 저장됐지만, 현재 LT1/LT2 bpm을 확정할 수 있는 구조화된 심박 수치가 충분하지 않습니다. Garmin 캡처에서 페이스·심박·랩 수치가 판독 가능한 자료가 누적되면 LT 추정을 갱신합니다.`,
    imageNote:files.length?`Garmin 이미지 ${files.length}장 저장 완료`:'Garmin 이미지 없음'};
  if(!saved){
    const local={id:crypto.randomUUID(),...row,image_count:files.length};
    const all=[local,...getLocalWorkouts(target.name)];
    localStorage.setItem(wkKey(target.name),JSON.stringify(all));setWorkouts(all)
  } else setWorkouts(v=>[saved,...v]);
  setAnalysisResult(result);setFiles([]);setPreviews([]);
 } if(screen==='choose')return <main className="wrap"><Hero/><section className="card"><h2>로그인 선택</h2><button onClick={()=>{setErr('');setScreen('personal')}}>개인 로그인</button><button className="ghost" onClick={()=>{setErr('');setScreen('adminLogin')}}>관리자 로그인</button><small>회원 초기 비밀번호는 0000입니다.</small></section></main>;
 if(screen==='personal')return <main className="wrap"><Hero/><form className="card" onSubmit={personal}><h2>개인 로그인</h2><label>이름<input name="name" required placeholder="회원 이름"/></label><label>비밀번호<input name="pin" inputMode="numeric" maxLength="4" type="password" required placeholder="초기 0000"/></label>{err&&<p className="error">{err}</p>}<button>로그인</button><button type="button" className="ghost" onClick={()=>setScreen('choose')}>← 돌아가기</button></form></main>;
 if(screen==='adminLogin')return <main className="wrap"><Hero/><form className="card" onSubmit={admin}><h2>관리자 로그인</h2><label>관리자 비밀번호<input name="pin" inputMode="numeric" maxLength="4" type="password" required/></label>{err&&<p className="error">{err}</p>}<button>관리자 로그인</button><button type="button" className="ghost" onClick={()=>setScreen('choose')}>← 돌아가기</button></form></main>;
 if(screen==='change')return <main className="wrap"><Top name={me.name} onHome={()=>setScreen('home')}/><form className="card" onSubmit={changePin}><h2>비밀번호 변경</h2><label>현재 비밀번호<input name="old" inputMode="numeric" maxLength="4" type="password" required/></label><label>새 4자리<input name="new" inputMode="numeric" maxLength="4" type="password" required/></label><label>새 비밀번호 확인<input name="confirm" inputMode="numeric" maxLength="4" type="password" required/></label>{err&&<p className="error">{err}</p>}<button>변경</button><button type="button" className="ghost" onClick={()=>setScreen('home')}>← 돌아가기</button></form></main>;
 if(screen==='new')return <main className="wrap"><Top name={(sel||me).name} onHome={()=>setScreen(sel?'admin':'home')}/><button className="back" onClick={()=>setScreen(sel?'detail':'home')}>← 돌아가기</button><form className="card" onSubmit={saveWorkout}><h2>새 운동 분석</h2><label>날짜<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0,10)}/></label><label>Garmin 캡처 <span>여러 장 선택 가능</span><input type="file" accept="image/*" multiple onChange={pickImages}/></label>{previews.length>0&&<div className="previews">{previews.map((p,i)=><div className="preview" key={p}><img src={p}/><button type="button" onClick={()=>removeImage(i)}>×</button></div>)}</div>}<label>자각강도 RPE <b>{rpe}</b><input type="hidden" name="rpe" value={rpe}/><div className="rpeButtons">{[1,2,3,4,5,6,7,8,9,10].map(n=><button key={n} type="button" className={rpe===n?'on':''} onClick={()=>setRpe(n)}>{n}</button>)}</div></label><label>오늘의 느낌 · 훈련상황<textarea name="feeling" rows="6" placeholder="예: 후반에도 여유, 다리가 무거움, 더위·습도, 수면 부족, 통증, 언덕·바람 등"/></label><button>저장하고 바로 분석</button><small>사진 장수 자체가 신뢰도를 높이지 않습니다. 페이스·심박·랩 등 해석 가능한 자료를 함께 누적합니다.</small></form>{analysisResult&&<AnalysisResult r={analysisResult}/>}</main>;
 if(screen==='history')return <main className="wrap"><Top name={me.name} onHome={()=>setScreen('home')}/><button className="back" onClick={()=>setScreen('home')}>← 돌아가기</button><History tts={tts} workouts={workouts}/></main>;
 if(screen==='detail'){const rr=raceRanges(sel,tts);return <main className="wrap"><Top name="관리자" onHome={()=>{setSel(null);setScreen('admin')}}/><button className="back" onClick={()=>{setSel(null);setScreen('admin')}}>← 전체 회원</button><Profile m={sel} rr={rr} tts={tts}/><TrendGraphs tts={tts} workouts={workouts}/><History tts={tts} workouts={workouts}/><section className="card"><button onClick={()=>setScreen('new')}>＋ 이 회원 운동 입력</button><button className="ghost" onClick={()=>resetPin(sel.name)}>비밀번호 0000 초기화</button></section></main>}
 if(screen==='admin')return <main className="wrap"><Top name="관리자" onHome={()=>setScreen('choose')}/><section className="headline"><div><h1>회원 현황</h1><p>{members.length}명 · LT/5K 통합</p></div><button className="mini" onClick={()=>setScreen('choose')}>로그아웃</button></section><section className="memberlist">{members.map(m=>{const mt=ttForMember(allTts,m),b=ltBase(m,mt);return <button className="member memberV108" key={m.id} onClick={async()=>{await loadHistory(m);setScreen('detail')}}><span className="name">{m.name}<small>{b.source}</small></span><span><small>LT1</small><b>{b.lt1||'—'}</b></span><span><small>LT2</small><b>{b.lt2||'—'}</b></span><span className="t confidence">{b.confidence==='자료부족'?'자료부족':`신뢰도 ${b.confidence}`}{b.tt?<small>5K {fmt(b.tt)}</small>:null}</span></button>})}</section></main>;
 const rr=raceRanges(me,tts);return <main className="wrap"><Top name={me.name} onHome={()=>setScreen('choose')}/><Profile m={me} rr={rr} tts={tts}/><section className="card actionCard"><h3>운동 분석</h3><button className="big" onClick={()=>{setSel(null);setScreen('new')}}>＋ Garmin 이미지 · RPE 입력</button><button className="ghost" onClick={()=>setScreen('history')}>내 기록 · 5K TT 보기</button><button className="ghost" onClick={()=>setShowGraphs(v=>!v)}>📈 내 변화 그래프 {showGraphs?'접기':'보기'}</button>{showGraphs&&<TrendGraphs tts={tts} workouts={workouts}/>}</section><section className="card"><h3>계정</h3><button onClick={()=>{setErr('');setScreen('change')}}>내 비밀번호 변경</button><small>초기 비밀번호 0000 → 본인만의 숫자 4자리로 변경하세요.</small></section><button className="ghost" onClick={()=>{setMe(null);setScreen('choose')}}>로그아웃</button></main>
}
function Hero(){return <section className="hero"><div className="logo">NIRC</div><h1>Run Pulse</h1><p>나의 페이스 · 심박 · RPE를 한곳에서</p></section>}
function Top({name,onHome}){return <header><b>NIRC Run Pulse <small>v1.0.8</small></b><div className="topActions"><span>{name}</span>{onHome&&<button type="button" className="homeBtn" onClick={onHome}>⌂ 홈</button>}</div></header>}
function Profile({m,rr,tts=[]}){const b=ltBase(m,tts);return <><section className="heroCard"><small>나의 현재 LT</small><div className="lts"><div><span>LT1</span><b>{b.lt1||'—'}</b><em>{b.lt1?'bpm':'자료 필요'}</em></div><div><span>LT2</span><b>{b.lt2||'—'}</b><em>{b.lt2?'bpm':'자료 필요'}</em></div></div><p className="status">{trend[m?.trend]||trend.unknown} · 신뢰도 {b.confidence}</p><small className="ltSource">기준: {b.source}{b.tt?` · 최근 5K ${fmt(b.tt)}`:''}</small></section><section className="card"><h3>레이스 심박 가이드</h3>{rr?<div className="race"><div className="rh"><b>종목</b><b>START</b><b>MAIN</b><b>LATE</b></div>{Object.entries(rr).map(([k,v])=><div key={k}><b>{k}</b>{v.map((x,i)=><span key={i}>{x}</span>)}</div>)}</div>:<p className="muted">LT 데이터가 충분해지면 5K·10K·HALF·FULL 개인별 심박이 표시됩니다.</p>}<small className="muted">Garmin Zone이 아니라 개인 LT와 누적 운동자료를 기준으로 봅니다.</small></section></>}
function History({tts,workouts}){return <><section className="card"><h3>5K TT 추세</h3><div className="chips">{tts.length?tts.map(t=><div className="chip" key={t.id}><small>{String(t.tt_date).slice(5)}</small><b>{t.distance_m===5000?fmt(t.seconds):`${fmt(t.seconds)} (${t.distance_m/1000}K)`}</b></div>):<p className="muted">등록된 TT 기록이 없습니다.</p>}</div></section><section className="card"><h3>최근 운동 분석 기록</h3>{workouts.length?workouts.map(w=><div className="row" key={w.id}><span>{w.workout_date}</span><b>RPE {w.rpe||'—'}</b><span>{w.feeling||'메모 없음'}</span></div>):<p className="muted">아직 운동 분석 기록이 없습니다.</p>}</section></>}

function AnalysisResult({r}){return <section className="card resultCard"><div className="resultHead"><div><small>오늘의 분석 결과</small><h2>{r.title}</h2></div><span className="badge">신뢰도 {r.confidence}</span></div><div className="resultLT"><div><small>LT1</small><b>{r.lt1||'추정 불가'}</b><em>{r.lt1?'bpm':'자료 필요'}</em></div><div><small>LT2</small><b>{r.lt2||'추정 불가'}</b><em>{r.lt2?'bpm':'자료 필요'}</em></div></div><p className="analysisText">{r.explanation}</p><div className="evidence"><b>이번 분석에 반영</b><span>{r.imageNote}</span><span>RPE {r.rpe}</span><span>기존 LT·과거 기록</span><span>{r.source}</span></div><small className="muted">이미지에 수치가 보여도 현재 버전은 사진 픽셀 자체를 임의로 읽어 bpm을 만들어내지 않습니다. 판독 가능한 심박·페이스 수치가 구조화되어야 LT를 갱신합니다.</small></section>}
function Spark({vals,label,suffix=''}){const clean=vals.filter(x=>Number.isFinite(x.v));if(clean.length<2)return <div className="graphEmpty"><b>{label}</b><span>자료가 2회 이상 쌓이면 그래프가 표시됩니다.</span></div>;const min=Math.min(...clean.map(x=>x.v)),max=Math.max(...clean.map(x=>x.v)),range=max-min||1;const pts=clean.map((x,i)=>`${8+i*(284/(clean.length-1))},${88-((x.v-min)/range)*64}`).join(' ');return <div className="spark"><div className="sparkTitle"><b>{label}</b><span>{clean.at(-1).v}{suffix}</span></div><svg viewBox="0 0 300 100" role="img" aria-label={label}><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>{clean.map((x,i)=>{const cx=8+i*(284/(clean.length-1)),cy=88-((x.v-min)/range)*64;return <circle key={i} cx={cx} cy={cy} r="4" fill="currentColor"/>})}</svg><div className="sparkDates"><span>{String(clean[0].d).slice(5)}</span><span>{String(clean.at(-1).d).slice(5)}</span></div></div>}
function TrendGraphs({tts,workouts}){const ordered=[...(workouts||[])].reverse();const lt1=ordered.map(w=>({d:w.workout_date,v:Number(w.lt1_est)})).filter(x=>x.v);const lt2=ordered.map(w=>({d:w.workout_date,v:Number(w.lt2_est)})).filter(x=>x.v);const rpe=ordered.map(w=>({d:w.workout_date,v:Number(w.rpe)})).filter(x=>x.v);const tt=(tts||[]).filter(t=>t.distance_m===5000).map(t=>({d:t.tt_date,v:Math.round((Number(t.seconds)/5)*10)/10}));return <div className="graphs"><h3>날짜별 변화</h3><Spark vals={lt1} label="LT1 심박" suffix=" bpm"/><Spark vals={lt2} label="LT2 심박" suffix=" bpm"/><Spark vals={tt} label="5K TT 평균 페이스" suffix=" 초/km"/><Spark vals={rpe} label="RPE 변화"/><div className="graphEmpty"><b>같은 페이스의 심박 · 같은 심박의 페이스</b><span>Garmin에서 구조화된 페이스-심박 값이 누적되면 자동으로 표시합니다.</span></div></div>}
