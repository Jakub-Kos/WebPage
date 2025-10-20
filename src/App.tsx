import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import School from "./pages/School";
import Cooking from "./pages/Cooking";
import Travel from "./pages/Travel";
import NotFound from "./pages/NotFound";
import InteractiveArm from "./apps/InteractiveArm";

export default function App() {
  return (
    <BrowserRouter basename="/WebPage">
      <nav
        style={{
          background: "#0b1220",
          color: "#e5f0ff",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div style={{ fontWeight: 700 }}>Jakub Kos</div>
        <div style={{ display: "flex", gap: 18 }}>
          <Link style={{ color: "inherit", textDecoration: "none" }} to="/">Home</Link>
          <Link style={{ color: "inherit", textDecoration: "none" }} to="/school">School</Link>
          <Link style={{ color: "inherit", textDecoration: "none" }} to="/cooking">Cooking</Link>
          <Link style={{ color: "inherit", textDecoration: "none" }} to="/travel">Travel</Link>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/school" element={<School />} />
        <Route path="/school/robotika" element={<InteractiveArm />} />
        <Route path="/cooking" element={<Cooking />} />
        <Route path="/travel" element={<Travel />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
