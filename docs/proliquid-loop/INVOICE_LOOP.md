# Proliquid Invoice Loop

## 1. Purpose

This document defines the complete invoice operating loop for Proliquid. It sets out how invoices should move from receipt to accounting entry creation in a controlled, auditable, and realistic manner for Luxembourg holding companies, SPVs, family offices, and investment structures.

The invoice loop exists to ensure that:

- documents are captured consistently
- invoice data is validated before accounting use
- classification follows Proliquid accounting rules
- ambiguous or material items are reviewed by humans
- accounting proposals are explainable and supportable
- each outcome leaves a reliable audit trail

This loop should be used as the reference process for all future invoice-related operations.

## 2. Scope

This loop applies to:

- supplier invoices
- customer invoices, where relevant to the entity
- fee notes and service invoices
- recurring administration invoices
- professional service invoices
- banking and support invoices
- invoices linked to investment, holding, or family office operations where accounting treatment is required

This loop does not authorize automatic final posting. It prepares accounting outcomes under controlled review.

## 3. Inputs

The invoice loop depends on a combination of documents, structure context, and accounting reference data.

### Minimum operating inputs

- the invoice document itself
- the target entity
- invoice date
- supplier or customer identity
- invoice amount and currency
- line or description content
- tax information where available

### Supporting contextual inputs

- entity purpose and structure profile
- known counterparties
- existing chart of accounts
- accounting rules
- prior invoice history
- payment status if already known
- reporting period context

If these inputs are incomplete, the invoice may still enter the loop, but it should not move to final accounting acceptance without sufficient evidence.

## 4. Accepted Document Sources

The loop should accept invoices from operationally realistic sources used by Luxembourg structures and their service providers.

### Accepted sources

- direct client upload
- internal team upload
- secure document room submission
- administrative collection from advisers or service providers
- structured invoice intake from a recurring vendor source
- invoice attached to a broader client file or reporting package

### Source acceptance principles

- the source must be attributable
- the document must be retained in a stable client record
- duplicate or superseded versions must be distinguishable
- the loop must preserve the original received document

Documents that arrive informally may still be ingested, but they should be flagged if provenance is unclear.

## 5. Invoice Intake Workflow

The invoice intake workflow begins at receipt and ends when the invoice is registered as a valid candidate for extraction and review.

### Workflow

Invoice Received  
Document Validation  
Data Extraction  
Classification  
Accounting Proposal  
Confidence Scoring  
Human Review if required  
Approval  
Accounting Entry Creation  
Audit Trail

### Intake steps

1. Identify the document as an invoice candidate.
2. associate it with the correct entity or structure
3. identify whether it is supplier-side or customer-side
4. record source, receipt date, and original document reference
5. mark whether the invoice is first-time, recurring, replacement, or duplicate

### Intake control rules

- each invoice must be tied to a specific entity before further processing
- duplicate-looking invoices must be flagged, not silently merged
- documents that are clearly not invoices should be routed out of the invoice loop
- invoices without enough visual or documentary integrity should move to exception handling

## 6. Data Extraction Workflow

The extraction workflow converts invoice content into structured candidate data for downstream validation and classification.

### Target extracted fields

- invoice number
- invoice date
- supplier or customer name
- currency
- subtotal
- VAT amount if any
- total amount
- due date if available
- line descriptions or service descriptions
- reference numbers or contractual references

### Extraction principles

- extraction is preparatory, not final
- extracted data must remain linked to the source document
- uncertain fields should be marked as uncertain rather than guessed silently
- line-level detail should be retained when it materially affects classification

### Extraction decision rule

If a field cannot be extracted confidently, the loop should preserve the ambiguity and move it forward for validation rather than inventing a value.

## 7. Validation Workflow

Validation determines whether the extracted invoice data is coherent enough to proceed.

### Validation checks

- is the document legible enough to support review
- is the document actually an invoice
- is the entity assignment correct
- is the counterparty identifiable
- are date, amount, and currency coherent
- does the tax breakdown appear internally consistent
- does the invoice belong to the relevant reporting period or require accrual handling

### Validation outcomes

- valid and ready for classification
- valid with warnings
- incomplete and routed for human review
- invalid and routed to exception handling

### Mandatory human validation cases

- missing supplier identity
- unclear total amount
- unclear VAT breakdown
- invoice appears to belong to another entity
- multiple materially different services with unclear allocation
- invoice appears to relate to financing, acquisition, restructuring, or distribution activity

## 8. Classification Workflow

Classification determines the likely accounting nature of the invoice in line with `ACCOUNTING_RULES.md`.

### Primary classification questions

- is this a supplier invoice or customer invoice
- is it operating, financing, investing, tax-related, or exceptional
- is the charge recurring or one-off
- is the charge expense, capitalizable, reimbursable, or linked to balance sheet activity
- does it relate to professional fees, administration, banking, governance, investment support, or another known category

### Classification rules

- classify based on economic purpose, not vendor name alone
- use the entity's known activity profile as a control input
- distinguish ordinary administration from governance-sensitive or structure-sensitive items
- do not force expense classification where the invoice may represent an asset, loan cost, transaction cost, or capital event

### Typical classification categories for target structures

- accounting and administration fees
- audit and tax fees
- legal and structuring costs
- banking fees
- regulatory or filing costs
- software and data tools
- investor reporting support
- investment or deal-related support costs
- reimbursable or pass-through items
- exceptional or special transaction costs

## 9. Accounting Proposal Workflow

The accounting proposal workflow converts a classified invoice into a draft accounting recommendation.

### Proposal contents

- proposed counterparty
- proposed accounting period
- proposed expense, revenue, payable, receivable, or VAT treatment
- proposed account or account group
- proposed narrative or description
- proposed split if multiple components are materially distinct

### Proposal rules

- proposals must follow the accounting philosophy already defined
- proposals must remain conservative where evidence is partial
- proposals must separate tax treatment from base expense or revenue classification
- proposals must not collapse ambiguity into false precision

### Special care areas

Human confirmation is strongly expected where the invoice may affect:

- shareholder or investor balances
- intercompany positions
- acquisition or disposal costs
- capital raising or funding activity
- distribution-related charges
- exceptional governance events

## 10. Confidence Scoring Process

Confidence scoring determines how much review is required before approval.

### High confidence

An invoice proposal may be treated as high confidence when:

- the document is complete and legible
- the counterparty is known
- the service description is clear
- the amount and tax logic are coherent
- the entity fit is obvious
- the category is recurring and stable
- no governance-sensitive feature is present

### Medium confidence

An invoice proposal is medium confidence when:

- the likely classification is clear but not fully routine
- the counterparty is known but the invoice is not yet a stable recurring pattern
- the line descriptions are usable but not ideal
- the VAT or account mapping requires light confirmation

### Low confidence

An invoice proposal is low confidence when:

- the invoice content is incomplete or vague
- the economic purpose is unclear
- multiple accounting outcomes are plausible
- the invoice may relate to capital, debt, intercompany, or exceptional activity
- VAT treatment is unclear
- the invoice is materially large

### Confidence rule

Confidence scoring supports routing and prioritization. It does not replace approval.

## 11. Human Review Process

Human review is the formal control step that determines whether the invoice proposal can be accepted, amended, or escalated.

### Human reviewers should confirm

- the invoice belongs to the correct entity
- the accounting category is appropriate
- the proposed account treatment is acceptable
- VAT treatment is supported
- the period treatment is correct
- the invoice is ordinary or exceptional in context

### Mandatory human review cases

- low-confidence invoices
- all ambiguous invoices
- high-value invoices
- related-party invoices
- invoices affecting financing, equity, investment, or distributions
- invoices with unclear VAT treatment
- invoices with split treatment that materially affects reporting

### Human review outcomes

- approve as proposed
- approve with adjustment
- return for clarification
- escalate
- reject as invalid or misrouted

## 12. Escalation Process

Escalation is required when invoice treatment cannot be resolved safely at routine review level.

### Escalation triggers

- unclear legal or tax characterization
- uncertainty over capital versus expense treatment
- unclear related-party implications
- uncertain cross-border VAT logic
- unusually large or sensitive invoices
- invoice linked to restructuring, acquisition, disposal, or financing activity
- unresolved contradiction between invoice content and business context

### Escalation expectations

- preserve the invoice and all extracted data
- capture the reason for escalation clearly
- assign the escalation to the right human owner
- separate known facts from open questions
- prevent silent progression to approval

## 13. Exception Management

Exception management ensures that problematic invoices remain visible and controlled.

### Common exception types

- duplicate invoice
- missing invoice data
- unreadable document
- unclear entity allocation
- unknown counterparty
- unclear VAT
- unclear period
- unsupported accounting treatment
- document that is not actually an invoice

### Exception handling rules

- exceptions must be categorized
- each exception must have an owner
- provisional treatment must not be mistaken for approved treatment
- unresolved material exceptions must block final accounting acceptance
- repeat exception patterns should be reviewed for process improvement

## 14. Audit Trail Requirements

The invoice loop must preserve a complete record of how the invoice moved from receipt to accounting outcome.

### Audit trail should capture

- source of receipt
- document version or source reference
- extracted data used for review
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
- the original invoice must remain linked to the final accounting outcome

## 15. Loop Success Criteria

The invoice loop is successful when it produces accounting-ready outcomes without sacrificing control.

### Operational success criteria

- invoices are captured quickly and consistently
- the correct entity is identified early
- extracted data is usable and explainable
- classification follows stable accounting rules
- ambiguous items are surfaced rather than hidden
- review effort is focused on the right invoices

### Control success criteria

- high-risk and high-value invoices receive human validation
- VAT-sensitive items are handled conservatively
- accounting proposals remain document-supported
- exception handling is explicit
- final accounting entries are traceable back to source invoices

### Service success criteria

- clients experience orderly follow-up rather than fragmented requests
- internal teams can see invoice status clearly
- recurring administration work becomes more consistent over time
- investor and reporting quality benefits from stronger document discipline

## Notes

This invoice loop should remain practical, conservative, and service-oriented. It is intended to support Luxembourg-focused financial administration with stronger consistency, clearer review rules, and a reliable bridge between source documents and accounting outcomes.
