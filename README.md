# Proliquid

Proliquid is an entity-first accounting and financial operations platform for multi-tenant organizations.

## Current product scope

The active application centers on:

- organization administration
- entity workspaces
- role-based internal and client access
- accounting setup and templates
- business transactions and journal entries
- document upload and secure private download
- reporting
- audit logging

The active product model is organization-first and entity-first, including operational support for fund-type entities where needed.

## Environment

Required variables:

- `DATABASE_URL`
- `JWT_SECRET`

Additional environment variables may be required for optional services such as private document storage.

## Prisma

```bash
npm run prisma:generate
npm run prisma:migrate
```

## Build

```bash
npm run build
```
