# Proliquid Business Data Model

## 1. Purpose

This document defines the minimum viable business data model for Proliquid. It is not a technical schema. It is the operating record model that describes which business objects must exist, how they relate to each other, and which minimum fields are required for the platform to function as a controlled Luxembourg financial operating environment.

The model is intended for Luxembourg holdings, SPVs, family offices, and investment structures. It should support onboarding, accounting operations, documents, bank processing, reconciliation, reporting, approvals, auditability, and future AI-assisted loops.

This document exists so that every future workflow and loop can rely on the same business language and the same minimum operating records.

## 2. Core Business Entities

The minimum viable Proliquid business model is built around the following core entities:

- Client
- Entity
- User
- Counterparty
- Bank Account
- Document
- Invoice
- Bank Transaction
- Accounting Entry
- Reconciliation Record
- Reporting Pack
- Workflow Item
- Approval Record
- Audit Trail Record
- Investor
- Family Office

These objects form the minimum operating surface required to run a real Luxembourg administration and financial operations platform.

## 3. Relationships Between Entities

The model should be understood through operational relationships rather than technical ownership diagrams.

### Primary relationship logic

- a client may have one or more entities
- an entity belongs to one client relationship context
- users may be internal Proliquid users or external client-side users with access to one or more entities
- counterparties are linked to one or more entities
- bank accounts belong to entities
- documents are linked to entities and may also link to invoices, bank transactions, workflow items, and reporting packs
- invoices belong to entities and are linked to counterparties, documents, and accounting activity
- bank transactions belong to bank accounts and entities
- accounting entries belong to entities and may link to invoices, bank transactions, and reconciliations
- reconciliation records link invoices, bank transactions, accounting entries, and open balances
- reporting packs belong to entities and may be visible to selected users, investors, or family office stakeholders
- workflow items may relate to any major business object that requires follow-up, review, or approval
- approval records sit on top of accounting, reporting, reconciliation, onboarding, or other sensitive workflow items
- audit trail records should be able to reference all major controlled business objects
- investors may be linked to one or more entities
- a family office may oversee one or more entities and one or more investors

### Relationship principle

The entity is the main operating unit. Most business records should be traceable back to a specific entity, even when a client, investor, or family office view spans several structures.

## 4. Client Model

The client model represents the commercial and operating relationship between Proliquid and the party being served.

### What the client object represents

- who Proliquid is serving
- what kind of relationship exists
- which structures belong to that relationship
- who the main contacts and decision-makers are

### Minimum client fields

- client name
- client type
- primary contact name
- primary contact details
- country or countries of relevance
- relationship status
- service scope summary
- onboarding status
- internal Proliquid owner

## 5. Entity Model

The entity model is the core operating object of the platform.

### What the entity object represents

- the legal or operating structure being administered
- the unit through which accounting, documents, bank activity, reporting, and workflows are organized

### Minimum entity fields

- entity name
- legal name if different
- entity type
- legal form
- jurisdiction
- incorporation status
- operational status
- base currency
- purpose or activity summary
- ownership summary
- directors or authorized representatives
- reporting cadence
- onboarding completion status
- internal Proliquid owner

## 6. User Model

The user model represents every person who uses or is given controlled visibility into the platform.

### What the user object represents

- who the person is
- whether they are internal or external
- what role they perform
- which entities or records they may access

### Minimum user fields

- user name
- email
- user type
- role
- associated client or organization if relevant
- associated entities
- access status
- approval authority level if relevant
- reporting visibility scope if relevant

## 7. Counterparty Model

The counterparty model represents the external or related party involved in an economic or documentary relationship with an entity.

### What the counterparty object represents

- suppliers
- customers
- advisers
- banks
- intercompany parties
- tax authorities
- related parties

### Minimum counterparty fields

- counterparty name
- counterparty type
- linked entity or entities
- country
- contact details if relevant
- tax or registration reference if relevant
- relationship status
- related-party flag

## 8. Bank Account Model

The bank account model represents a real operating or transactional bank account used by an entity.

### What the bank account object represents

- where bank statements and bank transactions belong
- how cash activity is tied to the entity
- whether the account is active, pending, or historical

### Minimum bank account fields

- bank account name or label
- bank name
- account currency
- account identifier summary
- linked entity
- account purpose
- account status
- onboarding or banking-readiness status

## 9. Document Model

The document model represents a source or support record that may affect operations, accounting, review, or reporting.

### What the document object represents

- invoices
- bank statements
- legal or compliance records
- support schedules
- reports
- governance documents

### Minimum document fields

- document title
- document type
- linked entity
- source
- received or uploaded date
- document status
- linked counterparty if relevant
- linked invoice if relevant
- linked bank account or statement context if relevant
- reviewer status if relevant

## 10. Invoice Model

The invoice model represents a structured supplier or customer billing record.

### What the invoice object represents

- a bill to be paid
- an invoice issued to a customer where relevant
- a source record for accounting, payment tracking, and reconciliation

### Minimum invoice fields

- invoice number
- invoice type
- linked entity
- linked counterparty
- invoice date
- due date if available
- currency
- subtotal
- tax amount if applicable
- total amount
- status
- payment status
- accounting classification status
- linked source document

## 11. Bank Transaction Model

The bank transaction model represents an individual movement extracted from a bank statement.

### What the bank transaction object represents

- incoming transfer
- outgoing transfer
- fee
- tax payment or receipt
- funding movement
- distribution movement
- investment-related cash flow

### Minimum bank transaction fields

- linked entity
- linked bank account
- statement source reference
- transaction date
- value date if available
- direction
- currency
- amount
- narrative or reference
- counterparty name if known
- classification status
- reconciliation status

## 12. Accounting Entry Model

The accounting entry model represents a controlled accounting outcome tied to business events.

### What the accounting entry object represents

- the accounting record created from documents, bank movements, manual review, or approved workflows
- a draft or approved financial classification outcome

### Minimum accounting entry fields

- linked entity
- accounting period
- entry date
- entry type
- entry status
- source context
- linked invoice if relevant
- linked bank transaction if relevant
- narrative
- approval status
- posting or finalization status

## 13. Reconciliation Model

The reconciliation model represents the controlled matching state between business records.

### What the reconciliation object represents

- invoice-to-payment matches
- bank-to-ledger matches
- intercompany confirmations
- open-item status
- unresolved exceptions

### Minimum reconciliation fields

- linked entity
- reconciliation type
- source records involved
- confidence level
- reconciliation status
- reviewer status
- exception flag
- resolution date if completed
- open-balance indicator if relevant

## 14. Reporting Model

The reporting model represents a structured reporting output prepared for management, investors, family offices, or internal operations.

### What the reporting object represents

- period-based reporting packs
- investor reporting outputs
- accounting reporting views
- internal management reporting packages

### Minimum reporting fields

- report name
- report type
- linked entity
- reporting period
- report status
- intended audience
- release status
- linked supporting records or source set summary
- approver if required

## 15. Workflow Item Model

The workflow item model represents a unit of operational work that needs action, review, clarification, or follow-up.

### What the workflow item object represents

- review task
- exception follow-up
- missing document request
- approval request
- reconciliation issue
- onboarding action

### Minimum workflow item fields

- workflow item title
- workflow item type
- linked entity
- linked source object
- status
- owner
- priority
- due date if relevant
- escalation status

## 16. Approval Model

The approval model represents a formal human decision point.

### What the approval object represents

- approval of accounting proposals
- approval of reporting packs
- approval of reconciliations
- approval of onboarding readiness
- approval of sensitive operational outcomes

### Minimum approval fields

- approval type
- linked entity
- linked source object
- approver
- approval status
- approval date
- rationale or decision note
- escalation flag if relevant

## 17. Audit Trail Model

The audit trail model represents the traceability layer across all controlled actions.

### What the audit trail object represents

- who did what
- when it happened
- what object it affected
- what changed in business terms

### Minimum audit trail fields

- event date and time
- actor
- action type
- linked business object
- linked entity if relevant
- before or after state summary where relevant
- approval or override indicator if relevant
- escalation indicator if relevant

## 18. Investor Model

The investor model represents a person or institution with a financial or reporting relationship to one or more entities.

### What the investor object represents

- shareholder or investment participant context
- party entitled to selected information and reporting
- stakeholder relevant to funding, distributions, or reporting

### Minimum investor fields

- investor name
- investor type
- linked entity or entities
- contact or reporting contact
- visibility scope
- relationship status
- distribution or reporting relevance flag

## 19. Family Office Model

The family office model represents a family-led relationship overseeing one or more entities, investors, or structures.

### What the family office object represents

- the coordinating relationship for private structures
- the party needing multi-entity oversight
- the governance context for documents, reporting, and visibility

### Minimum family office fields

- family office name
- linked client relationship
- principal contact
- linked entities
- linked investors if relevant
- reporting scope
- access scope
- relationship status

## 20. Minimum Fields Required For Each Business Object

Every business object in the Proliquid model should carry a minimum control layer in addition to its domain-specific fields.

### Universal minimum control fields

- unique business identifier
- object type
- linked entity where relevant
- status
- owner or responsible party where relevant
- creation date
- last meaningful update date

### Additional mandatory control principles

- every sensitive object should be attributable to a human owner or accountable role
- every object that affects accounting, reporting, or access should have a visible status
- every object used in a loop should be linkable to its upstream and downstream records
- every object that carries ambiguity should be capable of entering review, exception, or escalation states

## Notes

This business data model should remain the shared operating record foundation for Proliquid. It is intentionally business-oriented, conservative, and entity-centric so that future onboarding, accounting, document, bank, reconciliation, reporting, and AI loops can all rely on the same controlled business objects.
