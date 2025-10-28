import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Eraser, Upload, Loader2, PaintBucket, Check, AlertCircle, Minus, RefreshCw,
  Check as CheckIcon,
  CircleDot, Sun, Moon
} from "lucide-react";

// ---------- Fallback list (Used ONLY if fetch fails) ----------
const FALLBACK = `cigar
rebut
sissy
humph
awake
blush
focal
evade
serve
heath
dwarf
model
karma
stink
grade
quiet
bench
abate
feign
major
death
fresh
crust
stool
colon
marry
react
crate
trace
track
crane
slate
least
alert
later
route
actor
adore
canon
charm
cheap
chief
child
choir
clone
crisp
crown
dodge
fence
flame
ghost
glove
grand
grape
green
heart
honey
laugh
light
liver
lunar
lunch
night
noble
nurse
ocean
piano
plant
point
print
proud
raise
reach
ready
right
river
robot
round
shade
shape
sharp
shine
short
smile
snake
spice
spine
spite
sport
stack
stair
stamp
stand
start
state
steam
steel
stick
stone
story
straw
study
sugar
sweet
swing
table
taste
teach
thank
these
thing
three
tiger
title
today
token
total
touch
trace
train
truth
tutor
vivid
voice
watch
wheat
where
which
white
whole
woman
world
worry
young
youth
zebra`;

// --- 1. Core Types and Logic ---

type ColorKey = 0 | 1 | 2 | 3; // 0: empty, 1: gray, 2: yellow, 3: green

type ThemeMode = 'dark' | 'light';

const COLORS_DARK = {
  0: { name: "empty",  bg: "bg-neutral-900", border: "border-neutral-700", text: "text-neutral-500", symbol: null },
  1: { name: "gray",   bg: "bg-[#787c7e]",  border: "border-[#787c7e]",   text: "text-white", symbol: null },
  2: { name: "yellow", bg: "bg-[#c9b458]",  border: "border-[#c9b458]",   text: "text-black", symbol: <CircleDot className="size-6" /> },
  3: { name: "green",  bg: "bg-[#6aaa64]",  border: "border-[#6aaa64]",   text: "text-white", symbol: <CheckIcon className="size-6" /> },
} as const;

const COLORS_LIGHT = {
  0: { name: "empty",  bg: "bg-white", border: "border-neutral-300", text: "text-neutral-400", symbol: null },
  1: { name: "gray",   bg: "bg-[#787c7e]",  border: "border-[#787c7e]",   text: "text-white", symbol: null },
  2: { name: "yellow", bg: "bg-[#c9b458]",  border: "border-[#c9b458]",   text: "text-black", symbol: <CircleDot className="size-6" /> },
  3: { name: "green",  bg: "bg-[#6aaa64]",  border: "border-[#6aaa64]",   text: "text-white", symbol: <CheckIcon className="size-6" /> },
} as const;


function normalizeWord(w: string) { return (w || "").toLowerCase().replace(/[^a-z]/g, ""); }
function isFiveLetter(w: string) { return /^[a-z]{5}$/.test(w); }
function classNames(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }
function tn(theme: ThemeMode, dark: string, light: string) { return theme === 'dark' ? dark : light; }

function scoreWordle(guess: string, solution: string): number[] {
  guess = normalizeWord(guess); solution = normalizeWord(solution);
  const res = new Array(5).fill(0);
  const solCounts: Record<string, number> = {};
  for (let i = 0; i < 5; i++) {
    if (guess[i] === solution[i]) res[i] = 3;
    else solCounts[solution[i]] = (solCounts[solution[i]] || 0) + 1;
  }
  for (let i = 0; i < 5; i++) {
    if (res[i] === 3) continue;
    const g = guess[i];
    if (solCounts[g] > 0) { res[i] = 2; solCounts[g]--; } else res[i] = 1;
  }
  return res;
}

// --- UPDATED useWordlist Hook ---
function useWordlist() {
  const [words, setWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Loading word list...");

  const loadWords = async (file?: File) => {
    setLoading(true);
    setStatus(file ? `Loading from ${file.name}...` : "Loading built-in list...");
    try {
      let txt: string;
      if (file) {
        // 1. Load from uploaded file
        txt = await file.text();
      } else {
        // 2. Load from public/wordlists/wordle.txt (served under BASE_URL)
        // In dev, BASE_URL is '/', in production (GitHub Pages) it's '/WebPage/' from vite.config.ts.
        // Place your file at: web/public/wordlists/wordle.txt
        const base = (import.meta as any).env?.BASE_URL ?? '/';
        const url = `${base.replace(/\/$/, '')}/wordlists/wordle.txt`;
        console.debug('[WordlePattern] Fetching word list from:', url);
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status} (File not found at ${url})`);
        }
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('text/html')) {
          // Likely got index.html due to wrong path/base; abort to fallback.
          throw new Error(`Got HTML instead of a word list from ${res.url || url}. Ensure file exists under public/wordlists/wordle.txt and URL resolves to a .txt file.`);
        }
        txt = await res.text();
      }

      const parsed = txt.split(/\s+/).map(normalizeWord).filter(isFiveLetter);
      const uniq = Array.from(new Set(parsed));
      if (uniq.length === 0) throw new Error("No valid 5-letter words found in file.");

      setWords(uniq);
      setError("");
      setStatus(file ? `Loaded ${uniq.length} words from ${file.name}` : `Loaded ${uniq.length} words (built-in)`);

    } catch (e: any) {
      // 3. Fallback to hardcoded list on any error
      const fallback = FALLBACK.split(/\s+/).map(normalizeWord).filter(isFiveLetter);
      setWords(fallback);
      setError(`Error: ${e.message}. Using fallback list.`);
      setStatus(`Using fallback list (${fallback.length})`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWords(); // Load built-in list on mount
  }, []);

  return { words, loading, error, status, loadFromFile: loadWords, reload: () => loadWords() };
}

// --- 2. Re-usable UI Components (Styled with plain Tailwind) ---

type ButtonVariant = 'default' | 'secondary' | 'outline';
type ButtonSize = 'default' | 'sm';

const buttonVariantClasses = (theme: ThemeMode) => ({
  default: "bg-green-600 text-white hover:bg-green-700",
  secondary: tn(theme, "bg-neutral-700 text-neutral-100 hover:bg-neutral-600", "bg-neutral-200 text-neutral-900 hover:bg-neutral-300"),
  outline: tn(theme, "border border-neutral-700 bg-transparent hover:bg-neutral-800", "border border-neutral-300 bg-transparent hover:bg-neutral-100"),
} as const);

const BUTTON_SIZES = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
} as const;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  theme: ThemeMode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, className, theme, variant = "default", size = "default", ...props }) => {
  const base = "inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:pointer-events-none disabled:opacity-50";
  const variants = buttonVariantClasses(theme);
  return (
    <button className={classNames(base, variants[variant], BUTTON_SIZES[size], className)} {...props}>
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  theme: ThemeMode;
  className?: string;
}

const Input: React.FC<InputProps> = ({ className, theme, ...props }) => (
  <input
    className={classNames(
      tn(theme, "flex h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100", "flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"),
      tn(theme, "placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-600", "placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300"),
      className
    )}
    {...props}
  />
);

type BadgeVariant = 'secondary' | 'destructive' | 'info';
const badgeVariantClasses = (theme: ThemeMode) => ({
  secondary: tn(theme, "border-transparent bg-neutral-700 text-neutral-200", "border-transparent bg-neutral-200 text-neutral-800"),
  destructive: tn(theme, "border-transparent bg-red-800 text-red-100", "border-transparent bg-red-100 text-red-800"),
  info: tn(theme, "border-transparent bg-green-800 text-green-100", "border-transparent bg-green-100 text-green-800"),
} as const);

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  theme: ThemeMode;
  variant?: BadgeVariant;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, className, theme, variant = "secondary", ...props }) => {
  const variants = badgeVariantClasses(theme);
  return (
    <div
      className={classNames(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// --- 3. App-Specific Components ---

function GridEditor({
  grid, setGrid, activeColor, colors
}: { grid: number[][]; setGrid: React.Dispatch<React.SetStateAction<number[][]>>; activeColor: ColorKey; colors: typeof COLORS_DARK }) {
  const rows = grid.length, cols = grid[0].length;
  const dragging = useRef(false);

  const paint = useCallback((r: number, c: number) => {
    setGrid(prev => {
      const next = prev.map(x => x.slice());
      next[r][c] = activeColor;
      return next;
    });
  }, [activeColor, setGrid]);

  useEffect(() => {
    const up = () => (dragging.current = false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  return (
    <div
      className="flex flex-col gap-2 items-center p-4"
      onMouseLeave={() => (dragging.current = false)}
    >
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-2">
          {Array.from({ length: cols }).map((__, c) => {
            const v = grid[r][c] as ColorKey;
            const col = colors[v];
            return (
              <div
                key={`${r}-${c}`}
                onMouseDown={() => { dragging.current = true; paint(r, c); }}
                onMouseEnter={() => { if (dragging.current) paint(r, c); }}
                onMouseUp={() => (dragging.current = false)}
                className={classNames(
                  "w-14 h-14 md:w-16 md:h-16 rounded-md shadow-sm cursor-crosshair",
                  "flex items-center justify-center font-semibold text-2xl transition-colors",
                  "border-2",
                  col.bg, col.border, col.text
                )}
                title={`Row ${r + 1}, Col ${c + 1}: ${col.name}`}
              >
                {col.symbol}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ColorSwatch({ value, selected, onClick, colors, theme }: { value: ColorKey; selected: boolean; onClick: () => void; colors: typeof COLORS_DARK; theme: ThemeMode }) {
  const c = colors[value];
  return (
    <button
      onClick={onClick}
      className={classNames(
        "rounded-lg px-3 py-2 text-sm font-semibold border-2 flex items-center gap-2",
        "transition-all",
        c.bg, c.border, c.text,
        selected ? tn(theme, "ring-2 ring-neutral-100 shadow-md scale-105", "ring-2 ring-neutral-300 shadow-md scale-105") : "opacity-70 hover:opacity-100"
      )}
      title={c.name}
    >
      <span className={classNames("inline-block w-3 h-3 rounded-full border", c.bg, c.border)} />
      {c.name}
    </button>
  );
}

// --- 4. Main App Component (as a self-contained page) ---

export default function WordlePattern() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('wordle-theme') as ThemeMode | null) : null;
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });
  useEffect(() => { try { localStorage.setItem('wordle-theme', theme); } catch {} }, [theme]);
  const colors = theme === 'dark' ? COLORS_DARK : COLORS_LIGHT;

  const [solution, setSolution] = useState("");
  const [grid, setGrid] = useState(Array.from({ length: 6 }, () => Array.from({ length: 5 }, () => 0)));
  const [activeColor, setActiveColor] = useState<ColorKey>(3);
  const [activeTab, setActiveTab] = useState("built-in");

  const { words, loading, error, status, loadFromFile, reload } = useWordlist();

  const patterns = useMemo(() => grid.map(r => (r.every(v => v === 0) ? null : r)), [grid]);
  const anyRowFilled = useMemo(() => patterns.some(p => p !== null), [patterns]);
  const solutionValid = useMemo(() => isFiveLetter(solution), [solution]);
  const canCompute = solutionValid && words.length > 0 && anyRowFilled;

  const [results, setResults] = useState<{ candidates: string[][]; picks: string[] }>({ candidates: [], picks: [] });
  const [impossibleRows, setImpossibleRows] = useState<number[]>([]);
  const [working, setWorking] = useState(false);

  const resetResults = () => {
    setResults({ candidates: [], picks: [] });
    setImpossibleRows([]);
  };

  const resetAll = () => {
    setGrid(Array.from({ length: 6 }, () => Array.from({ length: 5 }, () => 0)));
    setSolution("");
    resetResults();
  };

  const loadDemoPattern = () => {
    setSolution("cigar");
    setGrid([
      [2, 2, 1, 2, 2], // gamic
      [2, 2, 1, 2, 2], // gamic
      [1, 1, 2, 1, 1], // words
      [1, 1, 2, 1, 1], // three
      [3, 1, 1, 1, 3], // color
      [3, 3, 3, 3, 3], // cigar
      ...Array(0).fill(Array(5).fill(0)),
    ].map(r => r.slice()));
    resetResults();
  };

  const compute = () => {
    if (!canCompute) return;
    setWorking(true);
    resetResults();

    setTimeout(() => {
      try {
        const S = normalizeWord(solution);
        const candidates = patterns.map((pat) => {
          if (!pat) return [] as string[];
          return words.filter(w => {
            const s = scoreWordle(w, S);
            return s.every((score, i) => score === pat[i]);
          });
        });

        const imps = candidates.reduce((acc: number[], arr, i) => {
          if (patterns[i] && arr.length === 0) acc.push(i);
          return acc;
        }, []);

        const picks = candidates.map(a => (a.length ? a[0] : ""));
        setResults({ candidates, picks });
        setImpossibleRows(imps);
      } finally {
        setWorking(false);
      }
    }, 10);
  };

  const sequence = useMemo(() =>
    results.picks.map((w, i) => (patterns[i] ? (w || "—") : null)).filter(Boolean).join(" · ")
  , [results.picks, patterns]);

  // This component provides its own page structure
  return (
    <div className={classNames("min-h-screen w-full", tn(theme, "bg-neutral-950 text-neutral-100", "bg-neutral-50 text-neutral-900"))}>
      <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">

        {/* Header (Top Bar) */}
        <header className={classNames("flex items-center justify-between py-4 border-b", tn(theme, "border-neutral-800", "border-neutral-200"))}>
          <h1 className="text-3xl font-extrabold tracking-tight">Wordle Pattern Reverse-Engineer</h1>
          <div className="flex gap-2 items-center">
            <Button theme={theme} variant="outline" size="sm" onClick={loadDemoPattern}>
              Demo Pattern
            </Button>
            <Button theme={theme} variant="secondary" size="sm" onClick={resetAll}>
              <Eraser className="mr-2 size-4" /> Reset All
            </Button>
            <Button theme={theme} variant="outline" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}>
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </header>

        {/* --- Main Content Area: Two Columns --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          {/* Left Column (Controls) */}
          <div className={classNames("p-5 rounded-lg border space-y-6", tn(theme, "border-neutral-800 bg-neutral-900/70", "border-neutral-200 bg-white/80"))}>
            <h2 className="text-xl font-semibold">Controls</h2>

            {/* Solution Input */}
            <div className="space-y-2">
              <label htmlFor="solution-input" className="text-sm font-semibold">Today’s word (solution)</label>
              <Input
                theme={theme}
                id="solution-input"
                value={solution}
                onChange={(e: any) => setSolution(normalizeWord(e.target.value))}
                placeholder="5 letters"
                maxLength={5}
                className="font-mono tracking-widest uppercase"
              />
              {!solution ? (
                <p className={classNames("text-sm", tn(theme, "text-neutral-400", "text-neutral-600"))}>Enter the hidden Wordle answer.</p>
              ) : solutionValid ? (
                <p className="text-sm text-green-400 flex items-center"><Check className="mr-1 size-4" /> Looks good</p>
              ) : (
                <p className="text-sm text-red-400 flex items-center"><AlertCircle className="mr-1 size-4" /> Must be 5 letters a–z</p>
              )}
            </div>

            {/* Paint Color Selector */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Paint color selector</label>
              <div className="flex flex-wrap gap-2">
                {[3, 2, 1, 0].map((v) => (
                  <ColorSwatch
                    key={v}
                    value={v as ColorKey}
                    selected={activeColor === v}
                    onClick={() => setActiveColor(v as ColorKey)}
                    colors={colors}
                    theme={theme}
                  />
                ))}
              </div>
              <p className={classNames("text-sm flex items-center", tn(theme, "text-neutral-400", "text-neutral-600"))}><PaintBucket className="mr-1 size-4" /> Click or drag on the grid to paint squares.</p>
            </div>

            {/* Word List (Tabs) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Word List</label>
              <div className={classNames("flex rounded-md p-1", tn(theme, "bg-neutral-800", "bg-neutral-200"))}>
                <button
                  onClick={() => setActiveTab('built-in')}
                  className={classNames(
                    "w-1/2 rounded p-2 text-sm font-semibold transition-colors",
                    activeTab === 'built-in'
                      ? tn(theme, 'bg-neutral-600 text-white', 'bg-white text-neutral-900 shadow')
                      : tn(theme, 'hover:bg-neutral-700/50', 'hover:bg-white/60')
                  )}
                >
                  Built-in Demo
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={classNames(
                    "w-1/2 rounded p-2 text-sm font-semibold flex items-center justify-center transition-colors",
                    activeTab === 'upload'
                      ? tn(theme, 'bg-neutral-600 text-white', 'bg-white text-neutral-900 shadow')
                      : tn(theme, 'hover:bg-neutral-700/50', 'hover:bg-white/60')
                  )}
                >
                  <Upload className="mr-2 size-4" /> Upload .txt
                </button>
              </div>

              {/* Built-in Tab Content */}
              <div className={classNames("p-2 text-sm", tn(theme, "text-neutral-400", "text-neutral-600"), activeTab !== 'built-in' && 'hidden')}>
                <Badge theme={theme} className={classNames("font-normal", error && tn(theme, "bg-red-800 text-red-100", "bg-red-100 text-red-700"))}>{status}</Badge>
                {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
                <Button theme={theme} variant="outline" size="sm" onClick={reload} className="mt-2">
                  <RefreshCw className="mr-2 size-4" /> Reload List
                </Button>
              </div>

              {/* Upload Tab Content */}
              <div className={classNames("p-2 space-y-2", activeTab !== 'upload' && 'hidden')}>
                <label htmlFor="file-upload" className="text-sm text-neutral-400">Select 5-letter word list (.txt)</label>
                <Input
                  theme={theme}
                  id="file-upload"
                  type="file"
                  accept=".txt"
                  onChange={(e: any) => { if (e.target.files.length > 0) loadFromFile(e.target.files[0]); }}
                />
                {loading && activeTab === 'upload' && (
                  <p className="text-sm text-blue-400 flex items-center"><Loader2 className="mr-2 size-4 animate-spin" /> Reading file...</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className={classNames("flex gap-2 pt-4 border-t", tn(theme, "border-neutral-800", "border-neutral-200"))}>
              <Button theme={theme} onClick={compute} disabled={!canCompute || working} className="w-full">
                {working ? (<><Loader2 className="mr-2 size-4 animate-spin" /> Computing…</>) : "Compute Guesses"}
              </Button>
              <Button theme={theme} variant="secondary" onClick={resetResults} disabled={results.candidates.length === 0}>
                Clear Results
              </Button>
            </div>
            {!anyRowFilled && (
              <p className="text-sm text-amber-500 flex items-center pt-2">
                <AlertCircle className="mr-1 size-4" /> Draw at least one row to enable Compute.
              </p>
            )}
          </div>

          {/* Right Column (Grid) */}
          <div className={classNames("p-5 rounded-lg border flex flex-col items-center justify-center min-h-[500px]", tn(theme, "border-neutral-800 bg-neutral-900/70", "border-neutral-200 bg-white/80"))}>
            <h2 className="text-xl font-semibold mb-4 text-center">Draw your desired pattern (5×6)</h2>
            <GridEditor grid={grid} setGrid={setGrid} activeColor={activeColor} colors={colors} />
            <div className={classNames("mt-4 text-xs text-center flex justify-center items-center gap-x-3 gap-y-1 flex-wrap", tn(theme, "text-neutral-400", "text-neutral-600"))}>
              <span>Legend:</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#6aaa64]" /> Green</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#c9b458]" /> Yellow</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#787c7e]" /> Gray</span>
            </div>
          </div>
        </div>

        {/* --- Results & How-To Area (Full Width) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

            {/* Results Card */}
            <div className={classNames("p-5 rounded-lg border", tn(theme, "border-neutral-800 bg-neutral-900/70", "border-neutral-200 bg-white/80"))}>
              <h2 className="text-xl font-semibold mb-4">Results</h2>
              <div className="space-y-4">
                {results.candidates.length === 0 ? (
                  <p className={classNames("text-sm", tn(theme, "text-neutral-400", "text-neutral-600"))}>
                    No results yet. Enter a valid solution, draw at least one row, and click Compute guesses.
                  </p>
                ) : (
                  <>
                    {/* Impossible Rows Box */}
                    {impossibleRows.length > 0 && (
                      <div className={classNames("rounded-lg border p-3 space-y-1", tn(theme, "border-red-700 bg-red-900/30 text-red-300", "border-red-300 bg-red-50 text-red-700"))}>
                        <p className="font-semibold flex items-center"><AlertCircle className="mr-2 size-4" /> Impossible Rows Detected</p>
                        <p className="text-sm">
                          Rows {impossibleRows.map(i => i + 1).join(", ")} produced zero matches. Recheck your solution or pattern.
                        </p>
                      </div>
                    )}

                    {/* Suggested Sequence Box */}
                    {impossibleRows.length === 0 && anyRowFilled && (
                      <div className="rounded-lg border border-green-700 p-3 bg-green-900/30 text-green-300 space-y-1">
                        <p className="font-semibold">Suggested Sequence</p>
                        <p className="font-mono tracking-wide break-words text-lg">{sequence}</p>
                      </div>
                    )}

                    {/* Per-row sections */}
                    <div className="space-y-4 pt-4">
                      {results.candidates.map((arr, i) => {
                        const pat = patterns[i];
                        if (!pat) return (
                          <div key={i} className="flex items-center space-x-2 p-2 rounded-md bg-neutral-800/50">
                            <Minus className="size-4 text-neutral-500" />
                            <span className="text-sm text-neutral-500">Row {i + 1} (blank)</span>
                          </div>
                        );

                        const isImpossible = impossibleRows.includes(i);
                        return (
                          <div key={i} className={classNames("border p-3 rounded-lg space-y-2", isImpossible ? 'border-red-700/50' : 'border-neutral-800')}>
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                Row {i + 1} — <Badge variant={isImpossible ? 'destructive' : 'secondary'}>{arr.length} candidate{arr.length === 1 ? "" : "s"}</Badge>
                              </span>
                              <div className="flex gap-0.5">
                                {pat.map((v, idx) => (
                                  <span key={idx} className={classNames("w-4 h-4 rounded-sm border", colors[v as ColorKey].bg, colors[v as ColorKey].border)} />
                                ))}
                              </div>
                            </div>

                            {arr.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-xs font-mono break-words text-neutral-400">
                                  {arr.slice(0, 10).join(", ")}{arr.length > 10 ? `... (+${arr.length - 10} more)` : ""}
                                </p>
                                <div className="flex gap-2 items-center">
                                  <Input
                                    value={results.picks[i] || ""}
                                    onChange={(e: any) => {
                                      const newPicks = [...results.picks];
                                      newPicks[i] = normalizeWord(e.target.value).substring(0, 5);
                                      setResults(r => ({ ...r, picks: newPicks }));
                                    }}
                                    placeholder={arr[0] || "Pick a word"}
                                    maxLength={5}
                                    className="font-mono uppercase w-40 bg-neutral-800"
                                  />
                                  <Button size="sm" variant="outline" onClick={() => {
                                    const newPicks = [...results.picks];
                                    newPicks[i] = arr[0] || "";
                                    setResults(r => ({ ...r, picks: newPicks }));
                                  }} disabled={!arr[0]}>
                                    Suggest
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-red-400">No valid guess yields this row for “{solution}”.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* "How this works" Card */}
            <div className="p-5 rounded-lg border border-neutral-800 bg-neutral-900/70">
              <h2 className="text-xl font-semibold mb-4">How this works</h2>
              <div className="space-y-3 text-sm text-neutral-400">
                <p>
                  This tool uses the exact Wordle scoring algorithm (handling duplicate letters correctly) to test every word in the dictionary against your provided solution.
                </p>
                <p>
                  It finds all guess words that would produce the **exact color pattern** you painted for each row.
                  The suggested sequence simply takes the first candidate found for each painted row. For comprehensive results, upload a full Wordle guess list (~13k words) using the **Upload .txt** tab. The build in has 33747 5-letter words but some of them are correctly not recognised by WORDLE.
                </p>
              </div>
            </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-neutral-500 pt-6 border-t border-neutral-800">
          Made by Jakub Kos — 28.10.25
        </footer>
      </div>
    </div>
  );
}


