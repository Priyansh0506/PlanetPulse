'use client';

import { useState } from 'react';
import { getDayOfWeek, getWeekProgressLabel } from '../lib/WeekUtils';
import { getNudgeStatus } from '../lib/nudge';
import { setWeeklyTarget } from '../lib/activities';

export default function WeeklyTargetCard({ target, weekTotalKg, topCategory, onTargetChange }) {
  const [editing, setEditing] = useState(!target);
  const [value, setValue] = useState(target || '');

  const dayOfWeek = getDayOfWeek();
  const nudge = target ? getNudgeStatus(weekTotalKg, target, dayOfWeek, topCategory) : { level: 'none' };
  const pct = target ? Math.min(100, (weekTotalKg / target) * 100) : 0;
  const remaining = target ? Math.max(0, target - weekTotalKg) : 0;

  async function save() {
    const kg = Number(value);
    if (!kg || kg <= 0) return;
    await setWeeklyTarget(kg);
    onTargetChange?.(kg);
    setEditing(false);
  }

  return (
    <div className="card">
      <div className="card-header-row">
        <h2>Weekly Target</h2>
        <span className="week-label">{getWeekProgressLabel()}</span>
      </div>

      {editing ? (
        <div>
          <label className="filter-label" htmlFor="weekly-target">Weekly Target (kg CO₂)</label>
          <div className="field-row">
            <input
              id="weekly-target"
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 40"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <button type="button" className="btn btn-primary" onClick={save}>Set Weekly Target</button>
          </div>
        </div>
      ) : (
        <>
          <div className={`progress-track nudge-${nudge.level}`}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="target-stats" aria-label="Weekly target summary">
            <span><strong>{weekTotalKg.toFixed(1)}</strong> Used</span>
            <span><strong>{target}</strong> Target</span>
            <span><strong>{remaining.toFixed(1)}</strong> Remaining</span>
          </div>
          {nudge.message && <p className={`nudge-message nudge-${nudge.level}`}>{nudge.message}</p>}
          <button type="button" className="btn btn-ghost small" onClick={() => setEditing(true)}>Change Weekly Target</button>
        </>
      )}
    </div>
  );
}
