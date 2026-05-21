# How to Set Up Google Sheets OAuth in n8n

This takes about 10 minutes. You only need to do it once.

---

## What You're Doing (In Plain English)

Google requires you to create a small "app" in Google Cloud so that n8n has permission to read and write your Google Sheet. You'll get two codes (Client ID and Client Secret) and paste them into n8n.

---

## Part A — Create a Google Cloud Project

**1. Go to Google Cloud Console**
→ Open: [https://console.cloud.google.com](https://console.cloud.google.com)
Sign in with the same Google account that owns the Google Sheet.

**2. Create a new project**
- Click the project dropdown at the top (it may say "Select a project" or show a project name)
- Click **New Project**
- Name it anything, e.g. `Carematix n8n`
- Click **Create**
- Wait a few seconds, then make sure your new project is selected in the dropdown

**3. Enable the Google Sheets API**
- In the search bar at the top, type: `Google Sheets API`
- Click the result called **Google Sheets API**
- Click **Enable**

**4. Also enable the Google Drive API**
- Go back to the search bar, type: `Google Drive API`
- Click the result and click **Enable**

---

## Part B — Create OAuth Credentials

**5. Go to the Credentials page**
- In the left sidebar, click **APIs & Services** → **Credentials**
- Click **+ Create Credentials** (at the top)
- Choose **OAuth client ID**

**6. Configure the OAuth consent screen (first-time only)**
If Google shows a warning saying "Configure consent screen", do this first:
- Click **Configure Consent Screen**
- Choose **External** → click **Create**
- Fill in:
  - **App name:** `Carematix n8n` (anything works)
  - **User support email:** your email
  - **Developer contact email:** your email
- Click **Save and Continue**
- On the Scopes page → click **Save and Continue** (no changes needed)
- On the Test Users page → click **+ Add Users** → add your own Google email → click **Save and Continue**
- Click **Back to Dashboard**
- Now go back to **Credentials** → **+ Create Credentials** → **OAuth client ID**

**7. Create the OAuth Client ID**
- Under **Application type**, select: **Web application**
- Give it a name, e.g. `n8n`
- Scroll to **Authorized redirect URIs**
- Click **+ Add URI**
- Paste this exactly:
  ```
  http://localhost:5678/rest/oauth2-credential/callback
  ```
- Click **Create**

**8. Copy your credentials**
A popup appears showing:
- **Client ID** — copy this
- **Client Secret** — copy this

Keep this popup open or save both values somewhere.

---

## Part C — Paste Into n8n

**9. Go back to n8n**
→ Open: [http://localhost:5678](http://localhost:5678)

**10. Open the Google Sheets credential**
- Click **Credentials** in the left sidebar
- Click **+ Add Credential**
- Search for **Google Sheets OAuth2 API** → select it → click Continue
- Set the **Name** field to exactly: `Google Sheets OAuth2`
- Paste your **Client ID** into the Client ID field
- Paste your **Client Secret** into the Client Secret field

**11. Connect your Google account**
- Click **Sign in with Google**
- A Google login popup will appear — sign in with the same Google account
- Google may warn "This app isn't verified" — click **Advanced** → then **Go to Carematix n8n (unsafe)**
  *(This warning appears because the app is in test mode — it's safe to proceed)*
- Click **Allow** to grant access
- The popup will close and n8n will show a green checkmark ✅

**12. Save**
- Click **Save**
- You're done!

---

## ✅ Done — What Happens Next

The workflow can now read from and write to your Google Sheet automatically.
Go back to the main setup guide and continue with **Credential 2 — Gemini**.
