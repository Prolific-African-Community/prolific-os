# Project Structure

This repository is currently a Next.js application with API routes, Prisma database schema, Tailwind styling, and existing Proliquid-specific documentation and accounting implementation.

## Current Tree

```text
.
├── .prolific/
├── data/
├── docs/
│   └── proliquid-loop/
├── knowledge/
├── lib/
├── pages/
│   ├── api/
│   └── dashboard/
├── prisma/
│   └── migrations/
├── prompts/
├── public/
├── scripts/
├── styles/
├── templates/
├── PROJECT_STRUCTURE.md
├── README.md
├── package.json
├── package-lock.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

## Existing Application Areas

`pages/` contains the Next.js pages-router frontend and backend API routes.

`pages/api/` contains HTTP API endpoints for authentication, administration, organizations, entities, accounting, documents, reports, and related workflows.

`pages/dashboard/` contains dashboard screens and entity workspaces.

`lib/` contains shared server-side helpers for Prisma, authentication, permissions, entity access, organization access, audit logging, performance logging, and accounting utilities.

`prisma/` contains the Prisma schema, seed script, and migration history.

`data/` contains structured source and normalized data used by existing accounting scripts.

`scripts/` contains operational scripts for admin creation and accounting data import/normalization.

`styles/` contains global CSS and type declarations.

`public/` contains public static assets.

## New Documentation Folders

`docs/` is for stable repository documentation, technical orientation, structure notes, and non-product reports.

`prompts/` is for reusable prompt assets and prompt-related operating notes.

`templates/` is for neutral reusable artifact skeletons, outlines, and checklists.

`knowledge/` is for curated reference material, validated notes, and stable technical context.

`.prolific/` is for Prolific OS repository metadata, process notes, and tool-facing operating context.

## Naming Conventions

Use lowercase kebab-case for new Markdown filenames, for example `initial-audit.md`.

Use uppercase snake-case only for root-level operational reports that must stand out, for example `INITIALIZATION_REPORT.md`.

Use `README.md` only as the entry point for a folder.

Use clear nouns over abbreviations, and include dates only when a document represents a point-in-time report.

Do not store secrets, credentials, private customer data, generated build artifacts, or product decision documents in these folders.
