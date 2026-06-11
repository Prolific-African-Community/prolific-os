# Proliquid Loop Run Log

## Purpose

This file records formal Proliquid loop runs used to review the operating model, identify execution priorities, and guide the next stage of product and operational development.

## Run Entries

## Run 003

### Run date

2026-06-11

### Run type

Invoice Loop validation progression increment.

### Documents reviewed

- `LOOP_RUNNER.md`
- `LOOP_IMPLEMENTATION_ROADMAP.md`
- `INVOICE_LOOP.md`
- `ACCOUNTING_RULES.md`
- `CURRENT_PRODUCT_STATE.md`
- `BACKLOG.md`
- `DECISIONS.md`

### Main findings

- The invoice candidate MVP already covered the first structured object in the invoice loop, but it stopped at candidate creation.
- The highest-priority unfinished gap was the lack of a controlled progression step between `DRAFT` and accounting review.
- A small but real workflow increment was possible without adding OCR, AI extraction, accounting proposals, or automatic posting.

### Increment completed

- Added controlled invoice candidate editing from the entity workspace.
- Added server-side invoice candidate update support.
- Added a validated candidate status progression from `DRAFT` to `READY_FOR_ACCOUNTING_REVIEW`.
- Added the ability to reopen a ready candidate back to `DRAFT`.
- Added audit logging for:
  - invoice candidate content updates
  - invoice candidate status changes

### Control decisions reinforced

- Invoice candidates may progress only when the source document remains `REVIEWED`.
- Minimum readiness for accounting review now requires:
  - counterparty
  - invoice date
  - currency
  - total amount
  - description
- Ready candidates are treated as controlled review objects and must be reopened to `DRAFT` before accounting fields are edited again.
- No OCR, AI extraction, reconciliation, automatic accounting proposal, or posting was introduced.

### Open questions

- Which approval role should be allowed to move a ready invoice candidate into a formal accounting proposal stage?
- Should invoice number become mandatory before accounting proposal, or remain optional for limited supporting invoice formats?
- What is the first minimum accounting proposal object: transaction draft, journal draft wrapper, or dedicated proposal record?

### Recommended next focus area

Recommended next focus area: manual accounting proposal MVP from ready invoice candidates.

The next smallest useful increment should let a `READY_FOR_ACCOUNTING_REVIEW` candidate produce a controlled draft accounting proposal without posting automatically and without bypassing chart-of-accounts, period, or approval controls.

## Run 002

### Run date

2026-06-11

### Run type

Invoice Loop MVP foundation increment.

### Documents reviewed

- `LOOP_RUNNER.md`
- `LOOP_IMPLEMENTATION_ROADMAP.md`
- `INVOICE_LOOP.md`
- `ACCOUNTING_RULES.md`
- `CURRENT_PRODUCT_STATE.md`
- `BACKLOG.md`
- `DECISIONS.md`

### Main findings

- The product already had the necessary prerequisites for the first invoice-loop object: reviewed document states, secure document storage, counterparties, permissions, audit logging, and entity-first workflow surfaces.
- The highest-value missing step was not extraction or UI polish. It was the absence of a structured business object representing a reviewed invoice before accounting treatment.
- A small manual invoice candidate layer is the safest next step because it creates workflow structure without pretending OCR, AI extraction, or automatic accounting already exist.

### Increment completed

- Added `InvoiceCandidate` as a structured entity-level workflow object linked to:
  - reviewed invoice document
  - entity
  - optional counterparty
- Added API support to:
  - list invoice candidates for an entity
  - create one invoice candidate from one reviewed invoice document
- Added entity workspace support in the Documents tab to:
  - start an invoice candidate from a reviewed invoice document
  - capture core manual fields
  - show created invoice candidates in a compact list

### Control decisions reinforced

- Reviewed documents only may enter the invoice candidate workflow.
- Only invoice-type documents may become invoice candidates.
- One document may create one invoice candidate only.
- Candidate creation remains human-driven and manual.
- No OCR, AI extraction, reconciliation, automatic accounting, or posting was introduced.

### Open questions

- What is the minimum candidate review status model after `DRAFT`?
- Which fields should become mandatory before an invoice candidate may produce an accounting proposal?
- Should counterparty be mandatory at candidate stage, or can unresolved counterparty mapping remain a controlled exception?
- What is the first approval threshold for moving a candidate into accounting proposal status?

### Recommended next focus area

Recommended next focus area: invoice candidate review progression.

The next smallest useful increment should let teams move invoice candidates from `DRAFT` into a controlled accounting-preparation state with explicit validation checks, without yet introducing OCR or automatic proposal logic.

## Run 001

### Run date

2026-06-11

### Run type

First official Proliquid General Loop run.

### Documents reviewed

- `VISION.md`
- `OPERATING_MODEL.md`
- `PRODUCT_BLUEPRINT.md`
- `ACCOUNTING_RULES.md`
- `INVOICE_LOOP.md`
- `BANK_STATEMENT_LOOP.md`
- `RECONCILIATION_LOOP.md`

### Main findings

- The documentation set now defines a coherent control philosophy across product, operations, accounting, document handling, bank processing, and reconciliation.
- The strongest recurring theme is clear: Proliquid is a human-led Luxembourg financial operating platform with structured assistance, not an autonomous accounting engine.
- The operating model is directionally strong, but several execution foundations are still missing, especially onboarding, role-based approval authority, entity operating data standards, and measurable service operations.
- The loop architecture is sufficiently defined to support a real product roadmap, but not yet sufficiently operationalized to scale without process ambiguity.
- The highest-risk gap is not conceptual product design. It is the absence of explicit execution rules for who does what, when, and under which thresholds.

### Highest priorities identified

- define the minimum viable client onboarding journey
- define the minimum viable business data structure for live entities
- launch the first usable entity workspace
- establish accounting approval authority and review thresholds
- define the live chart-of-accounts operating standard
- formalize document room operating rules
- operationalize invoice, bank statement, and reconciliation service policies
- build the review queue and exception taxonomy
- define the first audit and reporting release standards

### Open questions

- What should be the first real customer journey from mandate to live reporting?
- Which roles must exist on day one for internal operations and external access?
- How should high-value review thresholds vary between a small holding company and an active SPV or family office structure?
- What is the minimum investor reporting standard that is commercially credible without overbuilding?
- What is the smallest safe AI assistance scope that can enter production without undermining trust?

### Recommended next focus area

Recommended next focus area: operating foundation.

The next loop should prioritize turning the product concept into a controlled service system by defining:

- onboarding
- internal roles and approval rights
- entity operating records
- document operating standards
- review queue and exception taxonomy

Until those foundations exist, further loop sophistication risks outpacing operating control.

## Observations

- The documentation set is strongest on control philosophy and target-state logic.
- The documentation set is weaker on launch-sequencing detail and day-one operating roles.
- The product direction is credible for Luxembourg structures, but execution discipline now matters more than additional conceptual expansion.

## Follow-Ups

- maintain the top-20 execution backlog
- review accepted decisions before introducing any broader automation
- use the next formal loop run to define onboarding, role authority, and minimum service metrics

## Notes

Each future run should add a new entry with dated findings, updated priorities, new decisions, and a recommended next focus area.
