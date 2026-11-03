# Constrain a value only when we own both the set and the writer

Many fields draw their value from a known set — currencies, countries, card schemes, transaction
types, statuses, channels. The recurring question is whether the database should enforce that set
or accept whatever it is given. We answer it with one test:

> Enforce the set when we control **which values are legal** *and* **the code that writes the
> column**. If either belongs to someone else, store the value as given.

Both halves matter. Owning the set without owning the writer means a legitimate write fails.
Owning the writer without owning the set means we reject values that were correct when they were
produced. Only when we own both is enforcement free of downside.

Countries and currencies are where this surfaced, but the rule is about a value's role, not about
any particular field.

A second test qualifies the first: **enforcement is only worth as much as our ability to change our
mind about it.** Adding or removing a legal value rewrites the constraint, and on a table that is
large and constantly written that migration is not something anyone will realistically schedule.
Where the ownership test says "enforce" but the table makes the migration impractical, the table
wins. In practice the two tests agree, because the things we own tend to be the things that are
small.

## Corollaries

**Internal settings — enforce it.**
Configuration a person edits through the admin panel: terminals, risk policies, merchant and
merchant-account settings, groups, companies, user preferences. We define the legal values, the
admin panel is the only writer, and the tables are small — hundreds of rows, not millions — so a
typo should be impossible to persist and changing the set later is a routine migration.

**Operational records — do not enforce it.**
The rows that accumulate as the platform runs: transactions, orders, payers and payer snapshots,
future transactions, webhook attempts. Two reasons, and either alone is sufficient. The row states
what was true at the time, so it must stay able to hold a value we have since stopped offering — a
payment made in a currency we no longer support does not become invalid. And these are the tables
that grow without bound and are written constantly, so retrofitting or amending a constraint means
a rewrite nobody will ever schedule. Store the value as given.

**A value arriving from outside — do not enforce it.**
The writer is a feed, an integration, or a provider response, and it answers to someone else.
`currency_rates` is filled by `functions/sync-currency-rates` from an external provider;
constraining it turns an unfamiliar code from a surprising row into a failed import. Storing a
value we do not recognise beats dropping the data.

**A set another entity owns — reference it, do not copy it.**
Where the legal values are themselves records elsewhere in the system, point at them rather than
duplicating their identifiers as loose strings. Card schemes on terminals and on merchant fee
conditions are resolved from the payment-provider product registry at runtime, so there is no
fixed set to enforce; a reference keeps the value tied to its source and unable to drift from it.

Volume is a good proxy for these cases but not a substitute for them. `currency_rates` holds 11,331
rows — more than any settings table — yet it is neither an operational record nor ours to enforce,
because an external job writes it. Ask who owns the set, who writes the column, and whether the
migration is one we would ever actually run.

## What this means in the database

An enforced value becomes a database-level enumeration; an unenforced one is stored as free text.
For a single value the two occupy the same column on the same row and differ only in what they
will accept, so enforcing costs nothing structurally. A list of values needs somewhere to put the
repetition, and there the shapes genuinely differ:

- An **enforced list** gets a table of its own, one row per value, keyed to its parent.
- A **reference list** gets a row per value carrying a real foreign key to the record it names.
- An **unenforced list** is the shape to avoid. Every unenforced list on a collection is funnelled
  into a single shared table for that collection, discriminated by a string naming the field it
  came from — so unrelated lists share storage, the value carries no constraint at all, and every
  reader must filter on that string. A list that genuinely should not be enforced belongs in a
  reference or its own modelled shape, never in the shared bag.

The price of enforcement is that adding a member to the set becomes a schema migration. For sets
fixed by standards bodies that is rare, and it falls on configuration tables, which are small.

One operational trap: the generated names for a list's table and its enumeration derive from the
field's full path, and Postgres caps identifiers at 63 characters, so a deeply nested field fails
at startup. Name those explicitly — `merchants…conditions.issuer_countries` and
`payment_providers…processor_membership.processing_countries` are the worked examples.

`backoffice/src/fields/CountryField.ts` and `CurrencyField.ts` encode this rule for the two fields
that prompted it, and are the reference for how it is applied.
