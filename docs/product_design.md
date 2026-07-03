# UNIVERSAL PREMIUM DESIGN REDESIGN PROMPT
## Transform any website or product into a premium, contemporary, intuitive experience

## Role

Act as a world-class product designer, UX architect, frontend engineer, design-system architect, and motion designer.

Your mission is to completely redesign the current website or application interface into a premium, contemporary, highly intuitive digital experience.

This is not a simple visual refresh.

This is a full UX and UI redesign intended to make the product feel clearer, more beautiful, more premium, more usable, and more professional.

You have creative freedom, but you must preserve all existing functionality unless explicitly instructed otherwise.

---

## Design Goal

Redesign the product with a feel inspired by:

- Apple: clarity, elegance, spacing, calm premium surfaces
- Notion: simple workspace logic, intuitive structure, useful blocks
- Tesla: minimalism, confidence, strong visual control
- Google Workspace: familiar productivity ergonomics and obvious actions
- Linear: sharp layouts, refined product UI, fast workflows
- Arc / Raycast / Superhuman: speed, command-like clarity, modern interaction
- Modern AI-native tools: contextual actions, guided workflows, intelligent interfaces

Do not copy these brands.

Extract the design intelligence behind them and create a unique interface adapted to this product.

The final product should feel:

- premium
- calm
- clean
- contemporary
- intuitive
- spacious
- fast
- elegant
- trustworthy
- business-grade
- emotionally polished
- visually refined
- simple without being empty
- powerful without feeling complex

Avoid:

- generic Tailwind dashboard look
- cluttered SaaS layouts
- childish illustrations
- excessive gradients
- corporate stock-design clichés
- noisy cards
- too many badges
- too many borders
- heavy shadows
- confusing navigation
- technical wording when user-friendly wording is better
- redesigning only the colors while leaving the UX unchanged

---

## First Step: Product Understanding

Before redesigning, audit the current product.

Identify:

1. What the product does.
2. Who the users are.
3. What the main user workflow is.
4. What the key pages are.
5. What the primary objects/entities are.
6. What actions matter most.
7. What currently feels confusing, heavy, ugly, or too technical.
8. Which functionality must not be broken.
9. Which pages need the most UX improvement.
10. What the product should emotionally feel like.

If information is missing, infer reasonably from the code, routes, UI, copy, and structure.

Do not stop unless a missing decision would cause major product risk.

---

## Core UX Principle

The user should always understand:

- where they are
- what the product does
- what they can do next
- what is ready
- what is missing
- what requires attention
- what action matters most

Every page should have:

- clear hierarchy
- one dominant primary action
- useful secondary actions
- elegant empty states
- readable loading states
- actionable error states
- consistent spacing
- consistent component behavior

The redesign must reduce cognitive load.

---

## Visual Foundation

Use a premium light interface by default.

Recommended base:

- soft off-white / light grey canvas
- white elevated surfaces
- near-black typography
- muted grey secondary text
- fine hairline borders
- soft layered shadows
- generous spacing
- rounded cards
- subtle glass or frosted surfaces only where useful
- one strong accent color
- minimal, consistent icons
- tasteful SVG illustrations only when useful

Suggested neutral palette:

- Canvas: #F5F6F8
- Surface: #FFFFFF
- Surface Soft: #F9FAFB
- Text Primary: #0A0A0A
- Text Secondary: #5F6368
- Text Muted: #9AA0A6
- Border: rgba(0,0,0,0.08)
- Hairline: rgba(0,0,0,0.06)

Choose or adapt the accent color based on the brand/product:

- AI / SaaS: electric blue
- Finance / accounting: deep blue, emerald, graphite
- Automotive: gold, electric yellow, black
- Medical / wellness: icy blue, teal, white
- Logistics / industrial: steel blue, signal orange, black
- Education: royal blue, violet
- Luxury / real estate: champagne, terracotta, ivory
- Legal / corporate: navy, slate, silver

If the product already has brand colors, preserve them but refine them.

---

## Typography

Use a modern, readable typography system.

Preferred:

- Inter or equivalent for UI
- JetBrains Mono or equivalent for code/preformatted/technical content if needed

Typography should feel:

- crisp
- premium
- spacious
- highly readable
- not decorative

Create hierarchy for:

- hero/display titles
- page titles
- section headings
- small labels
- body text
- metadata
- buttons
- forms
- technical/preformatted content

Use tight, refined typography for large headings and generous line-height for body content.

---

## Layout System

Improve the product using a consistent layout system.

Depending on the product, use:

### Public Website Layout

For landing/marketing pages:

- premium navigation
- strong hero
- clear product promise
- workflow or value preview
- capability sections
- proof/result sections
- elegant final CTA

The landing page should explain the product in seconds.

### Authenticated App Layout

For dashboards/apps:

- clean sidebar or top navigation
- active route states
- workspace identity
- quick actions
- content canvas
- page header
- main grid
- optional right contextual panel

The app should feel like an operating system, not a basic admin panel.

### Object Detail / Cockpit Layout

For project/client/document/product/asset detail pages:

- strong header
- object status
- metadata
- next best action
- progress/workflow stepper
- tabs or grouped sections
- related data
- recent activity

The page should answer:

- What is this?
- What is the current state?
- What is missing?
- What should I do next?

### Studio / Editor Layout

For creation/generation/editing pages:

- large main working area
- right-side action/context rail
- setup panel
- preview/editor
- history/activity
- export/action panel
- readiness state

The user should not have to scroll endlessly to understand the workflow.

---

## Workflow Mapping

Find the core workflow and make it visible.

Examples:

For an AI document product:

Project → Knowledge → Resources → Document → Generate → Review → Export

For a logistics product:

Client → Vehicles → Jobs → Planning → Dispatch → Tracking → Billing

For an accounting product:

Client → Documents → Transactions → Review → Reports → Filing

For a medical/wellness product:

Patient → Assessment → Plan → Sessions → Progress → Reports

For an education platform:

Campus → Courses → Students → Content → Evaluation → Certification

For an automotive site:

Service → Vehicle → Diagnosis → Estimate → Repair → Delivery

For a real estate project:

Asset → Market → Budget → Plan → Sales → Reporting

Adapt the interface around the actual workflow.

Use workflow steppers, readiness indicators, empty states, and next-best-action cards where useful.

---

## Component System

Create or standardize reusable UI components if useful.

Recommended components:

- Button
- Card
- Badge
- StatusPill
- Input
- Textarea
- Select
- Field
- Label
- Alert
- EmptyState
- SectionCard
- Skeleton
- Spinner
- Icon
- PageHeader
- Tabs
- StatTile
- ActionPanel
- DetailHeader
- SidebarNav
- Breadcrumb
- SearchInput
- FileCard
- DocumentCard
- WorkflowStepper
- ContextReadiness
- ExportPanel
- ActivityTimeline
- PreviewPanel

Only create components that actually simplify the code.

Avoid overengineering.

---

## Buttons

Create a clear button system:

- primary
- secondary
- ghost
- subtle
- danger
- disabled
- loading

Rules:

- only one primary action per section when possible
- destructive actions must be visually separated
- loading state must be obvious
- labels must use action verbs
- avoid vague labels like “Submit” when a better label exists

Examples:

- Create project
- Upload file
- Generate document
- Save changes
- Export PDF
- Archive
- Continue
- Review content

---

## Cards

Create card variants:

- standard card
- interactive card
- elevated card
- empty state card
- status card
- preview card
- resource/file card
- document/output card

Cards should feel light, spacious, and useful.

Avoid noisy card grids.

---

## Status System

Create clear status pills/badges.

Possible statuses:

- active
- draft
- archived
- pending
- running
- ready
- generated
- failed
- succeeded
- exported
- uploaded
- extracted
- private
- public
- incomplete
- needs review

Status should help users understand what to do next.

---

## Empty States

Every empty state must guide the user.

Empty state structure:

- simple icon or SVG
- clear title
- one-sentence explanation
- primary action
- optional example

Avoid:

- “No data”
- “Nothing here”
- raw technical words
- empty blank screens

Example:

Title:
“Create your first project”

Description:
“Projects centralize the context, resources, and outputs your workspace will use.”

CTA:
“Create project”

---

## Loading States

Use:

- skeleton cards
- shimmer
- button spinners
- disabled states
- no layout jumping

Loading should feel smooth and intentional.

---

## Error States

Errors must be:

- human-readable
- short
- actionable

Rewrite technical errors into product language.

Examples:

Instead of:
“500 Internal Server Error”

Use:
“Something went wrong. Try again or check your configuration.”

Instead of:
“429 quota exceeded”

Use:
“API quota exceeded. Check billing or usage limits.”

Instead of:
“Unauthorized”

Use:
“Your session expired. Please log in again.”

Do not expose stack traces in the UI.

---

## Motion / Animation

Use subtle, premium motion only.

Allowed:

- fade-up page entrance
- hover lift on cards
- soft button transitions
- skeleton shimmer
- loading pulse
- smooth tab transitions
- gentle reveal animations
- upload progress motion
- generation pulse

Avoid:

- bouncing effects
- heavy parallax
- distracting animation
- gimmicky 3D motion
- slow transitions

Motion must support clarity and speed.

---

## Icons

Use consistent minimal line icons.

Icon rules:

- rounded stroke
- 1.5–2px stroke
- monochrome by default
- accent color only for active/primary states
- same visual weight across all icons

Use icons for:

- navigation
- primary actions
- empty states
- status
- files
- documents
- upload
- edit
- delete
- export
- settings
- security
- search
- generation / AI if relevant

Do not use emojis as icons.

---

## SVG Illustrations

Use SVG illustrations only if they improve clarity.

Good places:

- landing hero
- workflow explanation
- empty states
- upload zone
- generation pipeline
- export readiness

Style:

- abstract
- geometric
- minimal
- premium
- not cartoonish
- not stock SaaS illustration style

---

## Copywriting

Improve the wording across the app.

Copy must be:

- clear
- short
- premium
- useful
- action-oriented

Avoid:

- technical database labels
- vague SaaS marketing
- “AI magic” clichés
- excessive explanations
- internal implementation terms

Prefer:

- user-facing nouns
- action verbs
- workflow language
- simple explanations

Examples:

Instead of:
“GenerationRun”

Use:
“Generation history”

Instead of:
“Resource metadata”

Use:
“Source material”

Instead of:
“Submit”

Use:
“Create document” or “Save changes”

---

## Page Redesign Checklist

Redesign all relevant visible pages.

For each page:

1. Clarify the purpose of the page.
2. Identify the primary action.
3. Improve hierarchy.
4. Improve layout.
5. Improve spacing.
6. Improve copy.
7. Improve empty states.
8. Improve loading states.
9. Improve error states.
10. Preserve functionality.
11. Reuse design-system components.
12. Check mobile/responsive behavior if applicable.

Typical pages to inspect:

- home page
- login page
- dashboard
- list pages
- detail pages
- editor/studio pages
- upload/resource pages
- settings pages
- coming soon/placeholder pages
- export/preview areas
- admin pages if present

---

## Implementation Rules

When implementing:

- preserve existing functionality
- preserve existing APIs
- preserve auth behavior
- preserve data flow
- preserve form handlers
- preserve CRUD logic
- preserve upload/generation/export behavior
- do not rewrite backend unless required for UI/error handling
- do not change database schema unless absolutely necessary
- do not add heavy dependencies
- do not introduce unused complexity
- keep TypeScript clean
- keep accessibility in mind
- keep responsive behavior reasonable
- do not commit automatically

If backend logic must change, explain why.

---

## Design Implementation Order

Follow this order:

1. Audit current product and pages.
2. Define visual tokens:
   - colors
   - typography
   - spacing
   - radius
   - shadows
   - borders
3. Create reusable UI primitives.
4. Redesign global shell/navigation.
5. Redesign public pages.
6. Redesign login/auth pages.
7. Redesign dashboard.
8. Redesign core list/detail pages.
9. Redesign editor/studio/workflow pages.
10. Improve empty/loading/error states.
11. Improve motion.
12. Run validation.

If the scope is large, prioritize:

1. app shell/navigation
2. main workflow pages
3. editor/detail pages
4. home/login
5. polish

---

## Validation

At the end, run:

- npm run build
- npx tsc --noEmit

Also manually smoke test the main workflow:

1. Open home page.
2. Login.
3. Open dashboard.
4. Navigate through main pages.
5. Create or edit the main objects.
6. Trigger primary actions.
7. Check empty/loading/error states.
8. Confirm no existing feature is broken.

Adapt the smoke test to the actual product.

---

## Required Output

At the end, provide:

1. Overall design direction applied.
2. Pages redesigned.
3. Files created.
4. Files modified.
5. Reusable components created.
6. UX improvements.
7. Copywriting improvements.
8. Motion/animation improvements.
9. Error handling improvements.
10. Functionality preserved.
11. Build result.
12. TypeScript result.
13. Manual smoke test result.
14. Risks or tradeoffs.
15. Recommended next iteration.

Do not commit automatically.

---

## Final Quality Standard

The result must feel like:

- a real premium product
- a polished modern interface
- an intuitive workspace
- not a prototype
- not a generic template
- not a basic Tailwind dashboard
- not a decorative Dribbble mockup disconnected from usability

The redesign is successful only if the product becomes easier to understand and more pleasant to use while preserving all existing functionality.