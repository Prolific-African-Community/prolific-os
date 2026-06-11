# Proliquid Loop Decisions

## Purpose

This file records the major product, operating, accounting, and control decisions that are already established implicitly or explicitly across the current Proliquid documentation set.

These decisions should be treated as the current doctrine for future loop design unless they are later revised through an explicit decision process.

## Accepted Decisions

### Decision 1: Proliquid is service-led, platform-enabled

Proliquid is not positioned as software replacing financial administration. It is a Luxembourg-focused service and operating platform where human expertise remains central and the platform improves control, visibility, and continuity.

### Decision 2: Luxembourg credibility comes before platform narrative

The product is built for Luxembourg holdings, SPVs, family offices, and investment structures. The commercial and operating center of gravity is Luxembourg administration, accounting, reporting, and structure support.

### Decision 3: The product is entity-centric

The entity is the main operating unit. Documents, accounting activity, bank processing, reconciliations, reporting, and control views should all be organized around the entity.

### Decision 4: Human-in-the-loop is the governing philosophy

Human validation is mandatory for ambiguous, sensitive, or high-value matters. AI may assist, but accountable human review remains a structural requirement.

### Decision 5: Fully autonomous accounting is out of scope

The platform may prepare suggestions, but it should not make unsupervised accounting decisions or final postings on critical matters.

### Decision 6: Control takes priority over automation volume

The system should favor conservative, explainable, traceable outcomes over aggressive automation.

### Decision 7: Audit trail is a first-class capability

Auditability is not optional. Source-to-output traceability, approvals, overrides, escalations, and exception history are part of the product’s core value.

### Decision 8: Documents are foundational operating records

Invoices, bank statements, reports, and support schedules are not passive attachments. They are operational source records that drive accounting, review, reconciliation, and reporting.

### Decision 9: Accounting proposals may be assisted, not silently finalized

Draft accounting proposals are acceptable. Silent collapse of ambiguity into final treatment is not.

### Decision 10: High-value transactions require mandatory human review

Thresholds may later be tuned by entity profile, but the principle is already established and should not be weakened.

### Decision 11: Ambiguous VAT treatment must be escalated

VAT handling should be conservative and document-supported, particularly for cross-border and mixed-profile structures.

### Decision 12: Bank text alone is not sufficient evidence

Bank narratives may inform classification and matching, but they do not by themselves determine accounting substance.

### Decision 13: Revenue must not be inferred casually for target structures

For holdings, SPVs, and family-office structures, incoming funds may reflect loans, capital, reimbursements, distributions, or investment proceeds. These should not be treated as revenue without support.

### Decision 14: Shareholder, investor, intercompany, and distribution flows are high-risk categories

These flows require stronger review, tighter documentation, and more conservative treatment than routine operational items.

### Decision 15: Reconciliation is control work, not a cosmetic bookkeeping task

The reconciliation loop exists to confirm that accounting records remain tied to real evidence. It should expose ambiguity rather than smooth it away.

### Decision 16: Conservative reconciliation beats convenient matching

Automatic or manual matching should prefer explainability over speed. Numeric similarity alone is not enough where multiple plausible interpretations remain.

### Decision 17: The product should graduate automation in levels

Structured visibility comes first, then assisted preparation, then workflow automation, then limited conditional accounting automation. There is no mandate for autonomous financial action.

### Decision 18: Workflow visibility is part of the product, not just internal process

Statuses, review queues, exceptions, escalations, and pending actions should be visible because operating control is a user-facing value proposition.

### Decision 19: Investor and family office access must be controlled and selective

External users should see approved, relevant information based on role. Internal visibility and external visibility are not the same thing.

### Decision 20: The product should feel like a premium financial operating platform

The product is expected to support serious financial administration with clarity, restraint, and institutional discipline rather than generic SaaS behavior.

## Open Questions

- How should high-value thresholds be defined by entity type, size, and reporting sensitivity?
- What is the first minimum viable reporting pack standard for investor and family office users?
- Which approval rights belong to which internal roles at launch?
- What is the first acceptable scope of AI assistance in production before broader loop expansion?
- How should multi-entity visibility work for family offices and cross-border groups without weakening role-based control?
- Which unresolved compliance topics require external adviser review rather than internal policy only?

## Rejected Or Explicitly Not Chosen

### Fully autonomous accounting

Rejected as inconsistent with the documented control philosophy and target client risk profile.

### Reconciliation based primarily on amount matching

Rejected because it is too weak for holdings, SPVs, investor flows, and intercompany activity.

### Document storage without workflow meaning

Rejected because documents are defined as operational records, not passive files.

### Investor-grade reporting built on unresolved exceptions

Rejected because reporting credibility depends on controlled source records, review, and reconciliation.

### Automation-first product sequencing

Rejected because the current doctrine prioritizes operating control, service delivery, and institutional reliability before aggressive automation.

## Notes

This decision register should be updated whenever a new official loop run results in a meaningful strategic, product, accounting, or operating decision.
