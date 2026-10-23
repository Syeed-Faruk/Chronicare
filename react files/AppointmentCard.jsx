import React from "react";

// Static presentation example only. No booking, database, or calendar integration.
export default function AppointmentCard() {
  return (
    <article style={{ fontFamily: "Arial, sans-serif", padding: 20, border: "1px solid #d8e5d8", borderRadius: 12, maxWidth: 420 }}>
      <h2 style={{ marginTop: 0 }}>Sample Appointment Card</h2>
      <p><strong>Visit type:</strong> Routine follow-up</p>
      <p><strong>Date:</strong> Example date — replace before presenting</p>
      <p><strong>Status:</strong> Sample only</p>
      <button type="button" disabled style={{ padding: "9px 14px", border: 0, borderRadius: 6, background: "#e8f5e9", color: "#263238" }}>
        Demo only — not bookable
      </button>
    </article>
  );
}
