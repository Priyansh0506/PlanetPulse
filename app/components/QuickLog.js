'use client';

const SHORTCUTS = [
  { type: 'car', quantity: 10, label: 'Office drive', detail: '10 km', icon: '↗' },
  { type: 'bus', quantity: 5, label: 'Bus trip', detail: '5 km', icon: '→' },
  { type: 'veg_meal', quantity: 1, label: 'Veg lunch', detail: '1 meal', icon: '●' },
  { type: 'electricity', quantity: 5, label: 'Home energy', detail: '5 kWh', icon: '⌁' },
];

export default function QuickLog({ onSelect }) {
  return (
    <section className="quick-log" aria-labelledby="quick-log-title">
      <div className="quick-log-head">
        <div>
          <p className="section-eyebrow">Quick log</p>
          <h2 id="quick-log-title">Start with a common choice.</h2>
        </div>
        <p>Prefill a shortcut, then review the calculation before saving.</p>
      </div>
      <div className="quick-log-grid">
        {SHORTCUTS.map((shortcut) => (
          <button
            className="quick-log-item"
            key={shortcut.type}
            type="button"
            onClick={() => onSelect(shortcut)}
          >
            <span className="quick-log-icon" aria-hidden="true">{shortcut.icon}</span>
            <span><strong>{shortcut.label}</strong><small>{shortcut.detail}</small></span>
            <span className="quick-log-arrow" aria-hidden="true">+</span>
          </button>
        ))}
      </div>
    </section>
  );
}