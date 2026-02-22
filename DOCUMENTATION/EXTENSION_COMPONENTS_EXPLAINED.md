# 🔧 InnerVoice AI Chrome Extension — Complete Component Breakdown

> A detailed explanation of **every file and configuration** you need to build, why it exists, and what it does.

---

## 📖 Table of Contents

1. [Backend Deployment](#1-backend-deployment)
2. [Environment Configuration](#2-environment-configuration)
3. [Extension Icons](#3-extension-icons)
4. [Manifest.json](#4-manifestjson)
5. [Vite Build Configuration](#5-vite-build-configuration)
6. [Background Service Worker](#6-background-service-worker)
7. [Content Script](#7-content-script)
8. [Extension Storage Wrapper](#8-extension-storage-wrapper)
9. [React Extension Components](#9-react-extension-components)
10. [Build & Deployment](#10-build--deployment)

---

## 1. Backend Deployment

### What: Production Django API (Railway, Render, or VPS)

### Why It's Critical:
- Your extension **cannot** call `localhost:8000` — that only works on your local machine
- Real users installing the extension need to connect to a **public HTTPS API**
- Google Chrome blocks `http://` API calls from extensions (requires HTTPS)
- Without a deployed backend, the extension is just a fancy UI with no functionality

### What It Does:
- Hosts your Django REST API endpoints publicly
- Handles user authentication (login/register)
- Processes text analysis requests (emotion, sentiment, personality)
- Generates AI-powered text rewrites via Gemini API
- Stores user data, analysis history, and progress tracking

### How to Deploy:

**Option A: Railway (Recommended for beginners)**
```bash
# 1. Sign up at https://railway.app with GitHub
# 2. Connect your GitHub repo
# 3. Railway auto-deploys your backend
# 4. You get a URL like: https://innervoice-api-prod-xxxx.railway.app

npm install -g @railway/cli
cd backend
railway login
railway init
railway up
```

**Option B: Render (Also free tier)**
```bash
# Go to https://render.com
# Connect GitHub repo
# Deploy Django app
# Get URL: https://innervoice-api.onrender.com
```

**Option C: DigitalOcean Droplet ($6/mo, full control)**
```bash
# Create a VPS
# SSH in and deploy Django manually
# Point domain to droplet IP
```

### Railway Setup Checklist:
- [ ] Sign up with GitHub
- [ ] Connect InnerVoiceAI repo
- [ ] Set environment variables:
  - `DEBUG=False`
  - `GEMINI_API_KEY=your-key`
  - `SECRET_KEY=django-secret`
  - `ALLOWED_HOSTS=your-railway-url`
- [ ] Run migrations: `railway run python manage.py migrate`
- [ ] Test: Open `https://your-railway-url/api/health/` → should return `{"success": true}`
- [ ] **Copy the URL** — you'll need this in `.env.production`

---

## 2. Environment Configuration

### 2.1 `.env.development`

**File Location:** `frontend/.env.development`

**What It Contains:**
```
VITE_API_URL=http://localhost:8000/api
```

**Why It Exists:**
- During local development, you run your Django backend on `localhost:8000`
- This environment file tells Vite to use the local API
- Only used when you run `npm run dev` locally
- **Never** deployed to production

**What It Does:**
- Vite reads this file and injects `VITE_API_URL` into your JavaScript
- All API calls in the app use this URL: `fetch(import.meta.env.VITE_API_URL + '/analyze')`
- Automatically switches based on the build mode

**How to Create:**
```bash
cd frontend
echo "VITE_API_URL=http://localhost:8000/api" > .env.development
```

---

### 2.2 `.env.production`

**File Location:** `frontend/.env.production`

**What It Contains:**
```
VITE_API_URL=https://innervoice-api-prod-xxxx.railway.app/api
```

**Why It Exists:**
- When building the extension for distribution, you need to point to the **production API** (your Railway URL)
- This is **not** committed to Git (sensitive information)
- Tells the extension where the real backend is located

**What It Does:**
- During `npm run build`, Vite reads this and embeds the production API URL into the bundle
- All users of the extension will call this production URL
- Keeps API URL separate from source code

**How to Create:**
```bash
cd frontend
cat > .env.production << 'EOF'
VITE_API_URL=https://your-railway-url-here/api
EOF

# Add to .gitignore so it's not committed:
echo ".env.production" >> .gitignore
```

**Important:**
- Replace `your-railway-url-here` with your actual Railway URL from Step 1
- This file should **never** be committed to Git
- Each developer has their own `.env.production` (or none, using Railway's auto-generated URL)

---

## 3. Extension Icons

### What: Four PNG image files at different sizes

### Why It's Critical:
- Chrome displays icons in different places: toolbar, management page, Chrome Web Store
- Each location needs a specific size for clarity (pixel-perfect rendering)
- Without icons, the extension looks unprofessional and may be rejected by Google

### What They Do:

| File | Size | Where It Appears | Purpose |
|---|---|---|---|
| **icon16.png** | 16×16 px | Browser toolbar (top-right) | Quick access, small space |
| **icon32.png** | 32×32 px | Windows system tray/taskbar | System integration |
| **icon48.png** | 48×48 px | Chrome extension management page | Extension list view |
| **icon128.png** | 128×128 px | Chrome Web Store listing | Store display, large preview |

### How to Create:

**Option A: Using an Online Generator (Easiest)**
1. Go to https://www.favicon-generator.org/
2. Upload your Brain icon (or logo)
3. Download all sizes
4. Extract to `frontend/public/icons/`

**Option B: Using ImageMagick (Command Line)**
```bash
mkdir -p frontend/public/icons

# Create icons from a source image
convert original-icon.png -resize 16x16 frontend/public/icons/icon16.png
convert original-icon.png -resize 32x32 frontend/public/icons/icon32.png
convert original-icon.png -resize 48x48 frontend/public/icons/icon48.png
convert original-icon.png -resize 128x128 frontend/public/icons/icon128.png
```

**Option C: Quick Placeholder (For Testing)**
```bash
# Create solid blue placeholder icons (replace with real ones later)
mkdir -p frontend/public/icons
cd frontend/public/icons

# Create empty PNGs (you'll replace these)
touch icon16.png icon32.png icon48.png icon128.png
```

### Design Recommendation:
- Use your brain icon with blue gradient (`from-blue-500 to-blue-700`)
- Add white background for transparency
- Must be PNG format (transparent background preferred)

---

## 4. Manifest.json

### What: Chrome Extension Configuration File

**File Location:** `frontend/manifest.json`

### Why It's Critical:
- **This is the "birth certificate" of your extension**
- Tells Chrome:
  - What the extension is called
  - What permissions it needs
  - Which files to load (popup, background, content script)
  - What domains it can access
  - Security policies
- Without it, Chrome doesn't recognize your code as an extension

### What It Does:

Each key in manifest.json serves a specific purpose:

```json
{
  "manifest_version": 3,           // MV3 = Modern standard (required)
  "name": "InnerVoice AI",         // Extension name in store & toolbar
  "version": "1.0.0",              // Auto-updated when you bump version
  "description": "...",            // Shown in Chrome Web Store
  "author": "Rizon1326",           // Your name
  
  "icons": {                       // Maps icon sizes used above
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  
  "action": {                      // Popup settings
    "default_popup": "index.html", // Which file opens when you click extension
    "default_icon": { ... },       // Icon to show in toolbar
    "default_title": "InnerVoice AI" // Tooltip on hover
  },
  
  "background": {                  // Service worker (runs in background)
    "service_worker": "src/background.js", // Your background script
    "type": "module"               // Enable ES6 imports
  },
  
  "content_scripts": [             // Scripts that run on all webpages
    {
      "matches": ["<all_urls>"],   // Run on every webpage
      "js": ["src/content.js"],    // Your content script
      "run_at": "document_idle"    // After page fully loads
    }
  ],
  
  "permissions": [                 // What the extension can do
    "storage",                     // Read/write chrome.storage
    "contextMenus",                // Add right-click context menu items
    "activeTab",                   // Access current tab
    "scripting"                    // Inject scripts into pages
  ],
  
  "host_permissions": [            // API domains to access
    "https://your-api-domain.com/*" // Only HTTPS allowed
  ],
  
  "content_security_policy": {     // Security rules (MV3 requirement)
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  
  "minimum_chrome_version": "102"  // Oldest Chrome version supported
}
```

### How to Create:

```bash
cd frontend
cat > manifest.json << 'EOF'
{
  "manifest_version": 3,
  "name": "InnerVoice AI",
  "version": "1.0.0",
  "description": "Analyze emotions and rewrite text with AI. Supports English, Bangla, and Banglish.",
  "author": "Rizon1326",

  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },

  "action": {
    "default_popup": "index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
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

  "permissions": ["storage", "contextMenus", "activeTab", "scripting"],
  "host_permissions": ["https://*"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "minimum_chrome_version": "102"
}
EOF
```

---

## 5. Vite Build Configuration

### What: Build system configuration for extension-specific bundling

**File Location:** `frontend/vite.config.js`

### Why It's Critical:
- Vite needs to know how to bundle an extension (different from a normal web app)
- Must handle multiple entry points: popup HTML, background service worker, content script
- Must output to a special folder structure that Chrome understands
- Without this, your extension won't build correctly

### What It Does:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'  // ← The magic plugin
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(fs.readFileSync('./manifest.json', 'utf8'))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),  // Reads manifest.json and configures bundling
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),  // @/components → src/components
    },
  },
  build: {
    outDir: 'dist-extension',  // Output folder (upload this to Chrome)
    emptyOutDir: true,         // Clear old builds
  },
})
```

**Key Components:**

| Component | Purpose |
|---|---|
| `@crxjs/vite-plugin` | Special plugin that knows how to build Chrome extensions |
| `crx({ manifest })` | Tells Vite to read your manifest.json and handle all entry points |
| `outDir: 'dist-extension'` | Creates a folder with the bundled extension |
| `alias: { '@': ... }` | Allows `import from '@/components'` instead of `../../components` |

### How to Update:

The vite.config.js has already been updated (see the previous setup steps). But if you need to understand it:

1. It imports `manifest.json` and passes it to the `crx` plugin
2. The `crx` plugin automatically:
   - Bundles `src/background.js` as a service worker
   - Bundles `src/content.js` as a content script
   - Bundles React popup as `index.html`
   - Creates proper folder structure for Chrome

---

## 6. Background Service Worker

### What: JavaScript file that runs in the extension background (not visible to user)

**File Location:** `frontend/src/background.js`

### Why It's Critical:
- Runs **24/7** while the browser is open (even if popup is closed)
- Handles events that happen outside the popup
- Creates the right-click context menu
- Listens for context menu clicks
- Passes data to popup when it opens

### What It Does:

```javascript
/* global chrome */

// Step 1: Create context menu items when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'innervoice-analyze',
    title: 'Analyze with InnerVoice AI',
    contexts: ['selection'],  // Only show when text is selected
  })

  chrome.contextMenus.create({
    id: 'innervoice-rewrite',
    title: 'Rewrite with InnerVoice AI',
    contexts: ['selection'],
  })
})

// Step 2: Listen for context menu clicks
chrome.contextMenus.onClicked.addListener((info) => {
  // Get the text user right-clicked on
  const selectedText = info.selectionText?.trim()
  if (!selectedText) return

  // Store it temporarily so popup can read it
  chrome.storage.local.set({
    pendingText: selectedText,
    pendingAction: info.menuItemId === 'innervoice-rewrite' ? 'rewrite' : 'analyze',
    pendingTimestamp: Date.now(),
  })

  // Open the popup immediately
  chrome.action.openPopup()
})
```

### Detailed Breakdown:

| Line | Purpose |
|---|---|
| `chrome.runtime.onInstalled.addListener()` | Runs once when extension is installed |
| `chrome.contextMenus.create()` | Adds "Analyze with InnerVoice AI" to right-click menu |
| `contexts: ['selection']` | Only show menu when text is selected |
| `chrome.contextMenus.onClicked` | Runs when user clicks the context menu item |
| `info.selectionText` | The text the user selected and right-clicked on |
| `chrome.storage.local.set()` | Stores data in extension storage (can be read by popup) |
| `chrome.action.openPopup()` | Opens the extension popup |

### User Flow:
1. User selects text on any website
2. Right-clicks
3. Sees "Analyze with InnerVoice AI" option
4. Clicks it
5. Background script stores the text
6. Popup opens (with text pre-filled)

---

## 7. Content Script

### What: JavaScript that runs **inside** webpages (has access to page content)

**File Location:** `frontend/src/content.js`

### Why It's Critical:
- The background script **cannot** access webpage content (security restriction)
- The popup script **cannot** access webpage content (different security sandbox)
- Only content scripts can read what's on the page
- Needed to retrieve selected text from any webpage

### What It Does:

```javascript
/* global chrome */

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // If popup asks for selected text...
  if (request.action === 'getSelectedText') {
    // Get the text currently selected on the page
    const selected = window.getSelection()?.toString()?.trim() || ''
    
    // Send it back to popup
    sendResponse({ text: selected })
  }
  return true  // Keep communication channel open for async responses
})
```

### Step-by-Step:

1. **Installed on all webpages:** Manifest says `"matches": ["<all_urls>"]`
   - This script automatically runs on every webpage user visits
   
2. **Waits for messages:** `onMessage.addListener()`
   - Sits idle, waiting for popup to ask for data
   
3. **Retrieves selected text:** `window.getSelection()`
   - This is the **only way** to get text from a webpage (content script privilege)
   
4. **Sends back to popup:** `sendResponse()`
   - Returns the selected text to whoever asked

### Why This Architecture:
```
User selects text on Gmail
          ↓
Content script on Gmail detects selection
          ↓
User right-clicks → context menu appears
          ↓
Background script opens popup + stores pending text
          ↓
Popup opens and reads stored text from chrome.storage
          ↓
Popup displays selected text for analysis
```

---

## 8. Extension Storage Wrapper

### What: A utility that unifies Chrome storage in extension with localStorage on web

**File Location:** `frontend/src/utils/extensionStorage.js`

### Why It's Critical:
- Your app needs to work in **two modes**: extension AND web app
- Extension uses `chrome.storage.local` (persists data, secure)
- Web app uses `localStorage` (browser storage)
- Without a wrapper, you'd need two different codebases
- This wrapper lets you write once, work everywhere

### What It Does:

```javascript
/**
 * Unified storage layer:
 * - In extension: uses chrome.storage.local
 * - On web: uses browser localStorage
 * - Same API, works in both places
 */
export const storage = {
  // GET data
  get: async (key) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // Extension: use chrome.storage.local
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => 
          resolve(result[key] ?? null)
        )
      })
    }
    // Web: use localStorage
    return localStorage.getItem(key)
  },

  // SET data
  set: async (key, value) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // Extension: use chrome.storage.local
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve)
      })
    }
    // Web: use localStorage
    localStorage.setItem(key, value)
  },

  // DELETE data
  remove: async (key) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // Extension: use chrome.storage.local
      return new Promise((resolve) => {
        chrome.storage.local.remove([key], resolve)
      })
    }
    // Web: use localStorage
    localStorage.removeItem(key)
  },
}
```

### How to Use:

Before (doesn't work in both places):
```javascript
localStorage.setItem('token', 'user-auth-token')
```

After (works everywhere):
```javascript
import { storage } from '@/utils/extensionStorage'

// Store token
await storage.set('token', 'user-auth-token')

// Retrieve token
const token = await storage.get('token')

// Delete token
await storage.remove('token')
```

### Why This Pattern:
- Same code runs in extension AND web app
- No `if (isExtension())` scattered everywhere
- Cleaner, more maintainable
- Follows dependency injection principle

---

## 9. React Extension Components

### What: Pre-built React components that form the extension UI

**Files:**
- `frontend/src/layouts/ExtensionLayout.jsx`
- `frontend/src/pages/extension/ExtensionAnalyze.jsx`
- `frontend/src/pages/extension/ExtensionHistory.jsx`

### Why They're Critical:
- These components **already exist** in your codebase
- They provide the user interface for the extension
- They're optimized for 400×600 pixel popup format
- They handle authentication, tab switching, analysis display

### What They Do:

#### ExtensionLayout.jsx
```
┌─────────────────────────────────┐
│ Header (user, settings, logout) │  ← ExtensionLayout handles this
├─────────────────────────────────┤
│                                 │
│   Analyze | History | Settings  │
│                                 │
│   (Content depends on active)   │
│                                 │
├─────────────────────────────────┤
│ Bottom Nav (tab switching)      │  ← Handles tab navigation
└─────────────────────────────────┘
```

**Provides:**
- Login/Register gate (shows login form if not authenticated)
- Header with theme toggle and logout
- Tab navigation (Analyze, History, Settings)
- Settings panel
- 400×600px fixed layout

#### ExtensionAnalyze.jsx
```
┌─────────────────────────────────┐
│ [Analyze] [Rewrite] Tabs        │
├─────────────────────────────────┤
│                                 │
│ Analyze Tab:                    │
│ ├─ Textarea for text input      │
│ ├─ Analyze button               │
│ └─ Results (emotions, sentiment)│
│                                 │
│ Rewrite Tab:                    │
│ ├─ Textarea for text input      │
│ ├─ Rewrite style selector       │
│ ├─ Rewrite button               │
│ └─ Rewritten text display       │
│                                 │
└─────────────────────────────────┘
```

**Provides:**
- Text input for analysis
- Display of emotion detection results
- 6 rewrite styles (professional, casual, friendly, etc.)
- Copy-to-clipboard buttons

**New Feature Added (in previous steps):**
```javascript
React.useEffect(() => {
  // When popup opens, check if there's pending text from context menu
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['pendingText'], (result) => {
      if (result.pendingText) {
        setText(result.pendingText)  // Auto-fill the textarea
      }
    })
  }
}, [])
```

#### ExtensionHistory.jsx
```
┌─────────────────────────────────┐
│ Recent History                  │
├─────────────────────────────────┤
│                                 │
│ ✍️  "I feel happy today"        │ ← Each item is clickable
│ Analysis • 2 hours ago          │
│                                 │
│ 😊 "Amazing work!"              │
│ Rewrite • 4 hours ago           │
│                                 │
│ (Shows last 20 items)           │
│                                 │
└─────────────────────────────────┘
```

**Provides:**
- List of last 20 analyses/rewrites
- Expandable items
- Refresh button
- Emotion emoji + timestamp

---

## 10. Build & Deployment

### 10.1 Building the Extension

**What Happens:**
```bash
npm run build
```

1. Vite reads your `manifest.json`
2. The `@crxjs/vite-plugin` plugin processes it:
   - Bundles `src/background.js` as service worker
   - Bundles `src/content.js` as content script
   - Bundles React app as popup
3. Outputs everything to `dist-extension/` folder
4. Creates this structure:
```
dist-extension/
├── manifest.json               (Chrome reads this first)
├── index.html                  (Popup HTML)
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── src/
│   ├── background.js           (Service worker bundle)
│   └── content.js              (Content script bundle)
└── assets/
    ├── index-xxxxx.js          (React + all dependencies)
    └── index-xxxxx.css         (Tailwind CSS)
```

### Why This Structure Matters:
- Chrome expects `manifest.json` at root
- Chrome loads `index.html` as popup
- Service worker and content script are bundled separately (security isolation)
- All assets are in one folder for easy zipping

---

### 10.2 Loading Unpacked Extension (Local Testing)

**What You Do:**
```bash
# 1. Build
npm run build

# 2. Open Chrome
# 3. Go to chrome://extensions
# 4. Enable "Developer mode" (toggle, top-right)
# 5. Click "Load unpacked"
# 6. Select dist-extension/ folder
```

**What Chrome Does:**
1. Reads `manifest.json`
2. Loads all permissions and scripts
3. Creates icon in toolbar
4. Shows extension in `chrome://extensions`

---

### 10.3 Submitting to Chrome Web Store

**What You Do:**
```bash
# 1. Zip the built extension
cd dist-extension
zip -r ../innervoice-ai-v1.0.0.zip .

# 2. Go to https://chrome.google.com/webstore/devconsole
# 3. Click "New Item"
# 4. Upload the ZIP
# 5. Fill in store listing details
# 6. Submit for review
```

**Google Review Process:**
1. Google tests your extension (24-48 hours)
2. Checks for:
   - Malicious code
   - Excessive permissions
   - Deceptive practices
   - Privacy policy
3. Either approves or asks for changes
4. If approved, appears in Chrome Web Store

**Timeline:**
- First submission: 1-3 days
- Updates: 1-2 days
- Store visibility: Instant after approval

---

## 📋 Complete Setup Checklist

### Pre-Build
- [ ] Backend deployed to Railway/Render (get HTTPS URL)
- [ ] `.env.development` created with `http://localhost:8000/api`
- [ ] `.env.production` created with Railway URL
- [ ] Icons created in `frontend/public/icons/` (4 files: 16, 32, 48, 128px)
- [ ] `manifest.json` created in `frontend/`
- [ ] `vite.config.js` updated with @crxjs/vite-plugin
- [ ] `frontend/src/background.js` created
- [ ] `frontend/src/content.js` created
- [ ] `frontend/src/utils/extensionStorage.js` created
- [ ] `ExtensionAnalyze.jsx` updated to read pendingText

### Build
- [ ] Run `npm install` in frontend
- [ ] Run `npm run build`
- [ ] `dist-extension/` folder created successfully

### Local Testing
- [ ] Load unpacked extension in Chrome
- [ ] Login works
- [ ] Analyze tab works (English + Bangla)
- [ ] Rewrite tab works
- [ ] History tab works
- [ ] Context menu appears when selecting text
- [ ] Context menu pre-fills text in popup

### Store Submission
- [ ] Chrome Developer account created ($5)
- [ ] All icons prepared
- [ ] Screenshots created
- [ ] Description written
- [ ] Privacy policy created
- [ ] Extension zipped
- [ ] Uploaded to devconsole
- [ ] Submitted for review

---

## 🎯 Quick Reference: What Each File Does

| File | Purpose | Created/Edited |
|---|---|---|
| `backend/` (Railway) | REST API, user auth, analysis | Already exists, deploy it |
| `.env.development` | Local API URL | Create new |
| `.env.production` | Production API URL | Create new |
| `manifest.json` | Extension config | Create new |
| `vite.config.js` | Bundler config | Edit existing |
| `public/icons/` | Extension icons | Create 4 PNGs |
| `src/background.js` | Context menu handler | Create new |
| `src/content.js` | Webpage text reader | Create new |
| `src/utils/extensionStorage.js` | Storage abstraction | Create new |
| `ExtensionLayout.jsx` | Popup shell | Already exists |
| `ExtensionAnalyze.jsx` | Analyze UI | Edit existing |
| `ExtensionHistory.jsx` | History UI | Already exists |
| `dist-extension/` | Built extension (upload this) | Generated by build |

---

## 🚀 Execution Order

1. **Deploy backend** → Get HTTPS URL
2. **Create environment files** → `.env.development`, `.env.production`
3. **Create icons** → 4 PNG files
4. **Create manifest.json** → Extension configuration
5. **Update vite.config.js** → Add @crxjs/vite-plugin
6. **Create background.js** → Context menu logic
7. **Create content.js** → Text selection logic
8. **Create extensionStorage.js** → Storage wrapper
9. **Update ExtensionAnalyze.jsx** → Handle pending text
10. **Build** → `npm run build`
11. **Test locally** → Load unpacked
12. **Submit to store** → Upload ZIP to devconsole

**Total time: 4-8 hours** (most is testing and small fixes)

---

## 📞 Troubleshooting Quick Links

| Problem | Solution |
|---|---|
| Extension won't load | Check manifest.json syntax, ensure icons exist |
| API calls fail | Verify `.env.production` URL is correct and HTTPS |
| Context menu doesn't work | Ensure background.js is created and manifest includes it |
| Text not pre-filling | Check chrome.storage.local.get in ExtensionAnalyze.jsx |
| Icons look blurry | Resize source image properly, use PNG format |
| Store rejection | Add privacy policy, justify permissions, test security |

---

*Last updated: February 2026 | Complete Component Breakdown v1.0*
