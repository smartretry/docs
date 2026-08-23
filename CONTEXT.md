# SmartRetry Documentation

Vocabulary for the SmartRetry API documentation site. These terms carry specific
meanings in payments and data protection, and using them loosely produces claims
that are legally or technically wrong. This file is a glossary only.

## Language

### Product

**Terminal**:
A merchant account configuration that determines routing and optimization. Identified
by `terminal_friendly_id` and passed as a path parameter on payment requests.
_Avoid_: Account, merchant account, endpoint

**Merchant**:
The business integrating SmartRetry. The party that holds the agreement with us.
_Avoid_: Client, customer, user

**Payer**:
The cardholder making a payment to a merchant. Never a SmartRetry user.
_Avoid_: Customer, buyer, end user

**Retry**:
A reconstructed transaction attempt with optimized parameters after a decline. Not a
resubmission of the same request.
_Avoid_: Resubmit, repeat, replay

### Access

**User Master**:
The dashboard role that manages a client account and creates additional users.
_Avoid_: Admin, administrator, owner, superuser

**User**:
The dashboard role with day-to-day operational access.
_Avoid_: Viewer, member, standard user

### Data protection

**Controller**:
The merchant. Determines the purposes and means of processing payer data.

**Processor**:
SmartRetry. Handles transaction data on the merchant's instruction, under the
agreement between us.

**Does not store card data**:
SmartRetry retains no card numbers or CVV after a transaction reaches final status.
This is a statement about retention only.

**PCI scope**:
SmartRetry transmits cardholder data and is therefore in PCI DSS scope as a service
provider, regardless of not storing it. Never write that SmartRetry is "out of PCI
scope" or "does not touch card data" - not storing and not being in scope are
different claims, and only the first is true. Tokenized flows reduce the *merchant's*
scope, not SmartRetry's.

**Token**:
The 88-character payment instrument reference used in place of raw card details on
repeat charges. Distinct from `provider_token`, which is processor-issued. The
relationship between the two is currently described inconsistently across
`integration/rest-api.mdx` and `api-reference/payments/status.mdx`.
_Avoid_: Vault reference, card token
