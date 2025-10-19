export default function Home() {
  return (
    <div style={{ padding: 32, fontFamily: "Inter, sans-serif" }}>
      <h1>Welcome to Jakub Kos Website</h1>
      <p>This is my personal space where I share school projects, travels, and recipes.</p>

      <h2>Sections</h2>
      <ul>
        <li><a href="./school">📘 School</a> — university projects, assignments, and simulations</li>
        <li><a href="./cooking">🍳 Cooking</a> — recipes and food experiments</li>
        <li><a href="./travel">🌍 Travel</a> — trips, photos, and experiences</li>
      </ul>
    </div>
  );
}
