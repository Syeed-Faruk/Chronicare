import React from "react";

// Static sample data only. This component does not read or save patient data.
export default function HealthSummary() {
  const metrics = [
    { name: "Heart rate", value: "72 bpm" },
    { name: "Blood pressure", value: "120/80 mmHg" },
    { name: "Daily steps", value: "6,400" },
  ];

  return (
    <section style={{ fontFamily: "Arial, sans-serif", padding: 20 }}>
      <h2>Sample Health Summary</h2>
      <p style={{ color: "#607d68" }}>Illustrative values — not real patient records.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {metrics.map((metric) => (
          <div key={metric.name} style={{ minWidth: 150, padding: 16, border: "1px solid #d8e5d8", borderRadius: 10 }}>
            <div style={{ color: "#607d68", fontSize: 14 }}>{metric.name}</div>
            <strong style={{ display: "block", marginTop: 8, fontSize: 20 }}>{metric.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
