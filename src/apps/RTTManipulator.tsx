import React, { useEffect, useMemo, useRef, useState } from "react";
import Plot from "react-plotly.js";

/** ---------------- THEME ---------------- */
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

function Panel({
  title,
  style,
  colors,
  children,
}: React.PropsWithChildren<{ title?: string; style?: React.CSSProperties; colors: any }>) {
  return (
    <div
      style={{
        background: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 12,
        boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
        ...style,
      }}
    >
      {title && (
        <div style={{ fontWeight: 800, marginBottom: 8, color: colors.text }}>{title}</div>
      )}
      {children}
    </div>
  );
}

/** ---------------- Problem definition ---------------- */
const l0 = 1.0;
const q1 = (t: number) => 4.0 * t - Math.PI / 2.0; // revolute about z
const q2 = (t: number) => 6.0 - 2.0 * t;           // prismatic along z
const q3 = (t: number) => 3.0 * t + 1.0;           // prismatic along local x'
const N = 601;
const tmin = 0, tmax = 3;

/** Small helper for numeric matrix pretty printing */
const fmt = (x: number) => (Number.isFinite(x) ? x.toFixed(3) : "");

/** ---------------- Main component ---------------- */
export default function RTTManipulator() {
  const [theme, setTheme] = useState<ThemeKey>("dark");
  const C = THEMES[theme];

  // ---- Precompute trajectory ----
  const { T, x, y, z, th, r, ranges } = useMemo(() => {
    const T = Array.from({ length: N }, (_, i) => tmin + (tmax - tmin) * (i / (N - 1)));
    const th = T.map(q1);
    const r = T.map(q3);
    const z = T.map((tt) => l0 + q2(tt));
    const x = T.map((_, i) => r[i] * Math.cos(th[i]));
    const y = T.map((_, i) => r[i] * Math.sin(th[i]));
    const pad = 1.0;
    const min = (a: number[]) => Math.min(...a);
    const max = (a: number[]) => Math.max(...a);
    return {
      T,
      x,
      y,
      z,
      th,
      r,
      ranges: {
        x: [min(x) - pad, max(x) + pad],
        y: [min(y) - pad, max(y) + pad],
        z: [min(z) - pad, max(z) + pad],
      },
    };
  }, []);

  // ---- Animation state ----
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafId = useRef<number | null>(null);
  const lastTs = useRef<number>(0);

  useEffect(() => {
    if (!playing) return;
    const step = (ts: number) => {
      if (ts - lastTs.current > 40) {
        setI((p) => (p + 1) % N);
        lastTs.current = ts;
      }
      rafId.current = requestAnimationFrame(step);
    };
    rafId.current = requestAnimationFrame(step);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [playing]);

  // ---- 3D manipulator objects for current frame ----
  const build3D = () => {
    const theta = th[i],
      R = r[i],
      Z = z[i];
    const Pbase = [0, 0, l0];
    const Pw = [0, 0, Z];
    const Pend = [R * Math.cos(theta), R * Math.sin(theta), Z];

    const base = {
      type: "scatter3d",
      mode: "lines",
      x: [0, 0],
      y: [0, 0],
      z: [0, l0],
      line: { width: 8 },
    } as any;

    const q2line = {
      type: "scatter3d",
      mode: "lines",
      x: [Pbase[0], Pw[0]],
      y: [Pbase[1], Pw[1]],
      z: [Pbase[2], Pw[2]],
      line: { width: 8 },
    } as any;

    const q3line = {
      type: "scatter3d",
      mode: "lines",
      x: [Pw[0], Pend[0]],
      y: [Pw[1], Pend[1]],
      z: [Pw[2], Pend[2]],
      line: { width: 8 },
    } as any;

    const trail = {
      type: "scatter3d",
      mode: "lines",
      x: x.slice(0, i + 1),
      y: y.slice(0, i + 1),
      z: z.slice(0, i + 1),
      line: { width: 3 },
    } as any;

    // heading (q1) arc + direction at base
    const headLen = 0.08 * Math.min(ranges.x[1] - ranges.x[0], ranges.y[1] - ranges.y[0]);
    const H = [headLen * Math.cos(theta), headLen * Math.sin(theta), 0];
    const heading = {
      type: "scatter3d",
      mode: "lines",
      x: [0, H[0]],
      y: [0, H[1]],
      z: [0, 0],
      line: { width: 3 },
    } as any;
    const phi = Array.from({ length: 60 }, (_, k) => (k * theta) / 59);
    const rrArc = 1.2 * headLen;
    const arc = {
      type: "scatter3d",
      mode: "lines",
      x: phi.map((p) => rrArc * Math.cos(p)),
      y: phi.map((p) => rrArc * Math.sin(p)),
      z: phi.map(() => 0),
      line: { width: 2 },
    } as any;

    return [base, q2line, q3line, trail, heading, arc];
  };

  const [camera, setCamera] = useState<any>(null);

  const layout3D = {
    scene: {
      xaxis: { title: { text: "x" }, range: ranges.x },
      yaxis: { title: { text: "y" }, range: ranges.y },
      zaxis: { title: { text: "z" }, range: ranges.z },
      aspectmode: "cube" as const,
      uirevision: "scene-3d",      // do not reset scene on data changes
      camera: camera || undefined, // restore last camera
      bgcolor: C.panel,
    },
    margin: { l: 0, r: 0, t: 10, b: 0 },
    paper_bgcolor: C.panel,
    plot_bgcolor: C.panel,
    showlegend: false,
  };

  const xyTraces = [
    { type: "scatter", mode: "lines", x, y, line: { width: 2 } } as any,
    { type: "scatter", mode: "markers", x: [x[i]], y: [y[i]], marker: { size: 8 } } as any,
  ];
  const xzTraces = [
    { type: "scatter", mode: "lines", x, y: z, line: { width: 2 } } as any,
    { type: "scatter", mode: "markers", x: [x[i]], y: [z[i]], marker: { size: 8 } } as any,
  ];
  const xyLayout = {
    xaxis: { title: { text: "x" }, range: ranges.x, constrain: "domain" },
    yaxis: { title: { text: "y" }, range: ranges.y, scaleanchor: "x" as const, scaleratio: 1, constrain: "domain" },
    margin: { l: 40, r: 10, t: 10, b: 40 },
    paper_bgcolor: C.panel,
    plot_bgcolor: C.panel,
    showlegend: false,
    uirevision: "xy-locked",
  };
  const xzLayout = {
    xaxis: { title: { text: "x" }, range: ranges.x },
    yaxis: { title: { text: "z" }, range: ranges.z },
    margin: { l: 40, r: 10, t: 10, b: 40 },
    paper_bgcolor: C.panel,
    plot_bgcolor: C.panel,
    showlegend: false,
  };

  // ---- CSV link (client-side) ----
  const csvHref = useMemo(() => {
    const header = "t,x,y,z\n";
    const body = T.map((tt, k) => `${tt},${x[k]},${y[k]},${z[k]}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    return URL.createObjectURL(blob);
  }, [T, x, y, z]);

  const t = T[i];
  const q1deg = (q1(t) * 180) / Math.PI;

  // ---- DH math panel values ----
  const DH = [
    { i: 0, theta: "0", d: "l₀", a: "0", alpha: "0" },
    { i: 1, theta: "q₁", d: "0", a: "0", alpha: "0" },
    { i: 2, theta: "π/2", d: "q₂", a: "0", alpha: "π/2" },
    { i: 3, theta: "0", d: "q₃", a: "0", alpha: "0" },
  ];

  const numericT = useMemo(() => {
    const c = Math.cos(q1(t));
    const s = Math.sin(q1(t));
    const r = q3(t);
    const zz = l0 + q2(t);
    // Closed-form T for RTT with our simplification
    return [
      [c, -s, 0, r * c],
      [s,  c, 0, r * s],
      [0,  0, 1, zz],
      [0,  0, 0, 1],
    ];
  }, [t]);

  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, Arial, sans-serif",
        background: C.bg,
        color: C.text,
        minHeight: "100vh",
        width: "100vw",
        overflowX: "hidden",
      }}
    >
      {/* Header (unified) */}
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>RTT Manipulator – Trajectory & DH Math</div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <label>Theme:</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeKey)}
            style={{
              padding: "4px 6px",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              background: C.panel,
              color: C.text,
            }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="contrast">High-contrast</option>
          </select>
        </div>
      </div>

      {/* Main grid – matches your other app structure */}
      <div style={{ padding: "0 14px 14px", width: "100vw", boxSizing: "border-box" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(360px, 560px) 1fr",
            gap: 12,
            alignItems: "start",
          }}
        >
          {/* LEFT column: controls + DH math */}
          <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
            <Panel colors={C} title="Scenario">
              <div style={{ color: C.subtext, fontSize: 13, marginBottom: 10 }}>
                l₀ = 1, q₁(t) = 4t − π/2, q₂(t) = 6 − 2t, q₃(t) = 3t + 1, t ∈ [0, 3]
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => setPlaying((p) => !p)}
                  style={{
                    border: `1px solid ${C.border}`,
                    background: C.panel,
                    color: C.text,
                    borderRadius: 10,
                    padding: "8px 12px",
                    cursor: "pointer",
                  }}
                >
                  {playing ? "⏸ Pause" : "▶ Play"}
                </button>
                <span
                  style={{
                    padding: "6px 10px",
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    fontFamily: "ui-monospace",
                  }}
                >
                  t = {t.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={N - 1}
                step={1}
                value={i}
                onChange={(e) => setI(parseInt(e.target.value, 10))}
                style={{ width: "100%", marginTop: 10 }}
              />
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                  fontFamily: "ui-monospace",
                }}
              >
                <span>q₁ = {q1deg.toFixed(1)}°</span>
                <span>q₂ = {(z[i] - l0).toFixed(2)}</span>
                <span>q₃ = {r[i].toFixed(2)}</span>
                <a
                  href={csvHref}
                  download="rtt_trajectory.csv"
                  style={{
                    marginLeft: "auto",
                    border: `1px solid ${C.border}`,
                    background: C.panel,
                    borderRadius: 10,
                    padding: "6px 10px",
                    textDecoration: "none",
                    color: C.text,
                  }}
                >
                  Download CSV
                </a>
                <a
                  href="/WebPage/apps/rtt/rtt_trajectory.gif"
                  style={{
                    marginLeft: "auto",
                    border: `1px solid ${C.border}`,
                    background: C.panel,
                    borderRadius: 10,
                    padding: "6px 10px",
                    textDecoration: "none",
                    color: C.text,
                  }}
                >
                  Download GIF
                </a>
              </div>
            </Panel>

            {/* DH Table + math */}
            <Panel colors={C} title="DH parameters → Transform T(t)">
              <div style={{ color: C.subtext, fontSize: 13, marginBottom: 8 }}>
                Using standard DH: <i>Rz(θ) · Tz(d) · Tx(a) · Rx(α)</i> per row (all a=0 here).
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    fontSize: 13,
                    minWidth: 420,
                  }}
                >
                  <thead>
                    <tr>
                      {["i", "θᵢ", "dᵢ", "aᵢ", "αᵢ"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            borderBottom: `1px solid ${C.border}`,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DH.map((row) => (
                      <tr key={row.i}>
                        <td style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{row.i}</td>
                        <td style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{row.theta}</td>
                        <td style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{row.d}</td>
                        <td style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{row.a}</td>
                        <td style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{row.alpha}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 10, fontSize: 13 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Closed form:</div>
                <code style={{ display: "block", whiteSpace: "pre", lineHeight: 1.5 }}>
{`T(t) = [
  [ cos(q1), -sin(q1), 0,  q3*cos(q1) ],
  [ sin(q1),  cos(q1), 0,  q3*sin(q1) ],
  [    0   ,     0   , 1,  l0 + q2    ],
  [    0   ,     0   , 0,      1      ]
]`}
                </code>
                <div style={{ color: C.subtext, marginTop: 6 }}>
                  ⇒ p(t) = T(t)·[0,0,0,1]ᵀ = ( x, y, z ) =
                  ( q₃ cos q₁, q₃ sin q₁, l₀ + q₂ ).
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 13 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  Numeric T at current t = {t.toFixed(2)}
                </div>
                <table
                  style={{
                    borderCollapse: "collapse",
                    fontFamily: "ui-monospace, Menlo, monospace",
                  }}
                >
                  <tbody>
                    {numericT.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((c, ci) => (
                          <td
                            key={ci}
                            style={{
                              padding: "4px 8px",
                              border: `1px solid ${C.border}`,
                              textAlign: "right",
                              minWidth: 70,
                            }}
                          >
                            {fmt(c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

            {/* RIGHT column: 3D (left) + XY/XZ (right) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(420px, 1fr) 1fr",
                gridTemplateRows: "1fr 1fr",
                gap: 12,
                alignItems: "stretch",
                minWidth: 0,
                height: "clamp(420px, calc(100dvh - 220px), 820px)",
              }}
            >
              <Panel colors={C} title="3D projection" style={{ gridColumn: "1", gridRow: "1 / span 2", height: "100%", minHeight: 0, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "100%" }}>
                  <Plot
                    data={build3D()}
                    layout={{ ...layout3D, autosize: true, height: undefined, margin: { l: 0, r: 0, t: 10, b: 0 }, scene: { ...layout3D.scene, aspectmode: "cube" } }}
                    useResizeHandler
                    style={{ width: "100%", height: "100%" }}
                    config={{ displayModeBar: false }}
                    onRelayout={(ev: any) => {
                        if (ev["scene.camera"]) setCamera(ev["scene.camera"]); // keep user camera
                      }}
                  />
                </div>
              </Panel>

              <Panel colors={C} title="x–y projection" style={{ gridColumn: "2", gridRow: "1", minHeight: 0, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "100%" }}>
                  <Plot
                    data={xyTraces}
                    layout={{ ...xyLayout, autosize: true, height: undefined, margin: { l: 40, r: 10, t: 10, b: 40 } }}
                    useResizeHandler
                    style={{ width: "100%", height: "100%" }}
                    config={{ displayModeBar: false }}
                  />
                </div>
              </Panel>

              <Panel colors={C} title="x–z projection" style={{ gridColumn: "2", gridRow: "2", minHeight: 0, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "100%" }}>
                  <Plot
                    data={xzTraces}
                    layout={{ ...xzLayout, autosize: true, height: undefined, margin: { l: 40, r: 10, t: 10, b: 40 } }}
                    useResizeHandler
                    style={{ width: "100%", height: "100%" }}
                    config={{ displayModeBar: false }}
                  />
                </div>
              </Panel>
            </div>
        </div>
      </div>
    </div>
  );
}
