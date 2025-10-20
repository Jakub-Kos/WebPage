import { useEffect, useMemo, useRef, useState } from "react";
import Plot from "react-plotly.js";

// RTT manipulator trajectory (matches your Python)
const l0 = 1.0;
const q1 = (t: number) => 4.0 * t - Math.PI / 2.0; // revolute about z
const q2 = (t: number) => 6.0 - 2.0 * t;           // prismatic along z
const q3 = (t: number) => 3.0 * t + 1.0;           // prismatic along local x'

const N = 601;              // samples
const tmin = 0.0, tmax = 3.0;

export default function RTTManipulator() {
  // ---- Precompute trajectory ----
  const { T, x, y, z, theta, r, ranges } = useMemo(() => {
    const T = Array.from({ length: N }, (_, i) => tmin + (tmax - tmin) * i / (N - 1));
    const theta = T.map(q1);
    const r = T.map(q3);
    const z = T.map(tt => l0 + q2(tt));
    const x = T.map((_, i) => r[i] * Math.cos(theta[i]));
    const y = T.map((_, i) => r[i] * Math.sin(theta[i]));
    const pad = 1.0;
    const min = (a: number[]) => Math.min(...a);
    const max = (a: number[]) => Math.max(...a);
    return {
      T, x, y, z, theta, r,
      ranges: {
        x: [min(x) - pad, max(x) + pad],
        y: [min(y) - pad, max(y) + pad],
        z: [min(z) - pad, max(z) + pad],
      }
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
      if (ts - lastTs.current > 40) { // ~25 fps
        setI(prev => (prev + 1) % N);
        lastTs.current = ts;
      }
      rafId.current = requestAnimationFrame(step);
    };
    rafId.current = requestAnimationFrame(step);
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, [playing]);

  // ---- Build manipulator traces for current frame ----
  const build3D = () => {
    const th = theta[i], rr = r[i], zz = z[i];
    const Pw = [0, 0, zz];
    const P = [rr * Math.cos(th), rr * Math.sin(th), zz];

    // base up to z=l0
    const base = { type: "scatter3d", mode: "lines", x: [0, 0], y: [0, 0], z: [0, l0], line: { width: 8 } } as any;
    // q2 vertical
    const q2line = { type: "scatter3d", mode: "lines", x: [0, 0], y: [0, 0], z: [l0, zz], line: { width: 8 } } as any;
    // q3 radial
    const q3line = { type: "scatter3d", mode: "lines", x: [Pw[0], P[0]], y: [Pw[1], P[1]], z: [Pw[2], P[2]], line: { width: 8 } } as any;
    // trail
    const trail = { type: "scatter3d", mode: "lines", x: x.slice(0, i + 1), y: y.slice(0, i + 1), z: z.slice(0, i + 1), line: { width: 3 } } as any;
    // heading at base in xy
    const headLen = 0.08 * Math.min(ranges.x[1] - ranges.x[0], ranges.y[1] - ranges.y[0]);
    const H = [headLen * Math.cos(th), headLen * Math.sin(th), 0];
    const heading = { type: "scatter3d", mode: "lines", x: [0, H[0]], y: [0, H[1]], z: [0, 0], line: { width: 3 } } as any;
    // q1 arc 0..th at base
    const phi = Array.from({ length: 60 }, (_, k) => k * (th) / 59);
    const rrArc = 1.2 * headLen;
    const arc = { type: "scatter3d", mode: "lines", x: phi.map(p => rrArc * Math.cos(p)), y: phi.map(p => rrArc * Math.sin(p)), z: phi.map(() => 0), line: { width: 2 } } as any;

    return [base, q2line, q3line, trail, heading, arc];
  };

  const layout3D = {
    scene: {
      xaxis: { title: { text: "x" }, range: ranges.x },
      yaxis: { title: { text: "y" }, range: ranges.y },
      zaxis: { title: { text: "z" }, range: ranges.z },
      aspectmode: "cube" as const,
    },
    margin: { l: 0, r: 0, t: 10, b: 0 },
    paper_bgcolor: "#0b0e12",
    plot_bgcolor: "#0b0e12",
    showlegend: false,
  };

  const xyTraces = [
    { type: "scatter", mode: "lines", x, y, line: { width: 2 } } as any,
    { type: "scatter", mode: "markers", x: [x[i]], y: [y[i]], marker: { size: 8 } } as any,
  ];
  const xyLayout = {
    xaxis: { title: { text: "x" }, range: ranges.x },
    yaxis: { title: { text: "y" }, range: ranges.y, scaleanchor: "x", scaleratio: 1 },
    margin: { l: 40, r: 10, t: 10, b: 40 },
    paper_bgcolor: "#0b0e12",
    plot_bgcolor: "#0b0e12",
    showlegend: false,
  };

  const xzTraces = [
    { type: "scatter", mode: "lines", x, y: z, line: { width: 2 } } as any,
    { type: "scatter", mode: "markers", x: [x[i]], y: [z[i]], marker: { size: 8 } } as any,
  ];
  const xzLayout = {
    xaxis: { title: { text: "x" }, range: ranges.x },
    yaxis: { title: { text: "z" }, range: ranges.z },
    margin: { l: 40, r: 10, t: 10, b: 40 },
    paper_bgcolor: "#0b0e12",
    plot_bgcolor: "#0b0e12",
    showlegend: false,
  };


  // CSV (client-side)
  const csvHref = useMemo(() => {
    const header = "t,x,y,z\n";
    const body = T.map((tt, k) => `${tt},${x[k]},${y[k]},${z[k]}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    return URL.createObjectURL(blob);
  }, [T, x, y, z]);

  const t = T[i];
  const q1deg = (q1(t) * 180 / Math.PI).toFixed(1);

  return (
    <div style={{ padding: 16, color: "#e6ebf0", background: "#0b0e12", minHeight: "100vh" }}>
      <h1 style={{ margin: "0 0 12px" }}>RTT Manipulator – 3D & Side Views</h1>
      <p style={{ margin: "0 0 16px", opacity: 0.85 }}>
        l0=1, q1(t)=4t−π/2, q2(t)=6−2t, q3(t)=3t+1, t∈[0,3]
      </p>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1.3fr 0.9fr" }}>
        <div style={{ background: "#121821", border: "1px solid #1f2a37", borderRadius: 16, padding: 12 }}>
          <Plot
            data={build3D()}
            layout={{ ...layout3D, height: 520 }}
            config={{ displayModeBar: false }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="btn"
              onClick={() => setPlaying(p => !p)}
              style={{ border: "1px solid #334155", background: "#152238", borderRadius: 10, padding: "8px 12px", cursor: "pointer" }}
            >
              {playing ? "⏸ Pause" : "▶ Play"}
            </button>
            <span style={{ padding: "6px 10px", border: "1px solid #243447", borderRadius: 14, fontFamily: "ui-monospace" }}>
              t = {t.toFixed(2)}
            </span>
            <input
              type="range"
              min={0}
              max={N - 1}
              step={1}
              value={i}
              onChange={(e) => setI(parseInt(e.target.value, 10))}
              style={{ width: "min(520px,100%)" }}
            />
            <span style={{ padding: "6px 10px", border: "1px solid #243447", borderRadius: 14, fontFamily: "ui-monospace" }}>
              q1={q1deg}° · q2={(z[i] - l0).toFixed(2)} · q3={(r[i]).toFixed(2)}
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "#121821", border: "1px solid #1f2a37", borderRadius: 16, padding: 12 }}>
            <Plot data={xyTraces} layout={{ ...xyLayout, height: 240 }} config={{ displayModeBar: false }} />
          </div>
          <div style={{ background: "#121821", border: "1px solid #1f2a37", borderRadius: 16, padding: 12 }}>
            <Plot data={xzTraces} layout={{ ...xzLayout, height: 240 }} config={{ displayModeBar: false }} />
          </div>
          <div style={{ background: "#121821", border: "1px solid #1f2a37", borderRadius: 16, padding: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href={csvHref} download="rtt_trajectory.csv" style={{ border: "1px solid #334155", background: "#152238", borderRadius: 10, padding: "8px 12px" }}>
                Download CSV
              </a>
              {/* If you export a GIF from Python, drop it in /public/apps/rtt/rtt_trajectory.gif */}
              <a href="/apps/rtt/rtt_trajectory.gif" style={{ border: "1px solid #334155", background: "#152238", borderRadius: 10, padding: "8px 12px" }}>
                RTT GIF (if present)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
