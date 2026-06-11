# Loop Implementation Roadmap

## Purpose

This document identifies the shortest realistic path from the current Proliquid product state to the first working AI-assisted operational loop.

It uses the documented current product state, backlog, decisions, and loop definitions to answer one practical question:

**What should Proliquid build next, in what order, to move from a functioning internal accounting platform to a controlled AI-assisted operating product?**

This roadmap is intentionally execution-oriented. It reflects the actual codebase state rather than an idealized target state.

---

## Strategic Starting Point

### What already exists

The current product already has:

- authenticated multi-tenant access
- organization and entity administration
- strict permissions
- entity workspace
- accounting setup
- custom accounts and accounting rules
- accounting periods
- business transactions
- draft journal entry generation
- posting and reversal
- reporting
- audit logs
- real document upload with private storage and secure download

### What does not yet exist

The current product does **not** yet have:

- OCR or structured extraction
- invoice processing workflow
- bank statement processing workflow
- reconciliation workflow
- review queue
- confidence scoring engine
- AI-assisted accounting proposal workflow
- investor-reporting workflow enhancements beyond current accounting reports

### Shortest-path principle

The shortest path is not “add AI first.”

The shortest path is:

1. turn uploaded documents into structured operational records
2. add review and exception control
3. add invoice loop support first
4. then bank statement loop
5. then reconciliation
6. only then expand AI assistance and external reporting sophistication

This sequencing is consistent with the current codebase and with the documented control philosophy.

---

## Missing Capabilities Analysis

## 1. Structured document intake state

**Current state**

- Documents can be uploaded, categorized, linked to an entity, and optionally linked to counterparties or transactions.
- Files are stored privately and can be opened securely.
- Documents remain mostly passive records after upload.

**Target state**

- Documents become active workflow objects.
- Each uploaded invoice or bank statement can move through intake, validation, review, and downstream accounting preparation states.

**Complexity**

- **Medium**

**Dependencies**

- Existing document model and upload flow
- Entity permissions
- Audit trail
- Additional workflow/status fields or linked workflow records

---

## 2. Invoice extraction and validation

**Current state**

- Supplier/customer invoice document types exist.
- No extraction, validation, or structured invoice record is present.

**Target state**

- Uploaded invoice documents produce structured invoice candidates with core fields:
  - counterparty
  - invoice number
  - date
  - amount
  - currency
  - VAT indicators
  - description
- Each invoice candidate can be validated before accounting use.

**Complexity**

- **High**

**Dependencies**

- Structured document intake
- Counterparty support
- Accounting rules baseline
- Human review checkpoints
- Confidence scoring

---

## 3. Bank statement ingestion and transaction extraction

**Current state**

- Bank-statement document type exists.
- No statement parsing, transaction extraction, or bank-account-centered workflow exists.

**Target state**

- MT940, CAMT.053, CSV, and PDF statements can enter a bank statement loop.
- Statement records produce transaction candidates for validation and classification.

**Complexity**

- **High**

**Dependencies**

- Structured document intake
- Bank account business object and ownership logic
- Review queue
- Confidence scoring
- Conservative transaction classification rules

---

## 4. Reconciliation workflow

**Current state**

- Accounting records, documents, transactions, and journal entries exist.
- No dedicated reconciliation objects, queues, statuses, or matching workflow exist.

**Target state**

- The product supports invoice-to-payment, payment-to-invoice, bank-to-ledger, intercompany, shareholder, investment, and distribution reconciliation under controlled review.

**Complexity**

- **High**

**Dependencies**

- Invoice loop output
- Bank statement loop output
- Matching candidates model
- Review queue
- Exception handling
- Strong audit trail

---

## 5. Review queue and exception management

**Current state**

- Review happens implicitly through user actions and status changes.
- There is no explicit queue for pending review, ambiguous items, escalations, or exceptions.

**Target state**

- A visible work queue exists for:
  - pending invoice review
  - pending statement review
  - pending accounting proposal review
  - pending reconciliation review
  - exception handling

**Complexity**

- **Medium**

**Dependencies**

- Shared workflow states
- Shared exception taxonomy
- Permissions
- Audit logging

---

## 6. Confidence scoring

**Current state**

- No formal confidence model exists in the product.
- Review remains entirely manual.

**Target state**

- The product can assign confidence levels to extracted data, classifications, proposals, and matches.
- Confidence determines whether an item can proceed directly, requires review, or enters exception handling.

**Complexity**

- **Medium**

**Dependencies**

- Structured inputs
- Clear decision rules from accounting policies
- Review queue
- Explicit escalation thresholds

---

## 7. AI-assisted accounting proposals

**Current state**

- Accounting proposals are rule-based only through explicit transaction creation.
- No AI-assisted proposal layer exists for documents or statement transactions.

**Target state**

- The product can generate draft accounting suggestions from invoice and bank-statement workflows.
- Suggestions remain human-controlled and auditable.

**Complexity**

- **High**

**Dependencies**

- Invoice loop MVP
- Bank statement loop MVP
- Confidence scoring
- Review queue
- Audit logging of proposals, overrides, and approvals

---

## 8. Investor reporting enhancements

**Current state**

- Trial Balance and General Ledger exist.
- Reporting is accounting-focused rather than investor-pack focused.

**Target state**

- External-facing reporting layers become more usable for investors, family offices, and stakeholders, with stronger readiness visibility and controlled release.

**Complexity**

- **Medium**

**Dependencies**

- Better reconciliation coverage
- Better review control
- Clear reporting statuses
- Strong portal entitlements

---

## Phase 1 — Quick Wins Using Existing Architecture

## Objective

Use the current entity-first platform, document upload, permissions, audit, and accounting setup to create the minimum operating foundation for loops without rebuilding the product.

## Scope

- Introduce workflow statuses for uploaded operational documents
- Distinguish invoices from bank statements operationally, not only by document type
- Add visible review states and exception states
- Add a lightweight review queue in the entity workspace
- Add operational counts for:
  - pending review
  - exceptions
  - approved items awaiting accounting action

## Expected business value

- Makes the existing document capability operational rather than passive
- Gives internal teams a controlled place to work from
- Creates the first visible operating loop behavior without AI
- Reduces reliance on scattered follow-up outside the platform

## Required database changes

- Likely required
- Minimum likely additions:
  - workflow/status enrichment for documents or linked workflow items
  - exception / review status support
  - assignment or reviewer fields if queue ownership is needed

## Required UI changes

- Documents tab becomes workflow-aware
- Add pending review / exception sections or queue views
- Add visible status progression
- Add simple reviewer actions such as:
  - validate
  - mark incomplete
  - escalate

## Required API changes

- Document list/filter expansion
- Endpoints to update operational status
- Queue-style endpoints or filtered list responses

## Required AI components

- None required in this phase

## Reality check

This is the fastest credible step because it reuses the architecture that already exists. It does not require AI to start behaving like an operating system.

---

## Phase 2 — Invoice Loop MVP

## Objective

Deliver the first working AI-assisted operational loop using invoices as the starting point.

## Scope

- Intake invoices from uploaded documents
- Create structured invoice candidates
- Validate core fields
- Propose classification and draft accounting treatment
- Route ambiguous or sensitive items to human review
- Allow approval to create accounting entries

## Expected business value

- Converts uploaded invoice documents into real accounting work
- Creates the first concrete example of AI assistance with human control
- Directly supports accounting production for Luxembourg entities
- Demonstrates differentiated operational value quickly

## Required database changes

- Likely required
- Minimum likely additions:
  - invoice business object
  - extracted invoice fields
  - validation status
  - confidence score
  - review outcome
  - proposal/approval trace

## Required UI changes

- Invoice workflow view inside Documents or a dedicated operational submodule
- Structured invoice detail screen
- Validation warnings
- Review and approval actions
- Clear accounting proposal display

## Required API changes

- Invoice intake endpoints
- Validation/classification/proposal endpoints
- Approval endpoint to create accounting entry or transaction/journal draft
- Status/history retrieval endpoints

## Required AI components

- Field extraction assistance
- Classification assistance
- Confidence scoring
- Draft accounting proposal assistance

## Reality check

This is the best first AI-assisted loop because:

- documents already exist
- accounting engine already exists
- audit already exists
- human control doctrine is already defined

It is materially easier than starting with bank statements or reconciliation.

---

## Phase 3 — Bank Statement Loop MVP

## Objective

Turn uploaded bank statements into controlled transaction candidates and draft accounting proposals.

## Scope

- Ingest MT940, CAMT.053, CSV, and PDF statements
- Validate statement ownership and period coverage
- Extract statement transaction lines
- Classify transaction candidates
- Prepare accounting proposals
- Route sensitive items for review

## Expected business value

- Expands the platform from document-backed invoice work into cash-movement operations
- Supports accounting throughput more directly
- Creates the foundation for reconciliation
- Improves period-close readiness

## Required database changes

- Likely required
- Minimum likely additions:
  - bank account business object if not yet formalized
  - bank statement object
  - statement transaction object
  - extraction and review statuses
  - confidence / exception fields

## Required UI changes

- Bank statement intake and review surface
- Statement-level and line-level validation views
- Classification review interface
- Approval flow for transaction candidates

## Required API changes

- Statement upload/intake workflow endpoints
- Extraction result endpoints
- Classification and proposal endpoints
- Review and approval endpoints

## Required AI components

- Statement parsing assistance, especially for weaker formats
- Transaction narrative interpretation assistance
- Confidence scoring
- Draft accounting proposal assistance

## Reality check

This phase is more difficult than invoices because bank text is ambiguous and accounting substance is harder to infer. It should not be attempted before the invoice review/control pattern is proven.

---

## Phase 4 — Reconciliation Loop MVP

## Objective

Introduce controlled matching between invoices, payments, bank transactions, and ledger outcomes.

## Scope

- invoice-to-payment matching
- payment-to-invoice matching
- bank-to-ledger matching
- partial payment handling
- grouped payment handling
- exception queue for unresolved matches

## Expected business value

- Improves control and traceability
- Makes reports more credible
- Reduces unresolved open items
- Creates the bridge from “documents processed” to “books controlled”

## Required database changes

- Almost certainly required
- Minimum likely additions:
  - reconciliation object
  - reconciliation line or match object
  - match status
  - confidence score
  - exception reason
  - resolution history

## Required UI changes

- Reconciliation queue
- Candidate matching view
- Partial settlement and grouped settlement display
- Reviewer resolution controls

## Required API changes

- Matching candidate generation endpoints
- Match acceptance/rejection endpoints
- Exception and resolution endpoints
- Reconciliation status endpoints

## Required AI components

- Candidate ranking
- Confidence scoring
- Match suggestion assistance

## Reality check

Reconciliation should not be rushed. Without the prior invoice and bank loops, reconciliation becomes guesswork rather than control.

---

## Phase 5 — Review Queue

## Objective

Generalize review and exception handling across all loops into one operating layer.

## Scope

- unify pending review items
- unify exception handling
- unify escalation tracking
- add ownership, aging, and resolution visibility

## Expected business value

- Creates a real operations cockpit
- Prevents loops from becoming disconnected mini-tools
- Improves throughput and accountability
- Gives management visibility into backlog and risk

## Required database changes

- Likely required
- Either:
  - a shared workflow item object
  - or a shared queue model with references to underlying loop records

## Required UI changes

- Dedicated review queue tab or module
- Filters by:
  - entity
  - type
  - status
  - assignee
  - aging
- queue detail and action views

## Required API changes

- queue list endpoints
- queue action endpoints
- escalation and resolution endpoints

## Required AI components

- Priority suggestions
- Triage suggestions
- Exception categorization assistance

## Reality check

This phase is operationally critical even if it does not feel glamorous. Without it, multiple loops will create hidden backlog and inconsistent review behavior.

---

## Phase 6 — AI-Assisted Accounting Proposals

## Objective

Expand from rule-driven and loop-specific proposals into a broader AI-assisted accounting proposal layer.

## Scope

- generate better draft proposals from invoice and bank evidence
- improve account mapping suggestions
- improve description generation
- improve VAT caution flags
- improve escalation recommendations

## Expected business value

- Reduces routine review effort
- Improves consistency in draft preparation
- Helps teams work faster without removing approval control

## Required database changes

- Possibly moderate
- Likely additions:
  - proposal versioning
  - rationale/explanation fields
  - override tracking
  - confidence history

## Required UI changes

- richer proposal review screens
- explanation display
- comparison between suggested and approved treatment
- override capture

## Required API changes

- proposal generation endpoints
- proposal refresh/recompute endpoints
- override and approval endpoints

## Required AI components

- classification assistance
- account suggestion assistance
- rationale generation
- confidence scoring refinement
- anomaly or ambiguity detection

## Reality check

This phase should happen only after review queue discipline is working. Otherwise AI will generate volume faster than humans can control it.

---

## Phase 7 — Investor Reporting Enhancements

## Objective

Upgrade reporting from internal accounting views into more client- and investor-usable outputs.

## Scope

- reporting readiness visibility
- better stakeholder-facing summaries
- controlled release states
- stronger entity and period reporting status

## Expected business value

- Improves external-facing product value
- Supports family office and investor use cases
- Makes the platform more differentiated commercially

## Required database changes

- Possibly limited to moderate
- May require:
  - reporting package records
  - reporting status fields
  - release/approval metadata

## Required UI changes

- reporting status views
- package or pack-style presentation
- controlled client/investor visibility states

## Required API changes

- reporting package endpoints
- release-state endpoints
- investor-visibility endpoints

## Required AI components

- summary drafting assistance
- reporting completeness checks
- anomaly highlighting

## Reality check

This is valuable, but it should follow core accounting-control loops. Better investor outputs built on weak upstream control would damage credibility.

---

## Recommended Shortest Path

## The shortest practical sequence

1. **Phase 1 first**
   - make documents operational
   - introduce statuses, validation states, and queue behavior
2. **Phase 2 next**
   - launch Invoice Loop MVP as the first AI-assisted operational loop
3. **Phase 5 in parallel or immediately after early Phase 2**
   - establish a proper review queue before scale increases
4. **Phase 3**
   - add bank statement processing
5. **Phase 4**
   - add reconciliation
6. **Phase 6**
   - deepen AI-assisted accounting proposals
7. **Phase 7**
   - extend investor reporting

## Why this is the shortest path

- It reuses existing architecture.
- It starts from documents, which already exist in production form.
- It uses the existing accounting engine rather than replacing it.
- It respects the documented human-in-the-loop philosophy.
- It avoids premature reconciliation and investor-reporting complexity.

---

## Hard Truths

### 1. The first AI loop is not blocked by missing AI

The first AI loop is blocked more by missing operational workflow state and review control than by missing model calls.

### 2. Review queue work is not optional

Without a visible review and exception layer, the product will accumulate hidden ambiguity and operational debt.

### 3. Bank statement work is harder than invoice work

Invoice Loop MVP should come first because it has cleaner structure, better documentary evidence, and stronger accounting context.

### 4. Reconciliation is downstream control, not an early shortcut

If reconciliation is attempted before invoice and bank loops are stable, the product will create weak matches and false confidence.

### 5. Investor reporting should not outrun source control

The platform should not expand external-facing reporting sophistication until upstream accounting and review loops are dependable.

---

## Recommended First Commitment

If Proliquid wants the shortest path to a real AI-assisted loop, the first commitment should be:

**Build Phase 1 and Phase 2 as one connected delivery track:**

- operational document statuses
- invoice candidate records
- invoice validation
- confidence scoring
- human review
- approval to accounting entry creation
- audit trace across the whole path

That is the first credible Proliquid loop.

---

## Notes

This roadmap is intentionally conservative. It assumes that Proliquid’s real competitive advantage comes from controlled financial operations, not from making the earliest possible automation claims.
