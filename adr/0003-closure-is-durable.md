# A terminal state belongs in durable storage

A recovery is closed when it will produce no further attempts. Closure is irreversible: nothing
re-opens a closed recovery, and pursuing the payment again means a new transaction, which opens a
recovery of its own. That property is what decides where the fact is kept.

Every other recovery-scoped fact in `apps/transaction-preflight` lives in Redis, in the snapshot
`RecoveryDecisionsRepository` maintains — refused mandate terms, spent instruments, exhausted
silent sources. That store is deliberately **fail-open** on read: its own documentation says a
Redis outage "loses at most a recorded refusal or an exhausted source — costing one redundant
prompt or lookup, never blocking a recovery that would otherwise proceed." It also carries a
30-day TTL.

Both properties are correct for a recorded refusal and wrong for a closure. A fail-open read of a
closure silently re-opens it; a TTL silently expires it. The failure is invisible in both cases —
the recovery simply resumes attempting a payment we had decided to stop attempting, and nothing
in the system records that a decision was lost.

**Closure is therefore written to `recovery_plans`, and read from it.** The table already exists,
already carries the `active | recovered | exhausted | cancelled` lifecycle, and is already visible
to operators. `RecoveryPlanRepository` inverts the convention its neighbour follows: it **fails
closed** on read. A plan we cannot read is not treated as open.

## Worked example

The merchant tells us to stop — the payment was taken by other means. That instruction arrives
through the Console or the API and has no representation in any transaction payload; the only way
a later pass learns of it is by reading something written when it arrived. Held in Redis it would
be one outage away from being ignored, and one month away from expiring, while the recovery it was
meant to stop keeps drawing PSP fees. Held in `recovery_plans` it is a row that stays a row.

## Consequences

- Step 1 of the pipeline gains a Postgres read where it previously had none. It is cacheable, but
  it is on the hot path of every message and is not free.
- The two recovery-scoped stores now disagree about failure semantics on purpose. `RecoveryDecisions`
  fails open, `RecoveryPlan` fails closed, and the reason is the reversibility of what each holds.
  Neither should be changed to match the other.
- `plan_id` is not a minted identifier. It is the value `resolveRecoveryId` already derives from
  the originating attempt's `friendlyId`, so the recovery has one identity rather than two that
  must be joined.
- Recoverability writes closures and nothing else. `recovered` is an approval outcome this stage
  never observes; whatever handles the return path from the payment processor will own it.
