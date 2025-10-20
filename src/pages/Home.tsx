export default function Home() {
  return (
    <div style={{ padding: 32, fontFamily: "Inter, sans-serif" }}>
      <h1>Welcome to Jakub Kos Website</h1>
      <p>This is my personal page where I share school projects (and in the future travels, and recipes maybe)</p>

      <h2>Sections</h2>
      <ul>
        <li><a href="./school">📘 School</a> — university projects, assignments, and simulations</li>
        <li><a href="./cooking">🍳 Cooking</a> — recipes</li>
        <li><a href="./travel">🌍 Travel</a> — trips, photos, and experiences</li>
      </ul>
    </div>
  );
}
