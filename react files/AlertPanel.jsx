import React from "react";

// Static UI sample. It does not generate clinical alerts or call an API.
export default function AlertPanel() {
  const alerts = [
    { title: "Routine check-in", detail: "Example informational notification", level: "Info" },
    { title: "Appointment reminder", detail: "Example reminder for UI demonstration", level: "Reminder" },
  ];

  return (
    <section style={{ fontFamily: "Arial, sans-serif", padding: 20 }}>
      <h2>Example Notifications</h2>
      {alerts.map((alert) => (
        <article key={alert.title} style={{ borderLeft: "4px solid #66bb6a", background: "#f1f8e9", padding: 14, marginBottom: 10 }}>
          <strong>{alert.title}</strong>
          <span style={{ float: "right", fontSize: 12, color: "#607d68" }}>{alert.level}</span>
          <p style={{ marginBottom: 0 }}>{alert.detail}</p>
        </article>
      ))}
    </section>
  );
}
