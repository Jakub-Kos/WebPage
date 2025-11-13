import { Link } from "react-router-dom";

export default function School() {
  return (
    <div style={{ padding: 32, fontFamily: "Inter, sans-serif" }}>
      <h1>School Projects</h1>
      <p>Here I aim to publish useful apps I've done for my coursework and assignments.</p>

        <h2>Robotics</h2>
        <ul>
            <li><Link to="/school/robotika/InteractiveArm">Interactive 2D RR Arm</Link></li>
            <li><Link to="/school/robotika/RTTManipulator">RTT Manipulator Simulator</Link></li>
            <li><a href="/WebPage/robotics/index.html">Line-Following Robot Simulator</a></li>
        </ul>
    </div>
  );
}
