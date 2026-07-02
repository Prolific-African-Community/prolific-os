# Prolific OS Cleanup Audit

## 1. Summary

The current visible application shell is neutral and small. It uses the public home page, login, change-password, dashboard, projects placeholder, templates placeholder, settings placeholder, and three shared shell components.

Legacy Proliquid code remains mostly in API routes, Prisma schema, Prisma migrations, accounting libraries, seed/scripts, Luxembourg PCN data, and old Proliquid documentation. The four legacy dashboard pages have been neutralized at the UI level, but their old business logic still exists in backend routes and database models.

Current visible shell import path:

- `pages/index.tsx`: `next/head`, `next/link`
- `pages/login.tsx`: `react`, `next/router`, `components/app-shell`
- `pages/change-password.tsx`: `react`, `next/router`, calls `/api/auth/change-password`
- `pages/dashboard/index.tsx`: `components/app-shell`
- `pages/dashboard/projects.tsx`: `components/placeholder-page`
- `pages/dashboard/templates.tsx`: `components/placeholder-page`
- `pages/dashboard/settings.tsx`: `components/placeholder-page`
- `components/app-shell.tsx`: `next/link`, `next/router`, `react`
- `components/placeholder-page.tsx`: `components/app-shell`
- `components/legacy-route-redirect.tsx`: `next/link`, `next/router`, `react`

Auth routes still used by the visible shell:

- `pages/api/auth/login.ts`
- `pages/api/auth/change-password.ts`
- `lib/prisma.ts`
- `lib/auth.ts`
- `lib/performance-log.ts`

## 2. Keep

- `pages/_app.tsx`: Next.js app entry, required for global styles.
- `pages/index.tsx`: neutral Prolific OS public entry page.
- `pages/login.tsx`: required login screen.
- `pages/change-password.tsx`: required by existing auth flow when `mustChangePassword` is true.
- `pages/dashboard/index.tsx`: current protected dashboard shell.
- `pages/dashboard/projects.tsx`: placeholder route required by current navigation.
- `pages/dashboard/templates.tsx`: placeholder route required by current navigation.
- `pages/dashboard/settings.tsx`: placeholder route required by current navigation.
- `components/app-shell.tsx`: current protected shell, navigation, logout, and route guard.
- `components/placeholder-page.tsx`: shared neutral placeholder used by future MVP navigation routes.
- `components/legacy-route-redirect.tsx`: neutralizes old protected routes until they can be deleted.
- `styles/globals.css`: global Tailwind and base CSS.
- `styles/global.d.ts`: project type declarations.
- `public/favicon.ico`: harmless public asset.
- `lib/prisma.ts`: current Prisma client singleton.
- `lib/auth.ts`: current JWT helpers and API auth wrapper; keep until auth is redesigned.
- `lib/performance-log.ts`: generic performance wrapper used by login and legacy APIs.
- `pages/api/auth/login.ts`: needed now by `pages/login.tsx`.
- `pages/api/auth/change-password.ts`: needed now by `pages/change-password.tsx`.
- `pages/api/auth/register.ts`: not visible in the shell, but still generic enough to keep until auth onboarding is decided.
- `prisma/schema.prisma`: required for Prisma Client generation and build.
- `prisma/migrations/`: required for current database history and deploy safety.
- `package.json`: required project manifest; keep Next, React, TypeScript, Prisma, Tailwind, bcrypt, and jsonwebtoken for current shell/auth.
- `package-lock.json`: required reproducible install state.
- `next.config.js`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `prettier.config.js`, `next-env.d.ts`: build and tooling infrastructure.
- `docs/00_manifesto.md`, `docs/01_prd.md`, `docs/02_roadmap.md`, `docs/README.md`: current Prolific OS documentation.
- `.prolific/README.md`, `PROJECT_STRUCTURE.md`, `INITIALIZATION_REPORT.md`: repository/process documentation from initialization.

## 3. Replace Later

- `lib/auth.ts`: auth logic is mostly reusable, but it still imports `OrganizationStatus`, `PlatformRole`, and tenant membership checks.
- `pages/api/auth/login.ts`: login is needed now, but it still blocks users through legacy organization/entity membership checks.
- `pages/api/auth/change-password.ts`: needed now, but should eventually use the future Prolific auth service shape.
- `pages/api/auth/register.ts`: generic registration path, but not wired into the visible shell and not aligned with final access model.
- `prisma/schema.prisma`: required now, but the data model is dominated by legacy Proliquid accounting and organization/entity concepts.
- `prisma/migrations/`: required now, but future cleanup may need a new baseline or migration strategy after model decisions.
- `prisma/seed.ts`: useful for local setup only if current auth depends on seeded users, but it creates Proliquid demo organization/entity/accounting data.
- `components/legacy-route-redirect.tsx`: temporary routing guard; delete after the legacy route files are removed.
- `pages/dashboard/admin.tsx`: currently neutral redirect; replace by deleting the route once direct URL compatibility is no longer needed.
- `pages/dashboard/users.tsx`: currently neutral redirect; replace by deleting the route once direct URL compatibility is no longer needed.
- `pages/dashboard/entity/[entityId].tsx`: currently neutral redirect; replace with future project routes only when ready.
- `pages/dashboard/accounting/[entityId].tsx`: currently neutral redirect; delete after legacy accounting routes are fully retired.
- `@vercel/blob` dependency in `package.json`: potentially reusable for future uploads/resources, but currently only used by legacy accounting document APIs.
- `formidable` dependency in `package.json`: potentially reusable for future uploads, but currently only used by legacy document upload code.
- `@mui/material`, `@emotion/react`, `@emotion/styled` dependencies in `package.json`: appear unused by the current shell; verify before removal.

## 4. Safe To Delete

These items appear unused by the current visible Prolific OS shell and can likely be removed in future cleanup tickets. Do not delete them in the same ticket as Prisma/auth changes.

- Path: `docs/proliquid-loop/`
  Reason: legacy Proliquid product, accounting, banking, invoice, reconciliation, and operating-model documentation.
  Dependency risk: low.

- Path: `data/accounting/luxembourg/`
  Reason: Luxembourg PCN source and normalized accounting data; not used by visible shell.
  Dependency risk: low, unless accounting import scripts are still intentionally run.

- Path: `scripts/normalize-luxembourg-pcn-csv.ts`
  Reason: legacy PCN normalization script; only used by `accounting:normalize-lux-pcn`.
  Dependency risk: low.

- Path: `scripts/import-luxembourg-pcn-template.ts`
  Reason: legacy PCN import script; only used by `accounting:import-lux-pcn`.
  Dependency risk: medium because it imports Prisma accounting template models.

- Path: `scripts/create-admin.js`
  Reason: local admin creation helper with hardcoded test credentials; not used by build or visible shell.
  Dependency risk: low, provided another local user setup method exists.

- Path: `pages/api/hello.ts`
  Reason: default sample API route; not used by visible shell.
  Dependency risk: low.

- Path: `pages/api/accounting/**`
  Reason: legacy accounting API surface: chart of accounts, counterparties, documents, invoice candidates, journal entries, periods, reports, rules, templates, transactions.
  Dependency risk: medium because many files import shared legacy libs and Prisma models, but no visible MVP shell route calls them.

- Path: `pages/api/entities/[id]/apply-accounting-template.ts`
  Reason: legacy accounting template application endpoint.
  Dependency risk: medium because it is tied to entity/accounting Prisma models.

- Path: `pages/api/entities/[id]/projects.ts`
  Reason: legacy entity-scoped project endpoint; future Prolific projects should not be entity/accounting scoped.
  Dependency risk: medium because it depends on entity access logic.

- Path: `pages/api/audit-logs.ts`
  Reason: legacy audit log endpoint imported from accounting helper patterns and entity-scoped filtering.
  Dependency risk: medium because `AuditLog` may be reusable later, but current shell does not call this endpoint.

- Path: `lib/accounting-api.ts`
  Reason: accounting request parsing, transaction validation, journal validation, and accounting response helpers.
  Dependency risk: medium because many legacy APIs import it; delete only after those APIs are removed.

- Path: `lib/accounting-periods.ts`
  Reason: accounting period validation helper for journal posting/reversal.
  Dependency risk: medium because legacy journal routes import it.

- Path: `lib/accounting-account-governance.ts`
  Reason: account classification and Luxembourg chart-of-account logic.
  Dependency risk: medium because chart-of-accounts APIs import it.

- Path: `pages/dashboard/admin.tsx`
  Reason: now only a neutral redirect for a retired route.
  Dependency risk: low after direct legacy route compatibility is no longer required.

- Path: `pages/dashboard/users.tsx`
  Reason: now only a neutral redirect for a retired route.
  Dependency risk: low after direct legacy route compatibility is no longer required.

- Path: `pages/dashboard/accounting/[entityId].tsx`
  Reason: now only a neutral redirect for a retired route.
  Dependency risk: low after direct legacy route compatibility is no longer required.

- Path: `pages/dashboard/entity/[entityId].tsx`
  Reason: now only a neutral redirect for a retired route.
  Dependency risk: low after direct legacy route compatibility is no longer required.

## 5. Do Not Delete Yet

- Path: `prisma/schema.prisma`
  Reason: required by `prisma generate`, build, and Prisma Client typing.
  What depends on it: `npm run build`, `postinstall`, `lib/prisma.ts`, all Prisma imports.

- Path: `prisma/migrations/`
  Reason: current migration history for the existing database.
  What depends on it: deploy/migration workflows and any existing environment using this database.

- Path: `lib/prisma.ts`
  Reason: Prisma Client singleton.
  What depends on it: auth APIs and all legacy APIs.

- Path: `lib/auth.ts`
  Reason: JWT verification, password helpers, `withAuth` wrapper.
  What depends on it: `pages/api/auth/change-password.ts`, `pages/api/auth/register.ts`, most protected legacy APIs.

- Path: `pages/api/auth/login.ts`
  Reason: login form submits here.
  What depends on it: `pages/login.tsx`.

- Path: `pages/api/auth/change-password.ts`
  Reason: password-change form submits here.
  What depends on it: `pages/change-password.tsx`.

- Path: `lib/performance-log.ts`
  Reason: imported by login and several legacy APIs.
  What depends on it: `pages/api/auth/login.ts`, legacy API routes.

- Path: `lib/entity-access.ts`
  Reason: legacy, but imported by `lib/permissions.ts` and many legacy API routes.
  What depends on it: entity, accounting, admin, organization APIs.

- Path: `lib/organization-access.ts`
  Reason: legacy, but imported by organization user APIs.
  What depends on it: `pages/api/organization/users.ts`, `pages/api/organization/client-users.ts`, `pages/api/organization/users/[id].ts`.

- Path: `lib/permissions.ts`
  Reason: legacy entity/accounting permissions, but imported by legacy APIs.
  What depends on it: accounting APIs, entity APIs, organization APIs.

- Path: `lib/audit-log.ts`
  Reason: legacy, but imported by APIs that still compile.
  What depends on it: admin, accounting, entity, organization APIs.

- Path: `pages/api/entities.ts`
  Reason: not needed by visible shell, but connected to entity access and several legacy routes.
  What depends on it: no visible shell route, but legacy code and possible external callers.

- Path: `pages/api/entities/[id].ts`
  Reason: not needed by visible shell, but connected to entity workspace data.
  What depends on it: legacy entity route history and possible external callers.

- Path: `pages/api/admin/organizations/**`
  Reason: not needed by visible shell, but deeply tied to current organization/user auth model.
  What depends on it: legacy admin route history and current Prisma organization models.

- Path: `pages/api/organization/**`
  Reason: not needed by visible shell, but tied to organization and user membership models.
  What depends on it: legacy user management route history and auth membership concepts.

- Path: `package.json`
  Reason: contains build, Prisma, and dependency definitions.
  What depends on it: install, build, dev server, Prisma generate.

- Path: `package-lock.json`
  Reason: current dependency lock.
  What depends on it: reproducible installs.

## 6. Prisma Legacy Map

- `User`: needed for auth. Used by login, password change, JWT subject, password hash.
- `Organization`: needed for current auth checks, potentially reusable later as workspace/account container, but legacy in current shape.
- `OrganizationUser`: needed for current auth checks, legacy role model.
- `Entity`: legacy Proliquid. Represents fiduciary/accounting entity, not MVP project.
- `EntityUser`: needed for current auth checks, legacy entity membership.
- `AccountingTemplate`: legacy Proliquid accounting.
- `AccountingTemplateAccount`: legacy Proliquid accounting.
- `AccountingTemplateRule`: legacy Proliquid accounting.
- `Project`: unclear/potentially reusable name, but current model is legacy because it is organization/entity scoped and connected to accounting transactions/journal lines.
- `ChartOfAccount`: legacy Proliquid accounting.
- `AccountingPeriod`: legacy Proliquid accounting.
- `Counterparty`: legacy Proliquid accounting.
- `BusinessTransaction`: legacy Proliquid accounting.
- `JournalEntry`: legacy Proliquid accounting.
- `JournalLine`: legacy Proliquid accounting.
- `AccountingRule`: legacy Proliquid accounting.
- `Document`: potentially reusable concept, but current model is legacy because it is entity/accounting scoped and tied to transactions, counterparties, invoice candidates, and Vercel Blob document APIs.
- `InvoiceCandidate`: legacy Proliquid accounting/invoice workflow.
- `AuditLog`: potentially reusable, but current fields are organization/entity/resource oriented.

Enums:

- `UserRole`: needed for auth.
- `PlatformRole`: needed for current auth super-admin checks.
- `OrganizationType`: legacy/potentially reusable only if organizations remain.
- `OrganizationRole`: needed for current membership APIs, legacy for MVP.
- `OrganizationStatus`: needed for current auth active-tenant checks.
- `EntityType`: legacy Proliquid.
- `EntityRole`: needed for current auth membership checks, legacy for MVP.
- `AccountingStandard`: legacy Proliquid accounting.
- `AccountType`: legacy Proliquid accounting.
- `AccountingPeriodStatus`: legacy Proliquid accounting.
- `CounterpartyType`: legacy Proliquid accounting.
- `TransactionType`: legacy Proliquid accounting.
- `TransactionStatus`: legacy Proliquid accounting.
- `JournalEntryStatus`: legacy Proliquid accounting.
- `DocumentType`: potentially reusable name, but current values are legacy accounting/investor document types.

Current auth-required Prisma objects:

- Models: `User`, `Organization`, `OrganizationUser`, `Entity`, `EntityUser`
- Enums: `UserRole`, `PlatformRole`, `OrganizationStatus`
- Indirect current-auth enums/models: `OrganizationRole`, `EntityRole` are not required by login itself but are part of the current membership schema and protected API system.

## 7. API Route Map

Needed now:

- `pages/api/auth/login.ts`: called by login page.
- `pages/api/auth/change-password.ts`: called by change-password page.

Potentially keep until auth/onboarding is defined:

- `pages/api/auth/register.ts`: generic user registration, not visible in shell.

Legacy:

- `pages/api/accounting/chart-of-accounts.ts`
- `pages/api/accounting/chart-of-accounts/[id].ts`
- `pages/api/accounting/chart-of-accounts/preview.ts`
- `pages/api/accounting/counterparties.ts`
- `pages/api/accounting/documents.ts`
- `pages/api/accounting/documents/[id].ts`
- `pages/api/accounting/documents/[id]/download.ts`
- `pages/api/accounting/documents/upload.ts`
- `pages/api/accounting/invoice-candidates.ts`
- `pages/api/accounting/invoice-candidates/[id].ts`
- `pages/api/accounting/invoice-candidates/[id]/create-transaction.ts`
- `pages/api/accounting/journal-entries.ts`
- `pages/api/accounting/journal-entries/[id]/post.ts`
- `pages/api/accounting/journal-entries/[id]/reverse.ts`
- `pages/api/accounting/periods.ts`
- `pages/api/accounting/periods/[id].ts`
- `pages/api/accounting/reports/general-ledger.ts`
- `pages/api/accounting/reports/trial-balance.ts`
- `pages/api/accounting/rules.ts`
- `pages/api/accounting/rules/[id].ts`
- `pages/api/accounting/templates.ts`
- `pages/api/accounting/templates/[id].ts`
- `pages/api/accounting/templates/[id]/accounts.ts`
- `pages/api/accounting/templates/[id]/rules.ts`
- `pages/api/accounting/transactions.ts`
- `pages/api/entities.ts`
- `pages/api/entities/[id].ts`
- `pages/api/entities/[id]/apply-accounting-template.ts`
- `pages/api/entities/[id]/projects.ts`
- `pages/api/admin/organizations.ts`
- `pages/api/admin/organizations/[id]/reset-admin-password.ts`
- `pages/api/admin/organizations/[id]/status.ts`
- `pages/api/admin/organizations/[id]/users.ts`
- `pages/api/organization/client-users.ts`
- `pages/api/organization/entities.ts`
- `pages/api/organization/users.ts`
- `pages/api/organization/users/[id].ts`
- `pages/api/audit-logs.ts`

Unclear:

- `pages/api/hello.ts`: sample route. Safe to delete if no external health check uses it.

## 8. Recommended Cleanup Tickets

Ticket 1: Remove legacy documentation and PCN data

- Objective: Delete Proliquid-only docs and Luxembourg accounting data that are not used by build or visible shell.
- Files likely affected: `docs/proliquid-loop/`, `data/accounting/luxembourg/`.
- Acceptance criteria: build passes, TypeScript passes, no `docs/proliquid-loop` or `data/accounting/luxembourg` files remain.

Ticket 2: Remove legacy accounting scripts and npm accounting commands

- Objective: Remove PCN import/normalization scripts and package scripts that reference them.
- Files likely affected: `scripts/normalize-luxembourg-pcn-csv.ts`, `scripts/import-luxembourg-pcn-template.ts`, `package.json`, `package-lock.json`.
- Acceptance criteria: build passes, TypeScript passes, `npm run` no longer lists accounting PCN commands.

Ticket 3: Remove neutralized legacy dashboard routes

- Objective: Delete direct legacy route files after confirming neutral navigation is stable.
- Files likely affected: `pages/dashboard/admin.tsx`, `pages/dashboard/users.tsx`, `pages/dashboard/entity/[entityId].tsx`, `pages/dashboard/accounting/[entityId].tsx`, `components/legacy-route-redirect.tsx`.
- Acceptance criteria: `/dashboard`, `/dashboard/projects`, `/dashboard/templates`, and `/dashboard/settings` still build; legacy dashboard URLs return 404 or an agreed neutral fallback.

Ticket 4: Remove legacy accounting API surface

- Objective: Delete unused accounting endpoints and accounting helper libraries once no visible shell or auth code imports them.
- Files likely affected: `pages/api/accounting/**`, `lib/accounting-api.ts`, `lib/accounting-periods.ts`, `lib/accounting-account-governance.ts`.
- Acceptance criteria: build passes, TypeScript passes, no imports from deleted accounting libs remain.

Ticket 5: Redesign auth data dependency away from organization/entity memberships

- Objective: Simplify auth so login/password change depend only on user/session concepts before Prisma model cleanup.
- Files likely affected: `pages/api/auth/login.ts`, `pages/api/auth/change-password.ts`, `lib/auth.ts`, `prisma/schema.prisma`, future migrations.
- Acceptance criteria: login works, password change works, build passes, TypeScript passes, auth no longer queries `Organization`, `OrganizationUser`, `Entity`, or `EntityUser`.
