import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── constants ───────────────────────────────────────────────
const QUARTERS = [1, 2, 3, 4];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const RECOMMENDATIONS = {
  A: { title:"Recommend for Promotion / Compensation Review", body:"This talent is performing exceptionally across all objectives. We recommend considering them for a promotion or a formal compensation review in the next cycle.", color:"#28a745", bg:"rgba(40,167,69,0.07)" },
  B: { title:"Recognise Contribution & Explore Growth", body:"This talent is performing well and consistently meeting expectations. We recommend formally recognising their contribution and exploring stretch assignments or growth opportunities.", color:"#0071e3", bg:"rgba(0,113,227,0.07)" },
  C: { title:"Targeted Coaching Recommended", body:"This talent is meeting baseline expectations but has room to grow. We recommend targeted coaching, a development plan, and closer check-ins to help them reach the next performance level.", color:"#bf8a00", bg:"rgba(191,138,0,0.07)" },
  D: { title:"Place on Performance Improvement Plan", body:"This talent is falling below expectations. We recommend placing them on a structured Performance Improvement Plan (PIP) with clear milestones, regular reviews, and defined support mechanisms.", color:"#d4622a", bg:"rgba(212,98,42,0.07)" },
  F: { title:"Urgent Performance Review Required", body:"This talent is significantly underperforming across objectives. We recommend an urgent performance review with HR leadership and consideration of contract termination if no improvement is demonstrated.", color:"#d62a2a", bg:"rgba(214,42,42,0.07)" },
};

const DEPARTMENTS = [
  { id:"d1", name:"Talent Operations",              desc:"Talent sourcing, placement and resource management" },
  { id:"d2", name:"People Performance and Culture", desc:"HR, performance management and organisational culture" },
  { id:"d3", name:"Strategic Operations",           desc:"Business strategy, planning and operational excellence" },
  { id:"d4", name:"Partnerships",                   desc:"Client relationships, alliances and business development" },
  { id:"d5", name:"Finance",                        desc:"Financial planning, reporting and controls" },
  { id:"d6", name:"Learning",                       desc:"Talent development, training and capability building" },
  { id:"d7", name:"Marketing and Communications",   desc:"Brand, content and external communications" },
];

// ─── helpers ─────────────────────────────────────────────────
const uid = () => "_" + Math.random().toString(36).slice(2, 9);
const initials = (n) => n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const gradeOf = (s) => s >= 70 ? "A" : s >= 60 ? "B" : s >= 50 ? "C" : s >= 40 ? "D" : "F";
const gradeColor = (g) => ({ A:"#28a745", B:"#0071e3", C:"#bf8a00", D:"#d4622a", F:"#d62a2a" }[g] || "#aeaeb2");
const gradeBg   = (g) => ({ A:"rgba(40,167,69,0.09)", B:"rgba(0,113,227,0.09)", C:"rgba(191,138,0,0.09)", D:"rgba(212,98,42,0.09)", F:"rgba(214,42,42,0.09)" }[g] || "#f5f5f7");

const AVATAR_PAIRS = [
  ["#e8e8ed","#3a3a3c"],["#d1d1d6","#2c2c2e"],["#c7c7cc","#2c2c2e"],
  ["#bcbcc4","#1c1c1e"],["#aeaeb2","#1c1c1e"],["#98989d","#ffffff"],["#8e8e93","#ffffff"],
];
const avatarPair = (id) => { let h=0; for (const c of id) h=(h*31+c.charCodeAt(0))%AVATAR_PAIRS.length; return AVATAR_PAIRS[h]; };

// scores shape: { "talentId:year:quarter": { okrId: score } }
const scoreKey = (tid, year, quarter) => `${tid}:${year}:${quarter}`;

const computeScore = (talent, okrs, scoresMap, year, quarter) => {
  if (!talent?.okrs?.length) return null;
  const k = scoreKey(talent.id, year, quarter);
  const tScores = scoresMap[k] || {};
  let wSum=0, wTotal=0;
  for (const oid of talent.okrs) {
    const okr = okrs.find((o)=>o.id===oid);
    const s = tScores[oid];
    if (okr && s!==undefined) { wSum+=s*okr.weight; wTotal+=okr.weight; }
  }
  return wTotal===0 ? null : Math.round(wSum/wTotal);
};

const computeAnnualScore = (talent, okrs, scoresMap, year) => {
  const qScores = QUARTERS.map((q) => computeScore(talent, okrs, scoresMap, year, q));
  const filled = qScores.filter((s) => s!==null);
  if (filled.length===0) return { scores: qScores, avg: null, complete: false };
  const avg = Math.round(filled.reduce((a,b)=>a+b,0)/filled.length);
  return { scores: qScores, avg, complete: filled.length===4 };
};

// ─── styles ──────────────────────────────────────────────────
const S = {
  app: { display:"flex", minHeight:"100vh", background:"#f5f5f7", fontFamily:"'Geist',-apple-system,BlinkMacSystemFont,sans-serif", fontSize:14, WebkitFontSmoothing:"antialiased" },
  sidebar: { width:232, background:"rgba(255,255,255,0.92)", borderRight:"1px solid rgba(0,0,0,0.08)", padding:"20px 0", display:"flex", flexDirection:"column", flexShrink:0, position:"sticky", top:0, height:"100vh", overflowY:"auto" },
  main: { flex:1, overflowY:"auto" },
  logoWrap: { padding:"6px 20px 24px" },
  logoMark: { fontWeight:700, fontSize:16, color:"#1d1d1f", letterSpacing:"-0.3px" },
  logoSub: { fontSize:11, color:"#aeaeb2", marginTop:1 },
  navSection: { padding:"14px 20px 5px", fontSize:11, color:"#aeaeb2", fontWeight:500 },
  navItem: (a) => ({ display:"flex", alignItems:"center", gap:9, padding:"8px 10px", margin:"0 10px 1px", borderRadius:8, cursor:"pointer", color:a?"#0071e3":"#6e6e73", background:a?"rgba(0,113,227,0.08)":"transparent", fontWeight:a?500:400, fontSize:13.5, transition:"all 0.15s" }),
  pageHeader: { padding:"26px 36px 20px", borderBottom:"1px solid rgba(0,0,0,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,255,255,0.75)", backdropFilter:"blur(12px)", position:"sticky", top:0, zIndex:10 },
  pageTitle: { fontWeight:600, fontSize:21, letterSpacing:"-0.4px", color:"#1d1d1f" },
  pageSub: { color:"#aeaeb2", fontSize:13, marginTop:2 },
  content: { padding:"26px 36px" },
  btn: (v="primary") => ({ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:980, fontSize:13, fontWeight:500, cursor:"pointer", border:"none", fontFamily:"inherit", letterSpacing:"-0.1px", transition:"all 0.15s", ...(v==="primary"?{background:"#0071e3",color:"#fff"}:v==="danger"?{background:"rgba(214,42,42,0.08)",color:"#d62a2a"}:{background:"#e8e8ed",color:"#1d1d1f"}) }),
  card: { background:"#fff", border:"1px solid rgba(0,0,0,0.08)", borderRadius:14, padding:"20px 22px", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" },
  grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 },
  grid3: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 },
  grid4: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 },
  statCard: { background:"#fff", border:"1px solid rgba(0,0,0,0.08)", borderRadius:14, padding:"18px 20px", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" },
  statLabel: { fontSize:12, color:"#aeaeb2", fontWeight:500, marginBottom:8 },
  statValue: { fontWeight:700, fontSize:28, letterSpacing:"-1px", color:"#1d1d1f" },
  statChange: { fontSize:12, color:"#aeaeb2", marginTop:5 },
  formGroup: { marginBottom:16 },
  label: { display:"block", fontSize:12.5, color:"#6e6e73", marginBottom:6, fontWeight:500 },
  input: { width:"100%", background:"#f5f5f7", border:"1px solid rgba(0,0,0,0.13)", borderRadius:9, padding:"9px 12px", color:"#1d1d1f", fontFamily:"inherit", fontSize:13.5, outline:"none", boxSizing:"border-box" },
  grade: (g) => ({ display:"inline-flex", alignItems:"center", justifyContent:"center", width:28, height:28, borderRadius:7, fontWeight:700, fontSize:13, background:gradeBg(g), color:gradeColor(g) }),
  scoreBar: { width:"100%", height:4, background:"#e8e8ed", borderRadius:999, overflow:"hidden" },
  chip: { display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", background:"#f5f5f7", borderRadius:999, fontSize:11.5, color:"#6e6e73" },
  qchip: (active) => ({ padding:"5px 13px", borderRadius:980, border:"none", fontFamily:"inherit", fontSize:12, fontWeight:active?600:400, cursor:"pointer", transition:"all 0.15s", background:active?"#0071e3":"#e8e8ed", color:active?"#fff":"#6e6e73" }),
  medal: (r) => ({ width:22, height:22, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10.5, fontWeight:700, ...(r===1?{background:"rgba(191,138,0,0.12)",color:"#bf8a00"}:r===2?{background:"rgba(130,130,150,0.12)",color:"#8a8a9a"}:r===3?{background:"rgba(160,100,40,0.12)",color:"#a06428"}:{background:"#f5f5f7",color:"#aeaeb2"}) }),
  okrItem: { background:"#fff", border:"1px solid rgba(0,0,0,0.08)", borderRadius:10, padding:"13px 15px", marginBottom:8 },
  empty: { textAlign:"center", padding:"56px 20px", color:"#aeaeb2" },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.22)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(6px)" },
  modal: { background:"#fff", border:"1px solid rgba(0,0,0,0.1)", borderRadius:18, padding:"26px 28px", width:520, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.15)" },
  toast: { position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", background:"#1d1d1f", color:"#fff", padding:"10px 20px", borderRadius:980, fontSize:13, fontWeight:500, zIndex:999, pointerEvents:"none" },
};

// ─── small components ────────────────────────────────────────
function Avatar({ id, name, size=38 }) {
  const [bg,fg] = avatarPair(id);
  return <div style={{ width:size, height:size, borderRadius:10, background:bg, color:fg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:size*0.34, flexShrink:0 }}>{initials(name)}</div>;
}
function GradeBadge({ score }) {
  if (score==null) return <span style={{ color:"#aeaeb2", fontSize:12 }}>—</span>;
  const g=gradeOf(score);
  return <div style={S.grade(g)}>{g}</div>;
}
function ScoreBar({ score }) {
  const g=score!=null?gradeOf(score):null;
  return <div style={S.scoreBar}><div style={{ height:"100%", borderRadius:999, width:`${score||0}%`, background:g?gradeColor(g):"#e8e8ed", transition:"width 0.5s cubic-bezier(.4,0,.2,1)" }} /></div>;
}
function Spinner({ size=20, color="#0071e3" }) {
  return <><div style={{ width:size, height:size, border:"2.5px solid #e8e8ed", borderTopColor:color, borderRadius:"50%", animation:"ts-spin 0.7s linear infinite" }} /><style>{`@keyframes ts-spin{to{transform:rotate(360deg)}}`}</style></>;
}
function Modal({ open, onClose, title, children, footer, wide=false }) {
  if (!open) return null;
  return (
    <div style={S.overlay} onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ ...S.modal, ...(wide?{width:680}:{}) }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div style={{ fontWeight:600, fontSize:17, letterSpacing:"-0.3px" }}>{title}</div>
          <button onClick={onClose} style={{ background:"#f5f5f7", border:"none", borderRadius:"50%", width:28, height:28, cursor:"pointer", fontSize:16, color:"#6e6e73", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        {children}
        {footer && <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:20, paddingTop:18, borderTop:"1px solid rgba(0,0,0,0.08)" }}>{footer}</div>}
      </div>
    </div>
  );
}
function Field({ label, children }) { return <div style={S.formGroup}><label style={S.label}>{label}</label>{children}</div>; }
function Input({ value, onChange, placeholder, type="text", style={} }) { return <input type={type} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} style={{ ...S.input, ...style }} />; }
function Sel({ value, onChange, children }) { return <select value={value} onChange={(e)=>onChange(e.target.value)} style={{ ...S.input, appearance:"none", WebkitAppearance:"none" }}>{children}</select>; }
function Textarea({ value, onChange, placeholder }) { return <textarea value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} style={{ ...S.input, minHeight:76, resize:"vertical" }} />; }

function PeriodSelector({ year, quarter, onYear, onQuarter, showQuarter=true }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <Sel value={year} onChange={(v)=>onYear(parseInt(v))}>
        {YEARS.map((y)=><option key={y} value={y}>{y}</option>)}
      </Sel>
      {showQuarter && QUARTERS.map((q)=>(
        <button key={q} style={S.qchip(quarter===q)} onClick={()=>onQuarter(q)}>Q{q}</button>
      ))}
    </div>
  );
}

function RecommendationCard({ annualData }) {
  const { avg, complete } = annualData;
  if (!complete) return null;
  const g = gradeOf(avg);
  const rec = RECOMMENDATIONS[g];
  return (
    <div style={{ background:rec.bg, border:`1px solid ${rec.color}22`, borderRadius:12, padding:"16px 18px", marginTop:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:rec.color, flexShrink:0 }} />
        <div style={{ fontWeight:600, fontSize:13, color:rec.color }}>{rec.title}</div>
      </div>
      <div style={{ fontSize:12.5, color:"#3a3a3c", lineHeight:1.6 }}>{rec.body}</div>
    </div>
  );
}

// ─── main app ────────────────────────────────────────────────
export default function App() {
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [tab,      setTab]      = useState("dashboard");
  const [toast,    setToast]    = useState(null);
  const toastTimer              = useRef(null);

  const [okrs,    setOkrs]    = useState([]);
  const [talents, setTalents] = useState([]);
  const [scores,  setScores]  = useState({}); // { "tid:year:q": { okrId: score } }

  // active period
  const [activeYear,    setActiveYear]    = useState(CURRENT_YEAR);
  const [activeQuarter, setActiveQuarter] = useState(Math.ceil((new Date().getMonth()+1)/3));
  const [viewYear,      setViewYear]      = useState(CURRENT_YEAR); // for annual view

  // modals
  const [okrModal,      setOkrModal]      = useState(false);
  const [talentModal,   setTalentModal]   = useState(false);
  const [scoreModal,    setScoreModal]    = useState(null);
  const [annualModal,   setAnnualModal]   = useState(null); // talentId
  const [editingOkr,    setEditingOkr]    = useState(null);
  const [editingTalent, setEditingTalent] = useState(null);

  const [okrForm,    setOkrForm]    = useState({ name:"", description:"", dept:"", weight:"100" });
  const [talentForm, setTalentForm] = useState({ name:"", role:"", dept:"", okrs:[] });
  const [tempScores, setTempScores] = useState({});
  const [sortDir,    setSortDir]    = useState("desc");

  const showToast = (msg) => { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current=setTimeout(()=>setToast(null),2400); };

  // ── load ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [{ data:oRows },{ data:tRows },{ data:sRows }] = await Promise.all([
          supabase.from("okrs").select("*"),
          supabase.from("talents").select("*"),
          supabase.from("scores").select("*"),
        ]);
        setOkrs(oRows||[]);
        setTalents(tRows||[]);
        const sm={};
        for (const r of (sRows||[])) {
          const k=scoreKey(r.talent_id, r.year||CURRENT_YEAR, r.quarter||1);
          if (!sm[k]) sm[k]={};
          sm[k][r.okr_id]=r.score;
        }
        setScores(sm);
      } catch(e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f5f5f7", gap:12 }}>
      <Spinner size={32} /><div style={{ fontSize:13, color:"#aeaeb2" }}>Loading shared data…</div>
    </div>
  );

  // ── OKR actions ──────────────────────────────────────────────
  const openNewOkr  = () => { setEditingOkr(null); setOkrForm({ name:"", description:"", dept:"", weight:"100" }); setOkrModal(true); };
  const openEditOkr = (o) => { setEditingOkr(o.id); setOkrForm({ name:o.name, description:o.description||"", dept:o.dept||"", weight:String(o.weight) }); setOkrModal(true); };
  const saveOkr = async () => {
    if (!okrForm.name.trim()) return;
    setSaving(true);
    const p={ name:okrForm.name, description:okrForm.description, dept:okrForm.dept, weight:parseInt(okrForm.weight)||100 };
    if (editingOkr) { await supabase.from("okrs").update(p).eq("id",editingOkr); setOkrs(okrs.map((o)=>o.id===editingOkr?{...o,...p}:o)); }
    else { const n={id:uid(),...p}; await supabase.from("okrs").insert(n); setOkrs([...okrs,n]); }
    setSaving(false); setOkrModal(false); showToast("OKR saved");
  };
  const deleteOkr = async (id) => {
    if (!confirm("Delete this OKR?")) return;
    setSaving(true);
    await supabase.from("scores").delete().eq("okr_id",id);
    await supabase.from("okrs").delete().eq("id",id);
    setOkrs(okrs.filter((o)=>o.id!==id));
    const ns=Object.fromEntries(Object.entries(scores).map(([k,s])=>{ const c={...s}; delete c[id]; return [k,c]; }));
    setScores(ns);
    setSaving(false); showToast("OKR deleted");
  };

  // ── Talent actions ───────────────────────────────────────────
  const openNewTalent = () => {
    setEditingTalent(null);
    setTalentForm({ name:"", role:"", dept:"", okrs:[] });
    setTalentModal(true);
  };
  const openEditTalent = (t) => {
    setEditingTalent(t.id);
    setTalentForm({ name:t.name, role:t.role, dept:t.dept, okrs:[...t.okrs] });
    setTalentModal(true);
  };
  const saveTalent = async () => {
    if (!talentForm.name.trim()) return;
    setSaving(true);
    const payload = { name:talentForm.name, role:talentForm.role, dept:talentForm.dept, okrs:talentForm.okrs };
    if (editingTalent) {
      await supabase.from("talents").update(payload).eq("id", editingTalent);
      setTalents(talents.map((t)=>t.id===editingTalent?{...t,...payload}:t));
      showToast("Talent updated");
    } else {
      const n={ id:uid(), ...payload };
      await supabase.from("talents").insert(n);
      setTalents([...talents,n]);
      showToast("Talent added");
    }
    setSaving(false); setTalentModal(false);
  };
  const deleteTalent = async (id) => {
    if (!confirm("Remove this talent and all their scores?")) return;
    setSaving(true);
    await supabase.from("scores").delete().eq("talent_id",id);
    await supabase.from("talents").delete().eq("id",id);
    setTalents(talents.filter((t)=>t.id!==id));
    const ns=Object.fromEntries(Object.entries(scores).filter(([k])=>!k.startsWith(id+":")));
    setScores(ns);
    setSaving(false); showToast("Talent removed");
  };

  // ── Score actions ────────────────────────────────────────────
  const openScore = (tid) => {
    const k=scoreKey(tid,activeYear,activeQuarter);
    setTempScores({...(scores[k]||{})});
    setScoreModal(tid);
  };
  const saveScoreModal = async () => {
    setSaving(true);
    const talent=talents.find((t)=>t.id===scoreModal);
    const rows=talent.okrs.filter((oid)=>tempScores[oid]!==undefined).map((oid)=>({ talent_id:scoreModal, okr_id:oid, score:tempScores[oid], year:activeYear, quarter:activeQuarter }));
    if (rows.length) await supabase.from("scores").upsert(rows,{ onConflict:"talent_id,okr_id,year,quarter" });
    const k=scoreKey(scoreModal,activeYear,activeQuarter);
    setScores({...scores,[k]:{...(scores[k]||{}),...tempScores}});
    setSaving(false); setScoreModal(null); showToast("Scores saved");
  };

  // ── computed ─────────────────────────────────────────────────
  const deptOkrs  = (dId)=>okrs.filter((o)=>o.dept===dId);
  const deptName  = (id)=>DEPARTMENTS.find((d)=>d.id===id)?.name||"—";

  const activeScored = talents
    .map((t)=>({ ...t, score:computeScore(t,okrs,scores,activeYear,activeQuarter) }))
    .filter((t)=>t.score!==null);

  const avg = activeScored.length ? Math.round(activeScored.reduce((s,t)=>s+t.score,0)/activeScored.length) : null;
  const top = [...activeScored].sort((a,b)=>b.score-a.score)[0];
  const sorted = [...activeScored].sort((a,b)=>sortDir==="desc"?b.score-a.score:a.score-b.score);

  const NavItem = ({ id, icon, label }) => (
    <div style={S.navItem(tab===id)} onClick={()=>setTab(id)}>
      <svg style={{ width:16, height:16, flexShrink:0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">{icon}</svg>
      {label}
    </div>
  );

  return (
    <div style={S.app}>
      {/* SIDEBAR */}
      <aside style={S.sidebar}>
        <div style={S.logoWrap}>
          <div style={S.logoMark}>TalentScope<span style={{ display:"inline-block", width:7, height:7, background:"#0071e3", borderRadius:"50%", marginLeft:3, marginBottom:1 }} /></div>
          <div style={S.logoSub}>Appraisal Intelligence</div>
        </div>
        <div style={{ flex:1 }}>
          <div style={S.navSection}>Overview</div>
          <NavItem id="dashboard"   label="Dashboard"     icon={<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>} />
          <div style={S.navSection}>Data</div>
          <NavItem id="okrs"        label="OKR Scorecards" icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>} />
          <NavItem id="departments" label="Departments"    icon={<path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>} />
          <NavItem id="talents"     label="Talents"        icon={<path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>} />
          <div style={S.navSection}>Appraisal</div>
          <NavItem id="scoring"   label="Score Talents"  icon={<path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>} />
          <NavItem id="rankings"  label="Rankings"       icon={<path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"/>} />
          <NavItem id="annual"    label="Annual Review"  icon={<path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>} />
        </div>
        <div style={{ padding:"12px 20px", fontSize:11, color:"#aeaeb2", display:"flex", alignItems:"center", gap:7, minHeight:36 }}>
          {saving && <><Spinner size={10} color="#0071e3" /><span>Saving…</span></>}
        </div>
      </aside>

      <main style={S.main}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard" && <>
          <div style={S.pageHeader}>
            <div><div style={S.pageTitle}>Overview</div><div style={S.pageSub}>Executive performance intelligence</div></div>
            <PeriodSelector year={activeYear} quarter={activeQuarter} onYear={setActiveYear} onQuarter={setActiveQuarter} />
          </div>
          <div style={S.content}>
            {/* period pill */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(0,113,227,0.08)", borderRadius:980, padding:"5px 12px", fontSize:12, color:"#0071e3", fontWeight:500, marginBottom:18 }}>
              Showing {activeYear} · Q{activeQuarter} data
            </div>
            <div style={S.grid4}>
              {[
                { label:"Total Talents",  value:talents.length,               sub:`${activeScored.length} scored this quarter` },
                { label:"Quarter Avg",    value:avg??"—",                     sub:avg?`Grade ${gradeOf(avg)}`:"No scores yet", vc:avg?gradeColor(gradeOf(avg)):"#aeaeb2" },
                { label:"Departments",    value:DEPARTMENTS.length,            sub:`${okrs.length} OKRs created` },
                { label:"Top Performer",  value:top?top.name.split(" ")[0]:"—", sub:top?`${top.score}% score`:"", vc:top?gradeColor(gradeOf(top.score)):"#1d1d1f", vfs:18 },
              ].map((s,i)=>(
                <div key={i} style={S.statCard}>
                  <div style={S.statLabel}>{s.label}</div>
                  <div style={{ ...S.statValue, color:s.vc||"#1d1d1f", fontSize:s.vfs||28 }}>{s.value}</div>
                  <div style={S.statChange}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ ...S.grid2, marginTop:16 }}>
              <div style={S.card}>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:3 }}>Grade Distribution</div>
                <div style={{ fontSize:12, color:"#aeaeb2", marginBottom:16 }}>{activeYear} Q{activeQuarter}</div>
                {["A","B","C","D","F"].map((g)=>{
                  const cnt=activeScored.filter((t)=>gradeOf(t.score)===g).length;
                  const pct=activeScored.length?Math.round((cnt/activeScored.length)*100):0;
                  return <div key={g} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <div style={{ ...S.grade(g), flexShrink:0 }}>{g}</div>
                    <div style={{ flex:1 }}><div style={S.scoreBar}><div style={{ height:"100%", borderRadius:999, width:`${pct}%`, background:gradeColor(g), transition:"width 0.4s" }} /></div></div>
                    <div style={{ fontSize:12, color:"#6e6e73", minWidth:20, textAlign:"right" }}>{cnt}</div>
                  </div>;
                })}
              </div>
              <div style={S.card}>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:3 }}>Department Avg Score</div>
                <div style={{ fontSize:12, color:"#aeaeb2", marginBottom:16 }}>{activeYear} Q{activeQuarter}</div>
                {DEPARTMENTS.map((d)=>{
                  const sc=talents.filter((t)=>t.dept===d.id).map((t)=>computeScore(t,okrs,scores,activeYear,activeQuarter)).filter((s)=>s!==null);
                  const av=sc.length?Math.round(sc.reduce((a,b)=>a+b,0)/sc.length):null;
                  return <div key={d.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:9 }}>
                    <div style={{ fontSize:12, color:"#6e6e73", width:164, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flexShrink:0 }}>{d.name}</div>
                    <div style={{ flex:1 }}><div style={S.scoreBar}><div style={{ height:"100%", borderRadius:999, width:`${av||0}%`, background:av?gradeColor(gradeOf(av)):"#e8e8ed", transition:"width 0.4s" }} /></div></div>
                    <div style={{ fontSize:12, fontWeight:600, color:av?gradeColor(gradeOf(av)):"#aeaeb2", minWidth:24, textAlign:"right" }}>{av??"—"}</div>
                  </div>;
                })}
              </div>
            </div>
            <div style={{ ...S.grid2, marginTop:16 }}>
              <div style={S.card}>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:3 }}>Top 5 Performers</div>
                <div style={{ fontSize:12, color:"#aeaeb2", marginBottom:16 }}>{activeYear} Q{activeQuarter}</div>
                {activeScored.length===0 && <div style={{ color:"#aeaeb2", fontSize:13 }}>No scores recorded for this quarter yet.</div>}
                {[...activeScored].sort((a,b)=>b.score-a.score).slice(0,5).map((t,i)=>(
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                    <div style={S.medal(i+1)}>{i+1}</div>
                    <Avatar id={t.id} name={t.name} size={34} />
                    <div style={{ flex:1 }}><div style={{ fontWeight:500, fontSize:13 }}>{t.name}</div><ScoreBar score={t.score} /></div>
                    <span style={{ fontWeight:700, fontSize:15, color:gradeColor(gradeOf(t.score)) }}>{t.score}</span>
                    <GradeBadge score={t.score} />
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:3 }}>Score Spread</div>
                <div style={{ fontSize:12, color:"#aeaeb2", marginBottom:16 }}>{activeYear} Q{activeQuarter}</div>
                {activeScored.length===0 && <div style={{ color:"#aeaeb2", fontSize:13 }}>No scored talents yet.</div>}
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {[...activeScored].sort((a,b)=>b.score-a.score).map((t)=>{
                    const g=gradeOf(t.score);
                    return <div key={t.id} style={{ background:gradeBg(g), borderRadius:8, padding:"6px 10px", display:"flex", alignItems:"center", gap:6 }}>
                      <Avatar id={t.id} name={t.name} size={22} />
                      <div>
                        <div style={{ fontSize:11, fontWeight:500, color:"#1d1d1f" }}>{t.name.split(" ")[0]}</div>
                        <div style={{ fontSize:11, fontWeight:700, color:gradeColor(g) }}>{t.score}</div>
                      </div>
                    </div>;
                  })}
                </div>
              </div>
            </div>
          </div>
        </>}

        {/* ── OKRs ── */}
        {tab==="okrs" && <>
          <div style={S.pageHeader}><div><div style={S.pageTitle}>OKR Scorecards</div><div style={S.pageSub}>Create and manage objectives per department</div></div><button style={S.btn()} onClick={openNewOkr}>+ New OKR</button></div>
          <div style={S.content}>
            {okrs.length===0 && <div style={S.empty}><div style={{ fontSize:32, marginBottom:10, opacity:0.3 }}>📋</div><div>No OKRs yet. Create your first one.</div></div>}
            {DEPARTMENTS.map((d)=>{
              const dOkrs=deptOkrs(d.id); if(!dOkrs.length) return null;
              return <div key={d.id} style={{ marginBottom:28 }}>
                <div style={{ fontWeight:600, fontSize:15, marginBottom:12 }}>{d.name}</div>
                {dOkrs.map((o)=>(
                  <div key={o.id} style={S.okrItem}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:500, fontSize:13.5 }}>{o.name}</div>
                        <div style={{ fontSize:12, color:"#aeaeb2", marginTop:2 }}>{o.description||"No description"}</div>
                        <div style={{ fontSize:11.5, color:"#0071e3", fontWeight:500, marginTop:5 }}>Weight: {o.weight}%</div>
                      </div>
                      <button style={S.btn("secondary")} onClick={()=>openEditOkr(o)}>Edit</button>
                      <button style={S.btn("danger")}    onClick={()=>deleteOkr(o.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>;
            })}
          </div>
        </>}

        {/* ── DEPARTMENTS ── */}
        {tab==="departments" && <>
          <div style={S.pageHeader}><div><div style={S.pageTitle}>Departments</div><div style={S.pageSub}>Your 7 teams and their performance overview</div></div></div>
          <div style={S.content}>
            <div style={S.grid2}>
              {DEPARTMENTS.map((d)=>{
                const tCount=talents.filter((t)=>t.dept===d.id).length;
                const oCount=okrs.filter((o)=>o.dept===d.id).length;
                const sc=talents.filter((t)=>t.dept===d.id).map((t)=>computeScore(t,okrs,scores,activeYear,activeQuarter)).filter((s)=>s!==null);
                const av=sc.length?Math.round(sc.reduce((a,b)=>a+b,0)/sc.length):null;
                return <div key={d.id} style={S.card}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                    <div style={{ width:42, height:42, background:"rgba(0,113,227,0.08)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:16, color:"#0071e3", flexShrink:0 }}>{d.name[0]}</div>
                    <div><div style={{ fontWeight:600, fontSize:14 }}>{d.name}</div><div style={{ fontSize:12, color:"#aeaeb2", marginTop:1 }}>{d.desc}</div></div>
                  </div>
                  <div style={{ display:"flex", borderTop:"1px solid rgba(0,0,0,0.07)", paddingTop:14 }}>
                    {[["Talents",tCount],["OKRs",oCount],["Avg Score",av??"—"]].map(([lbl,val],i)=>(
                      <div key={lbl} style={{ flex:1, textAlign:"center", ...(i>0?{borderLeft:"1px solid rgba(0,0,0,0.07)"}:{}) }}>
                        <div style={{ fontWeight:700, fontSize:20, color:lbl==="Avg Score"&&av?gradeColor(gradeOf(av)):"#1d1d1f" }}>{val}</div>
                        <div style={{ fontSize:11, color:"#aeaeb2" }}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>;
              })}
            </div>
          </div>
        </>}

        {/* ── TALENTS ── */}
        {tab==="talents" && <>
          <div style={S.pageHeader}><div><div style={S.pageTitle}>Talents</div><div style={S.pageSub}>Manage your talent pool</div></div><button style={S.btn()} onClick={openNewTalent}>+ Add Talent</button></div>
          <div style={S.content}>
            {talents.length===0 && <div style={S.empty}><div style={{ fontSize:32, marginBottom:10, opacity:0.3 }}>👥</div><div>No talents added yet.</div></div>}
            <div style={S.grid3}>
              {talents.map((t)=>{
                const score=computeScore(t,okrs,scores,activeYear,activeQuarter);
                const grade=score!==null?gradeOf(score):null;
                const annual=computeAnnualScore(t,okrs,scores,activeYear);
                return <div key={t.id} style={{ ...S.card, display:"flex", flexDirection:"column", gap:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <Avatar id={t.id} name={t.name} />
                    <div style={{ flex:1 }}><div style={{ fontWeight:600, fontSize:13.5 }}>{t.name}</div><div style={{ fontSize:11.5, color:"#aeaeb2", marginTop:1 }}>{t.role} · {deptName(t.dept)}</div></div>
                    {grade && <GradeBadge score={score} />}
                  </div>
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#aeaeb2", marginBottom:5 }}>
                      <span>Q{activeQuarter} {activeYear}</span>
                      <span style={{ fontWeight:600, color:score!==null?gradeColor(grade):"#aeaeb2" }}>{score!==null?`${score}%`:"Not scored"}</span>
                    </div>
                    <ScoreBar score={score} />
                  </div>
                  {annual.avg!==null && <div style={{ fontSize:11, color:"#6e6e73" }}>
                    {activeYear} avg: <span style={{ fontWeight:600, color:gradeColor(gradeOf(annual.avg)) }}>{annual.avg}%</span>
                    {annual.complete && <span style={{ marginLeft:4, color:"#28a745" }}>✓ Full year</span>}
                  </div>}
                  <div style={{ display:"flex", gap:8 }}>
                    <button style={{ ...S.btn("secondary"), flex:1, justifyContent:"center" }} onClick={()=>openScore(t.id)}>Score Q{activeQuarter}</button>
                    <button style={S.btn("secondary")} onClick={()=>setAnnualModal(t.id)}>Year</button>
                    <button style={S.btn("secondary")} onClick={()=>openEditTalent(t)}>Edit</button>
                    <button style={S.btn("danger")} onClick={()=>deleteTalent(t.id)}>✕</button>
                  </div>
                </div>;
              })}
            </div>
          </div>
        </>}

        {/* ── SCORING ── */}
        {tab==="scoring" && <>
          <div style={S.pageHeader}>
            <div><div style={S.pageTitle}>Score Talents</div><div style={S.pageSub}>Evaluate OKR performance per talent</div></div>
            <PeriodSelector year={activeYear} quarter={activeQuarter} onYear={setActiveYear} onQuarter={setActiveQuarter} />
          </div>
          <div style={S.content}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(0,113,227,0.08)", borderRadius:980, padding:"5px 12px", fontSize:12, color:"#0071e3", fontWeight:500, marginBottom:18 }}>
              Scoring {activeYear} · Q{activeQuarter}
            </div>
            {talents.length===0 && <div style={S.empty}><div style={{ fontSize:32, marginBottom:10, opacity:0.3 }}>⭐</div><div>Add talents first to score them.</div></div>}
            {talents.map((t)=>{
              const score=computeScore(t,okrs,scores,activeYear,activeQuarter);
              const grade=score!==null?gradeOf(score):null;
              const k=scoreKey(t.id,activeYear,activeQuarter);
              const scored=t.okrs.filter((oid)=>(scores[k]||{})[oid]!==undefined).length;
              return <div key={t.id} style={{ ...S.card, marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <Avatar id={t.id} name={t.name} size={44} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:15 }}>{t.name}</div>
                    <div style={{ fontSize:12, color:"#6e6e73" }}>{t.role} · {deptName(t.dept)}</div>
                    <div style={{ fontSize:11, color:"#aeaeb2", marginTop:3 }}>{scored}/{t.okrs.length} OKRs scored for Q{activeQuarter}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    {score!==null?<><div style={{ fontWeight:800, fontSize:26, color:gradeColor(grade), letterSpacing:"-1px" }}>{score}</div><GradeBadge score={score} /></>:<div style={{ color:"#aeaeb2", fontSize:13 }}>Not scored</div>}
                  </div>
                  <button style={S.btn()} onClick={()=>openScore(t.id)}>Score / Edit</button>
                </div>
                {t.okrs.length>0 && <div style={{ marginTop:14, borderTop:"1px solid rgba(0,0,0,0.07)", paddingTop:14, display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:8 }}>
                  {t.okrs.map((oid)=>{
                    const okr=okrs.find((o)=>o.id===oid); const s=(scores[k]||{})[oid]; if(!okr) return null;
                    return <div key={oid} style={{ background:"#f5f5f7", borderRadius:8, padding:"9px 12px", border:"1px solid rgba(0,0,0,0.07)" }}>
                      <div style={{ fontSize:11, color:"#aeaeb2" }}>{okr.name}</div>
                      <div style={{ fontWeight:700, fontSize:18, color:s!==undefined?gradeColor(gradeOf(s)):"#aeaeb2" }}>{s??"—"}</div>
                    </div>;
                  })}
                </div>}
              </div>;
            })}
          </div>
        </>}

        {/* ── RANKINGS ── */}
        {tab==="rankings" && <>
          <div style={S.pageHeader}>
            <div><div style={S.pageTitle}>Rankings</div><div style={S.pageSub}>Talent performance leaderboard</div></div>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <PeriodSelector year={activeYear} quarter={activeQuarter} onYear={setActiveYear} onQuarter={setActiveQuarter} />
              <div style={{ display:"flex", background:"#e8e8ed", borderRadius:8, padding:3, gap:2 }}>
                {["desc","asc"].map((d)=>(
                  <button key={d} onClick={()=>setSortDir(d)} style={{ padding:"5px 12px", borderRadius:6, border:"none", background:sortDir===d?"#fff":"transparent", color:sortDir===d?"#1d1d1f":"#6e6e73", cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:sortDir===d?500:400, boxShadow:sortDir===d?"0 1px 3px rgba(0,0,0,0.06)":"none", transition:"all 0.15s" }}>
                    {d==="desc"?"Highest First":"Lowest First"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={S.content}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(0,113,227,0.08)", borderRadius:980, padding:"5px 12px", fontSize:12, color:"#0071e3", fontWeight:500, marginBottom:18 }}>
              {activeYear} · Q{activeQuarter} Rankings
            </div>
            <div style={S.card}>
              {sorted.length===0 && <div style={{ color:"#aeaeb2", fontSize:13, padding:"32px 0", textAlign:"center" }}>No scored talents for this period yet.</div>}
              {sorted.length>0 && <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>{["Rank","Talent","Department","OKRs","Score","Grade","Performance"].map((h)=>(
                  <th key={h} style={{ textAlign:"left", padding:"10px 12px", fontSize:11, color:"#aeaeb2", borderBottom:"1px solid rgba(0,0,0,0.07)", fontWeight:500 }}>{h}</th>
                ))}</tr></thead>
                <tbody>{sorted.map((t,i)=>{
                  const grade=gradeOf(t.score); const rank=sortDir==="desc"?i+1:sorted.length-i;
                  const k=scoreKey(t.id,activeYear,activeQuarter);
                  const okrCount=t.okrs.filter((oid)=>(scores[k]||{})[oid]!==undefined).length;
                  return <tr key={t.id} style={{ borderBottom:i<sorted.length-1?"1px solid rgba(0,0,0,0.06)":"none" }}>
                    <td style={{ padding:"12px 12px" }}><div style={S.medal(rank)}>{rank}</div></td>
                    <td style={{ padding:"12px 12px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                        <Avatar id={t.id} name={t.name} size={34} />
                        <div><div style={{ fontWeight:500, fontSize:13.5 }}>{t.name}</div><div style={{ fontSize:11, color:"#aeaeb2" }}>{t.role}</div></div>
                      </div>
                    </td>
                    <td style={{ padding:"12px 12px" }}><span style={S.chip}>{deptName(t.dept)}</span></td>
                    <td style={{ padding:"12px 12px", color:"#6e6e73", fontSize:13 }}>{okrCount}</td>
                    <td style={{ padding:"12px 12px" }}><span style={{ fontWeight:700, fontSize:16, color:gradeColor(grade) }}>{t.score}</span></td>
                    <td style={{ padding:"12px 12px" }}><GradeBadge score={t.score} /></td>
                    <td style={{ padding:"12px 12px", minWidth:140 }}><ScoreBar score={t.score} /></td>
                  </tr>;
                })}</tbody>
              </table>}
            </div>
          </div>
        </>}

        {/* ── ANNUAL REVIEW ── */}
        {tab==="annual" && <>
          <div style={S.pageHeader}>
            <div><div style={S.pageTitle}>Annual Review</div><div style={S.pageSub}>Full year performance and recommendations</div></div>
            <Sel value={viewYear} onChange={(v)=>setViewYear(parseInt(v))}>
              {YEARS.map((y)=><option key={y} value={y}>{y}</option>)}
            </Sel>
          </div>
          <div style={S.content}>
            {talents.length===0 && <div style={S.empty}><div style={{ fontSize:32, marginBottom:10, opacity:0.3 }}>📅</div><div>No talents added yet.</div></div>}
            {talents.map((t)=>{
              const annual=computeAnnualScore(t,okrs,scores,viewYear);
              const { scores:qScores, avg, complete } = annual;
              return <div key={t.id} style={{ ...S.card, marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                  <Avatar id={t.id} name={t.name} size={44} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:15 }}>{t.name}</div>
                    <div style={{ fontSize:12, color:"#6e6e73" }}>{t.role} · {deptName(t.dept)}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11, color:"#aeaeb2", marginBottom:4 }}>{viewYear} Annual Avg</div>
                    {avg!==null
                      ? <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
                          <span style={{ fontWeight:800, fontSize:26, color:gradeColor(gradeOf(avg)), letterSpacing:"-1px" }}>{avg}</span>
                          <GradeBadge score={avg} />
                          {complete && <span style={{ fontSize:11, color:"#28a745", fontWeight:500 }}>✓ Complete</span>}
                        </div>
                      : <div style={{ color:"#aeaeb2", fontSize:13 }}>No data yet</div>
                    }
                  </div>
                </div>

                {/* Q1–Q4 grid */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:avg!==null?0:0 }}>
                  {QUARTERS.map((q,i)=>{
                    const s=qScores[i]; const g=s!==null?gradeOf(s):null;
                    return <div key={q} style={{ background:s!==null?gradeBg(g):"#f5f5f7", borderRadius:10, padding:"12px 14px", border:`1px solid ${s!==null?gradeColor(g)+"22":"rgba(0,0,0,0.07)"}` }}>
                      <div style={{ fontSize:11, color:"#aeaeb2", fontWeight:500, marginBottom:6 }}>Q{q}</div>
                      {s!==null
                        ? <><div style={{ fontWeight:800, fontSize:22, color:gradeColor(g), letterSpacing:"-0.5px" }}>{s}</div><div style={S.grade(g)}>{g}</div></>
                        : <div style={{ fontSize:13, color:"#aeaeb2" }}>Not scored</div>
                      }
                    </div>;
                  })}
                </div>

                {/* recommendation */}
                <RecommendationCard annualData={annual} />

                {!complete && avg!==null && (
                  <div style={{ marginTop:12, fontSize:12, color:"#aeaeb2", fontStyle:"italic" }}>
                    {4-qScores.filter(s=>s!==null).length} quarter{4-qScores.filter(s=>s!==null).length!==1?"s":""} remaining before annual recommendation is generated.
                  </div>
                )}
              </div>;
            })}
          </div>
        </>}

      </main>

      {/* ── MODALS ── */}

      {/* OKR modal */}
      <Modal open={okrModal} onClose={()=>setOkrModal(false)} title={editingOkr?"Edit OKR":"New OKR Scorecard"}
        footer={<><button style={S.btn("secondary")} onClick={()=>setOkrModal(false)}>Cancel</button><button style={S.btn()} onClick={saveOkr}>{saving?"Saving…":"Save OKR"}</button></>}>
        <Field label="OKR Title"><Input value={okrForm.name} onChange={(v)=>setOkrForm({...okrForm,name:v})} placeholder="e.g. Client Satisfaction Score" /></Field>
        <Field label="Description"><Textarea value={okrForm.description} onChange={(v)=>setOkrForm({...okrForm,description:v})} placeholder="What does this OKR measure?" /></Field>
        <Field label="Department"><Sel value={okrForm.dept} onChange={(v)=>setOkrForm({...okrForm,dept:v})}><option value="">— Select Department —</option>{DEPARTMENTS.map((d)=><option key={d.id} value={d.id}>{d.name}</option>)}</Sel></Field>
        <Field label="Weight (%)"><Input type="number" value={okrForm.weight} onChange={(v)=>setOkrForm({...okrForm,weight:v})} placeholder="100" /></Field>
      </Modal>

      {/* Talent modal */}
      <Modal open={talentModal} onClose={()=>setTalentModal(false)} title={editingTalent?"Edit Talent":"Add Talent"}
        footer={<><button style={S.btn("secondary")} onClick={()=>setTalentModal(false)}>Cancel</button><button style={S.btn()} onClick={saveTalent}>{saving?"Saving…":(editingTalent?"Update Talent":"Save Talent")}</button></>}>
        <Field label="Full Name"><Input value={talentForm.name} onChange={(v)=>setTalentForm({...talentForm,name:v})} placeholder="e.g. Amara Osei" /></Field>
        <Field label="Role / Title"><Input value={talentForm.role} onChange={(v)=>setTalentForm({...talentForm,role:v})} placeholder="e.g. Senior Associate" /></Field>
        <Field label="Department"><Sel value={talentForm.dept} onChange={(v)=>{ const autoOkrs=okrs.filter((o)=>o.dept===v).map((o)=>o.id); setTalentForm({...talentForm,dept:v,okrs:autoOkrs}); }}><option value="">— Select Department —</option>{DEPARTMENTS.map((d)=><option key={d.id} value={d.id}>{d.name}</option>)}</Sel></Field>
        <Field label="Assign OKRs">
          <div style={{ border:"1px solid rgba(0,0,0,0.1)", borderRadius:9, background:"#f5f5f7", maxHeight:200, overflowY:"auto" }}>
            {!talentForm.dept && <div style={{ padding:"12px 14px", fontSize:12, color:"#aeaeb2" }}>Select a department first</div>}
            {talentForm.dept && deptOkrs(talentForm.dept).length===0 && <div style={{ padding:"12px 14px", fontSize:12, color:"#aeaeb2" }}>No OKRs for this department yet</div>}
            {talentForm.dept && deptOkrs(talentForm.dept).map((o)=>(
              <label key={o.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", cursor:"pointer" }}>
                <input type="checkbox" checked={talentForm.okrs.includes(o.id)} style={{ accentColor:"#0071e3", width:14, height:14 }}
                  onChange={(e)=>setTalentForm({...talentForm,okrs:e.target.checked?[...talentForm.okrs,o.id]:talentForm.okrs.filter((id)=>id!==o.id)})} />
                <div><div style={{ fontSize:13, fontWeight:500 }}>{o.name}</div><div style={{ fontSize:11, color:"#aeaeb2" }}>Weight: {o.weight}%</div></div>
              </label>
            ))}
          </div>
        </Field>
      </Modal>

      {/* Score modal */}
      {scoreModal && (()=>{
        const talent=talents.find((t)=>t.id===scoreModal); if(!talent) return null;
        let wSum=0, wTotal=0;
        for (const oid of talent.okrs) { const okr=okrs.find((o)=>o.id===oid); const s=tempScores[oid]; if(okr&&s!==undefined&&!isNaN(s)){wSum+=s*okr.weight;wTotal+=okr.weight;} }
        const cs=wTotal>0?Math.round(wSum/wTotal):null; const cg=cs!==null?gradeOf(cs):null;
        return <Modal open={!!scoreModal} onClose={()=>setScoreModal(null)} title={`Score — ${talent.name} · ${activeYear} Q${activeQuarter}`}
          footer={<><button style={S.btn("secondary")} onClick={()=>setScoreModal(null)}>Cancel</button><button style={S.btn()} onClick={saveScoreModal}>{saving?"Saving…":"Save Scores"}</button></>}>
          {talent.okrs.length===0 && <div style={{ color:"#aeaeb2", fontSize:13 }}>No OKRs assigned to this talent.</div>}
          {talent.okrs.map((oid)=>{
            const okr=okrs.find((o)=>o.id===oid); if(!okr) return null;
            const val=tempScores[oid]??""; const g=val!==""?gradeOf(parseInt(val)):null;
            return <div key={oid} style={S.formGroup}>
              <label style={S.label}>{okr.name} <span style={{ color:"#aeaeb2", fontWeight:400 }}>(Weight: {okr.weight}%)</span></label>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <input type="number" min="0" max="100" value={val} placeholder="0–100"
                  onChange={(e)=>{ const n=Math.min(100,Math.max(0,parseInt(e.target.value))); setTempScores({...tempScores,[oid]:isNaN(n)?undefined:n}); }}
                  style={{ ...S.input, width:80 }} />
                {g && <div style={S.grade(g)}>{g}</div>}
              </div>
            </div>;
          })}
          <div style={{ marginTop:14, padding:"14px 16px", background:"#f5f5f7", borderRadius:10, border:"1px solid rgba(0,0,0,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:11, color:"#aeaeb2", textTransform:"uppercase", letterSpacing:1 }}>Computed Score</div>
              <div style={{ fontWeight:800, fontSize:28, letterSpacing:"-1px", color:cg?gradeColor(cg):"#aeaeb2", marginTop:3 }}>{cs??"—"}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, color:"#aeaeb2", textTransform:"uppercase", letterSpacing:1 }}>Grade</div>
              <div style={{ marginTop:5 }}>{cg?<div style={S.grade(cg)}>{cg}</div>:<span style={{ color:"#aeaeb2" }}>—</span>}</div>
            </div>
          </div>
        </Modal>;
      })()}

      {/* Annual modal */}
      {annualModal && (()=>{
        const talent=talents.find((t)=>t.id===annualModal); if(!talent) return null;
        const annual=computeAnnualScore(talent,okrs,scores,viewYear);
        const { scores:qScores, avg, complete } = annual;
        return <Modal open={!!annualModal} onClose={()=>setAnnualModal(null)} title={`${talent.name} — ${viewYear} Annual Review`} wide>
          <div style={{ marginBottom:16 }}>
            <Sel value={viewYear} onChange={(v)=>setViewYear(parseInt(v))}>
              {YEARS.map((y)=><option key={y} value={y}>{y}</option>)}
            </Sel>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
            {QUARTERS.map((q,i)=>{
              const s=qScores[i]; const g=s!==null?gradeOf(s):null;
              return <div key={q} style={{ background:s!==null?gradeBg(g):"#f5f5f7", borderRadius:10, padding:"14px 16px", border:`1px solid ${s!==null?gradeColor(g)+"22":"rgba(0,0,0,0.07)"}`, textAlign:"center" }}>
                <div style={{ fontSize:11, color:"#aeaeb2", fontWeight:500, marginBottom:8 }}>Q{q}</div>
                {s!==null
                  ? <><div style={{ fontWeight:800, fontSize:24, color:gradeColor(g), letterSpacing:"-0.5px" }}>{s}</div><div style={{ display:"flex", justifyContent:"center", marginTop:6 }}><div style={S.grade(g)}>{g}</div></div></>
                  : <div style={{ fontSize:13, color:"#aeaeb2" }}>Not scored</div>
                }
              </div>;
            })}
          </div>
          {avg!==null && <div style={{ background:"#f5f5f7", borderRadius:10, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
            <div>
              <div style={{ fontSize:11, color:"#aeaeb2", textTransform:"uppercase", letterSpacing:1 }}>Annual Average</div>
              <div style={{ fontWeight:800, fontSize:28, color:gradeColor(gradeOf(avg)), letterSpacing:"-1px", marginTop:3 }}>{avg}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, color:"#aeaeb2", textTransform:"uppercase", letterSpacing:1 }}>Grade</div>
              <div style={{ marginTop:5, display:"flex", justifyContent:"flex-end", gap:8, alignItems:"center" }}>
                <GradeBadge score={avg} />
                {complete && <span style={{ fontSize:11, color:"#28a745", fontWeight:500 }}>✓ Full year complete</span>}
              </div>
            </div>
          </div>}
          <RecommendationCard annualData={annual} />
          {!complete && avg!==null && <div style={{ marginTop:10, fontSize:12, color:"#aeaeb2", fontStyle:"italic" }}>
            {4-qScores.filter(s=>s!==null).length} quarter{4-qScores.filter(s=>s!==null).length!==1?"s":""} remaining before annual recommendation is generated.
          </div>}
          {avg===null && <div style={{ color:"#aeaeb2", fontSize:13, textAlign:"center", padding:"20px 0" }}>No scores recorded for {viewYear} yet.</div>}
        </Modal>;
      })()}

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}