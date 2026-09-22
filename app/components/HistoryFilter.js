'use client';

import { useState } from 'react';
import { EMISSION_FACTORS } from '../lib/calculateCO2';

export default function HistoryFilter({ activities }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const filtered = activities.filter((a) => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (dateFilter && !a.created_at.startsWith(dateFilter)) return false;
    return true;
  });

  function exportCsv() {
    const header = ['Date', 'Activity', 'Quantity', 'Unit', 'CO2 kg', 'Flagged'];
    const rows = filtered.map((a) => [
      new Date(a.created_at).toISOString().slice(0, 10),
      EMISSION_FACTORS[a.type]?.label || a.type,
      a.quantity,
      EMISSION_FACTORS[a.type]?.unit || '',
      a.co2_kg,
      a.flagged ? 'Yes' : 'No',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'planetpulse-history.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card">
      <h2>History</h2>
      <p className="section-intro">Review every saved activity. Filters update the list without changing your totals.</p>

      <div className="history-filters">
        <div className="filter-control">
          <label className="filter-label" htmlFor="history-type">Filter by Type</label>
          <select id="history-type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            {Object.entries(EMISSION_FACTORS).map(([key, v]) => (
              <option key={key} value={key}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="filter-control">
          <label className="filter-label" htmlFor="history-date">Filter by Date</label>
          <input id="history-date" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </div>
        <div className="filter-actions">
          <button className="btn btn-quiet" type="button" onClick={() => { setTypeFilter('all'); setDateFilter(''); }}>
            Clear Filters
          </button>
          <button className="btn btn-quiet" type="button" onClick={exportCsv} disabled={filtered.length === 0}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="table-wrap">
      <table className="history-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Qty</th>
            <th>CO₂</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((a) => (
            <tr key={a.id} className={a.flagged ? 'row-flagged' : ''}>
              <td>{new Date(a.created_at).toLocaleDateString()}</td>
              <td>{EMISSION_FACTORS[a.type]?.label || a.type}</td>
              <td>{a.quantity} {EMISSION_FACTORS[a.type]?.unit}</td>
              <td>{a.co2_kg.toFixed(2)} kg</td>
              <td>
                {a.flagged && (
                  <span className="badge-flag" title="Excluded from totals — flagged as unusually high">
                    flagged
                  </span>
                )}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan="5" className="empty">No entries match this filter.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
