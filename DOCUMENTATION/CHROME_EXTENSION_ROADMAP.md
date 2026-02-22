# 🚀 InnerVoice AI — Chrome Extension Development Roadmap
> From existing codebase → production deployment on the Chrome Web Store

---

## 📋 Table of Contents

1. [Project Status Snapshot](#1-project-status-snapshot)
2. [Architecture Overview](#2-architecture-overview)
3. [Phase 0 — Prerequisites & Environment Setup](#phase-0--prerequisites--environment-setup)
4. [Phase 1 — Vite Build Configuration for Extension](#phase-1--vite-build-configuration-for-extension)
5. [Phase 2 — Chrome Manifest v3 Setup](#phase-2--chrome-manifest-v3-setup)
6. [Phase 3 — Feature Completion (Extension-Specific)](#phase-3--feature-completion-extension-specific)
7. [Phase 4 — Context Menu Integration](#phase-4--context-menu-integration)
8. [Phase 5 — Backend Deployment (Production API)](#phase-5--backend-deployment-production-api)
9. [Phase 6 — Extension Hardening & Security](#phase-6--extension-hardening--security)
10. [Phase 7 — Testing](#phase-7--testing)
11. [Phase 8 — Chrome Web Store Submission](#phase-8--chrome-web-store-submission)
12. [Phase 9 — Post-Launch & Maintenance](#phase-9--post-launch--maintenance)
13. [Full Task Checklist](#full-task-checklist)
14. [File Structure Reference](#file-structure-reference)

---

## 1. Project Status Snapshot

### ✅ Already Built (Extension Code Exists)

| Component | File | Status |
|---|---|---|
| Extension popup layout (400×600) | `src/layouts/ExtensionLayout.jsx` | ✅ Complete |
| Analyze tab (sentiment + emotions) | `src/pages/extension/ExtensionAnalyze.jsx` | ✅ Complete |
| Rewrite tab (Gemini AI, 6 goals) | `ExtensionAnalyze.jsx` → `RewriteView` | ✅ Complete |
| History tab (last 20 items) | `src/pages/extension/ExtensionHistory.jsx` | ✅ Complete |
| Auth gate (login + register forms) | `ExtensionLayout.jsx` → `ExtensionAuthView` | ✅ Complete |
| Extension mode detection | `src/lib/config.js` → `isExtension()` | ✅ Complete |
| App routing (web vs extension) | `src/App.jsx` | ✅ Complete |
| Settings panel (theme selector) | `ExtensionLayout.jsx` → `ExtensionSettings` | ✅ Complete |
| Bangla/Banglish NLP backend | `services/` | ✅ Complete |
| Django REST API (all endpoints) | `backend/api/` | ✅ Complete |

### ❌ Missing (Must Build)

| Component | Priority |
|---|---|
| `manifest.json` (Manifest V3) | 🔴 Critical |
| Vite build config for extension output | 🔴 Critical |
| `background.js` service worker | 🔴 Critical |
| Content script (for right-click context menu) | 🟡 High |
| Production API URL in `.env` | 🔴 Critical |
| Extension icons (16, 32, 48, 128px) | 🟡 High |
| Chrome Web Store assets (screenshots, description) | 🟡 High |
| Backend deployed to a public server | 🔴 Critical |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CHROME BROWSER                                    │
│                                                                      │
│  ┌──────────────────┐    ┌─────────────────────────────────────┐    │
│  │  background.js   │    │   popup.html  (400×600)             │    │
│  │  (Service Worker)│    │   React App → ExtensionApp()        │    │
│  │                  │    │                                      │    │
│  │  - Context menu  │    │  ┌────────────┬──────────────────┐  │    │
│  │    event handler │    │  │  Analyze   │    History       │  │    │
│  │  - Badge updates │    │  │  Tab       │    Tab           │  │    │
│  │  - Message relay │    │  │            │                  │  │    │
│  └──────┬───────────┘    │  └────────────┴──────────────────┘  │    │
│         │                └──────────────────┬──────────────────┘    │
│         │                                   │                       │
│  ┌──────▼───────────┐                       │                       │
│  │  content.js      │   chrome.runtime      │                       │
│  │  (Content Script)│   .sendMessage()      │                       │
│  │                  │◄──────────────────────┘                       │
│  │  - Reads selected│                                               │
│  │    text from page│                                               │
│  │  - Sends to popup│                                               │
│  └──────────────────┘                                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  HTTPS API calls
                               ▼
              ┌─────────────────────────────────┐
              │   Django REST API (Production)  │
              │   https://api.innervoice.app    │
              │                                 │
              │  POST /api/analyze/             │
              │  POST /api/rewrite/             │
              │  GET  /api/history/             │
              │  POST /api/auth/login/          │
              └─────────────────────────────────┘
```

---

## Phase 0 — Prerequisites & Environment Setup

**Time estimate: 1–2 hours**

### 0.1 Install Required Tools

```bash
# Ensure Node.js ≥ 18 is installed
node --version

# Install crx packaging tool (optional, for manual signing)
npm install -g crx3
```

### 0.2 Set Up Environment Files

Create `frontend/.env.development` (local dev):
```
VITE_API_URL=http://localhost:8000/api
```

Create `frontend/.env.production` (points to your deployed backend):
```
VITE_API_URL=https://your-api-domain.com/api
```

> ⚠️ **Never commit `.env.production` to git.** Add it to `.gitignore`.

### 0.3 Prepare Icon Assets

Create icons at exactly these sizes and place them in `frontend/public/icons/`:

| File | Size | Usage |
|---|---|---|
| `icon16.png` | 16×16 | Browser toolbar (small) |
| `icon32.png` | 32×32 | Windows taskbar |
| `icon48.png` | 48×48 | Extension management page |
| `icon128.png` | 128×128 | Chrome Web Store listing |

> 💡 **Tip:** Use the Brain icon from your sidebar, export it with a blue gradient background (`from-blue-500 to-blue-700`) to match the existing brand.

---

## Phase 1 — Vite Build Configuration for Extension

**Time estimate: 2–3 hours**

This is the most critical technical step. A Chrome extension requires a **specific output structure** — multiple entry points, no code splitting for the popup, and a flat output directory.

### 1.1 Install the Vite Extension Plugin

```bash
cd frontend
npm install -D @crxjs/vite-plugin
```

> The `@crxjs/vite-plugin` is the standard tool for building Vite-based Chrome extensions. It reads `manifest.json` directly and handles all entry points automatically.

### 1.2 Update `vite.config.js`

Replace the current config with an extension-aware version:

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'
import path from 'path'
import manifest from './manifest.json' assert { type: 'json' }

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),          // handles popup, background, content scripts
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist-extension',   // separate from web build output
    emptyOutDir: true,
  },
}))
```

### 1.3 Add Build Scripts to `package.json`

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "build:ext": "vite build --config vite.config.ext.js",
  "preview": "vite preview"
}
```

> Keep a separate `vite.config.ext.js` for extension builds so your web build is never broken.

---

## Phase 2 — Chrome Manifest v3 Setup

**Time estimate: 1 hour**

Create `frontend/manifest.json` at the root of the frontend folder:

```json
{
  "manifest_version": 3,
  "name": "InnerVoice AI",
  "version": "1.0.0",
  "description": "Analyze emotions and rewrite text with AI. Supports English, Bangla, and Banglish.",
  "author": "Rizon1326",

  "icons": {
    "16":  "icons/icon16.png",
    "32":  "icons/icon32.png",
    "48":  "icons/icon48.png",
    "128": "icons/icon128.png"
  },

  "action": {
    "default_popup": "index.html",
    "default_icon": {
      "16":  "icons/icon16.png",
      "32":  "icons/icon32.png",
      "48":  "icons/icon48.png",
      "128": "icons/icon128.png"
    },
    "default_title": "InnerVoice AI"
  },

  "background": {
    "service_worker": "src/background.js",
    "type": "module"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content.js"],
      "run_at": "document_idle"
    }
  ],

  "permissions": [
    "storage",
    "contextMenus",
    "activeTab",
    "scripting"
  ],

  "host_permissions": [
    "https://your-api-domain.com/*"
  ],

  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },

  "minimum_chrome_version": "102"
}
```

> ⚠️ **MV3 Rules to remember:**
> - No `eval()` or inline scripts anywhere
> - Background must be a service worker (not a persistent page)
> - All API calls must go to HTTPS (no `localhost` in production `host_permissions`)

---

## Phase 3 — Feature Completion (Extension-Specific)

**Time estimate: 3–4 hours**

### 3.1 Verify `isExtension()` Detection Works

Your `src/lib/config.js` already has:
```js
export const isExtension = () => {
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id
}
```
This is correct for MV3. No changes needed.

### 3.2 Fix Token Storage — Use `chrome.storage.local`

Currently your auth uses `localStorage`. In a Chrome extension, `localStorage` works in the popup but **does not persist reliably across sessions** and is inaccessible from the service worker.

Create `src/utils/extensionStorage.js`:

```js
// Unified storage: chrome.storage.local in extension, localStorage on web
export const storage = {
  get: async (key) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => resolve(result[key] ?? null))
      })
    }
    return localStorage.getItem(key)
  },
  set: async (key, value) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve)
      })
    }
    localStorage.setItem(key, value)
  },
  remove: async (key) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([key], resolve)
      })
    }
    localStorage.removeItem(key)
  },
}
```

Update your `AuthContext` / `useAuth` hook to use `storage.get()` / `storage.set()` instead of `localStorage` directly.

### 3.3 Fix CORS on Django Backend

Add the extension's origin to Django's CORS whitelist. In `backend/core/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",          # dev web
    "http://localhost:3000",
    "https://your-web-domain.com",    # prod web
    # Chrome extensions use chrome-extension:// scheme
]

# Allow Chrome extension requests (they send Origin: chrome-extension://...)
CORS_ALLOW_ALL_ORIGINS = False        # keep False
CORS_ALLOW_CREDENTIALS = True

# Add this to allow chrome-extension:// origins:
CORS_ORIGIN_REGEX_WHITELIST = [
    r"^chrome-extension://.*$",
]
```

### 3.4 Add "Open Web App" Button in Extension Settings

In `ExtensionSettings`, add a link to your deployed web app:

```jsx
<a
  href="https://your-web-domain.com"
  target="_blank"
  rel="noreferrer"
  className="flex items-center gap-2 text-sm text-primary mt-4"
>
  <ExternalLink className="h-4 w-4" />
  Open Full Dashboard
</a>
```

---

## Phase 4 — Context Menu Integration

**Time estimate: 3–5 hours**

This is the **highest-value feature** for a browser extension — select text on any webpage → right-click → "Analyze with InnerVoice AI".

### 4.1 Create `src/background.js` (Service Worker)

```js
// src/background.js

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'innervoice-analyze',
    title: 'Analyze with InnerVoice AI',
    contexts: ['selection'],       // only shows when text is selected
  })

  chrome.contextMenus.create({
    id: 'innervoice-rewrite',
    title: 'Rewrite with InnerVoice AI',
    contexts: ['selection'],
  })
})

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText?.trim()
  if (!selectedText) return

  // Store selected text so popup can read it on open
  chrome.storage.local.set({
    pendingText: selectedText,
    pendingAction: info.menuItemId === 'innervoice-rewrite' ? 'rewrite' : 'analyze',
    pendingTimestamp: Date.now(),
  })

  // Open the popup
  chrome.action.openPopup()
})
```

### 4.2 Create `src/content.js` (Content Script)

```js
// src/content.js
// Listens for messages from popup to get selected text from the active page

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    const selected = window.getSelection()?.toString()?.trim() || ''
    sendResponse({ text: selected })
  }
  return true  // keep the message channel open for async response
})
```

### 4.3 Handle Pending Text in `ExtensionAnalyze.jsx`

On component mount, check if the background worker stored a pending text:

```jsx
React.useEffect(() => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['pendingText', 'pendingAction', 'pendingTimestamp'], (result) => {
      const { pendingText, pendingAction, pendingTimestamp } = result
      // Only use pending text if it was set within the last 5 seconds
      if (pendingText && (Date.now() - (pendingTimestamp || 0)) < 5000) {
        setText(pendingText)
        if (pendingAction === 'rewrite') setActiveTab('rewrite')
        // Clear it so it doesn't replay on next popup open
        chrome.storage.local.remove(['pendingText', 'pendingAction', 'pendingTimestamp'])
      }
    })
  }
}, [])
```

---

## Phase 5 — Backend Deployment (Production API)

**Time estimate: 4–8 hours**

Your extension will be reviewed and used by real users. It **must** call a publicly accessible HTTPS API. A `localhost` URL will not work for anyone else.

### Recommended Deployment Options

| Platform | Cost | Difficulty | Best For |
|---|---|---|---|
| **Railway** | Free tier available | ⭐ Easy | Django + SQLite/Postgres, quick deploy |
| **Render** | Free tier available | ⭐ Easy | Similar to Railway |
| **Heroku** | Paid ($5/mo) | ⭐⭐ Medium | More control |
| **DigitalOcean App Platform** | $5/mo | ⭐⭐ Medium | Production-grade |
| **VPS (DigitalOcean Droplet / Vultr)** | $6/mo | ⭐⭐⭐ Hard | Full control |

### 5.1 Recommended: Deploy on Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
cd backend
railway login
railway init
railway up
```

### 5.2 Backend Checklist for Production

```python
# backend/core/settings.py changes for production:

DEBUG = False
ALLOWED_HOSTS = ['your-api-domain.railway.app', 'your-custom-domain.com']

# Use PostgreSQL instead of SQLite
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': '5432',
    }
}

# Serve media files via a CDN or cloud storage (e.g. Cloudinary for avatars)
# Static files via whitenoise
INSTALLED_APPS += ['whitenoise.runserver_nostatic']
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATIC_ROOT = BASE_DIR / 'staticfiles'
```

### 5.3 Create `backend/Procfile` (for Railway/Heroku)

```
web: gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
```

### 5.4 Create `backend/requirements.txt` additions

```
gunicorn
psycopg2-binary
whitenoise
django-cors-headers
```

---

## Phase 6 — Extension Hardening & Security

**Time estimate: 2–3 hours**

### 6.1 CSP Compliance — Remove Any Inline Styles/Scripts

Chrome's MV3 Content Security Policy blocks inline scripts. Audit your React components:
- ✅ Tailwind classes → fine
- ✅ `style={{ width: '50%' }}` → fine (inline *styles* are allowed, not inline *scripts*)
- ❌ `dangerouslySetInnerHTML` → audit all usages
- ❌ `eval()`, `new Function()` → must not exist

### 6.2 Token Security

- Store auth token only in `chrome.storage.local` (encrypted by Chrome OS keychain)
- Never store tokens in `sessionStorage` or cookies from within the extension
- Set a session expiry: if token is older than 7 days, force re-login

### 6.3 API Key Protection

Your Gemini API key is used in `backend/services/gemini_service.py`. Ensure:
- It is set as an **environment variable** on the server, never in source code
- The `.env` file is in `.gitignore`

### 6.4 Input Sanitization

The analyze endpoint accepts user text. Verify in `backend/api/views.py` that:
- Text length is capped (already has `len(text) < 3` check — add a max of 5000 chars)
- No server-side template injection is possible with the text passed to Gemini

---

## Phase 7 — Testing

**Time estimate: 3–5 hours**

### 7.1 Load Unpacked Extension Locally

```bash
# Build the extension
cd frontend
npm run build:ext

# Then in Chrome:
# 1. Go to chrome://extensions
# 2. Enable "Developer mode" (top right toggle)
# 3. Click "Load unpacked"
# 4. Select the  frontend/dist-extension  folder
```

### 7.2 Test Checklist

#### Auth
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (shows error)
- [ ] Register new account
- [ ] Token persists after closing and reopening popup
- [ ] Logout clears token

#### Analyze Tab
- [ ] English text analysis returns correct emotions
- [ ] Bangla (Unicode) text analysis works
- [ ] Banglish text analysis works
- [ ] Short text (< 10 chars) shows validation error
- [ ] Copy results button works

#### Rewrite Tab
- [ ] All 6 rewrite goals work
- [ ] Copy rewritten text button works
- [ ] Error shown when API call fails

#### History Tab
- [ ] Shows last 20 items
- [ ] Expand/collapse individual items works
- [ ] Refresh button fetches new data

#### Context Menu
- [ ] Select text on any webpage → right-click → "Analyze with InnerVoice AI" appears
- [ ] Clicking it opens popup with text pre-filled
- [ ] "Rewrite with InnerVoice AI" pre-fills text and switches to rewrite tab

#### Settings
- [ ] Theme toggles (Light / Dark / System)
- [ ] "Open Full Dashboard" link opens web app
- [ ] Back button returns to main view

#### General
- [ ] Works on HTTP pages
- [ ] Works on HTTPS pages
- [ ] Works on `chrome://` pages (context menu should not appear here — this is expected)
- [ ] Popup renders correctly at 400×600 — no overflow, no cut-off content
- [ ] Dark mode renders correctly

### 7.3 Cross-Browser Note

The extension targets **Chrome (MV3)**. For Firefox, MV3 support is partial — do not worry about Firefox for the initial release.

---

## Phase 8 — Chrome Web Store Submission

**Time estimate: 2–4 hours (+ up to 7 days for Google review)**

### 8.1 Create a Developer Account

1. Go to [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)
2. Pay the **one-time $5 registration fee**
3. Verify your email

### 8.2 Prepare Store Assets

| Asset | Specification |
|---|---|
| **Extension icon** | 128×128 PNG (already in `icons/`) |
| **Store icon** | 128×128 PNG |
| **Small tile** | 440×280 PNG |
| **Screenshots** | At least 1, up to 5. Size: 1280×800 or 640×400 |
| **Promotional tile** (optional) | 920×680 PNG |
| **Short description** | Max 132 characters |
| **Full description** | Max 16,000 characters (supports basic HTML) |

#### Suggested Short Description (132 chars):
```
Analyze emotions & rewrite text with AI. Supports English, Bangla, and Banglish. Right-click any text to analyze instantly.
```

### 8.3 Package the Extension

```bash
cd frontend
npm run build:ext

# The dist-extension/ folder is your extension package
# Zip it for upload:
cd dist-extension
zip -r ../innervoice-ai-v1.0.0.zip .
```

### 8.4 Upload to Developer Console

1. Click **"New Item"** in the developer console
2. Upload the `.zip` file
3. Fill in:
   - Store listing (description, screenshots, category → **"Productivity"**)
   - Privacy policy URL (required — host a simple one)
   - Permissions justification (explain why you need `contextMenus`, `storage`, etc.)
4. Set visibility: **Public** or **Unlisted** (unlisted for testing with select users)
5. Submit for review

### 8.5 Privacy Policy (Required by Google)

Host a simple privacy policy page. Key points to cover:
- What data you collect (user text, email, username)
- Where it is stored (your Django backend)
- That you do not sell user data
- How users can delete their account

### 8.6 Permissions Justification (Required)

Google will ask you to justify each permission:

| Permission | Justification |
|---|---|
| `storage` | Store auth token and theme preference locally for persistent login |
| `contextMenus` | Allow users to right-click selected text on any webpage to analyze it |
| `activeTab` | Read selected text from the current tab when context menu is triggered |
| `scripting` | Inject content script to retrieve selected text |

---

## Phase 9 — Post-Launch & Maintenance

### 9.1 Monitor & Respond to Reviews

- Respond to all 1-star reviews within 48 hours
- Fix crash bugs within 72 hours (submit an update — reviews usually take 1–2 days after first approval)

### 9.2 Version Update Workflow

```bash
# 1. Make code changes
# 2. Bump version in manifest.json: "version": "1.0.1"
# 3. Rebuild
npm run build:ext
# 4. Zip
cd dist-extension && zip -r ../innervoice-ai-v1.0.1.zip .
# 5. Upload new zip to Chrome Web Store developer console
# 6. Submit for review (usually 1–2 days after first approval)
```

### 9.3 Analytics (Optional but Recommended)

Add basic usage analytics to understand which features users use:
- Use the Chrome Web Store's built-in install/active user stats
- Optionally add a lightweight event logger in the Django backend (no third-party trackers — Google will flag them)

---

## Full Task Checklist

### Phase 0 — Environment
- [ ] Node ≥ 18 confirmed
- [ ] `.env.development` created
- [ ] `.env.production` created and added to `.gitignore`
- [ ] Icons created at 16, 32, 48, 128px in `public/icons/`

### Phase 1 — Build Config
- [ ] `@crxjs/vite-plugin` installed
- [ ] `vite.config.ext.js` created
- [ ] `build:ext` script added to `package.json`
- [ ] Extension builds successfully with `npm run build:ext`

### Phase 2 — Manifest
- [ ] `manifest.json` created at `frontend/manifest.json`
- [ ] All icon paths correct
- [ ] `host_permissions` points to production API domain

### Phase 3 — Feature Completion
- [ ] `chrome.storage.local` wrapper created (`extensionStorage.js`)
- [ ] `useAuth` hook updated to use new storage wrapper
- [ ] Django CORS updated to allow `chrome-extension://` origins
- [ ] "Open Web App" button added to extension settings

### Phase 4 — Context Menu
- [ ] `src/background.js` created
- [ ] `src/content.js` created
- [ ] `ExtensionAnalyze.jsx` reads `pendingText` from `chrome.storage.local` on mount
- [ ] Context menu tested end-to-end on a live webpage

### Phase 5 — Backend Deployment
- [ ] Production backend deployed (Railway/Render/VPS)
- [ ] HTTPS confirmed (`https://...`)
- [ ] PostgreSQL configured
- [ ] `DEBUG=False` in production
- [ ] `ALLOWED_HOSTS` set correctly
- [ ] Gemini API key set as environment variable on server
- [ ] `VITE_API_URL` in `.env.production` points to deployed backend

### Phase 6 — Hardening
- [ ] No `eval()` or inline scripts
- [ ] Token expiry logic implemented
- [ ] Text input length capped at 5000 chars
- [ ] Gemini API key confirmed not in source code

### Phase 7 — Testing
- [ ] Loaded unpacked extension in `chrome://extensions`
- [ ] All auth tests passed
- [ ] All analyze tests passed (EN + Bangla + Banglish)
- [ ] All rewrite tests passed
- [ ] History tests passed
- [ ] Context menu tests passed
- [ ] Settings tests passed
- [ ] Visual test at 400×600 — no overflow

### Phase 8 — Store Submission
- [ ] Chrome developer account created ($5 fee paid)
- [ ] All store assets prepared (icons, screenshots, descriptions)
- [ ] Privacy policy page live
- [ ] Extension zipped from `dist-extension/`
- [ ] Uploaded to developer console
- [ ] Permissions justified
- [ ] Submitted for review

### Phase 9 — Post-Launch
- [ ] Monitoring reviews
- [ ] Version bump workflow tested
- [ ] Update submitted at least once

---

## File Structure Reference

After completing all phases, your extension-related files should look like this:

```
frontend/
├── manifest.json                    ← NEW: Chrome extension manifest
├── vite.config.js                   ← UPDATED: standard web build
├── vite.config.ext.js               ← NEW: extension build config
├── .env.development                 ← NEW: local API URL
├── .env.production                  ← NEW: production API URL (gitignored)
├── public/
│   └── icons/
│       ├── icon16.png               ← NEW
│       ├── icon32.png               ← NEW
│       ├── icon48.png               ← NEW
│       └── icon128.png              ← NEW
├── src/
│   ├── App.jsx                      ← EXISTS: routes to ExtensionApp or WebApp
│   ├── background.js                ← NEW: service worker (context menu)
│   ├── content.js                   ← NEW: content script (selected text)
│   ├── utils/
│   │   └── extensionStorage.js      ← NEW: chrome.storage.local wrapper
│   ├── layouts/
│   │   └── ExtensionLayout.jsx      ← EXISTS: popup shell (400×600)
│   └── pages/
│       └── extension/
│           ├── ExtensionAnalyze.jsx ← EXISTS + UPDATED: reads pendingText
│           └── ExtensionHistory.jsx ← EXISTS: compact history list
└── dist-extension/                  ← GENERATED: upload this zip to Chrome Web Store
```

---

## ⏱️ Total Time Estimate

| Phase | Estimated Time |
|---|---|
| Phase 0 — Setup | 1–2 hours |
| Phase 1 — Vite Build Config | 2–3 hours |
| Phase 2 — Manifest | 1 hour |
| Phase 3 — Feature Completion | 3–4 hours |
| Phase 4 — Context Menu | 3–5 hours |
| Phase 5 — Backend Deployment | 4–8 hours |
| Phase 6 — Hardening | 2–3 hours |
| Phase 7 — Testing | 3–5 hours |
| Phase 8 — Store Submission | 2–4 hours |
| **Total Development** | **~21–35 hours** |
| Google Review Wait Time | 1–7 business days |

---

*Last updated: February 2026 | InnerVoice AI Extension Roadmap v1.0*
