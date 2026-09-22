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
        <h2>Weekly target</h2>
        <span className="week-label">{getWeekProgressLabel()}</span>
      </div>

      {editing ? (
        <div className="field-row">
          <input
            type="number"
            min="0"
            step="1"
            placeholder="kg CO₂ per week"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button className="btn-primary" onClick={save}>Set target</button>
        </div>
      ) : (
        <>
          <div className={`progress-track nudge-${nudge.level}`}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="progress-caption">
            {weekTotalKg.toFixed(1)} / {target} kg CO₂
          </p>
          {nudge.message && <p className={`nudge-message nudge-${nudge.level}`}>{nudge.message}</p>}
          <button className="btn-ghost small" onClick={() => setEditing(true)}>Change target</button>
        </>
      )}
    </div>
  );
}
