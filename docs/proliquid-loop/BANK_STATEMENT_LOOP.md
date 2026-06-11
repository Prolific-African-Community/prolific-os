# Proliquid Bank Statement Loop

## 1. Purpose

This document defines the complete bank statement loop for Proliquid. It describes how bank statements and the transactions they contain should move from receipt to accounting entry creation in a controlled, auditable, and realistic manner for Luxembourg holding companies, SPVs, family offices, and investment structures.

The bank statement loop exists to ensure that:

- bank movements are captured consistently
- statement data is validated before accounting use
- transaction classification follows Proliquid accounting rules
- incoming and outgoing funds are interpreted using substance, not bank wording alone
- high-risk and high-value movements remain subject to human judgment
- every final accounting outcome is supported by a reliable audit trail

This loop should be used as the reference process for all future bank-statement-driven operations.

## 2. Scope

This loop applies to:

- full bank statements
- partial statement files where operationally accepted
- recurring statement imports
- historical statement backfills where accounting work is required
- bank-driven transaction analysis for current-period accounting

The loop covers:

- incoming transfers
- outgoing transfers
- bank fees
- tax payments and tax receipts
- intercompany transactions
- investment-related flows
- distributions
- interest-related flows
- internal account transfers

This loop does not authorize automatic final posting. It prepares controlled accounting outcomes under review.

## 3. Inputs

The bank statement loop depends on source files, entity context, and accounting reference data.

### Minimum operating inputs

- the bank statement document or file
- the target entity
- bank account identity
- statement date range
- opening and closing balances where available
- transaction lines with dates, amounts, directions, and references

### Supporting contextual inputs

- known bank accounts for the entity
- chart of accounts
- accounting rules
- known counterparties
- invoice and document history
- shareholder, investor, and intercompany context
- period status and reporting context

If these inputs are incomplete, the statement may still enter the loop, but transactions should not progress to final accounting acceptance without sufficient validation.

## 4. Accepted Bank Statement Sources

The bank statement loop should support the statement formats most relevant to Luxembourg structures and financial administration work.

### Accepted formats

- MT940
- CAMT.053
- CSV
- PDF

### Source acceptance principles

- the source must be attributable to a known bank account or known banking relationship
- the statement period must be identifiable
- the original file must be preserved
- statement version or source reference must remain recoverable
- PDF statements may be accepted even if they require more human review

### Relative strength of sources

- CAMT.053 and MT940 are generally stronger for structured transaction interpretation
- CSV is acceptable where the format is stable and attributable
- PDF is acceptable, but it should be treated as a higher-review source when parsing certainty is lower

## 5. Statement Intake Workflow

The statement intake workflow begins at receipt and ends when the statement is registered as a valid candidate for transaction extraction and review.

### Workflow

Bank Statement Received  
Statement Validation  
Transaction Extraction  
Transaction Classification  
Accounting Proposal  
Confidence Scoring  
Human Review if required  
Approval  
Accounting Entry Creation  
Audit Trail

### Intake steps

1. identify the file as a bank statement candidate
2. associate it with the correct entity
3. associate it with the correct bank account where possible
4. record source, receipt date, and original document reference
5. determine statement format and period coverage
6. flag possible duplicates, overlaps, or replacements

### Intake control rules

- each statement must be assigned to a specific entity before further processing
- overlapping statements must be flagged rather than silently absorbed
- unknown bank accounts must be reviewed before transaction use
- unsupported or unclear files should move to exception handling

## 6. Transaction Extraction Workflow

The extraction workflow converts statement content into structured transaction candidates.

### Target extracted fields

- transaction date
- value date if available
- debit or credit direction
- amount
- currency
- narrative or reference text
- counterparty name where available
- bank account identifiers where available
- running balance or statement balance context where available

### Extraction principles

- extraction is preparatory, not final
- each transaction candidate must remain linked to its statement source
- uncertain fields should remain marked as uncertain
- the loop should preserve the original transaction narrative even when a structured interpretation is proposed

### Format-specific posture

- MT940 and CAMT.053 should normally provide stronger structured extraction
- CSV extraction quality depends on the consistency of the bank export
- PDF extraction should be treated more conservatively, especially where fields are visually ambiguous

## 7. Transaction Validation Workflow

Validation determines whether the extracted statement and transaction data is coherent enough to proceed.

### Statement-level validation checks

- does the file appear to be a real bank statement
- is the entity assignment correct
- is the bank account identifiable
- is the statement period coherent
- are balances plausible and internally consistent where available

### Transaction-level validation checks

- does each line have a usable date and amount
- is direction clear
- is currency clear
- is the narrative usable
- are there duplicate-looking transactions
- do the totals and balances support reliable use

### Validation outcomes

- valid and ready for classification
- valid with warnings
- incomplete and routed for human review
- invalid and routed to exception handling

### Mandatory human validation cases

- uncertain bank account ownership
- unclear opening or closing balance context
- materially incomplete transaction narratives
- duplicate or overlapping transactions
- suspiciously missing lines or balance gaps
- statement appears altered, truncated, or inconsistent

## 8. Transaction Classification Workflow

Classification determines the likely accounting nature of each bank movement in line with `ACCOUNTING_RULES.md`.

### Primary classification questions

- is the movement incoming or outgoing
- is it operational, financing, investing, tax-related, or internal
- is it linked to a known invoice, document, contract, or recurring pattern
- is it likely revenue, expense, funding, loan activity, capital movement, distribution, or transfer

### Core transaction categories

The loop should distinguish clearly between:

- incoming operating receipts
- outgoing operating payments
- bank fees
- tax payments and tax refunds
- intercompany transfers
- shareholder or investor funding
- loan drawdowns or repayments
- investment subscriptions or acquisitions
- investment disposals or proceeds
- distributions and dividend-related flows
- internal transfers between entity-linked accounts

### Classification rules

- the bank reference alone is never enough for final classification when multiple interpretations are plausible
- unexplained incoming funds must not be assumed to be revenue
- unexplained outgoing funds must not be assumed to be expense
- intercompany, shareholder, investor, and investment-related flows require stronger scrutiny
- recurring known fees or stable recurring operating items may be proposed more confidently if prior treatment is consistent

## 9. Accounting Proposal Workflow

The accounting proposal workflow converts a classified transaction into a draft accounting recommendation.

### Proposal contents

- proposed counterparty
- proposed accounting period
- proposed account or account group
- proposed balance sheet or profit and loss treatment
- proposed VAT relevance if any
- proposed narrative
- proposed matching link to an invoice, document, or known business event where available

### Proposal rules

- proposals must follow the accounting philosophy already defined
- proposals must reflect economic substance, not only narrative keywords
- proposals must remain conservative where evidence is partial
- proposals must separate operational expense flows from financing, investment, tax, and distribution flows
- proposals must not conceal uncertainty behind over-specific coding

### Special care areas

Human confirmation is strongly expected where the transaction may affect:

- shareholder or investor balances
- intercompany balances
- capital accounts
- loans
- investment positions
- distributions
- tax-sensitive treatment

## 10. Confidence Scoring Process

Confidence scoring determines how much review is required before approval.

### High confidence

A bank transaction proposal may be treated as high confidence when:

- the statement source is reliable
- the bank account is known
- the transaction narrative is clear
- the counterparty is known
- the pattern is recurring
- the accounting treatment is stable
- no governance-sensitive feature is present

### Medium confidence

A bank transaction proposal is medium confidence when:

- the likely treatment is clear but not fully routine
- the counterparty is probable but not certain
- a document or invoice link is likely but not definitive
- the transaction is ordinary but not strongly pattern-based

Medium-confidence items may be prepared automatically, but they should remain visible for review before final acceptance.

### Low confidence

A bank transaction proposal is low confidence when:

- the source is weak or partially unclear
- the narrative is vague
- the movement may be funding, loan, capital, intercompany, investment, or distribution related
- multiple accounting outcomes are plausible
- the transaction is unusual or materially large
- the tax treatment is unclear

Low-confidence items must be escalated for explicit human validation.

## 11. Human Review Process

Human review is the formal control step that determines whether the bank transaction proposal can be accepted, amended, or escalated.

### Human reviewers should confirm

- the statement belongs to the correct entity and account
- the transaction classification reflects real economic purpose
- the proposed account treatment is appropriate
- linked invoices or supporting documents make sense
- tax treatment is appropriate where relevant
- the transaction is ordinary or exceptional in context

### Mandatory human review cases

- low-confidence transactions
- all ambiguous transactions
- high-value transactions
- related-party, intercompany, shareholder, or investor transactions
- investment subscriptions, acquisitions, disposals, or proceeds
- distributions
- unclear tax payments or tax refunds
- internal transfers where destination or purpose is unclear

### Human review outcomes

- approve as proposed
- approve with adjustment
- return for clarification
- escalate
- reject as invalid or misrouted

## 12. Escalation Process

Escalation is required when bank transaction treatment cannot be resolved safely at routine review level.

### Escalation triggers

- unclear legal or tax characterization
- uncertainty over revenue, funding, loan, or distribution treatment
- unclear related-party or intercompany implications
- large incoming or outgoing transfers without sufficient support
- unclear investment-related movement
- contradiction between statement narrative and known business context
- unresolved statement integrity concern

### Escalation expectations

- preserve the full statement and extracted transaction data
- capture the reason for escalation clearly
- assign the escalation to the right human owner
- distinguish known facts from open questions
- prevent silent progression to approval

## 13. Exception Management

Exception management ensures that problematic statements and transactions remain visible and controlled.

### Common exception types

- duplicate statement
- overlapping statement coverage
- unknown bank account
- unreadable or incomplete file
- duplicate transaction
- missing or weak transaction narrative
- unclear entity allocation
- unclear counterparty
- unsupported classification
- suspicious balance inconsistency

### Exception handling rules

- exceptions must be categorized
- each exception must have an owner
- provisional treatment must not be mistaken for approved treatment
- unresolved material exceptions must block final accounting acceptance
- repeated exception patterns should be reviewed for process improvement or source normalization

## 14. Audit Trail Requirements

The bank statement loop must preserve a complete record of how the statement and each transaction moved from receipt to accounting outcome.

### Audit trail should capture

- source of receipt
- statement format and source reference
- entity and bank account assignment
- extracted transaction data
- validation outcome
- classification outcome
- accounting proposal
- confidence level
- human review outcome
- escalations and exception status
- final approval basis
- resulting accounting entry reference

### Audit trail principles

- every material override must be visible
- every approval must be attributable
- every escalation must be recoverable
- the original statement must remain linked to the final accounting outcome
- bank-transaction decisions should remain explainable during later reconciliation and reporting review

## 15. Loop Success Criteria

The bank statement loop is successful when it produces accounting-ready transaction outcomes without weakening financial control.

### Operational success criteria

- statements are captured quickly and consistently
- the correct entity and bank account are identified early
- extracted transaction data is usable and explainable
- classification follows stable accounting rules
- ambiguous and high-risk movements are surfaced rather than hidden
- review effort is focused on the right transactions

### Control success criteria

- high-risk and high-value movements receive human validation
- intercompany, investment, shareholder, and distribution flows are treated conservatively
- tax-sensitive items are not inferred casually
- exception handling is explicit
- final accounting entries remain traceable to statement source and transaction context

### Service success criteria

- clients experience more orderly banking follow-up
- internal teams can see statement and transaction status clearly
- recurring bank processing becomes more consistent over time
- accounting and reporting quality benefit from stronger bank-data discipline

## Notes

This bank statement loop should remain practical, conservative, and service-oriented. It is intended to support Luxembourg-focused financial administration with stronger consistency, clearer review rules, and a reliable bridge between bank data and accounting outcomes.
