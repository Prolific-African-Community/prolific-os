# Prolific OS

## Product Requirements Document

Version: 1.0
Status: Draft
Owner: Prolific
Product Type: Internal AI Workspace
Primary Objective: Generate complex, professional and standardized documents in a few clicks.

---

# 1. Product Definition

Prolific OS is an AI-powered workspace that transforms project knowledge into complete professional deliverables.

The product is designed to centralize project context, structure resources, guide AI generation, enable human review, and export final outputs in professional formats.

Prolific OS is not a chat interface. It is not a simple prompt wrapper. It is a production system for standardized work.

The first product focus is document production.

The system must allow a user to generate complex documents such as contracts, annexes, PRDs, technical specifications, SOPs, reports, business plans, proposals and internal documentation from project knowledge, uploaded resources and reusable templates.

---

# 2. Product Promise

The core product promise is:

> Give Prolific OS the knowledge of a project, then ask it to produce any professional deliverable.

The user should not need to rewrite the same context repeatedly.

The system should remember project knowledge, resources, documents, templates and previous outputs.

Every new document should benefit from what the system already knows.

---

# 3. Problem Statement

Today, producing a professional document requires too many manual steps.

Typical workflow:

1. Retrieve previous context.
2. Find old documents.
3. Open ChatGPT or Claude.
4. Write a prompt.
5. Upload files manually.
6. Generate partial content.
7. Copy and paste the result.
8. Reorganize sections.
9. Format the document.
10. Export manually.
11. Repeat for each new deliverable.

This workflow is slow, repetitive, inconsistent and difficult to standardize.

The main problem is not only writing.

The real problem is:

* gathering context;
* selecting the right resources;
* structuring the output;
* applying a consistent standard;
* reviewing the content;
* exporting it properly;
* reusing knowledge later.

Prolific OS must solve this entire workflow.

---

# 4. Product Goals

The MVP must allow a user to:

1. Create a project.
2. Store knowledge inside that project.
3. Upload resources.
4. Create a document request.
5. Choose or generate a template.
6. Generate a complete professional document.
7. Edit the document.
8. Export the document as Markdown, DOCX and PDF.
9. Reuse project knowledge for future documents.

The product must make document production faster without sacrificing quality, control or standardization.

---

# 5. Target Users

## 5.1 Initial Users

The first users are internal Prolific users.

They need to produce:

* contracts;
* annexes;
* PRDs;
* business plans;
* technical specifications;
* client proposals;
* internal workflows;
* operating procedures;
* legal and administrative documents;
* project documentation.

## 5.2 Future Users

The product may later serve:

* consultants;
* law firms;
* accounting firms;
* agencies;
* SMEs;
* product teams;
* software studios;
* administrative teams;
* business operators.

The MVP is built for Prolific first.

External use comes later.

---

# 6. Product Principles

## 6.1 Standardization First

Every output must follow a clear structure.

Documents should not feel improvised.

The system must help produce consistent, reusable and professional deliverables.

## 6.2 Knowledge Before Generation

The system must collect and organize project knowledge before generating documents.

The quality of the document depends on the quality of the context.

## 6.3 Templates Over Prompts

The user should not need to write complex prompts.

Templates, document types and structured inputs should guide generation.

Prompts are an internal implementation detail.

## 6.4 Complete Outputs

The MVP must generate complete documents, not only outlines or fragments.

The user may still edit and improve the result, but the first generation should be usable.

## 6.5 Human Review

AI can generate, structure and improve.

The user validates.

No important output should be treated as final without user review.

## 6.6 Export Is Core

A generated document is not useful if it cannot be exported.

Markdown, DOCX and PDF exports are part of the MVP.

---

# 7. Core Workflow

The MVP workflow is:

1. User logs in.
2. User creates or selects a project.
3. User adds project knowledge.
4. User uploads resources.
5. User creates a new document.
6. User chooses a document type or template.
7. User enters the document objective.
8. User adds specific instructions.
9. User clicks “Generate”.
10. Prolific OS builds the context.
11. Prolific OS generates a structured outline.
12. Prolific OS generates the complete document.
13. User reviews and edits the result.
14. User exports the document as Markdown, DOCX or PDF.
15. Final document remains stored inside the project.

The interface must feel simple.

The internal generation process can be multi-step, but the user experience should remain controlled and direct.

---

# 8. Main Product Modules

## 8.1 Authentication

The product must support:

* login;
* logout;
* session persistence;
* protected dashboard pages.

Existing authentication from the cloned Proliquid project may be reused if it remains stable and simple.

## 8.2 Projects

A project is the main workspace container.

Examples:

* Novotralux;
* SL Automotive;
* Proliquid;
* SEB;
* Open Campus Africa;
* SED-X;
* Prolific internal.

Each project contains:

* project knowledge;
* documents;
* resources;
* templates;
* generated outputs.

A project must allow the user to avoid repeating the same context for every document.

## 8.3 Knowledge

Knowledge is structured project information.

It may include:

* company descriptions;
* legal details;
* business context;
* standard wording;
* prior decisions;
* internal notes;
* operating rules;
* branding instructions;
* recurring facts.

Knowledge should be reusable across documents.

For the MVP, knowledge can be stored as simple text blocks attached to a project.

Advanced search, embeddings and knowledge graphs are not required for the MVP.

## 8.4 Resources

Resources are uploaded files attached to a project or a document.

Supported MVP file types:

* PDF;
* DOCX;
* XLSX;
* Markdown;
* TXT;
* images.

Resources may be used as context for document generation.

The MVP should support upload, listing and association with a project.

Deep file parsing can start simple.

If full extraction is not available for a file type, the system should still store the file and allow future processing.

## 8.5 Templates

Templates define how a document should be structured and generated.

A template may include:

* document type;
* default structure;
* required sections;
* writing rules;
* tone;
* formatting expectations;
* export rules.

MVP templates should include:

* Contract;
* Annex;
* PRD;
* SOP;
* Proposal;
* Report;
* Business Plan;
* Technical Specification;
* Custom Document.

Templates can start as predefined database records or static configuration.

A template editor is not required for the first MVP but should be anticipated.

## 8.6 Documents

A document is a generated deliverable.

Each document belongs to a project.

A document contains:

* title;
* type;
* objective;
* instructions;
* selected template;
* selected resources;
* generated outline;
* generated content;
* status;
* exports.

Document statuses:

* Draft;
* Context Ready;
* Generating;
* Review;
* Completed;
* Archived.

## 8.7 Editor

The document editor is where the user reviews and improves the generated document.

MVP requirements:

* display generated Markdown;
* allow manual editing;
* save changes;
* show document title and status;
* export current content.

Advanced rich text editing can come later.

A clean Markdown editor is sufficient for MVP if exports work properly.

## 8.8 AI Engine

The AI engine must handle:

* context building;
* outline generation;
* complete document generation;
* rewriting;
* improving structure;
* summarizing resources where possible.

The MVP should use OpenAI API as the first provider.

Claude support can come later.

The AI engine must be isolated from UI logic.

## 8.9 Export Engine

The export engine must generate:

* Markdown;
* DOCX;
* PDF.

Exports should use the latest saved document content.

The output should preserve:

* titles;
* headings;
* bullet lists;
* numbering;
* basic formatting;
* page structure where possible.

Advanced branded layouts can come later.

---

# 9. MVP Functional Requirements

## 9.1 User Login

The user must be able to log in and access the dashboard.

Acceptance criteria:

* unauthenticated users cannot access protected pages;
* authenticated users can access the dashboard;
* logout clears session;
* login flow remains stable after cleanup.

## 9.2 Project Creation

The user must be able to create a project.

Required fields:

* project name;
* short description;
* optional notes.

Acceptance criteria:

* user can create a project;
* project appears in project list;
* project can be opened;
* project data persists.

## 9.3 Project Knowledge

The user must be able to add knowledge to a project.

Required fields:

* title;
* content;
* category optional.

Acceptance criteria:

* user can add knowledge;
* knowledge appears in project;
* knowledge can be used in document generation context;
* knowledge can be edited.

## 9.4 Resource Upload

The user must be able to upload files to a project.

Acceptance criteria:

* user can upload a file;
* file is stored;
* file appears in resource list;
* file can be attached to a document request;
* unsupported files show a clear error.

## 9.5 Document Creation

The user must be able to create a document inside a project.

Required fields:

* title;
* document type;
* objective;
* instructions optional;
* selected resources optional;
* selected template.

Acceptance criteria:

* document is created;
* document appears in project documents;
* document can be opened;
* document starts in Draft status.

## 9.6 Template Selection

The user must be able to select a document template.

Acceptance criteria:

* predefined templates appear in a dropdown or selector;
* selected template is saved on the document;
* template influences generation.

## 9.7 Document Generation

The user must be able to generate a complete document.

The generation process should:

1. gather project knowledge;
2. gather document instructions;
3. include selected resources;
4. apply selected template;
5. generate a structured outline;
6. generate complete document content;
7. save result in the document editor.

Acceptance criteria:

* user clicks Generate;
* AI returns a complete document;
* document content is saved;
* document status changes to Review;
* errors are shown clearly.

## 9.8 Document Editing

The user must be able to edit generated content.

Acceptance criteria:

* content can be edited;
* changes can be saved;
* saved content persists after reload.

## 9.9 Export Markdown

The user must be able to export the document as Markdown.

Acceptance criteria:

* export downloads `.md`;
* exported content matches the current saved document.

## 9.10 Export DOCX

The user must be able to export the document as DOCX.

Acceptance criteria:

* export downloads `.docx`;
* headings and basic formatting are preserved;
* document opens correctly in Word or compatible editor.

## 9.11 Export PDF

The user must be able to export the document as PDF.

Acceptance criteria:

* export downloads `.pdf`;
* layout is readable;
* headings and basic formatting are preserved;
* document opens correctly in a PDF viewer.

---

# 10. Non-Functional Requirements

## 10.1 Simplicity

The MVP must remain simple.

No feature should be added unless it directly helps produce professional documents.

## 10.2 Reliability

The app must build successfully.

TypeScript errors should be avoided.

Core flows must not depend on unstable experimental code.

## 10.3 Modularity

AI logic, export logic, document logic and UI logic must be separated.

This is necessary to add Claude, templates, agents and advanced exports later.

## 10.4 Traceability

Documents must remain attached to projects.

Generated outputs should not disappear after page reload.

## 10.5 Performance

The product should remain responsive.

Long AI generation may show loading states.

The user should understand what is happening during generation.

## 10.6 Security

Project data should only be available to authenticated users.

Uploaded files should not be publicly exposed unless explicitly intended.

## 10.7 Maintainability

The codebase must be cleaned from Proliquid-specific logic before major MVP development.

Business-specific accounting logic must not remain in the main product flow.

---

# 11. Data Model

The MVP requires the following core models.

## 11.1 User

Represents an authenticated user.

Core fields:

* id;
* email;
* passwordHash;
* name;
* role;
* createdAt;
* updatedAt.

## 11.2 Project

Represents a workspace.

Core fields:

* id;
* name;
* description;
* status;
* createdById;
* createdAt;
* updatedAt.

Relations:

* has many documents;
* has many resources;
* has many knowledge items.

## 11.3 ProjectKnowledge

Represents reusable project context.

Core fields:

* id;
* projectId;
* title;
* content;
* category;
* createdAt;
* updatedAt.

## 11.4 Resource

Represents an uploaded file.

Core fields:

* id;
* projectId;
* documentId optional;
* filename;
* mimeType;
* size;
* storageUrl;
* extractedText optional;
* createdAt;
* updatedAt.

## 11.5 Document

Represents a generated deliverable.

Core fields:

* id;
* projectId;
* title;
* type;
* objective;
* instructions;
* templateId optional;
* status;
* outline;
* content;
* createdAt;
* updatedAt.

## 11.6 Template

Represents a document generation pattern.

Core fields:

* id;
* name;
* type;
* description;
* structure;
* generationRules;
* createdAt;
* updatedAt.

## 11.7 GenerationRun

Represents an AI generation attempt.

Core fields:

* id;
* documentId;
* provider;
* model;
* status;
* inputSummary;
* output;
* error;
* createdAt;
* updatedAt.

This model is useful for debugging and traceability.

---

# 12. Navigation

The MVP navigation should be simple.

Main navigation:

* Dashboard;
* Projects;
* Templates;
* Settings.

Inside a project:

* Overview;
* Documents;
* Knowledge;
* Resources.

Inside a document:

* Context;
* Editor;
* Exports.

No additional navigation should be added before the MVP works.

---

# 13. Main Screens

## 13.1 Login

Purpose:

Allow user authentication.

## 13.2 Dashboard

Purpose:

Show recent projects and documents.

## 13.3 Projects List

Purpose:

Show all projects and allow creation of a new project.

## 13.4 Project Detail

Purpose:

Display project overview, documents, knowledge and resources.

## 13.5 New Document

Purpose:

Create a document request.

Fields:

* title;
* type;
* template;
* objective;
* instructions;
* resources.

## 13.6 Document Editor

Purpose:

Generate, edit and export the document.

Must include:

* Generate button;
* editor area;
* status;
* export buttons.

## 13.7 Templates

Purpose:

Show available templates.

Template editing can come later.

## 13.8 Settings

Purpose:

Store basic configuration.

MVP settings:

* OpenAI API configuration through environment variables;
* user account basics.

---

# 14. AI Generation Flow

The MVP generation flow should be:

1. Load document.
2. Load project.
3. Load project knowledge.
4. Load selected resources.
5. Load selected template.
6. Build prompt.
7. Call OpenAI API.
8. Receive complete Markdown document.
9. Save output to document content.
10. Set status to Review.

The AI prompt should instruct the model to:

* use the project context;
* follow the selected template;
* produce a complete document;
* avoid unsupported assumptions;
* use placeholders where information is missing;
* write in a professional style;
* return Markdown only.

---

# 15. Export Flow

## 15.1 Markdown Export

Export current document content as `.md`.

## 15.2 DOCX Export

Convert Markdown content to DOCX.

The result must be usable in Word.

## 15.3 PDF Export

Convert current content to PDF.

The result must be readable and clean.

For MVP, design does not need to be ultra-premium.

The priority is reliable export.

---

# 16. Cleanup Requirements

The cloned Proliquid repository must be cleaned before or during MVP development.

Keep:

* Next.js setup;
* TypeScript;
* Tailwind;
* auth if usable;
* Prisma setup;
* database connection;
* generic UI patterns;
* upload infrastructure if usable.

Remove:

* accounting logic;
* journal entries;
* funds;
* investors;
* trial balance;
* Luxembourg PCN;
* Proliquid-specific dashboard pages;
* Proliquid-specific documentation;
* Proliquid-specific seed data;
* unused API routes.

Cleanup must be incremental.

After each cleanup step:

* build must pass;
* TypeScript must pass;
* app must remain runnable.

---

# 17. Out of Scope for MVP

The following are excluded from the MVP:

* Claude API;
* Canva integration;
* PowerPoint export;
* advanced template editor;
* multi-user collaboration;
* comments;
* approval workflows;
* vector database;
* knowledge graph;
* advanced RAG;
* agent orchestration;
* billing;
* public sharing;
* e-signature;
* legal compliance engine;
* advanced design system;
* client-facing portal.

These features may be added after the core workflow is validated.

---

# 18. MVP Success Criteria

The MVP is successful when a user can:

1. Log in.
2. Create a project.
3. Add knowledge to the project.
4. Upload resources.
5. Create a document request.
6. Select a template.
7. Generate a complete professional document.
8. Edit the document.
9. Export it as Markdown.
10. Export it as DOCX.
11. Export it as PDF.

The product is considered useful only if it can replace the current manual ChatGPT copy-paste workflow for real Prolific documents.

---

# 19. Development Strategy

Development should happen in small visible milestones.

## Milestone 1 — Cleanup Shell

Goal:

Remove obvious Proliquid branding and prepare a neutral Prolific OS shell.

## Milestone 2 — Projects

Goal:

Create project model, API and UI.

## Milestone 3 — Documents

Goal:

Create document model, API and UI.

## Milestone 4 — Knowledge

Goal:

Allow project knowledge creation and reuse.

## Milestone 5 — Resources

Goal:

Allow file upload and resource attachment.

## Milestone 6 — Templates

Goal:

Create predefined document templates.

## Milestone 7 — AI Generation

Goal:

Generate complete documents using OpenAI.

## Milestone 8 — Editor

Goal:

Allow editing and saving generated content.

## Milestone 9 — Exports

Goal:

Export Markdown, DOCX and PDF.

## Milestone 10 — End-to-End Test

Goal:

Generate and export a real professional document.

---

# 20. Development Rules

Every implementation ticket must follow these rules:

1. One ticket equals one objective.
2. Each ticket must be testable.
3. Each ticket must preserve build stability.
4. Codex must not invent product direction.
5. If documentation is unclear, implementation must stop and request clarification.
6. No customization before the core workflow works.
7. No advanced automation before the MVP works.
8. No broad refactor without a clear product benefit.

---

# 21. Final MVP Definition

The final MVP is:

A private Prolific workspace where a user can create a project, store knowledge, upload resources, generate a complete professional document using AI, edit it, and export it as Markdown, DOCX and PDF.

Nothing less is sufficient.

Everything more is secondary.
