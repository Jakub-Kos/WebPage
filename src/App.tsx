import React, { useEffect, useMemo, useRef, useState } from "react";
import { create, all } from "mathjs";

const math = create(all, {});

// ---------- THEME PRESETS ----------
type ThemeKey = "light" | "dark" | "contrast";
const THEMES: Record<ThemeKey, any> = {
  light: {
    bg: "#f7f8fb",
    panel: "#ffffff",
    border: "#e5e7eb",
    text: "#0f172a",
    subtext: "#475569",
    accent: "#1d4ed8",
    link1: "#9ca3af",
    base: "#111827",
    userPoint: "#059669",
    axis: "#e5e7eb",
    warn: "#b91c1c",
  },
  dark: {
    bg: "#0b1020",
    panel: "#121a2b",
    border: "#1f2a44",
    text: "#dbeafe",
    subtext: "#93a4c6",
    accent: "#60a5fa",
    link1: "#475569",
    base: "#93c5fd",
    userPoint: "#34d399",
    axis: "#26324f",
    warn: "#f87171",
  },
  contrast: {
    bg: "#ffffff",
    panel: "#ffffff",
    border: "#00000033",
    text: "#000000",
    subtext: "#333333",
    accent: "#0000ff",
    link1: "#7a7a7a",
    base: "#000000",
    userPoint: "#008000",
    axis: "#cccccc",
    warn: "#cc0000",
  },
};

// ---------- GEOMETRY HELPERS ----------
const toRad = (deg: number) => (deg * Math.PI) / 180;
function Rot2D(thetaRad: number) {
  const c = Math.cos(thetaRad), s = Math.sin(thetaRad);
  return [[c, -s, 0],[s, c, 0],[0, 0, 1]];
}
function Tran2D(dx: number, dy: number) {
  return [[1,0,dx],[0,1,dy],[0,0,1]];
}
function matMul(A: number[][], B: number[][]) {
  const r = A.length, c = B[0].length, kmax = B.length;
  const R: number[][] = Array.from({ length: r }, () => Array(c).fill(0));
  for (let i=0;i<r;i++) for (let j=0;j<c;j++) {
    let sum=0; for (let k=0;k<kmax;k++) sum += A[i][k]*B[k][j];
    R[i][j]=sum;
  }
  return R;
}
function matVec(A: number[][], v: number[]) {
  return A.map((row) => row.reduce((acc, aij, j) => acc + aij * v[j], 0));
}
function matIdentity(): number[][] { return [[1,0,0],[0,1,0],[0,0,1]]; }

// ---------- DEFAULT USER MATRIX (2-link symbolic) ----------
const DEFAULT_MATRIX: string[][] = [
  ["cos(θ1+θ2)", "-sin(θ1+θ2)", "l1*cos(θ1)+l2*cos(θ1+θ2)"],
  ["sin(θ1+θ2)",  "cos(θ1+θ2)",  "l1*sin(θ1)+l2*sin(θ1+θ2)"],
  ["0","0","1"],
];

// ---------- SIMPLE PANEL ----------
const Panel: React.FC<{title?: string; style?: React.CSSProperties; colors: any}> = ({ title, style, colors, children }) => (
  <div style={{
    background:colors.panel,border:`1px solid ${colors.border}`,borderRadius:10,padding:12,
    boxSizing:"border-box",boxShadow:"0 1px 2px rgba(16,24,40,0.04)",...style
  }}>
    {title && <div style={{ fontWeight:700, marginBottom:8, color:colors.text }}>{title}</div>}
    {children}
  </div>
);

// ---------- SMALL MATRIX VIEW ----------
type Cell = string | number;
const Matrix: React.FC<{ A: Cell[][]; colors:any; label?: string; compact?: boolean }> = ({ A, colors, label, compact }) => (
  <div style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
    {label && <div style={{ color:colors.subtext, fontSize:12, minWidth: compact? undefined : 60, textAlign:"right" }}>{label}</div>}
    <div style={{
      display:"grid",
      gridTemplateColumns:`repeat(${A[0].length}, auto)`,
      gap:6, padding:"8px 10px",
      border:`1px solid ${colors.border}`, borderRadius:8,
      background: colors.panel
    }}>
      {A.flatMap((row, i) => row.map((c, j) => (
        <div key={`${i}-${j}`} style={{
          minWidth: compact? 44 : 56, textAlign:"center",
          fontFamily:"ui-monospace, Menlo, monospace",
          color: colors.text
        }}>
          {typeof c === "number" ? (Number.isFinite(c) ? c.toFixed(3) : "") : c}
        </div>
      )))}
    </div>
  </div>
);

export default function App() {
  // ---- theme ----
  const [theme, setTheme] = useState<ThemeKey>("light");
  const C = THEMES[theme];

  // ---- arms: support 1..3 ----
  const [numArms, setNumArms] = useState<number>(2);
  const [l1, setL1] = useState(150);
  const [l2, setL2] = useState(120);
  const [l3, setL3] = useState(90);
  const [t1deg, setT1deg] = useState(30);
  const [t2deg, setT2deg] = useState(45);
  const [t3deg, setT3deg] = useState(20);

  // ---- matrix input & evaluation (debounced) ----
  const [rawCells, setRawCells] = useState<string[][]>(DEFAULT_MATRIX.map(r=>[...r]));
  const [msg, setMsg] = useState<string | null>(null);
  const [Tuser, setTuser] = useState<number[][] | null>(null);
  const [normalizeW, setNormalizeW] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const scope: Record<string, any> = {
          l1, l2, l3,
          θ1: toRad(t1deg), θ2: toRad(t2deg), θ3: toRad(t3deg), // radians
          θ1d: t1deg, θ2d: t2deg, θ3d: t3deg,                   // degree helpers
          pi: Math.PI,
          sind: (x:any)=>Math.sin(toRad(Number(x))),
          cosd: (x:any)=>Math.cos(toRad(Number(x))),
          tand: (x:any)=>Math.tan(toRad(Number(x))),
        };
        const evaluated = rawCells.map(row =>
          row.map(expr => {
            const v = math.evaluate(expr, scope);
            const n = typeof v === "number" ? v : (v?.valueOf?.() as number);
            if (typeof n !== "number" || !isFinite(n)) throw new Error("NaN");
            return n;
          })
        );
        setTuser(evaluated); setMsg(null);
      } catch (e:any) {
        setTuser(null); setMsg("Matrix parse/eval error: " + (e?.message ?? "Unknown"));
      }
    }, 120);
    return () => clearTimeout(id);
  }, [rawCells, l1, l2, l3, t1deg, t2deg, t3deg]);

  // ---- FK builder for 1..3 arms ----
  const anglesDeg = useMemo(() => [t1deg, t2deg, t3deg].slice(0, numArms), [t1deg, t2deg, t3deg, numArms]);
  const lengths   = useMemo(() => [l1, l2, l3].slice(0, numArms), [l1, l2, l3, numArms]);

  const Tfk = useMemo(() => {
    let T = matIdentity();
    for (let i=0;i<numArms;i++) {
      const R = Rot2D(toRad(anglesDeg[i]));
      const Tr = Tran2D(lengths[i], 0);
      // local-frame: rotate, then translate along that frame's x
      T = matMul(T, matMul(R, Tr));
    }
    return T;
  }, [numArms, anglesDeg, lengths]);

  const endFK = useMemo(() => {
    const p = matVec(Tfk,[0,0,1]);
    return { x:p[0], y:p[1] };
  }, [Tfk]);

  // joint chain (for drawing)
  const joints = useMemo(() => {
    const pts: {x:number,y:number}[] = [{x:0,y:0}];
    let angleSum = 0; let x=0, y=0;
    for (let i=0;i<numArms;i++) {
      angleSum += toRad(anglesDeg[i]);
      x += lengths[i] * Math.cos(angleSum);
      y += lengths[i] * Math.sin(angleSum);
      pts.push({x,y});
    }
    return pts; // length = numArms+1
  }, [numArms, anglesDeg, lengths]);

  const endUserRaw = useMemo(() => {
    if (!Tuser) return null;
    const p = matVec(Tuser,[0,0,1]);
    return { x: p[0], y: p[1], w: p[2] };
  }, [Tuser]);

  const endUser = useMemo(() => {
    if (!endUserRaw) return null;
    if (normalizeW && endUserRaw.w !== 0) {
      return { x: endUserRaw.x/endUserRaw.w, y: endUserRaw.y/endUserRaw.w };
    }
    return { x: endUserRaw.x, y: endUserRaw.y };
  }, [endUserRaw, normalizeW]);

  const err = endUser ? Math.hypot(endUser.x - endFK.x, endUser.y - endFK.y) : null;

  // ---- canvas (pan/zoom) ----
  const CANVAS_H = 420; const VB_W = 900, VB_H = 520;
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false); const last = useRef<{x:number,y:number}|null>(null);
  const baseScreen = { x: Math.round(VB_W*0.55), y: VB_H - 120 };

  const worldToScreen = (wx:number, wy:number) => ({
    x: baseScreen.x + pan.x + wx * scale,
    y: baseScreen.y + pan.y - wy * scale,
  });

  const onWheel: React.WheelEventHandler<SVGSVGElement> = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.max(0.3, Math.min(4, scale * factor));
    setScale(newScale);
  };
  const onMouseDown: React.MouseEventHandler<SVGSVGElement> = (e) => { dragging.current = true; last.current = { x: e.clientX, y: e.clientY }; };
  const onMouseMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    if (!dragging.current || !last.current) return;
    const dx = e.clientX - last.current.x; const dy = e.clientY - last.current.y;
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    last.current = { x: e.clientX, y: e.clientY };
  };
  const endDrag = () => { dragging.current = false; last.current = null; };

  // ---------- RENDER ----------
  return (
    <div style={{ fontFamily:"Inter, system-ui, Arial, sans-serif", background:C.bg, color:C.text, minHeight:"100vh", width:"100vw", overflowX:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"10px 14px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:20, fontWeight:800 }}>Interactive 2D RR Manipulator</div>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8, fontSize:13 }}>
            <label>Theme:</label>
            <select value={theme} onChange={(e)=>setTheme(e.target.value as ThemeKey)} style={{ padding:"4px 6px", border:`1px solid ${C.border}`, borderRadius:6, background:C.panel, color:C.text }}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="contrast">High-contrast</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ padding:"0 14px 14px", width:"100vw", boxSizing:"border-box" }}>
        <div style={{ display:"grid", gridTemplateColumns:"minmax(320px, 440px) 1fr", gap:12, alignItems:"start" }}>
          {/* LEFT */}
          <div style={{ display:"grid", gap:12, minWidth:0 }}>
            <Panel colors={C}>
              <div style={{ display:"grid", gap:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <label style={{ fontSize:12, color:C.subtext }}>Number of links:</label>
                  <select value={numArms} onChange={(e)=>setNumArms(Number(e.target.value))} style={{ padding:"4px 6px", border:`1px solid ${C.border}`, borderRadius:6, background:C.panel, color:C.text }}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                  <div style={{ marginLeft:8, fontSize:12, color:C.subtext }}>(angles shown in degrees)</div>
                </div>
                {/* controls per link */}
                <div>
                  <div style={{ fontSize:12, color:C.subtext, marginBottom:4 }}>Link 1 length (l1): <b>{l1.toFixed(0)}</b></div>
                  <input type="range" min={40} max={260} step={1} value={l1} onChange={(e)=>setL1(Number(e.target.value))} style={{ width:"100%" }} />
                </div>
                <div>
                  <div style={{ fontSize:12, color:C.subtext, marginBottom:4 }}>Joint 1 angle (θ1): <b>{t1deg.toFixed(1)}°</b></div>
                  <input type="range" min={-180} max={180} step={0.5} value={t1deg} onChange={(e)=>setT1deg(Number(e.target.value))} style={{ width:"100%" }} />
                </div>

                {numArms>=2 && <>
                  <div>
                    <div style={{ fontSize:12, color:C.subtext, marginBottom:4 }}>Link 2 length (l2): <b>{l2.toFixed(0)}</b></div>
                    <input type="range" min={40} max={260} step={1} value={l2} onChange={(e)=>setL2(Number(e.target.value))} style={{ width:"100%" }} />
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:C.subtext, marginBottom:4 }}>Joint 2 angle (θ2): <b>{t2deg.toFixed(1)}°</b></div>
                    <input type="range" min={-180} max={180} step={0.5} value={t2deg} onChange={(e)=>setT2deg(Number(e.target.value))} style={{ width:"100%" }} />
                  </div>
                </>}

                {numArms>=3 && <>
                  <div>
                    <div style={{ fontSize:12, color:C.subtext, marginBottom:4 }}>Link 3 length (l3): <b>{l3.toFixed(0)}</b></div>
                    <input type="range" min={40} max={260} step={1} value={l3} onChange={(e)=>setL3(Number(e.target.value))} style={{ width:"100%" }} />
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:C.subtext, marginBottom:4 }}>Joint 3 angle (θ3): <b>{t3deg.toFixed(1)}°</b></div>
                    <input type="range" min={-180} max={180} step={0.5} value={t3deg} onChange={(e)=>setT3deg(Number(e.target.value))} style={{ width:"100%" }} />
                  </div>
                </>}
              </div>
            </Panel>

            <Panel title="Matrix input (3×3 homogeneous)" colors={C}>
              <div style={{ fontSize:12, color:C.subtext, marginBottom:8 }}>
                Vars: <code>l1</code>, <code>l2</code>, <code>l3</code>, <code>θ1</code>, <code>θ2</code>, <code>θ3</code> (radians);
                <code> θ1d</code>, <code>θ2d</code>, <code>θ3d</code> (degrees). Radian funcs: <code>sin</code>, <code>cos</code>, <code>tan</code>. Degree helpers: <code>sind</code>, <code>cosd</code>, <code>tand</code>.
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:6 }}>
                {rawCells.map((row, i) =>
                  row.map((val, j) => (
                    <input
                      key={`${i}-${j}`}
                      value={val}
                      onChange={(e) =>
                        setRawCells(prev => prev.map((r, ri) => r.map((c, cj) => (ri===i && cj===j ? e.target.value : c))))
                      }
                      style={{
                        width:"100%", padding:"6px 8px", border:`1px solid ${C.border}`,
                        borderRadius:7, fontFamily:"ui-monospace, Menlo, monospace",
                        background: "#0b1220", color:"#e5f0ff", boxSizing:"border-box"
                      }}
                      spellCheck={false}
                    />
                  ))
                )}
              </div>
              {msg && <div style={{ color:C.warn, fontSize:12, marginTop:6 }}>{msg}</div>}
              <div style={{ marginTop:8, display:"flex", gap:8, alignItems:"center" }}>
                <label style={{ fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
                  <input type="checkbox" checked={normalizeW} onChange={(e)=>setNormalizeW(e.target.checked)} />
                  Normalize by w (homogeneous)
                </label>
              </div>
              <div style={{ fontSize:11, color:C.subtext, marginTop:6 }}>
                Robotics uses affine transforms with last row [0,0,1], so x,y don’t depend on w. Turn this on to divide by w.
              </div>
            </Panel>

            <Panel title="Values" colors={C}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, fontSize:12 }}>
                <div>
                  <div style={{ fontWeight:600, marginBottom:4 }}>FK end-effector</div>
                  <div>x = {endFK.x.toFixed(3)}</div>
                  <div>y = {endFK.y.toFixed(3)}</div>
                </div>
                <div>
                  <div style={{ fontWeight:600, marginBottom:4 }}>User matrix point</div>
                  {endUser ? (
                    <>
                      <div>x = {endUser.x.toFixed(3)}</div>
                      <div>y = {endUser.y.toFixed(3)}</div>
                      {endUserRaw && <div style={{ color:C.subtext }}>w = {endUserRaw.w.toFixed(3)}</div>}
                    </>
                  ) : (
                    <div style={{ color:C.warn }}>Invalid matrix</div>
                  )}
                </div>
              </div>
              <div style={{ fontSize:12, marginTop:8 }}>
                <div style={{ fontWeight:600, marginBottom:4 }}>Match error</div>
                {err != null ? (
                  <div style={{ color: err < 1 ? (theme==="dark"?"#34d399":"#059669") : C.warn }}>
                    ‖Δ‖ = {err.toFixed(3)} px {err < 1 ? "✓ Correct" : "← Adjust your matrix/angles"}
                  </div>
                ) : "—"}
              </div>
            </Panel>
          </div>

          {/* RIGHT: Canvas + static derivation */}
          <div style={{ display:"grid", gap:12, minWidth:0 }}>
            <Panel colors={C}>
              <div style={{ fontSize:12, color:C.subtext, marginBottom:6, display:"flex", gap:14, flexWrap:"wrap" }}>
                <span><span style={{ color:C.accent }}>●</span> FK end</span>
                <span><span style={{ color:C.userPoint }}>●</span> T·p</span>
                <span><span style={{ color:C.link1 }}>▬</span> link1</span>
                <span><span style={{ color:C.accent }}>▬</span> link2/3</span>
                <span>Wheel: zoom · Drag: pan</span>
              </div>

              <svg
                viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height={CANVAS_H}
                onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove}
                onMouseUp={endDrag} onMouseLeave={endDrag} style={{ cursor: "grab", userSelect:"none" }}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* axes */}
                <g strokeWidth={1}>
                  <line x1={baseScreen.x + pan.x} y1={0} x2={baseScreen.x + pan.x} y2={VB_H} stroke={C.axis} />
                  <line x1={0} y1={baseScreen.y + pan.y} x2={VB_W} y2={baseScreen.y + pan.y} stroke={C.axis} />
                </g>

                {/* base */}
                <circle cx={baseScreen.x + pan.x} cy={baseScreen.y + pan.y} r={6} fill={C.base} />
                <text x={baseScreen.x + pan.x + 6} y={baseScreen.y + pan.y - 8} fontSize={12} fill={C.subtext}>(0,0)</text>

                {/* links */}
                {joints.slice(0,-1).map((p,i) => {
                  const q = joints[i+1];
                  const s = worldToScreen(p.x,p.y); const e = worldToScreen(q.x,q.y);
                  const stroke = i===0 ? C.link1 : C.accent;
                  return (
                    <g key={i}>
                      <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={stroke} strokeWidth={8} strokeLinecap="round" />
                      <circle cx={e.x} cy={e.y} r={5} fill={C.base} />
                      <text x={s.x + 8} y={s.y - 10} fontSize={12} fill={C.text}>ℓ{i+1}={lengths[i].toFixed(0)}, θ{i+1}={anglesDeg[i].toFixed(1)}°</text>
                    </g>
                  );
                })}

                {/* FK end (bigger disk under) */}
                {(() => {
                  const end = joints[joints.length-1];
                  const p2 = worldToScreen(end.x, end.y);
                  return (
                    <>
                      <circle cx={p2.x} cy={p2.y} r={10} fill="none" stroke="#ffffff" strokeWidth={3} opacity={0.9} />
                      <circle cx={p2.x} cy={p2.y} r={7.5} fill={C.accent} stroke="#111827" strokeWidth={1.2} />
                      <text x={p2.x + 10} y={p2.y - 10} fontSize={12} fill={C.text}>FK</text>
                    </>
                  );
                })()}

                {/* user T·p (draw on top; if coincident, small disk centered → circle-in-circle) */}
                {endUser && (() => {
                  const end = joints[joints.length-1];
                  const pU  = worldToScreen(endUser.x, endUser.y);
                  const pFK = worldToScreen(end.x, end.y);
                  const d = Math.hypot(pU.x-pFK.x, pU.y-pFK.y);
                  const same = d < 0.5; // treat as identical visually
                  const px = same ? pFK.x : pU.x; const py = same ? pFK.y : pU.y;
                  return (
                    <>
                      {/* halo */}
                      <circle cx={px} cy={py} r={same?6:8} fill="none" stroke="#ffffff" strokeWidth={3} opacity={0.95} />
                      {/* small green */}
                      <circle cx={px} cy={py} r={same?3.8:5.5} fill={C.userPoint} stroke="#0b1320" strokeWidth={same?0.6:0} />
                      <text x={px + 10} y={py - 10} fontSize={12} fill={theme==="dark" ? "#86efac" : "#065f46"}>T·p</text>
                    </>
                  );
                })()}
              </svg>
            </Panel>

            <Panel colors={C} title="How T is built (right→left application)">
              <div style={{ color:C.subtext, fontSize:13, marginBottom:10 }}>
                We compose the base→end transform using local-frame steps:
                for each link <b>i</b>, we first rotate by <b>θᵢ</b> and then translate by <b>lᵢ</b> along that link's local x.
                For column vectors, the rightmost matrix acts first, so <b>T·p</b> applies <i>link 1 last</i>.
              </div>

              {/* SYMBOLIC CHAIN (depends on numArms) */}
              <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                {Array.from({length:numArms}).map((_,i)=> (
                  <React.Fragment key={i}>
                    <Matrix colors={C} label={`R(θ${i+1})`} A={[["cos(θ"+(i+1)+")","-sin(θ"+(i+1)+")","0"],["sin(θ"+(i+1)+")","cos(θ"+(i+1)+")","0"],["0","0","1"]]} compact />
                    <div style={{ fontSize:18 }}>·</div>
                    <Matrix colors={C} label={`Tr(l${i+1},0)`} A={[["1","0","l"+(i+1)],["0","1","0"],["0","0","1"]]} compact />
                    {i < numArms-1 && <div style={{ fontSize:18 }}>·</div>}
                  </React.Fragment>
                ))}
                <div style={{ fontSize:18 }}>·</div>
                <Matrix colors={C} label="p" A={[["0"],["0"],["1"]]} compact />
              </div>

              {/* NUMERIC CHAIN */}
              <div style={{ marginTop:12, display:"grid", gap:10 }}>
                {(() => {
                  const Rs = anglesDeg.map(a => Rot2D(toRad(a)));
                  const Trs = lengths.map(l => Tran2D(l,0));
                  // T = R1·Tr1·R2·Tr2·... in left-to-right notation
                  let T = matIdentity();
                  for (let i=0;i<numArms;i++) T = matMul(T, matMul(Rs[i], Trs[i]));
                  const p = [0,0,1];
                  const Tp = matVec(T, p);
                  return (
                    <>
                      <div style={{ color:C.subtext, fontSize:12 }}>With your current values:</div>
                      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                        {Array.from({length:numArms}).map((_,i)=> (
                          <React.Fragment key={"n"+i}>
                            <Matrix colors={C} label={`R(θ${i+1})`} A={Rs[i]} compact />
                            <div style={{ fontSize:18 }}>·</div>
                            <Matrix colors={C} label={`Tr(l${i+1},0)`} A={Trs[i]} compact />
                            {i < numArms-1 && <div style={{ fontSize:18 }}>·</div>}
                          </React.Fragment>
                        ))}
                        <div style={{ fontSize:18 }}>=</div>
                        <Matrix colors={C} label="T" A={T} compact />
                      </div>

                      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                        <Matrix colors={C} label="T" A={T} compact />
                        <div style={{ fontSize:18 }}>·</div>
                        <Matrix colors={C} label="p" A={[["0"],["0"],["1"]]} compact />
                        <div style={{ fontSize:18 }}>=</div>
                        <Matrix colors={C} label="T·p" A={[[Tp[0]],[Tp[1]],[Tp[2]]]} compact />
                      </div>
                    </>
                  );
                })()}
              </div>

              <div style={{ color:C.subtext, fontSize:12, marginTop:8 }}>
                Tip: Although people say "translate then rotate", with column vectors the math is <b>right→left</b>:
                the rightmost op happens first. Our chain <b>R·Tr</b> per link means the translation is in the
                <i>rotated (local) frame</i>, matching robot kinematics.
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
