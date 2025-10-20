import { Link } from "react-router-dom";

export default function School() {
  return (
    <div style={{ padding: 32, fontFamily: "Inter, sans-serif" }}>
      <h1>School Projects</h1>
      <p>Here I aim to publish useful apps I've done for my coursework and assignments.</p>

      <h2>Courses</h2>
      <ul>
        <li>
          <strong>Úvod do robotiky – NAIL028</strong>
          <br />
          <Link to="/school/robotika/InteractiveArm">→ Interactive 2D RR Manipulator App</Link>
          <br />
          <Link to="/school/robotika/RTTManipulator">→ RTT Manipulator – 3D & Side Views</Link>
        </li>
      </ul>
    </div>
  );
}
