# Whether and when are different questions with one owner each

Recoverability decides *whether* a recovery continues. Pacing decides *when* the next attempt
fires. The temptation is to let both hold a piece of "how many attempts is this decline worth",
because both are already counting the same attempt chain. That was tried, and it does not work.

The first arrangement gave the consecutive cap to the pacing ladders — which already positioned an
attempt by its same-status run and denied past their own end — and the non-consecutive cap to
Recoverability. Each half was defensible on its own. Together they produced three failures inside
one implementation:

- A test existed whose only purpose was to stop the two halves drifting apart. A test that holds a
  boundary together is usually evidence the boundary is in the wrong place.
- That test immediately found a live defect: suspected fraud spent one of its two allowed attempts,
  because the two halves counted differently. `planFromLadder` drops its `'NOW'` rung from the
  second retry onward *and* positions what remains by a run that already includes the originating
  decline, so a `['NOW', { days: 2 }]` ladder never reached its second rung when the status had also
  opened the recovery.
- Five statuses silently lost their second attempt, because the non-consecutive default closed the
  recovery before the ladder's second rung could fire. Nobody decided to halve them.

**So the counts belong entirely to `recoverability/caps.ts`, and a ladder is a schedule rather than
a budget.** Past its last rung a ladder clamps — it keeps returning that rung — instead of denying.
Running away is impossible: `MAX_RECOVERY_ATTEMPTS` ends every recovery regardless, including
`INSUFFICIENT_FUNDS`, which is deliberately uncapped per status precisely because availability
changes with time.

The stages themselves stay separate, which is a different question from where the counts live.
Recoverability must run first and cheap — before hydration, before shaping — while Pacing must run
last, because it reads what shaping produced. Their verdicts also differ in lifetime: a closure is
terminal and durable, a schedule is per-attempt and disposable.

## Consequences

- A ladder may be shorter or longer than its status's cap without either truncating the policy or
  stalling a recovery. Neither is a defect any more, so nothing needs to police the relationship.
- `consecutiveSameStatusCount` moved to `recoverability/counters.ts` and pacing imports it, so the
  dependency points the way the pipeline runs. It also now skips probes, which was harmless while it
  only chose a delay and is not once it decides a cap.
- Pacing no longer reports anything recovery-scoped. `RetryPlanDenied` carries no reason: a denial
  means only that this layer has no rung to offer.
- Statuses that had multi-rung ladders before the cap table existed carry explicit entries. The
  one-retry default is a rule for declines nobody has reasoned about, not a retroactive verdict on
  ones somebody had.
- The same reasoning applies to a decision not yet built. A zero-value authorization substituted for
  the real charge is a *request rewrite*, and Pacing's contract says it never rewrites the request.
  More concretely, `mandateDrift` — the guard that blocks unapproved changes to amount, currency and
  channel — runs at the end of Shaping, so an amount changed to zero during Pacing would route
  around the only check built to catch it. That swap belongs in Shaping when it is built.
