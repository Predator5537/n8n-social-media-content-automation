# Carematix Draft Generator — Setup Guide

**What this does:** Every Monday at 9am, it reads your content ideas from a Google Sheet and automatically writes LinkedIn, Facebook, and Instagram post drafts — then saves them back to the sheet.

**Time to set up:** ~15 minutes

---

## Before You Start — Get These 2 Things

You need two API keys. Get them now before opening n8n.

### 1. Gemini API Key (free)
1. Go to → [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key** → Copy it and save it somewhere

### 2. OpenRouter API Key (free)
1. Go to → [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. Create a free account
3. Click **Create Key** → Copy it and save it somewhere

---

## Step 1 — Import the Workflow into n8n

1. Open your browser → go to **http://localhost:5678**
2. Click **Workflows** in the left sidebar
3. Click the **⋯ menu** (top right) → select **Import from File**
4. Select the file: `carematix-workflow-a-draft-generator.json`
5. The workflow opens — **don't close it yet**

---

## Step 2 — Add Your 3 Credentials

In n8n, credentials are how the workflow connects to Google and the AI services. You add them once.

Click **Credentials** in the left sidebar, then follow these three steps:

---

### Credential 1 — Google Sheets

1. Click **+ Add Credential**
2. Search for and select: **Google Sheets OAuth2 API**
3. Set the **Name** field to exactly: `Google Sheets OAuth2`
4. Click **Sign in with Google** and approve access
5. Click **Save**

---

### Credential 2 — Gemini (AI writer)

1. Click **+ Add Credential**
2. Search for and select: **HTTP Query Authentication**
3. Set the **Name** field to exactly: `Gemini API`
4. Fill in the fields:
   - **Name:** `key`
   - **Value:** *(paste your Gemini API key here)*
5. Click **Save**

---

### Credential 3 — OpenRouter (backup AI)

1. Click **+ Add Credential**
2. Search for and select: **HTTP Header Authentication**
3. Set the **Name** field to exactly: `OpenRouter API`
4. Fill in the fields:
   - **Name:** `Authorization`
   - **Value:** `Bearer ` *(then paste your OpenRouter key — keep the word "Bearer" and the space before it)*
5. Click **Save**

---

## Step 3 — Set Up Your Google Sheet

The workflow is already connected to the Carematix Google Sheet. Open it and make sure it has these 3 tabs:

| Tab name | Purpose |
|----------|---------|
| `Prompt Config` | AI settings (pre-filled, leave as-is) |
| `Content Queue` | Where you add your content ideas |
| `Run Log` | Auto-filled by the workflow after each run |

### Add Your Content Ideas to "Content Queue"

Each row in this tab = one set of posts (LinkedIn + Facebook + Instagram).

**You must fill in all of these columns for each row:**

| Column | What to write |
|--------|---------------|
| **Row ID** | A unique label, e.g. `ROW-001`, `ROW-002` |
| **Status** | Type exactly: `BRIEFREADY` |
| **Theme** | The topic, e.g. `RPM for rural clinics` |
| **Content Pillar** | e.g. `Product Education` or `Customer Success` |
| **Objective** | What the post should achieve, e.g. `Drive demo requests` |
| **Audience** | Who it's for, e.g. `Primary care physicians` |
| **CTA** | The call to action, e.g. `Book a demo at carematix.com` |
| **Publish Date** | Format: `YYYY-MM-DD`, e.g. `2026-06-02` *(must be within the next 14 days)* |

> ⚠️ **The workflow only picks up rows where Status = `BRIEFREADY` and Publish Date is within the next 14 days.**

---

## Step 4 — Run It

### To test it now (manual run):
1. Open the workflow in n8n
2. Click the **Test workflow** button (▶ triangle at the top)
3. Watch the nodes turn green as it runs
4. Open your Google Sheet — the drafts will appear in the `LinkedIn Draft`, `Facebook Draft`, and `Instagram Caption` columns

### To turn on the weekly auto-run:
1. In the workflow editor, flip the toggle in the top right from **Inactive** → **Active**
2. Done — it will now run every Monday at 9am automatically

---

## How to Know If It Worked

Check the **Status** column in your Content Queue:

| Status | Meaning |
|--------|---------|
| `DRAFTREADY` | ✅ Drafts were written — go check the draft columns |
| `FAILEDGENERATION` | ❌ Something went wrong — see the `Error Code` column |

**If you see FAILEDGENERATION:**

| Error Code | Fix |
|------------|-----|
| `MISSINGINPUT` | A required field was blank — fill it in, reset Status to `BRIEFREADY`, run again |
| `APIFAILURE` | API key issue — double-check your credentials in n8n |
| `PARSEFAILURE` | AI responded oddly — reset Status to `BRIEFREADY` and try again |

---

*That's it. Once credentials are set up, the only ongoing work is filling in new rows in the Content Queue.*
