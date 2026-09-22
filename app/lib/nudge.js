/**
 * DP1 — When the weekly target is crossed: warn, encourage, shame, or block?
 *
 * Decision: encourage, with a specific next step — never a block, never shame.
 *
 * Why:
 *   * Blocking stops the user logging real activity, which breaks the app's one
 *     job. A tracker you can't put true data into is worse than useless.
 *   * Shame is the fastest known way to make someone abandon a tracker. This is
 *     an app people open on a bad week; guilt is the moment they stop opening it.
 *   * A bare "warning" with no action is passive noise, ignored by day three.
 *
 * So the nudge always states where you stand, and once you're over it names the
 * single highest category to trim — one concrete move, not a lecture. The
 * category has to be the same week the percentage is measured over, otherwise
 * the nudge can point at a bar that had nothing to do with this week's total.
 *
 * The pace threshold matters: being at 50% of target on day 3 is *on* pace, not
 * alarming, so we compare against the fraction of the week elapsed rather than a
 * flat line. A 15-point cushion absorbs normal day-to-day swing so a single busy
 * Tuesday doesn't trigger the "ahead" state.
 */

const NONE = { level: 'none', fraction: 0, pace: 0, message: null, topCategory: null };

/**
 * The single biggest category this week, so the nudge can name it rather than
 * gesturing at "the breakdown below" and leaving the user to hunt for it.
 * `byCategory` is a { type: kg } map already scoped to the current week.
 */
export function getTopCategory(byCategory) {
  const entries = Object.entries(byCategory || {});
  if (entries.length === 0) return null;
  const [type, kg] = entries.sort((a, b) => b[1] - a[1])[0];
  return { type, kg };
}

export function getNudgeStatus(totalKg, targetKg, dayOfWeek, topCategory = null) {
  if (!targetKg || targetKg <= 0) return NONE;

  const fraction = totalKg / targetKg;
  const pace = dayOfWeek / 7;
  const percent = Math.round(fraction * 100);
  const daysLeft = 7 - dayOfWeek;

  // Name the heaviest category only when there's something to name — an empty
  // week shouldn't produce "your largest category is null".
  const lead = topCategory ? { topCategory, label: topCategory.label, kg: topCategory.kg } : null;
  const nameIt = lead ? `${lead.label} (${lead.kg.toFixed(1)} kg)` : 'your largest category';

  if (fraction >= 1) {
    const over = Math.round((fraction - 1) * 100);
    return {
      level: 'exceeded',
      fraction,
      pace,
      percent,
      topCategory: topCategory || null,
      message:
        daysLeft > 0
          ? `You're ${over}% past your weekly target with ${daysLeft} day${daysLeft === 1 ? '' : 's'} to go. The category carrying it is ${nameIt} — trimming just that one for the rest of the week usually brings it back down.`
          : `You closed the week ${over}% over target, led by ${nameIt}. That's the one to aim at next week.`,
    };
  }

  if (fraction > pace + 0.15) {
    return {
      level: 'ahead',
      fraction,
      pace,
      percent,
      topCategory: topCategory || null,
      message: `You're ahead of pace for day ${dayOfWeek} of 7 — not a failure, but there's still time to level off. ${lead ? `${nameIt} is doing the most damage so far.` : 'Your largest category below is the one worth watching.'}`,
    };
  }

  if (fraction > pace) {
    return {
          level: 'watch',
          fraction,
          pace,
          percent,
          topCategory: topCategory || null,
          message: `Roughly on pace for day ${dayOfWeek} of 7. ${daysLeft} day${daysLeft === 1 ? '' : 's'} left to stay inside the line.`,
        };
        }

        return {
          level: 'on-track',
          fraction,
          pace,
          percent,
          topCategory: topCategory || null,
          message: `Comfortably on pace for day ${dayOfWeek} of 7 — you've used ${percent}% of your target with ${Math.round((1 - pace) * 100)}% of the week left.`,
        };
      }
