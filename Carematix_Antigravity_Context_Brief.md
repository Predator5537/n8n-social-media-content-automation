# Carematix Social Media Automation — Project Context Brief
**Version:** MVP Sprint 1 | **Date:** May 2026  
**PRD Owner:** Carematix Marketing

---

## Product Goal
Build a lightweight content operating system for Carematix so one non-technical operator can reliably generate, review, publish, and learn from social content across **LinkedIn, Facebook, and Instagram** — while maintaining brand standards.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Source of truth | Google Sheets (7-tab schema) |
| Orchestration | n8n |
| AI Generation (Primary) | Gemini Pro |
| AI Generation (Fallback) | OpenRouter |
| Creative assets | Canva Brand Kit |
| Publishing Phase 1 | Manual by operator |
| Publishing Phase 2 | Meta Graph API, LinkedIn/Buffer (gated) |

---

## The 5 Workflows

| ID | Name | Trigger | Status |
|---|---|---|---|
| A | Weekly Draft Generator | Monday 9AM | ✅ Built & validated |
| B | Review & Approval | Every 30 min polling | ✅ Built |
| C | Manual Publishing Fallback | Daily 8AM | ✅ Built |
| D | Auto-Publishing | Daily 8AM (Phase 2) | ⏳ Not built — gated on Meta/LinkedIn credentials |
| E | Weekly Competitor Digest | Friday 3PM | ✅ Built |

---

## Google Sheet — 7 Tabs

1. **Content Queue** — Master content row with all draft, approval, and publish fields
2. **Brand Rules** — Hashtags, banned words, approved CTAs, character limits
3. **Prompt Config** — Gemini model, temperature, word ranges per platform
4. **Competitor Tracker** — Manually logged competitor posts from ThoroughCare, Prevounce, Tenovi
5. **Weekly Digest** — AI-generated competitor summary output
6. **Metrics Log** — Impressions, reactions, comments, engagement rate
7. **Run Log** — Workflow execution audit trail

---

## State Machine (Critical — do not deviate)

```
BACKLOG → BRIEF_READY → DRAFT_GENERATING → DRAFT_READY
→ IN_REVIEW → APPROVED → SCHEDULED_MANUAL / SCHEDULED_AUTO
→ POSTED_MANUAL / POSTED_AUTO → METRICS_PENDING → COMPLETE

Failure paths:
DRAFT_GENERATING → FAILED_GENERATION (auto-retryable)
SCHEDULED_* → FAILED_PUBLISH (notify operator)
```

> ⚠️ Status values in the sheet and all n8n nodes must use the **exact same string format**  
> (currently no underscores in workflow files: `BRIEFREADY`, `DRAFTREADY` etc.) — align before going live.

---

## Key Constraints Antigravity Must Respect

1. **LinkedIn is manual-first** — Do not assume API access in Sprint 1
2. **Auto-publishing is Phase 2** — Workflow D is not active until Meta credentials are validated end-to-end
3. **Google Sheets is permanent** — Not a temporary tool; schema must not be changed without PRD review
4. **Every row needs full audit trail** — Row ID, status, timestamps, Posted By, and Error Code must always be written
5. **Brand Brain layer is required** — All prompts must load Brand DNA + Brand Rules + Prompt Config before generating content
6. **No credentials in the sheet** — All API keys live in n8n credentials only

---

## Current Sprint Status

- ✅ Workflow A validated against PRD
- 🔄 Running first live test of Workflow A now (operator testing)
- ⏳ Workflows B, C, E ready to import into n8n after Workflow A passes
- ⏳ Workflow D pending Meta + LinkedIn credential decision

---

## PRD Reference

Full audited PRD (`Carematix_Final_PRD.md`) is the single source of truth.  
Any feature, schema change, or workflow deviation must be checked against it before implementation.
