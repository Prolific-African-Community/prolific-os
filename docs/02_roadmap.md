# Prolific OS

## Product Roadmap

Version: 1.0
Status: Draft
Owner: Prolific
Reference Documents: `00_manifesto.md`, `01_prd.md`

---

# 1. Roadmap Objective

This roadmap defines the development sequence for Prolific OS.

The objective is to build a real MVP capable of generating complex, professional and standardized documents in a few clicks.

The roadmap must stay simple, sequential and execution-focused.

Every milestone must move the product closer to this final MVP definition:

> A private Prolific workspace where a user can create a project, store knowledge, upload resources, generate a complete professional document using AI, edit it, and export it as Markdown, DOCX and PDF.

---

# 2. Development Principles

## 2.1 One Milestone at a Time

Development must follow the roadmap order.

No future feature should be implemented before the current milestone is stable.

## 2.2 One Ticket, One Objective

Each development ticket must have one clear objective.

A ticket should be small enough to complete, test and review quickly.

## 2.3 Build Stability First

After every implementation step:

* the app must run;
* TypeScript must pass;
* the build must pass;
* existing working flows must not break.

## 2.4 Product Value Over Technical Complexity

No refactor should happen unless it directly supports the MVP.

No technical abstraction should be added without immediate product value.

## 2.5 Documentation Controls Development

The Manifesto defines why Prolific OS exists.

The PRD defines what must be built.

The Roadmap defines the order of execution.

Code must follow these documents.

---

# 3. Roadmap Overview

The MVP will be built through ten milestones.

1. Cleanup Shell
2. Projects
3. Documents
4. Knowledge
5. Resources
6. Templates
7. AI Generation
8. Editor
9. Exports
10. End-to-End MVP Test

---

# 4. Milestone 1 — Cleanup Shell

## Objective

Transform the cloned Proliquid repository into a clean Prolific OS application shell.

## Scope

Keep:

* Next.js setup;
* TypeScript;
* Tailwind;
* Prisma setup;
* authentication if usable;
* database connection;
* generic UI patterns;
* generic layout components.

Remove:

* Proliquid branding;
* accounting modules;
* fund modules;
* investor modules;
* journal entries;
* trial balance;
* Luxembourg PCN logic;
* Proliquid-specific dashboards;
* unused API routes;
* unused business-specific documentation;
* unused seed data.

## Expected Result

The app becomes a neutral Prolific OS shell with:

* login;
* protected dashboard;
* basic navigation;
* no visible Proliquid-specific product logic.

## Acceptance Criteria

* App starts locally.
* Login still works if retained.
* Dashboard loads.
* Build passes.
* TypeScript passes.
* No Proliquid business module appears in the main UI.

---

# 5. Milestone 2 — Projects

## Objective

Allow users to create and manage projects.

## Scope

Implement:

* Project data model;
* project creation API;
* project list API;
* project detail API;
* projects list screen;
* create project screen or modal;
* project detail screen.

## Project Fields

Required:

* name;
* description;
* status;
* createdById.

Optional later:

* category;
* client;
* tags;
* default language;
* default tone.

## Expected Result

The user can create a project and open it.

## Acceptance Criteria

* User can create a project.
* Project appears in the project list.
* Project detail page opens.
* Project persists after reload.
* Empty states are clean and understandable.

---

# 6. Milestone 3 — Documents

## Objective

Allow users to create documents inside a project.

## Scope

Implement:

* Document data model;
* document creation API;
* document list API;
* document detail API;
* project documents tab;
* new document form;
* document detail page.

## Document Fields

Required:

* projectId;
* title;
* type;
* objective;
* instructions;
* status;
* content.

Optional:

* templateId;
* outline;
* language;
* tone.

## Expected Result

The user can create a document request inside a project.

## Acceptance Criteria

* User can create a document from a project.
* Document appears in the project documents list.
* Document detail page opens.
* Document starts as Draft.
* Document data persists after reload.

---

# 7. Milestone 4 — Knowledge

## Objective

Allow users to store reusable project knowledge.

## Scope

Implement:

* ProjectKnowledge data model;
* create knowledge API;
* update knowledge API;
* list knowledge API;
* project knowledge tab;
* knowledge creation and editing interface.

## Knowledge Examples

* Company description;
* legal details;
* project facts;
* standard wording;
* brand instructions;
* operating rules;
* recurring context;
* prior decisions.

## Expected Result

The user can add context once and reuse it across future documents.

## Acceptance Criteria

* User can create a knowledge item.
* User can edit a knowledge item.
* Knowledge appears inside the project.
* Knowledge can be included in document generation context later.
* Empty state explains what project knowledge is for.

---

# 8. Milestone 5 — Resources

## Objective

Allow users to upload and attach resources to projects and documents.

## Scope

Implement:

* Resource data model;
* upload API;
* resource list API;
* project resources tab;
* resource attachment to document;
* basic file metadata storage.

## Supported MVP File Types

* PDF;
* DOCX;
* XLSX;
* Markdown;
* TXT;
* images.

## Expected Result

The user can upload files and associate them with a project or document.

## Acceptance Criteria

* User can upload a file.
* File appears in resource list.
* File metadata is saved.
* Resource can be selected when creating or editing a document.
* Unsupported files return a clear error.
* Upload does not break build or deployment.

---

# 9. Milestone 6 — Templates

## Objective

Provide standardized document structures.

## Scope

Implement predefined templates for:

* Contract;
* Annex;
* PRD;
* SOP;
* Proposal;
* Report;
* Business Plan;
* Technical Specification;
* Custom Document.

Each template should define:

* name;
* type;
* description;
* default structure;
* generation rules.

## Expected Result

The user can choose a template before generating a document.

## Acceptance Criteria

* Templates are visible in the UI.
* User can select a template.
* Selected template is saved on the document.
* Template data is available to the AI generation flow.
* No advanced template editor is required yet.

---

# 10. Milestone 7 — AI Generation

## Objective

Generate complete professional documents using OpenAI.

## Scope

Implement:

* OpenAI service layer;
* prompt builder;
* context builder;
* generation API;
* document generation button;
* loading state;
* error handling;
* generated content persistence.

## Generation Inputs

The AI generation must use:

* project knowledge;
* document objective;
* document instructions;
* selected template;
* selected resources where usable;
* document type.

## Generation Output

The AI must return:

* complete document content;
* Markdown format;
* professional structure;
* clear headings;
* complete sections;
* placeholders where information is missing.

## Expected Result

The user can click Generate and receive a complete document.

## Acceptance Criteria

* Generate button calls the backend.
* Backend builds context.
* Backend calls OpenAI.
* Generated content is saved to the document.
* Document status changes to Review.
* Errors are visible and understandable.
* Generated output is usable as a first complete draft.

---

# 11. Milestone 8 — Editor

## Objective

Allow users to edit and save generated documents.

## Scope

Implement:

* Markdown editor;
* save action;
* autosave if simple;
* document status display;
* generation result display;
* manual editing.

## Expected Result

The user can review, modify and save the generated document.

## Acceptance Criteria

* Generated Markdown appears in editor.
* User can edit content.
* User can save content.
* Saved content persists after reload.
* Editor is clean and usable.
* Document status is visible.

---

# 12. Milestone 9 — Exports

## Objective

Export documents as Markdown, DOCX and PDF.

## Scope

Implement:

* Markdown export;
* DOCX export;
* PDF export;
* export buttons;
* file naming convention.

## Export Rules

Exported files should use this naming convention:

```text
project-name_document-title_date.extension
```

## Expected Result

The user can export the current document content in three formats.

## Acceptance Criteria

* Markdown export downloads `.md`.
* DOCX export downloads `.docx`.
* PDF export downloads `.pdf`.
* Exported content matches the latest saved document.
* Headings and basic formatting are preserved.
* Files open correctly in standard tools.

---

# 13. Milestone 10 — End-to-End MVP Test

## Objective

Validate the full product workflow with a real Prolific document.

## Test Scenario

Create a real project, for example:

* Novotralux;
* SL Automotive;
* Prolific OS;
* Proliquid.

Then:

1. Create the project.
2. Add project knowledge.
3. Upload resources.
4. Create a document request.
5. Select a template.
6. Generate the document.
7. Edit the document.
8. Export Markdown.
9. Export DOCX.
10. Export PDF.

## Expected Result

The product replaces the manual ChatGPT copy-paste workflow for at least one real professional document.

## Acceptance Criteria

* Full workflow works without leaving Prolific OS.
* Generated document is complete.
* User can edit the result.
* All exports work.
* No critical bugs block the workflow.
* Product is useful enough for internal daily use.

---

# 14. Post-MVP Backlog

These features are explicitly excluded from the MVP.

They can be considered only after the full MVP workflow is stable.

## AI Improvements

* Claude integration;
* model selection;
* Fast / Standard / Deep mode;
* section-level regeneration;
* rewrite selected text;
* improve style;
* summarize resources;
* internal reviewer agent.

## Knowledge Improvements

* full file text extraction;
* vector search;
* semantic search;
* project memory;
* knowledge graph;
* automatic knowledge suggestions.

## Template Improvements

* template editor;
* template library;
* reusable clauses;
* branded document styles;
* company-specific templates.

## Collaboration

* comments;
* approvals;
* user roles;
* document sharing;
* review workflow;
* notifications.

## Export Improvements

* branded PDF themes;
* advanced DOCX styles;
* PowerPoint export;
* Canva integration;
* e-signature preparation.

## Productization

* billing;
* public client portal;
* onboarding flow;
* team management;
* external workspace access.

---

# 15. Ticket Execution Rules

Each implementation ticket must include:

1. Objective.
2. Scope.
3. Files likely affected.
4. What not to touch.
5. Acceptance criteria.
6. Test instructions.

A ticket must not include unrelated cleanup.

A cleanup ticket must not include new product features.

A feature ticket must not include broad refactoring.

---

# 16. Recommended Ticket Order

## Cleanup Tickets

1. Remove Proliquid branding from UI.
2. Remove Proliquid-specific dashboard navigation.
3. Remove accounting pages from visible routes.
4. Remove unused accounting API routes.
5. Clean Prisma schema to retain only required base models.
6. Confirm login and dashboard still work.

## Product Tickets

7. Add Project model.
8. Add project APIs.
9. Add projects list UI.
10. Add create project UI.
11. Add project detail page.
12. Add Document model.
13. Add document APIs.
14. Add new document UI.
15. Add document detail page.
16. Add ProjectKnowledge model.
17. Add knowledge APIs.
18. Add knowledge UI.
19. Add Resource model.
20. Add upload API.
21. Add resources UI.
22. Add predefined templates.
23. Add template selector.
24. Add OpenAI service.
25. Add prompt/context builder.
26. Add generate document API.
27. Add generate button and loading state.
28. Add Markdown editor.
29. Add save document action.
30. Add Markdown export.
31. Add DOCX export.
32. Add PDF export.
33. Run full MVP test.

---

# 17. Definition of Done

A milestone is done only when:

* implementation is complete;
* build passes;
* TypeScript passes;
* feature is manually tested;
* no unrelated product logic is introduced;
* user validates the result.

---

# 18. Final Roadmap Rule

The roadmap exists to prevent direction changes.

If a new idea appears, it must be classified as either:

1. Required for the current MVP; or
2. Post-MVP backlog.

Only required MVP features may interrupt the roadmap.

Everything else waits.
