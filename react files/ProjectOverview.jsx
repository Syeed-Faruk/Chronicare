import React from "react";

// Standalone React example only. Not imported by the existing CHRONICARE website.
export default function ProjectOverview() {
  const items = [
    { label: "Frontend", value: "HTML, CSS, JavaScript" },
    { label: "Backend", value: "Node.js and Express" },
    { label: "Database", value: "MySQL" },
    { label: "AI service", value: "Python and FastAPI" },
  ];

  return (
    <section style={styles.card}>
      <h2>CHRONICARE Project Overview</h2>
      <p>Example React component for demonstrating component-based UI.</p>
      <div style={styles.grid}>
        {items.map((item) => (
          <article key={item.label} style={styles.item}>
            <strong>{item.label}</strong>
            <span>{item.value}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

const styles = {
  card: { fontFamily: "Arial, sans-serif", padding: 20, border: "1px solid #d8e5d8", borderRadius: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 16 },
  item: { display: "grid", gap: 8, padding: 14, background: "#f1f8e9", borderRadius: 8 },
};
