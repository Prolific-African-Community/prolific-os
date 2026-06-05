# Proliquid Codex Context

## Purpose

This file is the permanent technical and product context for Codex when working on the Proliquid application.

Codex must read this file before making product, database, API, or frontend changes.

---

# 1. Current Project Context

Proliquid is a Next.js, Prisma, and PostgreSQL/Neon application.

The long-term goal is to build a global multi-tenant accounting and financial operations engine for:

* companies
* fiduciaries
* asset managers
* GPs
* funds
* SPVs
* holdings
* portfolios
* family office vehicles
* client/investor portals

The application must not be built only for Prolific or one specific company. Prolific may be used as a first test entity, but the architecture must remain generic.

The product ambition is not to create a basic accounting app. Proliquid should become a financial operating system: structured, fast, auditable, intuitive, and powerful enough to manage accounting, documents, reporting, entities, projects, investors, and operational workflows in one place.

---

# 2. Product Hierarchy

The product hierarchy is:

```txt
Super Admin
→ Organization
→ Entity
→ Projects / Accounting / Journal / Counterparties / Documents / Reporting / Setup
```

## Super Admin

The Super Admin is Proliquid.

The Super Admin creates and manages client Organizations.

Super Admin route:

```txt
/dashboard/admin
```

Super Admin can:

* create Organizations
* create the first Organization Admin user
* define max user limits for an Organization
* manage platform-level configuration
* manage accounting templates
* eventually import and maintain official chart-of-account templates

## Organization

An Organization represents a client company using Proliquid.

Examples:

* fiduciary
* asset manager
* GP
* company
* family office
* management firm

Organizations have users and own Entities.

An Organization is not the accounting workspace itself. The Entity is the accounting workspace.

## Entity

Entity is the main operational workspace.

An Entity can represent:

* company
* fund
* SPV
* holding
* portfolio
* family office vehicle
* accounting workspace

Entity route:

```txt
/dashboard/entity/[entityId]
```

Entity contains:

* Projects
* Accounting transactions
* Journal entries
* Counterparties
* Documents
* Reporting
* Accounting setup

## Legacy Fund

Fund is now legacy/backward compatibility only.

New product flows must use:

```txt
entityId
```

not:

```txt
fundId
```

Fund routes may remain temporarily for compatibility, but new features must be Entity-first.

Legacy Fund routes should redirect or bridge to Entity when possible.

---

# 3. Main Routes

## Super Admin Console

```txt
/dashboard/admin
```

Purpose:

* create client Organizations
* create first ORG_ADMIN access
* define maxUsers
* view Organizations

## Organization Dashboard

```txt
/dashboard
```

Purpose:

* list Entities
* create Entities
* open Entity workspaces
* access Organization-level user management where allowed

The dashboard must list Entities, not Funds.

## Entity Workspace

```txt
/dashboard/entity/[entityId]
```

Purpose:

The main internal workspace for an Entity.

Expected tabs:

* Overview
* Projects
* Accounting
* Journal
* Counterparties
* Documents
* Reporting
* Setup

## Legacy Accounting Route

```txt
/dashboard/accounting/[entityId]
```

Legacy compatibility route.

It should redirect or link to:

```txt
/dashboard/entity/[entityId]?tab=accounting
```

## Legacy Fund Route

```txt
/dashboard/fund/[id]
```

Legacy compatibility route.

It should redirect or bridge to the linked Entity when possible.

---

# 4. Roles and Access

## Platform-Level Roles

* `SUPER_ADMIN`
* `PLATFORM_SUPPORT`
* `NONE`

## Organization-Level Roles

* `ORG_ADMIN`
* `ORG_ACCOUNTANT`
* `ORG_REVIEWER`
* `ORG_VIEWER`

## Entity-Level Roles

* `ENTITY_ADMIN`
* `ENTITY_ACCOUNTANT`
* `ENTITY_REVIEWER`
* `ENTITY_VIEWER`
* `INVESTOR`

## Access Logic

### SUPER_ADMIN

Can:

* manage the platform
* create Organizations
* create first ORG_ADMIN user
* manage templates controlled by Proliquid
* access all Organizations and Entities where required

### ORG_ADMIN

Can:

* manage its Organization workspace
* create Entities
* manage internal Organization users within maxUsers limit
* create client/investor access
* manage accounting setup for its Entities
* create projects, counterparties, documents, transactions, and reports

### ORG_ACCOUNTANT

Can:

* create accounting transactions
* work with accounting data where authorized
* potentially manage chart of accounts/rules if explicitly allowed by the product
* should not manage Organization users

### ORG_REVIEWER

Can:

* review accounting information
* review documents and reporting
* should not create users
* should not modify critical accounting setup unless explicitly allowed

### ORG_VIEWER

Read-only internal access.

### INVESTOR / Client User

Limited portal access.

Can view:

* relevant documents
* reports
* investment/entity information where allowed

Cannot:

* create accounting transactions
* post journal entries
* reverse journal entries
* modify accounting setup
* manage users

## Password Security

Users created by Super Admin or ORG_ADMIN should have:

```txt
mustChangePassword = true
```

Flow:

```txt
temporary password
→ first login
→ redirect to /change-password
→ user sets own password
→ mustChangePassword = false
```

---

# 5. Entity Workspace Tabs

## Overview

Purpose:

* operational snapshot
* recent transactions
* recent journal entries
* quick actions

Keep compact and useful.

## Projects

Purpose:

* create and list projects linked to `entityId`
* no new flow should require `fundId`

## Accounting

Purpose:

* create BusinessTransactions
* generate DRAFT JournalEntries using active AccountingRules
* transaction creation must use `entityId`

## Journal

Purpose:

* list JournalEntries
* expand JournalLines
* post DRAFT entries
* reverse POSTED entries

## Counterparties

Purpose:

Manage:

* clients
* suppliers
* investors
* banks
* employees
* tax authorities
* related parties
* other third parties

## Documents

Purpose:

* create/list documents
* link documents to transactions
* link documents to counterparties
* later support real file upload

## Reporting

Purpose:

* Trial Balance
* General Ledger
* filters by date/account
* posted entries only
* full-width readable accounting tables

## Setup

Purpose:

* Chart of Accounts
* Accounting Rules
* Accounting Template application
* future Luxembourg PCN template import

---

# 6. Accounting Engine Principles

Proliquid uses double-entry accounting.

Rules:

* Every posted journal entry must balance.
* Total debit must equal total credit.
* JournalEntries start as `DRAFT`.
* Posting changes status to `POSTED`.
* Posted entries must not be directly modified.
* Corrections must use reversal or adjustment entries.
* Double posting must be blocked.
* Double reversal must be blocked.
* Critical accounting actions must be auditable.
* No AI should make final accounting posting decisions.
* AI may later assist with classification, extraction, and suggestions only.
* Human validation remains required before posting.

---

# 7. Strict Accounting Setup Decision

New Entities must not silently receive improvised accounting rules.

The correct strict flow is:

```txt
Entity created
→ no accounting transaction can be generated yet if no setup exists
→ apply an accounting template
→ ChartOfAccount records copied to Entity
→ AccountingRule records copied to Entity
→ BusinessTransactions can generate JournalEntries
```

If no active rule exists for a TransactionType, transaction creation should fail clearly.

Example valid error:

```txt
No active accounting rule found for CUSTOMER_INVOICE
```

This is correct behavior until the Entity has an applied template/rule.

---

# 8. Chart of Accounts Strategy

The default standard should be:

```txt
Luxembourg PCN / LUX_GAAP
```

Organizations must not freely upload their own chart of accounts.

Proliquid controls the official templates.

Allowed model:

```txt
Proliquid defines templates
→ Organization selects or applies approved template
→ Entity receives accounts and rules
→ Entity may add controlled custom accounts if allowed
```

Not allowed:

```txt
Organization uploads arbitrary chart of accounts
```

Reason:

Free uploads would break:

* standardization
* automation
* reporting consistency
* deterministic accounting rules
* data comparability
* future scale

---

# 9. Luxembourg PCN Integration Strategy

The Luxembourg chart of accounts should be integrated through controlled source files and import scripts.

Preferred approach for current stage:

```txt
/data/accounting/luxembourg/pcn-2020.accounts.json
/data/accounting/luxembourg/pcn-2020.rules.json
/scripts/import-accounting-template.ts
```

CSV is acceptable, but JSON is preferred for clarity and validation.

Excel can be used as a working source, but should not be the final technical source committed into the repo unless explicitly required.

Preferred process:

```txt
1. Obtain official PCN Luxembourg source
2. Clean/normalize data
3. Convert to validated JSON or CSV
4. Commit clean file to repo
5. Import into AccountingTemplate tables using an idempotent script
6. Apply template to Entities
```

Do not fake a full PCN.

If the full official PCN is not ready, use a clearly named starter template:

```txt
Luxembourg PCN Starter Template
```

Never call the starter template the full PCN.

---

# 10. Accounting Template System

Planned models:

* `AccountingTemplate`
* `AccountingTemplateAccount`
* `AccountingTemplateRule`

Purpose:

* prepare for full Luxembourg PCN integration
* control chart-of-account standards centrally
* allow templates to be applied to Entities
* avoid silent improvised setup

Expected behavior:

```txt
Template
→ contains accounts and rule definitions
→ applied to Entity
→ creates ChartOfAccount records
→ creates AccountingRule records
```

Template application must be:

* deterministic
* idempotent
* non-destructive
* auditable where relevant

Applying the same template twice must not duplicate accounts/rules.

## Luxembourg PCN 2020 Controlled CSV Import

The Luxembourg PCN 2020 template is imported from a controlled local CSV source:

```txt
data/accounting/luxembourg/source/pcn-luxembourg-2020.csv
```

Normalization generates:

```txt
data/accounting/luxembourg/normalized/pcn-luxembourg-2020.accounts.json
data/accounting/luxembourg/normalized/pcn-luxembourg-2020.import-report.json
```

Run:

```bash
npm run accounting:normalize-lux-pcn
npm run accounting:import-lux-pcn
```

XML is intentionally not used in this step. There is no runtime eCDF dependency.

---

# 11. Accounting Data Model Concepts

## ChartOfAccount

Entity-specific active chart of accounts.

Used by JournalLines.

## AccountingRule

Entity-specific or template-derived rule that maps:

```txt
TransactionType
→ debit account
→ credit account
```

Example:

```txt
CUSTOMER_INVOICE
→ Debit 411000 Customers
→ Credit 706000 Services Revenue
```

## BusinessTransaction

Operational event.

Examples:

* customer invoice
* customer payment
* supplier invoice
* supplier payment
* bank fee
* capital contribution
* capital call
* investment acquisition
* distribution

## JournalEntry

Accounting entry.

Statuses:

* DRAFT
* POSTED
* REVERSED

## JournalLine

Debit/credit line.

Must use Decimal values.

## Counterparty

Third party linked to transactions/documents/journal lines.

Examples:

* client
* supplier
* investor
* bank
* tax authority

## Document

Document record linked to Entity, transaction, and/or counterparty.

Current V1 may use `fileUrl`.

Future version should support real upload/storage.

---

# 12. Product Flow

## Super Admin Flow

```txt
/login
→ /dashboard/admin
→ create Organization
→ create first ORG_ADMIN user
→ define maxUsers
```

## Organization Admin Flow

```txt
/login
→ change password if required
→ /dashboard
→ create Entity
→ open /dashboard/entity/[entityId]
→ apply accounting template
→ create projects/counterparties/documents
→ create accounting transactions
→ post/reverse journal entries
→ view reporting
```

## Entity Accounting Flow

```txt
Entity created
→ Setup tab
→ Apply accounting template
→ Accounting tab
→ Create transaction
→ JournalEntry DRAFT generated
→ Journal tab
→ Post entry
→ Reporting tab
→ Trial Balance / General Ledger updated
```

---

# 13. UI / UX Product Philosophy

Proliquid should feel like a serious financial operating system.

UI direction:

* operational
* compact
* fast
* readable
* premium
* industrial SaaS feel
* fewer decorative illustrations
* less marketing copy
* smaller typography than landing pages
* tables and actions first
* useful KPIs only

Avoid:

* huge hero sections inside dashboards
* vague marketing paragraphs
* decorative visuals that do not help the task
* Fund-first language in new flows
* duplicated accounting concepts

Prefer:

* clear tabs
* compact cards
* readable tables
* status badges
* primary actions
* strict workflows
* visible auditability

---

# 14. API Response Rules

Prefer clear API responses:

```ts
{
  success: boolean
  data?: any
  message?: string
}
```

Do not expose password hashes.

Use clear error messages.

Example:

```txt
No active accounting rule found for CUSTOMER_INVOICE
```

---

# 15. Prisma and Database Rules

* Do not remove existing models unless explicitly requested.
* Do not break existing API routes.
* Prefer additive changes and optional relations first.
* Use `Decimal` for monetary values.
* Use explicit relation names when Prisma requires them.
* Keep backward compatibility with existing `Fund` and `Project` logic.
* New flows must be Entity-first.
* Avoid new Fund-based code.
* Fund should remain only for legacy compatibility until a dedicated cleanup phase.
* Project should be linked to Entity.
* Project creation should not require Fund in new flows.

After any Prisma schema change, run:

```bash
npx prisma format
npx prisma migrate dev --name <migration_name>
npx prisma generate
npm run build
```

---

# 16. Coding Rules

* Keep changes small, controlled, and testable.
* Avoid broad refactors unless explicitly requested.
* Do not redesign UI unless requested.
* Preserve existing working behavior.
* Prefer Entity-first APIs and routes.
* Do not weaken accounting validation.
* Do not bypass authentication or authorization.
* Do not suppress TypeScript errors globally.
* Do not use `ignoreBuildErrors`.
* Do not disable TypeScript.
* Do not introduce unnecessary dependencies.
* Keep implementation pragmatic.

---

# 17. Testing Expectations

After API changes:

* test authentication behavior
* verify role restrictions
* verify database records are created correctly
* run `npm run build`

After frontend changes:

* run `npm run build`
* run `npm run dev`
* manually test the relevant flow

After accounting changes:

* create transaction
* verify JournalEntry DRAFT
* verify debit/credit lines
* post entry
* verify reporting
* reverse entry if relevant
* verify Trial Balance remains balanced

---

# 18. Completed Roadmap

Completed or functionally validated:

* multi-tenant accounting core
* seed setup
* transaction generation
* JournalEntry DRAFT generation
* posting
* reversal
* double post blocking
* double reversal blocking
* accounting UI V1
* counterparties V1
* documents V1
* reporting V1
* Entity-first dashboard
* Entity workspace
* legacy accounting route compatibility
* legacy fund route compatibility
* Admin Console prompt
* Organization User Management prompt

---

# 19. Immediate Roadmap

Current next priorities:

## Step 1 — Ensure Entity creation is fully operational

* `/dashboard` must show `+ Create Entity`
* ORG_ADMIN must create Entities
* created Entity redirects to `/dashboard/entity/[entityId]`

## Step 2 — Ensure Project creation uses Entity

* Project creation must use `entityId`
* New Project flows must not require `fundId`
* legacy Fund project routes may remain compatible

## Step 3 — Accounting Setup V1

Inside Entity Setup tab:

* Chart of Accounts UI
* Accounting Rules UI
* create/toggle accounts
* create/toggle rules
* adapt accounting logic by Entity

## Step 4 — Accounting Template System

Add:

* AccountingTemplate
* AccountingTemplateAccount
* AccountingTemplateRule
* Apply template to Entity

## Step 5 — Luxembourg PCN Template

* create controlled Luxembourg PCN template
* default to Luxembourg PCN / LUX_GAAP
* do not allow Organizations to upload arbitrary chart of accounts
* import template from controlled repo file and script

## Step 6 — Full Luxembourg PCN Import

* obtain reliable official source
* clean/validate source file
* import full PCN into system template
* never fake full PCN data

## Step 7 — Accounting Periods and Closing

* open/close accounting periods
* block posting in closed periods
* reporting by period

## Step 8 — Real Document Upload

* replace manual fileUrl with real storage
* support invoices, contracts, reports, bank statements

## Step 9 — OCR / AI-Assisted Extraction

Later only.

* extract invoice data
* suggest transaction type
* suggest account/rule
* human validation required

## Step 10 — Bank Import and Reconciliation

Later.

* import CSV / CAMT / MT940
* match invoices and payments
* bank reconciliation

## Step 11 — Advanced Reporting

Later.

* P&L
* Balance Sheet
* exports PDF / Excel
* investor reports
* management reports

---

# 20. Non-Negotiable Product Rule

The target product flow is:

```txt
Super Admin creates Organization
→ ORG_ADMIN logs in
→ ORG_ADMIN creates Entity
→ ORG_ADMIN applies approved accounting template
→ ORG_ADMIN creates transactions
→ JournalEntries are generated as DRAFT
→ authorized user posts entries
→ Reporting updates from POSTED entries
```

Do not build new flows that contradict this architecture.
