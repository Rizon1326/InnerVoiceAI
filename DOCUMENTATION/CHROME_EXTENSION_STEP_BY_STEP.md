# 🎯 InnerVoice AI Chrome Extension — Easy Step-by-Step Guide

> **Created:** February 23, 2026  
> **Branch:** extension  
> **Purpose:** A simplified, easy-to-follow guide to build the Chrome extension

---

## 🧩 What's Already Done vs What's Missing

Think of it like building a house:

| Part | Status | What it is |
|---|---|---|
| **Foundation** (Backend API) | ✅ DONE | Django server with all AI services |
| **Rooms** (React UI) | ✅ DONE | `ExtensionAnalyze.jsx`, `ExtensionHistory.jsx`, `ExtensionLayout.jsx` |
| **Roof** (App logic) | ✅ DONE | `App.jsx` already switches between web and extension mode |
| **Front Door** (Chrome wrapper) | ❌ MISSING | Just **5 small files** to make Chrome recognize it as an extension |

---

## 📝 You Only Need to Create 5 Files + 4 Icons

---

### Step 1️⃣ — Create 4 Icon Images (5 mins)

Take any logo/icon and resize it to these 4 sizes:
- `icon16.png` (16×16)
- `icon32.png` (32×32)
- `icon48.png` (48×48)
- `icon128.png` (128×128)

Put them in `frontend/public/icons/`

> 💡 Use any free tool like [favicon.io](https://favicon.io) or Canva

---

### Step 2️⃣ — Create `manifest.json` (The ID Card of Your Extension)

This file tells Chrome: "Hey, I'm an extension, here's my name, what I can do, and what files I use."

**Location:** `frontend/manifest.json`

Key things it declares:
- Extension name, version, description
- The popup HTML file (your React app)
- The background service worker (`background.js`)
- Content script (`content.js`)
- Permissions needed (`storage`, `contextMenus`, `activeTab`, `scripting`)
- Your production API domain in `host_permissions`

---

### Step 3️⃣ — Create `background.js` (Handles Right-Click Menu)

This runs invisibly in the background. It does 2 things:
1. **On install** → Creates right-click menu items ("Analyze with InnerVoice AI", "Rewrite with InnerVoice AI")
2. **On click** → Stores the selected text in `chrome.storage.local` → Opens the popup

**Location:** `frontend/src/background.js`

---

### Step 4️⃣ — Create `content.js` (Reads Selected Text From Webpages)

This is injected into every webpage. It listens for messages from the popup asking "what text is selected?" and responds.

**Location:** `frontend/src/content.js`

---

### Step 5️⃣ — Create `vite.config.ext.js` (Builds Everything for Chrome)

A separate Vite config that uses `@crxjs/vite-plugin` to package your React app as a Chrome extension.

**Location:** `frontend/vite.config.ext.js`

---

### Step 6️⃣ — Add Build Command to `package.json`

Add `"build:ext"` script that uses the new config.

---

## 🔨 After Creating the Files — Build & Test

```bash
# 1. Install the new package
cd frontend
npm install -D @crxjs/vite-plugin

# 2. Build the extension
npm run build:ext

# 3. Load in Chrome
#    → Go to chrome://extensions
#    → Turn ON "Developer mode" (top-right toggle)
#    → Click "Load unpacked"
#    → Select the frontend/dist-extension folder

# 🎉 Your extension is now running in Chrome!
```

---

## 🌐 Backend Setup (Localhost — For Course Assignment / Demo)

> **You do NOT need to deploy to Railway, Render, or any cloud service.**
> Since this is a course assignment, `localhost` works perfectly fine.

### How it works

1. You run Django backend on `http://localhost:8000`
2. The extension calls `http://localhost:8000/api/...`
3. Everything runs on your machine — no cloud needed

### What you need

- `frontend/.env.development` with:

  ```
  VITE_API_URL=http://localhost:8000/api
  ```

- Django CORS must allow `chrome-extension://` origins (one small change in `settings.py`)
- **Before demoing:** always start the backend first:

  ```bash
  cd backend
  python manage.py runserver
  ```

### What you can SKIP

- ❌ Railway / Render / any cloud deployment
- ❌ PostgreSQL (keep using SQLite — it's fine)
- ❌ gunicorn / Procfile
- ❌ `DEBUG=False` / production settings
- ❌ Chrome Web Store submission (use "Load Unpacked" instead — free, instant)

---


## 📁 Final File Structure (What Changes)

```
frontend/
├── manifest.json                     ← NEW
├── vite.config.js                    ← UNCHANGED (web build)
├── vite.config.ext.js                ← NEW (extension build)
├── .env.development                  ← NEW (local API URL)
├── public/icons/
│   ├── icon16.png                    ← NEW
│   ├── icon32.png                    ← NEW
│   ├── icon48.png                    ← NEW
│   └── icon128.png                   ← NEW
├── src/
│   ├── App.jsx                       ← EXISTS (no changes needed)
│   ├── background.js                 ← NEW (service worker)
│   ├── content.js                    ← NEW (content script)
│   ├── utils/extensionStorage.js     ← NEW (storage wrapper)
│   ├── layouts/ExtensionLayout.jsx   ← EXISTS (minor update)
│   └── pages/extension/
│       ├── ExtensionAnalyze.jsx      ← EXISTS (add pendingText logic)
│       └── ExtensionHistory.jsx      ← EXISTS (no change)
└── dist-extension/                   ← GENERATED (upload to Chrome Store)
```

---

## 🏪 Loading the Extension (For Course Demo)

> **No Chrome Web Store needed.** Use "Load Unpacked" — it's free and instant.

1. Build: `npm run build:ext` in the `frontend/` folder
2. Open Chrome → go to `chrome://extensions`
3. Turn ON **"Developer mode"** (top-right toggle)
4. Click **"Load unpacked"**
5. Select the `frontend/dist-extension` folder
6. ✅ Done! The extension icon appears in your toolbar

---

## ⏱️ Time Estimate

| Step | Time |
| --- | --- |
| Icons | 5 mins |
| Create 5 files | 30 mins (Copilot can generate them) |
| Install and Build | 10 mins |
| Test locally | 30 mins |
| **Total** | **~1-2 hours** |

---

## ✅ Quick Checklist

- [ ] Icons created (16, 32, 48, 128px) in `public/icons/`
- [ ] `manifest.json` created
- [ ] `background.js` created
- [ ] `content.js` created
- [ ] `vite.config.ext.js` created
- [ ] `build:ext` script added to `package.json`
- [ ] `npm run build:ext` succeeds
- [ ] Extension loads in `chrome://extensions`
- [ ] Login/Register works
- [ ] Analyze tab works (EN + Bangla + Banglish)
- [ ] Rewrite tab works
- [ ] History tab shows last 20 items
- [ ] Right-click context menu works
- [ ] Theme toggle works
- [ ] Backend running on `localhost:8000` during demo

---

*Ready to start? Just say "create the files" and Copilot will generate everything!*
