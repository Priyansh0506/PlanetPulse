'use client';

import { useEffect, useState, useCallback } from 'react';
import ActivityForm from './components/ActivityForm';
import Dashboard from './components/Dashboard';
import WeeklyTargetCard from './components/WeeklyTargetCard';
import HistoryFilter from './components/HistoryFilter';
import { fetchActivities, getWeeklyTarget } from './lib/activities';
import { getWeekStart } from './lib/WeekUtils';
import { getTopCategory } from './lib/nudge';
import { EMISSION_FACTORS } from './lib/calculateCO2';

export default function Home() {
  const [activities, setActivities] = useState([]);
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [all, t] = await Promise.all([fetchActivities(), getWeeklyTarget()]);
    setActivities(all);
    setTarget(t);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <main className="shell">
        <p className="empty">Loading…</p>
      </main>
    );
  }

  const weekStart = getWeekStart();
  const weekActivities = activities.filter((a) => new Date(a.created_at) >= weekStart);
  const weekTotalKg = weekActivities
    .filter((a) => !a.flagged)
    .reduce((sum, a) => sum + a.co2_kg, 0);

  // The same week totals feed both the nudge and the breakdown beneath it, so
  // the category the nudge names is guaranteed to be the bar the user sees.
  const weekByCategory = {};
  for (const a of weekActivities) {
    if (a.flagged) continue;
    weekByCategory[a.type] = (weekByCategory[a.type] || 0) + a.co2_kg;
  }
  const topEntry = getTopCategory(weekByCategory);
  const topCategory = topEntry
    ? { ...topEntry, label: EMISSION_FACTORS[topEntry.type]?.label ?? topEntry.type.replace(/_/g, ' ') }
    : null;

  return (
    <main className="shell">
      <header className="app-header">
        <h1>PlanetPulse</h1>
        <p>Turn daily choices into a visible carbon footprint.</p>
      </header>

      <div className="grid">
        <div className="fade-in"><ActivityForm onLogged={load} /></div>
        <div className="fade-in"><WeeklyTargetCard target={target} weekTotalKg={weekTotalKg} topCategory={topCategory} onTargetChange={setTarget} /></div>
        <div className="fade-in"><Dashboard activities={weekActivities} label={weekStart ? `This week (from ${weekStart.toLocaleDateString()})` : 'Footprint so far'} /></div>
        <div className="fade-in span-2"><HistoryFilter activities={activities} /></div>
      </div>
    </main>
  );
}
