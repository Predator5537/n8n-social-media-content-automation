# 🚀 N8N Social Media Content Automation

> A lightweight, AI-powered content operating system built for Carematix that enables a single non-technical operator to generate, review, approve, and publish social media content across **LinkedIn**, **Facebook**, and **Instagram** — fully automated, on-brand, and audit-ready.

---

## ✨ Overview

This project delivers a production-ready n8n workflow suite that automates the entire social media content lifecycle — from idea to published post — using Google Sheets as the source of truth and Google Gemini as the AI content engine.

**Built for:** Carematix Marketing Team  
**Version:** MVP Sprint 1 | May 2026  
**Orchestration:** [n8n](https://n8n.io/) (self-hosted)

---

## 🏗️ Architecture

```
Google Sheets (7-tab schema)
        │
        ▼
   n8n Workflows ──► Gemini Pro (AI Generation)
        │                └──► OpenRouter (Fallback AI)
        │
        ▼
   Canva Brand Kit ──► Manual Publish (Phase 1)
                   └──► Meta Graph API / Buffer (Phase 2)
```

| Layer | Tool |
|---|---|
| Source of Truth | Google Sheets (7-tab schema) |
| Orchestration | n8n |
| AI Generation (Primary) | Gemini Pro |
| AI Generation (Fallback) | OpenRouter |
| Creative Assets | Canva Brand Kit |
| Publishing Phase 1 | Manual by operator |
| Publishing Phase 2 | Meta Graph API, LinkedIn/Buffer *(gated)* |

---

## 📂 Repository Structure

```
├── carematix-workflow-a-draft-generator.json       # Workflow A: Weekly Draft Generator
├── carematix-workflow-a-draft-generator-FIXED.json # Workflow A: Patched version
├── carematix-workflow-b-review-approval.json        # Workflow B: Review & Approval
├── carematix-workflow-c-manual-publish-checklist.json # Workflow C: Manual Publish Fallback
├── generate-workflow.js                             # Workflow generation utility script
├── HOW-TO-SETUP-WORKFLOW.md                         # End-to-end setup guide (~15 min)
├── GOOGLE-SHEETS-OAUTH-SETUP.md                     # Google Sheets OAuth setup guide
└── Carematix_Antigravity_Context_Brief.md           # Full project context & PRD reference
```

---

## ⚙️ The Workflow Suite

| ID | Workflow | Trigger | Status |
|---|---|---|---|
| **A** | Weekly Draft Generator | Every Monday at 9AM | ✅ Built & validated |
| **B** | Review & Approval | Every 30 min polling | ✅ Built |
| **C** | Manual Publishing Fallback | Daily at 8AM | ✅ Built |
| **D** | Auto-Publishing *(Phase 2)* | Daily at 8AM | ⏳ Pending Meta/LinkedIn credentials |
| **E** | Weekly Competitor Digest | Every Friday at 3PM | ✅ Built |

---

## 🗃️ Google Sheet Structure (7 Tabs)

| Tab | Purpose |
|---|---|
| **Content Queue** | Master content rows with draft, approval, and publish fields |
| **Brand Rules** | Hashtags, banned words, approved CTAs, character limits |
| **Prompt Config** | Gemini model settings, temperature, word ranges per platform |
| **Competitor Tracker** | Manually logged competitor posts |
| **Weekly Digest** | AI-generated competitor summary output |
| **Metrics Log** | Impressions, reactions, comments, engagement rate |
| **Run Log** | Workflow execution audit trail |

---

## 🔄 Content State Machine

Each content row moves through a defined lifecycle. Do not deviate from these states:

```
BACKLOG → BRIEF_READY → DRAFT_GENERATING → DRAFT_READY
        → IN_REVIEW → APPROVED → SCHEDULED_MANUAL / SCHEDULED_AUTO
        → POSTED_MANUAL / POSTED_AUTO → METRICS_PENDING → COMPLETE

Failure paths:
  DRAFT_GENERATING → FAILED_GENERATION  (auto-retryable)
  SCHEDULED_*      → FAILED_PUBLISH     (operator notified)
```

---

## 🚀 Quick Start

### Prerequisites

- [n8n](https://docs.n8n.io/hosting/) self-hosted instance running at `http://localhost:5678`
- A Google account with access to the Carematix Google Sheet
- A [Gemini API key](https://aistudio.google.com/app/apikey) *(free)*
- An [OpenRouter API key](https://openrouter.ai/keys) *(free)*

### Setup (~15 minutes)

**Step 1 — Import the workflow**
1. Open n8n at `http://localhost:5678`
2. Go to **Workflows** → **⋯ menu** → **Import from File**
3. Select `carematix-workflow-a-draft-generator-FIXED.json`

**Step 2 — Add your credentials in n8n**

| Credential Type | n8n Name (exact) | Notes |
|---|---|---|
| Google Sheets OAuth2 API | `Google Sheets OAuth2` | See [GOOGLE-SHEETS-OAUTH-SETUP.md](./GOOGLE-SHEETS-OAUTH-SETUP.md) |
| HTTP Query Authentication | `Gemini API` | Paste your Gemini API key as the `key` param |
| HTTP Header Authentication | `OpenRouter API` | Value: `Bearer YOUR_KEY` |

**Step 3 — Prepare your Google Sheet**

Add rows to the **Content Queue** tab with these required columns:

| Column | Example |
|---|---|
| Row ID | `ROW-001` |
| Status | `BRIEFREADY` |
| Theme | `RPM for rural clinics` |
| Content Pillar | `Product Education` |
| Objective | `Drive demo requests` |
| Audience | `Primary care physicians` |
| CTA | `Book a demo at carematix.com` |
| Publish Date | `2026-06-02` *(within 14 days)* |

**Step 4 — Run it**
- **Manual test:** Click the ▶ **Test workflow** button in n8n
- **Enable automation:** Toggle the workflow from **Inactive → Active**

> 📖 Full setup instructions: [HOW-TO-SETUP-WORKFLOW.md](./HOW-TO-SETUP-WORKFLOW.md)

---

## 🔍 Troubleshooting

| Status in Sheet | Meaning |
|---|---|
| `DRAFTREADY` | ✅ Drafts generated — check the draft columns |
| `FAILEDGENERATION` | ❌ Error occurred — see the `Error Code` column |

| Error Code | Fix |
|---|---|
| `MISSINGINPUT` | A required field is blank — fill in and reset status to `BRIEFREADY` |
| `APIFAILURE` | API key issue — verify credentials in n8n |
| `PARSEFAILURE` | AI gave unexpected output — reset to `BRIEFREADY` and retry |

---

## 🔐 Security Notes

- **Never store API keys in Google Sheets** — all credentials live in n8n's credential store only
- Google Sheets OAuth is scoped to read/write your specific sheet only
- The OAuth app will show an "unverified" warning during setup — this is expected for self-hosted tools in test mode

---

## 📋 Key Constraints

1. **LinkedIn is manual-first** — No API access assumed in Sprint 1
2. **Auto-publishing is Phase 2** — Workflow D is inactive until Meta credentials are validated
3. **Google Sheets schema is frozen** — Do not change tab names or column order without PRD review
4. **Every row requires a full audit trail** — Row ID, status, timestamps, Posted By, and Error Code must always be written back
5. **Brand Brain is required** — All prompts load Brand DNA + Brand Rules + Prompt Config before generating

---

## 📄 License

This project is proprietary and built exclusively for Carematix. All workflows, schemas, and documentation are confidential.

---

*Built with ❤️ using [n8n](https://n8n.io/) + [Google Gemini](https://deepmind.google/technologies/gemini/)*
