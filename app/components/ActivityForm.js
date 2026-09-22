'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  EMISSION_FACTORS,
  ACTIVITY_ORDER,
  GROUP_LABELS,
  calculateCO2,
  checkSanity,
} from '../lib/calculateCO2';
import { logActivity } from '../lib/activities';

/**
 * Feature 1 — Log Activity. Feature 2 — CO2 Calculation.
 *
 * The calculated CO2 is shown live as the user types, before they commit, so the
 * conversion between km/kWh/meals and kg CO2 is never a hidden step. That is the
 * whole educational point of the product.
 *
 * DP2 lives here: a quantity past its sanity ceiling is not accepted silently
 * AND not rejected. The form switches to a confirm state that names the number
 * and offers "Edit value" (returns focus to the input) and "Log anyway" (saves
 * it, flagged). Nothing is ever blocked.
 */
export default function ActivityForm({ onLogged }) {
  const [type, setType] = useState('car');
  const [quantity, setQuantity] = useState('');
  const [pending, setPending] = useState(null); // DP2 confirm state
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const quantityRef = useRef(null);
  const successTimer = useRef(null);

  const meta = EMISSION_FACTORS[type];

  const parsed = useMemo(() => {
    if (quantity.trim() === '') return null;
    const n = Number(quantity);
    return Number.isFinite(n) ? n : null;
  }, [quantity]);

  const previewKg =
    parsed !== null && parsed > 0 ? calculateCO2(type, parsed) : null;

  // Clear the success banner after a moment so the next entry starts clean.
  useEffect(() => {
    if (!success) return undefined;
    successTimer.current = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(successTimer.current);
  }, [success]);

  const isInvalid = quantity.trim() !== '' && (parsed === null || parsed <= 0);

  async function save(flagged) {
    const qty = Number(quantity);
    setSaving(true);
    setError(null);
    try {
      const co2Kg = calculateCO2(type, qty);
      const result = await logActivity({ type, quantity: qty, co2Kg, flagged });
      setQuantity('');
      setPending(null);
      setSuccess({
        label: meta.label,
        qty,
        unit: meta.unit,
        co2Kg,
        flagged: !!flagged,
        synced: result?.__synced !== false,
      });
      onLogged?.();
      quantityRef.current?.focus();
    } catch (e) {
      setError(
        e?.message
          ? `Could not save that entry: ${e.message}`
          : 'Could not save that entry. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSuccess(null);
    if (parsed === null || parsed <= 0) {
      setError('Enter a quantity greater than zero before saving.');
      quantityRef.current?.focus();
      return;
    }
    setError(null);

    const sanity = checkSanity(type, parsed);
    if (sanity.flagged) {
      setPending({ ...sanity, quantity: parsed });
      return;
    }
    save(false);
  }

  function handleTypeChange(next) {
    setType(next);
    setPending(null);
    setError(null);
    setSuccess(null);
  }

  function handleQuantityChange(next) {
    setQuantity(next);
    setPending(null);
    setError(null);
  }

  return (
    <form className="panel panel-form" onSubmit={handleSubmit} noValidate>
      <div className="panel-head">
        <h2>Log Activity</h2>
        <p className="panel-sub">
          Pick what you did and how much. The CO₂ is worked out as you type.
        </p>
      </div>

      <div className="field">
        <label htmlFor="activity-type">Activity Type</label>
        <select
          id="activity-type"
          name="activityType"
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          {Object.entries(GROUP_LABELS).map(([groupKey, groupLabel]) => (
            <optgroup key={groupKey} label={groupLabel}>
              {ACTIVITY_ORDER.filter(
                (k) => EMISSION_FACTORS[k].group === groupKey
              ).map((k) => (
                <option key={k} value={k}>
                  {EMISSION_FACTORS[k].label} — {EMISSION_FACTORS[k].factor} kg CO₂/
                  {EMISSION_FACTORS[k].unit}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="activity-quantity">Quantity</label>
        <div className="input-with-unit">
          <input
            id="activity-quantity"
            name="quantity"
            ref={quantityRef}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={quantity}
            aria-describedby="quantity-hint"
            aria-invalid={isInvalid || undefined}
            onChange={(e) => handleQuantityChange(e.target.value)}
          />
          <span className="unit-suffix" aria-hidden="true">
            {meta.unit}
          </span>
        </div>
        <p id="quantity-hint" className="field-hint">
          Measured in {meta.unit}. {meta.label} emits {meta.factor} kg CO₂ per{' '}
          {meta.unit}.
        </p>
      </div>

      <div className="co2-preview" aria-live="polite">
        <span className="co2-preview-label">Calculated CO₂</span>
        <span className="co2-preview-value">
          {previewKg !== null ? (
            <>
              {previewKg.toFixed(2)}
              <span className="co2-preview-unit"> kg</span>
            </>
          ) : (
            <span className="co2-preview-empty">—</span>
          )}
        </span>
      </div>

      {isInvalid && (
        <p className="state state-error" role="alert">
          <span className="state-title">Quantity must be a number above zero.</span>
        </p>
      )}

      {pending && (
        <div
          className={`state state-warning state-${pending.severity}`}
          role="alertdialog"
          aria-labelledby="sanity-title"
        >
          <span className="state-title" id="sanity-title">
            {pending.title}
          </span>
          <p className="state-body">{pending.message}</p>
          <div className="state-actions">
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                setPending(null);
                quantityRef.current?.focus();
                quantityRef.current?.select?.();
              }}
            >
              Edit value
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => save(true)}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Log anyway'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="state state-error" role="alert">
          <span className="state-title">{error}</span>
        </p>
      )}

      {success && (
        <p className="state state-success" role="status">
          <span className="state-title">
            Logged {success.qty} {success.unit} of {success.label} —{' '}
            {success.co2Kg.toFixed(2)} kg CO₂.
          </span>
          {success.flagged && (
            <span className="state-body">
              Saved to History, excluded from your weekly total because it was
              flagged.
            </span>
          )}
          {!success.synced && (
            <span className="state-body">
              Stored locally in this browser — no backend configured.
            </span>
          )}
        </p>
      )}

      {!pending && (
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Activity'}
        </button>
      )}
    </form>
  );
}
