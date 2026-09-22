'use client';

import { useEffect, useState, useCallback } from 'react';
import ActivityForm from './components/ActivityForm';
import Dashboard from './components/Dashboard';
import WeeklyTargetCard from './components/WeeklyTargetCard';
import HistoryFilter from './components/HistoryFilter';
import QuickLog from './components/QuickLog';
import { fetchActivities, getBackendMode, getWeeklyTarget } from './lib/activities';
import { getWeekStart } from './lib/WeekUtils';
import { getTopCategory } from './lib/nudge';
import { EMISSION_FACTORS } from './lib/calculateCO2';

export default function Home() {
  const [activities, setActivities] = useState([]);
  const [target, setTarget] = useState(null);
  const [storageMode, setStorageMode] = useState('unknown');
  const [preset, setPreset] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [all, t] = await Promise.all([fetchActivities(), getWeeklyTarget()]);
    setActivities(all);
    setTarget(t);
    setStorageMode(getBackendMode());
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) {
    return (
      <main className="shell">
        <div className="loading-state" role="status" aria-live="polite">
          <span className="loading-mark" aria-hidden="true" />
          <strong>Preparing your footprint</strong>
          <p>Loading saved activities and your weekly signal.</p>
        </div>
      </main>
    );
  }

  const weekStart = getWeekStart();
  const weekActivities = activities.filter((a) => new Date(a.created_at) >= weekStart);
  const weekTotalKg = weekActivities
    .filter((a) => !a.flagged)
    .reduce((sum, a) => sum + a.co2_kg, 0);
  const lifetimeTotalKg = activities
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
      <nav className="site-nav" aria-label="Main navigation">
        <a className="brand-mark" href="#overview" aria-label="PlanetPulse overview">
          <span className="brand-dot" aria-hidden="true" />
          PlanetPulse
        </a>
        <div className="nav-links">
          <a href="#overview">Overview</a>
          <a href="#track">Track</a>
          <a href="#dashboard">Dashboard</a>
          <a href="#history">History</a>
        </div>
        <span className={`sync-status sync-${storageMode}`} title="Where new activity entries are stored">
          <span className="sync-dot" aria-hidden="true" />
          {storageMode === 'remote' ? 'Cloud synced' : 'Browser saved'}
        </span>
        <a className="nav-cta" href="#track">Log activity <span aria-hidden="true">↗</span></a>
      </nav>

      <header className="app-header" id="overview">
        <div className="hero-copy">
          <p className="app-kicker">Personal climate ledger</p>
          <h1>Understand your footprint.<br /><em>Change what comes next.</em></h1>
          <p>PlanetPulse turns everyday choices into a clear, measurable carbon footprint, so the next decision feels possible.</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#track">Start tracking <span aria-hidden="true">↗</span></a>
            <a className="text-link" href="#dashboard">Explore your impact <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <div className="hero-signal" aria-label="Current week status">
          <div className="signal-orbit signal-orbit-back" aria-hidden="true" />
          <div className="signal-orbit signal-orbit-front" aria-hidden="true" />
          <div className="signal-core">
            <span>THIS WEEK</span>
            <strong>{weekTotalKg.toFixed(1)}</strong>
            <small>kg CO₂e logged</small>
          </div>
        </div>
      </header>

      <section className="story-strip" aria-label="How PlanetPulse works">
        <div className="story-intro"><span>01 — A clearer loop</span><strong>Small choices,<br />visible impact.</strong></div>
        <div className="story-step"><span>01</span><strong>Log</strong><p>Record travel, meals, or energy in seconds.</p></div>
        <div className="story-step"><span>02</span><strong>Understand</strong><p>See the CO₂ calculation before you save.</p></div>
        <div className="story-step"><span>03</span><strong>Adjust</strong><p>Use your weekly signal to choose what comes next.</p></div>
      </section>

      <section className="product-section" id="track" aria-labelledby="track-title">
        <div className="section-heading">
          <div><p className="section-eyebrow">Track your day</p><h2 id="track-title">Make the invisible measurable.</h2></div>
          <p>Every entry is calculated with a transparent factor. No accounts, no noise, no hidden score.</p>
        </div>
        <QuickLog onSelect={(shortcut) => { setPreset(shortcut); document.getElementById('activity-type')?.focus(); }} />
        <div className="grid">
          <div className="fade-in"><ActivityForm key={preset ? `${preset.type}-${preset.quantity}` : 'activity-form'} onLogged={load} preset={preset} /></div>
          <div className="fade-in"><WeeklyTargetCard target={target} weekTotalKg={weekTotalKg} topCategory={topCategory} onTargetChange={setTarget} /></div>
        </div>
      </section>

      <section className="insight-strip" aria-label="Footprint overview">
        <div><span>Total logged</span><strong>{lifetimeTotalKg.toFixed(1)} <small>kg CO₂e</small></strong></div>
        <div><span>This week</span><strong>{weekTotalKg.toFixed(1)} <small>kg CO₂e</small></strong></div>
        <div><span>Activities</span><strong>{activities.length}</strong></div>
        <div><span>Storage</span><strong>{storageMode === 'remote' ? 'Cloud' : 'Browser'}</strong></div>
      </section>

      <section className="product-section dashboard-section" id="dashboard" aria-labelledby="dashboard-title">
        <div className="section-heading">
          <div><p className="section-eyebrow">Your signal</p><h2 id="dashboard-title">A week you can read at a glance.</h2></div>
          <p>Compare your current footprint with the target you set. The week always runs Monday through Sunday.</p>
        </div>
        <Dashboard activities={weekActivities} label={weekStart ? `This week (from ${weekStart.toLocaleDateString()})` : 'Footprint so far'} />
      </section>

      <section className="product-section history-section" id="history" aria-label="Activity history">
        <HistoryFilter activities={activities} />
      </section>
      <p className="footer-note">Your entries stay available after refresh. Flagged values remain in History and are excluded from weekly totals.</p>
    </main>
  );
}
