# Proliquid Reconciliation Loop

## 1. Purpose

This document defines the complete reconciliation loop for Proliquid. It describes how source records should be matched, reviewed, resolved, and confirmed so that accounting records remain tied to real financial evidence for Luxembourg holding companies, SPVs, family offices, and investment structures.

The reconciliation loop exists to ensure that:

- financial records can be traced back to underlying source data
- payments and receipts are linked to the correct economic event
- bank activity, documents, and ledger outcomes remain coherent
- exceptions are surfaced early rather than hidden inside balances
- automation supports review without weakening control
- reconciliation decisions remain recoverable over time

This loop should be used as the reference process for all future Proliquid reconciliation operations.

## 2. Scope

This loop applies to reconciliation across:

- invoice to payment matching
- payment to invoice matching
- bank to ledger matching
- intercompany reconciliations
- shareholder transactions
- investment transactions
- distributions
- partial payments
- multiple payments against a single invoice
- multiple invoices paid in a single transaction

The loop covers both recurring operational reconciliation and period-end control work. It does not permit unresolved ambiguity to be treated as final merely because a numeric amount appears close.

## 3. Inputs

The reconciliation loop depends on multiple categories of source data and accounting context.

### Primary inputs

- supplier invoices
- customer invoices
- bank statements
- bank transaction lines
- business transactions
- journal entries
- open payables and receivables
- intercompany schedules
- shareholder and investor schedules

### Supporting contextual inputs

- entity profile and structure purpose
- chart of accounts
- accounting rules
- prior reconciliations
- period status
- known counterparties
- transaction narratives and references
- distribution or investment documentation where relevant

If source data is incomplete, the item may enter the reconciliation loop, but it should not be treated as fully reconciled until the evidentiary gap is resolved or explicitly accepted through controlled review.

## 4. Reconciliation Objectives

The reconciliation loop should serve a control purpose, not merely a bookkeeping convenience.

### Main objectives

- confirm that recorded accounting activity is supported by real source events
- confirm that payments and receipts are linked to the correct invoices, obligations, or financial movements
- distinguish operational flows from funding, investment, and distribution flows
- ensure open balances are real, explainable, and current
- identify unresolved items before reporting and close

### Control objectives

- preserve balance integrity
- reduce unexplained suspense-like positions
- support investor and management reporting reliability
- support audit readiness
- support clean period-end close

## 5. Matching Workflow

The reconciliation loop should follow a disciplined workflow rather than ad hoc manual matching.

### Workflow

Source Data Available  
Matching Candidates Identified  
Confidence Scoring  
Automatic Match if eligible  
Human Review if required  
Exception Queue  
Resolution  
Reconciliation Completed  
Audit Trail

### Workflow steps

1. gather all relevant source records for the entity and period
2. identify candidate relationships between records
3. assess the quality of the possible match
4. determine whether the match qualifies for automatic acceptance
5. route ambiguous or sensitive cases to human review
6. place unresolved items into the exception queue
7. resolve through evidence, judgment, or follow-up
8. mark only supported items as reconciled

## 6. Matching Rules

Matching must follow conservative principles and respect economic substance.

### Core matching signals

- amount
- date proximity
- currency
- counterparty identity
- document reference
- bank narrative
- invoice number
- known recurring pattern
- business context

### General matching rules

- a numeric amount alone is not enough for a final match where multiple interpretations remain plausible
- the strongest matches combine amount, timing, counterparty, and reference evidence
- the loop must prefer explainable matches over convenient matches
- one candidate should not be consumed by multiple final matches unless the structure of the settlement genuinely requires it

### Specific reconciliation patterns

#### Invoice to payment matching

- a payment may match one invoice, several invoices, or part of an invoice
- if a payment is smaller than the invoice, the unmatched balance must remain visible
- if a payment is larger, the excess must remain explainable and should not be absorbed silently

#### Payment to invoice matching

- incoming or outgoing bank movements may lead the reconciliation search when invoices are not yet linked
- the loop should identify the most plausible invoice population, but unresolved ambiguity must still be reviewed

#### Bank to ledger matching

- each bank movement should reconcile to the appropriate accounting event or approved open-item logic
- ledger movements that affect bank should be explainable against actual statement activity

#### Intercompany reconciliations

- intercompany balances require stronger bilateral support than ordinary trade items
- matching should consider both amount and business purpose
- unresolved intercompany balances should not be treated as routine open items indefinitely

#### Shareholder transactions

- shareholder-related flows must never be treated as routine revenue or expense without supporting evidence
- shareholder movements require classification discipline before reconciliation can be completed

#### Investment transactions and distributions

- subscriptions, acquisitions, disposals, proceeds, and distributions should be matched against governing support, not bank text alone
- related fees or taxes should be separated from the principal transaction where needed

## 7. Confidence Scoring Process

Confidence scoring determines how much control is needed before a match can be accepted.

### High confidence

A candidate match may be treated as high confidence when:

- amount matches exactly or near-exactly with a clear explanation
- currency matches
- counterparty is known
- timing is coherent
- references align
- the pattern is stable and non-sensitive
- no competing candidate creates credible ambiguity

### Medium confidence

A candidate match is medium confidence when:

- most evidence aligns, but one key element remains inferred
- timing or reference support is adequate but not definitive
- the economic relationship is plausible and routine, but not fully proven

Medium-confidence matches may be proposed and queued for review, but they should not be silently finalized where meaningful ambiguity remains.

### Low confidence

A candidate match is low confidence when:

- more than one credible match exists
- amount or timing only partially aligns
- the counterparty is uncertain
- the transaction may relate to funding, investment, intercompany, or distributions
- evidence is incomplete or contradictory
- the item is unusual or materially large

Low-confidence items must be reviewed by a human before any final reconciliation status is assigned.

## 8. Automatic Matching Rules

Automatic matching is permitted only when the control case is strong.

### Eligible automatic matches

Automatic matching may be allowed when:

- the match is high confidence
- there is no meaningful competing candidate
- the transaction is routine and non-sensitive
- the economic purpose is already well understood
- the entity pattern is stable
- the resulting treatment does not affect financing, equity, investment, intercompany, or distribution interpretation

### Automatic match exclusions

Automatic matching should not be used for:

- ambiguous cases
- high-value items
- intercompany items
- shareholder or investor items
- investment transactions
- distributions
- unusual partial settlements
- transactions with unresolved tax or legal implications

### Automatic matching rule

If there is any meaningful doubt about whether the match changes the interpretation of the underlying transaction, the item must not auto-match.

## 9. Human Review Process

Human review is the formal control step that determines whether a proposed reconciliation is acceptable.

### Human reviewers should confirm

- the matched records belong to the same economic event
- the settlement logic is coherent
- open balances remain correctly stated
- partial or grouped settlements are explained properly
- the match does not conceal a misclassification problem
- the resulting reconciliation status is supportable for reporting

### Mandatory human review cases

- low-confidence matches
- all ambiguous cases
- high-value items
- intercompany balances
- shareholder and investor transactions
- investment transactions
- distributions
- unusual many-to-one or one-to-many settlements
- items that remain open for an extended period

### Human review outcomes

- approve match
- approve match with adjustment
- reject proposed match
- split into separate candidate resolutions
- escalate
- move to exception queue

## 10. Escalation Process

Escalation is required when reconciliation cannot be resolved safely at routine review level.

### Escalation triggers

- unresolved ambiguity between multiple plausible matches
- reconciliation outcome depends on unclear legal or tax characterization
- shareholder, investor, or intercompany intent is unclear
- the item may affect distribution or investment treatment materially
- open balances appear stale, contradictory, or unsupported
- period-end reporting depends on unresolved matching

### Escalation expectations

- preserve the full evidence chain
- state clearly why the item cannot be resolved routinely
- identify the specific decision that requires judgment
- assign the escalation to the correct human owner
- keep the item visible until resolution is complete

## 11. Exception Management

Exception management ensures that unreconciled or problematic items remain controlled rather than buried.

### Common exception types

- unmatched invoice
- unmatched payment
- unmatched bank movement
- duplicate candidate
- conflicting candidate matches
- partial payment ambiguity
- grouped settlement ambiguity
- unsupported intercompany balance
- unclear shareholder flow
- unclear investment or distribution linkage

### Exception handling rules

- each exception must be categorized
- each exception must have an owner
- unresolved exceptions must remain visible across the period
- temporary assumptions must not be mistaken for final reconciliation
- material unresolved exceptions must be considered before reporting sign-off

## 12. Audit Trail Requirements

The reconciliation loop must preserve a full record of how a match was proposed, reviewed, accepted, or rejected.

### Audit trail should capture

- source records involved in the candidate match
- basis of the proposed match
- confidence level
- whether the item auto-matched or was reviewed manually
- reviewer decision
- escalations and exception status
- adjustments made during resolution
- final reconciliation status

### Audit trail principles

- every override must be visible
- every approval must be attributable
- every unresolved item must remain explainable
- the final reconciliation state must be reconstructable later

## 13. Period-End Reconciliation Process

Period-end reconciliation is the formal control pass that supports close and reporting reliability.

### Period-end priorities

- clear all routine high-confidence items
- review all aged open balances
- confirm bank-to-ledger completeness
- review all material unmatched items
- focus specifically on intercompany, shareholder, investment, and distribution positions
- identify items that could distort reporting if left unresolved

### Period-end rule

No item should be treated as immaterial by habit. Materiality must be judged in the context of the entity's actual scale, investor sensitivity, and reporting purpose.

## 14. Continuous Reconciliation Process

Reconciliation should not exist only at close. Continuous reconciliation improves control and reduces period-end pressure.

### Continuous reconciliation goals

- identify mismatches earlier
- reduce exception accumulation
- make invoice and bank workflows easier to review
- improve responsiveness to clients and service teams
- reduce the volume of last-minute reporting surprises

### Continuous reconciliation posture

- routine items should be reconciled as data becomes available
- unresolved items should enter a visible queue quickly
- recurring patterns should become easier to process over time
- sensitive categories should still remain review-driven

## 15. Loop Success Criteria

The reconciliation loop is successful when it improves both financial reliability and operational clarity.

### Operational success criteria

- matching candidates are identified consistently
- routine items are resolved without unnecessary delay
- partial and grouped settlements are handled explicitly
- exception queues remain understandable and actionable

### Control success criteria

- ambiguous cases receive human review
- high-risk categories are treated conservatively
- open balances are explainable
- bank and ledger positions remain coherent
- reconciliation decisions remain traceable over time

### Reporting success criteria

- period-end close is supported by cleaner open-item control
- shareholder, intercompany, investment, and distribution balances are more reliable
- investor and management reporting depend less on manual last-minute reconstruction

## Notes

This reconciliation loop should remain conservative, practical, and traceability-first. It is intended to strengthen confidence in Proliquid's accounting and reporting outputs by ensuring that matching decisions remain supportable, reviewable, and aligned with the realities of Luxembourg financial structures.
