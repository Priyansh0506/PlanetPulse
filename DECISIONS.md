# PlanetPulse Decisions

## DP1: Weekly target exceeded

When used emissions reach or pass the weekly target, the app shows a constructive
nudge naming the largest current category. Logging remains available and never
becomes disabled. This keeps the ledger truthful: a user can record a real
activity during a difficult week without being shamed or prevented from using
the product.

## DP2: Obviously wrong input

Quantities above a per-activity sanity ceiling trigger a warning before saving.
The user gets exactly two clear choices: **Edit value** or **Log anyway**.
Choosing **Log anyway** preserves the entry in History with a flagged marker,
while excluding it from weekly totals so one typo cannot distort the dashboard.

## DP3: Week boundaries and progress

A week starts Monday at 00:00 local time and ends Sunday at 23:59:59. The weekly
card shows Used, Target, Remaining, a progress bar, and the current day of seven.
The nudge compares progress to the fraction of the week elapsed, so being at
50% of a target on day three is treated as roughly on pace rather than as an
automatic failure.