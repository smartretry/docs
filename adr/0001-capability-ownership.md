# A fact lives where its owner is

Configuration was accumulating in the database by default, including facts no merchant owns. We
split it by asking who the fact belongs to.

**Facts about the outside world live in code.** What a payment provider supports, what a card
scheme requires, what a processor's API accepts — these are identical for every merchant, change
when a contract or an integration changes, and are meaningless to edit per-record. They belong in
versioned constants that deploy and roll back with the code that reads them, such as
`PaymentProcessorOptions` in `@smartretry/payment-constants`.

**Facts a merchant agreed to live in the database.** What a terminal is cleared to transact, what
a merchant authorises during a recovery, what a fee rule matches on — these differ per merchant,
are negotiated commercially, and must be changeable without a deploy. They belong in editable
collection data.

The test is not "is it a list of codes" but "who would have to be asked to change it". If the
answer is a vendor or a standards body, it is code. If the answer is one merchant, it is data.

## Worked example

Supported countries and currencies were modelled both ways at once: on `PaymentProvider` (what a
provider can process) and on `Terminals` (what a merchant is cleared for). Same value type,
entirely different owners. The provider side belongs in code; the terminal side belongs in the
database.

## Consequences

- Provider-side capability fields in the backoffice are therefore redundant. They stay editable
  while nothing reads them, which is a live source of confusion — `PaymentProvider`'s country
  fields should be removed.
- Merchant-owned configuration must be genuinely readable by the engine. A terminal policy the
  pipeline never loads is the same defect in the opposite direction, and was in fact true of the
  entire Recovery tab when this was written.
- A code-owned fact needs no admin UI. Adding one invites an operator to change something that
  will be silently overwritten by the next deploy.
