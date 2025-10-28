import { Link } from "react-router-dom";

export default function Personal() {
  return (
    <div style={{ padding: 32, fontFamily: "Inter, sans-serif" }}>
      <h1>Personal</h1>
      <p>Here I aim to publish useful apps I've created for fun and more meaningful reasons.</p>

      <h2>Personal Projects</h2>
      <ul>
        <li>
          <strong>Random Apps</strong>
          <br />
          <Link to="/personal/projects/WordlePattern">→ Wordle Pattern Creator</Link>
          <br />
        </li>
      </ul>
    </div>
  );
}
