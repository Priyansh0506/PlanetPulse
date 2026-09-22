export const EMISSION_FACTORS = {
  car: { factor: 0.2, unit: 'km', label: 'Car travel', group: 'travel', icon: 'car' },
  bus: { factor: 0.08, unit: 'km', label: 'Bus travel', group: 'travel', icon: 'bus' },
  flight: { factor: 0.25, unit: 'km', label: 'Flight', group: 'travel', icon: 'flight' },
  electricity: { factor: 0.8, unit: 'kWh', label: 'Electricity', group: 'home', icon: 'bolt' },
  veg_meal: { factor: 0.5, unit: 'meal', label: 'Veg meal', group: 'food', icon: 'leaf' },
  nonveg_meal: { factor: 2.0, unit: 'meal', label: 'Non-veg meal', group: 'food', icon: 'meat' },
};

// Order the picker by group so related choices sit together — travel first
// because it dominates most people's footprint, so it's the common case.
export const ACTIVITY_ORDER = ['car', 'bus', 'flight', 'electricity', 'veg_meal', 'nonveg_meal'];

export const GROUP_LABELS = {
  travel: 'Travel',
  home: 'Home energy',
  food: 'Food',
};

/**
 * DP2 — Absurd input (e.g. a 500,000 km car trip)
 *
 * Decision: flag-and-confirm, not silent-accept or hard-reject.
 * Silently accepting lets one typo wreck the weekly chart. Silently
 * rejecting loses real data if the user actually meant it (rare, but
 * possible — a flight of 15,000 km is real). So: block nothing, but stop
 * and ask when quantity crosses a ceiling that's realistic for a single
 * day. Confirmed entries are still saved, tagged `flagged`, and excluded
 * from totals/pace math so the dashboard stays trustworthy.
 */
const SANITY_CEILINGS = {
  car: 1000,       // longest realistic single road-trip day
  bus: 1000,
  flight: 20000,    // longest nonstop commercial route is ~17,000 km
  electricity: 200, // extreme single-day home usage
  veg_meal: 10,
  nonveg_meal: 10,
};

/**
 * A hard ceiling where the number stops being a plausible typo and becomes a
 * category error — 500,000 km in one day is longer than a return trip to the
 * Moon is far. Both tiers still save if the user confirms, so nothing is ever
 * silently dropped; the difference is only how loudly we push back.
 */
const IMPOSSIBLE_CEILINGS = {
  car: 20000,
  bus: 20000,
  flight: 100000,
  electricity: 10000,
  veg_meal: 100,
  nonveg_meal: 100,
};

/** Format a quantity without trailing `.0` noise (12 vs 12.5). */
function fmtQty(n) {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

export function checkSanity(type, quantity) {
  const ceiling = SANITY_CEILINGS[type];
  const meta = EMISSION_FACTORS[type];
  if (ceiling === undefined || !meta) return { flagged: false };

  if (quantity > ceiling) {
    const impossible = quantity > IMPOSSIBLE_CEILINGS[type];
    const unit = meta.unit;
    const qtyText = `${fmtQty(quantity)} ${unit}`;

    return {
      flagged: true,
      severity: impossible ? 'impossible' : 'high',
      title: impossible
        ? `That number looks like a typo — ${qtyText} in one entry`
        : `Unusually high — ${qtyText} in one entry`,
      message: impossible
        ? `${qtyText} of ${meta.label.toLowerCase()} is more than anyone could do in a single day, so it will almost certainly be a mistyped figure. Check the number and edit it, or log it anyway if it is genuinely correct — it stays in your history but is kept out of your weekly total so it can't distort the chart.`
        : `${qtyText} of ${meta.label.toLowerCase()} is past what a single day of this activity realistically produces. If that is right, log it anyway — it is saved but excluded from your weekly total and pace so the dashboard stays trustworthy.`,
    };
  }
  return { flagged: false };
}

export function calculateCO2(type, quantity) {
  const entry = EMISSION_FACTORS[type];
  if (!entry) throw new Error(`Unknown activity type: ${type}`);
  return Number((entry.factor * quantity).toFixed(3));
}

/**
 * A few plain-language equivalents, so a number in kilograms means something.
 * Figures are widely published averages (EPA / UK DEFRA style): a mature tree
 * absorbs ~21 kg CO2 per year, a petrol car emits ~0.20 kg per km (which is
 * our own car factor), and a phone charge is ~0.01 kg.
 */
export function describeImpact(co2Kg) {
  if (!co2Kg || co2Kg <= 0) return null;
  const treeDays = (co2Kg / 21) * 365;
  const carKm = co2Kg / EMISSION_FACTORS.car.factor;
  return {
    treeDays: Math.max(1, Math.round(treeDays)),
    carKm: Math.round(carKm),
  };
}
