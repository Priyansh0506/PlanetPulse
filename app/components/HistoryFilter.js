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

  return (
    <div className="card">
      <h2>History</h2>

      <div className="field-row">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          {Object.entries(EMISSION_FACTORS).map(([key, v]) => (
            <option key={key} value={key}>{v.label}</option>
          ))}
        </select>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
      </div>

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
  );
}
