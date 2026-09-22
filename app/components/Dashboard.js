'use client';

import { EMISSION_FACTORS } from '../lib/calculateCO2';

export default function Dashboard({ activities, label = 'Footprint so far' }) {
  // `activities` arrives already scoped to the week the nudge measures, so the
  // breakdown below the nudge and the nudge's own percentage agree.
  const active = activities.filter((a) => !a.flagged);
  const totalKg = active.reduce((sum, a) => sum + a.co2_kg, 0);
  const flaggedCount = activities.length - active.length;

  const byCategory = {};
  for (const a of active) {
    byCategory[a.type] = (byCategory[a.type] || 0) + a.co2_kg;
  }
  const maxVal = Math.max(1, ...Object.values(byCategory));
  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div className="card">
      <h2>{label}</h2>
      <p className="big-number">
        {totalKg.toFixed(1)} <span>kg CO₂</span>
      </p>

      <div className="breakdown">
        {rows.map(([type, kg]) => (
          <div className="breakdown-row" key={type}>
            <span className="breakdown-label">{EMISSION_FACTORS[type]?.label ?? type.replace(/_/g, ' ')}</span>
            <div className="breakdown-bar-track">
              <div className="breakdown-bar" style={{ width: `${(kg / maxVal) * 100}%` }} />
            </div>
            <span className="breakdown-value">{kg.toFixed(1)} kg</span>
          </div>
        ))}
        {rows.length === 0 && <p className="empty">Nothing logged yet.</p>}
      </div>

      {flaggedCount > 0 && (
        <p className="flagged-note">
          {flaggedCount} flagged entr{flaggedCount === 1 ? 'y' : 'ies'} excluded from this total — see history.
        </p>
      )}
    </div>
  );
}
