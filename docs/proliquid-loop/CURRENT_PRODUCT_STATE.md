# Current Product State

## Purpose

This document records the actual current state of the Proliquid product based on the existing codebase. It is intended to describe what is already present, what is only partially present, and what is currently absent.

Classification used in this document:

- **Implemented**
- **Partially implemented**
- **Planned**
- **Missing**

This is a factual product-state snapshot. It does not propose new features or target architecture.

---

## 1. Existing user roles

**Status: Implemented**

The codebase currently defines and uses multiple role layers:

- **Legacy user roles**
  - `ADMIN`
  - `GP`
  - `LP`
- **Platform roles**
  - `SUPER_ADMIN`
  - `PLATFORM_SUPPORT`
  - `NONE`
- **Organization roles**
  - `ORG_ADMIN`
  - `ORG_ACCOUNTANT`
  - `ORG_REVIEWER`
  - `ORG_VIEWER`
- **Entity roles**
  - `ENTITY_ADMIN`
  - `ENTITY_ACCOUNTANT`
  - `ENTITY_REVIEWER`
  - `ENTITY_VIEWER`
  - `INVESTOR`

Observed product behavior:

- `SUPER_ADMIN` and legacy `ADMIN` act as platform-level administrators.
- Organization users are managed through `OrganizationUser`.
- Client and investor-style access is managed through `EntityUser`.
- Permissions are enforced both by role and by organization/entity membership.
- Legacy `GP` / `LP` support still exists in auth and older page/API surfaces.

---

## 2. Existing pages

**Status: Implemented**

Current routed pages found in the codebase:

- Public:
  - `/`
- Authentication:
  - `/login`
  - `/change-password`
- Internal dashboards:
  - `/dashboard`
  - `/dashboard/admin`
  - `/dashboard/users`
  - `/dashboard/entity/[entityId]`
- Additional legacy / transitional surfaces:
  - `/dashboard/accounting/[entityId]`
  - `/dashboard/fund/[id]`
  - `/dashboard/fund/[id]/project/[projectId]`
  - `/funds/create`

Notes:

- The main internal product appears centered on `/dashboard` and `/dashboard/entity/[entityId]`.
- Legacy fund-oriented pages still exist alongside the newer entity-first workspace.

---

## 3. Existing dashboards

**Status: Implemented**

Current dashboard surfaces include:

- **Super Admin dashboard**
  - Organization creation
  - Organization status control
  - Organization user access management
  - Password reset for organization users
- **Workspace dashboard**
  - Entity list
  - KPI summary by entity
  - Entity creation for authorized users
- **Users dashboard**
  - Internal organization users
  - Client / investor users
  - Entity access assignment
  - Role updates and deactivation
- **Entity workspace**
  - Overview
  - Projects
  - Accounting
  - Journal
  - Counterparties
  - Documents
  - Reporting
  - Setup
  - Audit

---

## 4. Existing modules

**Status: Implemented**

Functional modules currently present:

- Authentication and password change
- Organization administration
- User and client user management
- Entity management
- Project management
- Accounting setup
- Chart of accounts
- Accounting rules
- Accounting periods
- Counterparties
- Business transactions
- Journal entries
- Documents
- Reporting
- Audit logs
- Permissions and access control

Modules that also exist but appear legacy or transitional:

- GP / fund management
- Legacy fund transaction flows

---

## 5. Existing workflows

**Status: Partially implemented**

Workflows that are operational today:

- Create organization and first admin user
- Activate, deactivate, or suspend organization
- Create internal organization users
- Create client/investor users with entity-level access
- Create entities
- Assign entity access through roles
- Apply accounting template to entity
- Create custom chart of accounts entries
- Create accounting rules
- Create accounting periods
- Create business transactions
- Automatically create draft journal entries from accounting rules
- Post journal entries
- Reverse journal entries
- Upload documents
- Open/download private documents through backend route
- View reports
- View audit log entries

Workflows that are present only in a basic or manual form:

- Client onboarding is distributed across admin, entity, user, and setup actions rather than a dedicated onboarding loop.
- Fund-centric legacy flows still coexist with the entity-first model.

Workflows not found as dedicated end-user product loops:

- OCR or extraction workflow
- Invoice processing workflow
- Bank statement ingestion workflow
- Reconciliation workflow
- Closing workflow orchestration

---

## 6. Existing document management capabilities

**Status: Implemented**

Current document capabilities found in code:

- Document records linked to:
  - Entity
  - Counterparty (optional)
  - Business transaction (optional)
- Real file upload using **private Vercel Blob**
- Server-side upload endpoint
- File metadata storage:
  - title
  - type
  - file URL
  - original filename
  - MIME type
  - file size
  - storage provider
  - storage key
  - uploaded by
  - status
- Secure backend download/open route for private Blob files
- Documents tab in the entity workspace
- Document count surfaced in workspace KPIs
- Document audit events:
  - `DOCUMENT_CREATED`
  - `DOCUMENT_UPLOADED`

Current limitations visible in code:

- No OCR
- No AI extraction
- No document parsing
- No automatic transaction creation from documents
- No review queue specific to document intake

---

## 7. Existing accounting capabilities

**Status: Implemented**

Current accounting capabilities include:

- Entity-level chart of accounts
- Accounting template support
- Luxembourg PCN-compatible template application support
- System and custom accounts
- Governance preview for custom accounts
- Accounting rules by transaction type
- Business transaction creation
- Automatic draft journal entry generation from accounting rules
- Double-entry journal line creation
- Journal posting
- Journal reversal
- Accounting periods with `OPEN`, `CLOSED`, and `LOCKED`
- Period enforcement for posting and reversal
- Counterparty management
- Project linkage on transactions and journal lines

Observed transaction/accounting types in product logic include:

- Customer invoice/payment
- Supplier invoice/payment
- Bank fee
- Loans
- Capital flows
- Investor contributions
- Investment acquisition/disposal
- Distributions
- Valuation and FX adjustments
- Transfers

Current limitations visible in code:

- No autonomous accounting loop
- No bank reconciliation engine
- No invoice extraction/accounting proposal loop outside manual transaction creation

---

## 8. Existing reporting capabilities

**Status: Implemented**

Current reporting capabilities include:

- **Trial Balance**
  - Entity-scoped
  - Period filter
  - Start/end date filters
  - Uses posted journal entries
- **General Ledger**
  - Entity-scoped
  - Account/date filtering
  - Uses posted journal lines
- Reporting tab in entity workspace
- Permission-based reporting access
- UI filtering to avoid showing only zero-value accounts by default in the trial balance view

Current limitations visible in code:

- Reporting scope is accounting-focused rather than investor-reporting-pack focused.
- No evidence of full report publishing workflow or scheduled reporting cycle management.

---

## 9. Existing audit capabilities

**Status: Implemented**

Current audit capabilities include:

- `AuditLog` database model
- Audit API endpoint
- Audit tab in the entity workspace
- Filtering by:
  - entity
  - organization
  - action
  - resource type
- User attribution on audit log records
- Metadata support

Audit events found in code include:

- `ORGANIZATION_CREATED`
- `ORGANIZATION_USER_CREATED`
- `ORGANIZATION_STATUS_CHANGED`
- `ORGANIZATION_USER_PASSWORD_RESET`
- `ENTITY_CREATED`
- `ACCOUNTING_TEMPLATE_APPLIED`
- `ACCOUNT_CREATED`
- `CUSTOM_ACCOUNT_CREATED`
- `ACCOUNT_UPDATED`
- `ACCOUNTING_RULE_CREATED`
- `ACCOUNTING_RULE_UPDATED`
- `ACCOUNTING_PERIOD_CREATED`
- period status change events
- `BUSINESS_TRANSACTION_CREATED`
- `JOURNAL_ENTRY_POSTED`
- `JOURNAL_ENTRY_REVERSED`
- `COUNTERPARTY_CREATED`
- `DOCUMENT_CREATED`
- `DOCUMENT_UPLOADED`
- `CLIENT_USER_CREATED`
- `USER_ROLE_CHANGED`
- `USER_DEACTIVATED`

Current limitations visible in code:

- Audit is strong at the API/write-action level.
- No separate audit administration console outside the entity audit tab and API.

---

## 10. Existing entity management capabilities

**Status: Implemented**

Current entity management capabilities include:

- Entity creation
- Entity list/dashboard
- Entity detail workspace
- Entity types:
  - `COMPANY`
  - `FUND`
  - `SPV`
  - `HOLDING`
  - `FAMILY_OFFICE`
  - `PORTFOLIO`
  - `OTHER`
- Organization-linked entities
- Entity-level user access
- Project records under entities
- Linkage to legacy fund records where present
- Accounting template application to entities

Current limitations visible in code:

- Some legacy fund structure remains alongside the entity-first structure.
- No dedicated lifecycle workflow beyond creation, setup, and ongoing operations.

---

## 11. Existing onboarding capabilities

**Status: Partially implemented**

What exists today:

- Organization creation
- First admin user creation
- Password change on first login
- Entity creation
- Internal user creation
- Client/investor user creation
- Entity access assignment
- Accounting setup initialization inside the entity workspace
- Template application

What is not present as a dedicated onboarding product capability:

- No single onboarding page or guided onboarding wizard
- No structured onboarding checklist workflow surfaced as a distinct module
- No client-request intake workflow
- No compliance/banking data collection workflow as a unified onboarding journey

The current onboarding capability is therefore operational, but fragmented across admin, users, and entity setup flows.

---

## 12. Existing database entities

**Status: Implemented**

Business/data models currently present in the Prisma schema include:

- `User`
- `Gp`
- `Organization`
- `OrganizationUser`
- `Entity`
- `EntityUser`
- `Fund`
- `Transaction` (legacy fund transaction model)
- `Project`
- `AccountingTemplate`
- `AccountingTemplateAccount`
- `AccountingTemplateRule`
- `ChartOfAccount`
- `AccountingPeriod`
- `Counterparty`
- `BusinessTransaction`
- `JournalEntry`
- `JournalLine`
- `AccountingRule`
- `Document`
- `AuditLog`

Observations:

- The schema clearly supports the entity-first accounting engine.
- Legacy GP/fund-era entities are still present.
- Document, audit, and period control are already modeled.

---

## 13. Existing APIs

**Status: Implemented**

API groups currently present:

- **Auth**
  - login
  - register
  - change password
- **Admin / organizations**
  - create/list organizations
  - change organization status
  - reset admin password
  - list organization users
- **Organization access**
  - internal users
  - client users
  - organization entities
- **Entities**
  - list/create entities
  - entity detail
  - entity projects
  - apply accounting template
  - ensure entity from legacy funds
- **Accounting setup**
  - chart of accounts
  - chart of accounts preview
  - account update/toggle
  - rules
  - rule update/toggle
  - periods
  - period update
  - templates
- **Accounting operations**
  - transactions
  - journal entries
  - journal post
  - journal reverse
  - counterparties
- **Documents**
  - list/create document metadata
  - upload real document
  - secure private download
- **Reporting**
  - trial balance
  - general ledger
- **Audit**
  - audit log listing

Observations:

- The API surface is broad and matches the entity workspace.
- Some legacy APIs still exist for GP/fund-oriented behavior.

---

## 14. Existing permissions model

**Status: Implemented**

The current permissions model is centralized and active in code.

Current characteristics:

- Authenticated API access uses bearer-token auth.
- Organization status is enforced both:
  - at login
  - during protected API access
- Permission helpers exist for:
  - entity access
  - entity management
  - accounting setup
  - transaction creation
  - posting and reversal
  - counterparties
  - documents
  - reports
  - organization user management

Observed permission behavior:

- `SUPER_ADMIN` / legacy `ADMIN` has global override behavior.
- `ORG_ADMIN` manages organization users and entities in active organizations.
- `ORG_ACCOUNTANT` is allowed to operate in accounting flows.
- `ORG_REVIEWER` is more read-oriented and blocked from setup changes.
- `ORG_VIEWER` is read-only.
- `ENTITY_*` roles support entity-scoped access.
- `INVESTOR` can access report-oriented views, but not internal operational setup.
- Inactive or suspended organizations are blocked from internal access unless the user is platform admin.

---

## 15. Existing gaps

**Status: Partially implemented**

The following gaps are visible in the current codebase state:

- **Public-to-internal onboarding continuity:** missing as a dedicated product flow
- **Dedicated onboarding workspace or checklist:** missing
- **OCR / extraction pipeline:** missing
- **AI-assisted accounting proposals from documents:** missing
- **Bank statement ingestion loop:** missing
- **Reconciliation workflow:** missing
- **Human review queues for invoice/bank loops:** missing
- **Closing workflow orchestration:** missing
- **Investor portal specialization beyond entity-scoped access:** partially implemented
- **Legacy vs entity-first consolidation:** partially implemented
- **Fund-era legacy pages and models still coexist with the newer entity-first product:** partially implemented

These are current-state observations only. They are included to show what is not yet present in the existing product surface.

---

## Summary

**Overall state: Partially implemented**

The current product is already a substantial internal financial operations platform with:

- multi-tenant organizations
- strict permissions
- entity-first workspace
- accounting setup
- transaction-to-journal workflow
- posting and reversal
- reporting
- document upload and secure access
- audit trail
- super admin controls

The product is no longer only a concept or wireframe. It is a working internal platform with live operational scope. At the same time, several future operating loops described in the Proliquid documentation set are not yet implemented as end-to-end product workflows.
