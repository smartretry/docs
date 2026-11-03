# Recoverability judges with rules, not a score

The specification for this stage is written in terms of a probability. Certain statuses "force the
score to 0"; a score "above 0 but below a defined threshold (X%)" is not worth attempting; a risk
error "lowers the probability", repeated risk errors "lower it sharply", and each further error
"erodes it more". Read literally, the gate needs a calibrated model of how likely a recovery is to
succeed.

No such number exists anywhere in the platform. `successProbability` appears only inside
`services/backup/`, an unwired tactics subsystem, where it compares two concrete tactics against
each other rather than scoring a recovery. Building a real one is its own piece of work: inputs,
calibration against outcomes, somewhere to compute it, and evidence that the threshold separates
recoveries worth attempting from recoveries that are not.

**So the stage decides with explicit rules instead.** The two score-shaped closers become
statements about facts we actually hold:

- *Not recoverable at all on this instrument* is a fixed set of statuses — stolen, lost, pickup,
  account closed, authorisation revoked, stop payment order. No arithmetic reaches zero; the
  status is on the list or it is not.
- *Too low to be worth attempting* is a count of risk declines within the recovery. Two closes it.

The alternative considered and rejected was a score-shaped interface with a rules-based
implementation behind it, so the signature would be right when real scoring arrived. It was
rejected because a function returning `0.18` invites callers to trust a precision that is not
there, and the first consumer to branch on a range rather than the threshold would be reading
noise.

## Worked example

An issuer's historical approval rate through one acquirer for one merchant category is the closest
thing to a probability the platform holds. `BehaviorProfile` states plainly that every field on it
is "observed rather than declared… never a promise the issuer has made", and `sampleSize` is
profile-wide, so a given category rate cannot be traced to the number of observations behind it.
A rate of 0.18 means roughly one in five of these is approved. Treating it as a score to compare
against a threshold hides that; treating it as a rule — *below 20%, and only when the profile has
at least 500 observations behind it, stop attempting* — keeps the judgement legible and reviewable.

## Consequences

- The thresholds in this stage are policy constants, not model parameters. Changing one is a
  decision someone makes, not a retraining.
- The specification's gradient language has no implementation. "Repeated risk errors lower it
  sharply" is a flat count of two, and the difference is deliberate rather than an omission.
- If a genuine recoverability score is built later, these rules are what it must reproduce before
  it replaces them.
