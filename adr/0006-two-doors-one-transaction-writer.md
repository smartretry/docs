# Two doors, one transaction writer

A merchant reaches the platform through `terminal`: a trusted server, on a private network, sending
a payment it already has the card for. A payer reaches it through the Hosted Payment Page: an
anonymous browser, on the public internet, that has not yet typed anything. Those are two different
callers with two different threat models, and the temptation is to serve both from `terminal`
because the transaction types are the same three — preauth, sale, recurring init.

**The split runs along who is calling, not along what is being transacted.** `apps/hpp` is the
payer's door and the only internet-facing service; `terminal` stays the merchant's door and remains
unreachable from outside. HPP holds the payer session, the payment-method offer, the wallet
handshakes and — later — the 3DS return. It never writes `transactions`. Every transaction is
created and advanced by `terminal`, called server-to-server.

Two other splits were considered and rejected:

- **Splitting by 3DS** — a service owning 3DS-authenticated transactions while `terminal` keeps
  direct ones. 3DS is already a stage in the routing pipeline (`apps/3ds`, a queue consumer reached
  via `transaction-preflight` → `route` → `risk` → `select`). A service that owns 3DS transactions
  end-to-end would need its own copy of that pipeline and would become a second writer of
  `transactions`, so the same payment would have two owners depending on how the issuer felt about
  it.
- **Payer routes inside `terminal`, separated by a route prefix.** `terminal` had no authentication
  at all when this was decided — the only thing protecting `POST /v1/payments/sale/:terminal_id`
  was that nothing internet-facing could reach it. A browser-reachable route in that process turns
  `terminal_friendly_id` into an enumeration target on the same day it ships.

Merchant authentication (`x-api-key`, per merchant) is implemented in `terminal` alone. HPP has no
merchant credential and cannot acquire one: `backoffice` stores only `hashIndex(plaintext)` and a
masked copy, so no service can recover a merchant's key to present it. HPP therefore calls
`terminal` under its own service identity, and the URL consistency check — terminal, order and
transaction must all agree — is authorization on top of that, not a substitute for it.

## Consequences

- Two calls create one payment. The merchant's create call persists a transaction in `PROCESSING`
  and **must not publish to `transaction-preflight`**: routing, risk and selection all need a BIN
  that does not exist until the payer types one. The payer's submit call attaches the instrument and
  publishes. Every existing controller publishes on persist, so this is the one place the pattern is
  deliberately broken.
- `terminal` authentication becomes a prerequisite of this work rather than a follow-up, and it must
  assert that the path terminal belongs to the authenticated merchant. That check answers **404, not
  403** — a 403 confirms the terminal exists and turns `friendly_id` into an oracle.
- The page URL is `${orderId}/${transactionId}` — two identifiers that the platform prints in status
  responses, webhooks and the console, deliberately used where a credential would normally go. It is
  a considered trade-off, resting on the payer only learning them after the transaction completes.
  It leaves a leaked pair working as a card-entry form for as long as the transaction stays open,
  which is currently forever (see below). A random token stored hashed on `transactions` is the
  reversal if that becomes a problem.
- An abandoned page leaves a `PROCESSING` transaction that never reaches a terminal status, so it
  never fires a webhook and sits in the approval-rate denominator. Accepted debt; the sweeper that
  closes it is not built.
- 3DS is out of scope for the first cut. `apps/3ds` does not resume the pipeline today
  (`app.ts`, `TODO: Send to next queue if needed`), and nothing in the platform can serve a
  challenge to a browser — `terminal` and `payment-processors` are the only services with HTTP
  routes. When it lands, the challenge is discovered through the same status-polling channel as
  every other payer action, not as a 3DS-shaped exception beside it.
- A payer session's `Step` therefore has states nobody writes yet: HPP writes `STARTED` at page open
  and `COMPLETED` at submit, while `WAITING` waits on 3DS and `TIMEOUT` on the sweeper.
- The redirect back to the merchant is signed with `HMAC-SHA256` over the terminal's redirect
  secret, and remains a UX hint. Fulfilment hangs off the webhook or a server-side status call,
  because payers close tabs and redirects get lost.
