/**
 * InnerVoice AI — Background Service Worker
 * Handles context menu (right-click) integration
 */

// Create context menu items when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'innervoice-analyze',
    title: 'Analyze with InnerVoice AI',
    contexts: ['selection'],
  })

  chrome.contextMenus.create({
    id: 'innervoice-rewrite',
    title: 'Rewrite with InnerVoice AI',
    contexts: ['selection'],
  })

  console.log('[InnerVoice] Context menus created')
})

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText?.trim()
  if (!selectedText) return

  // Store selected text so the popup can read it when it opens
  chrome.storage.local.set({
    pendingText: selectedText,
    pendingAction: info.menuItemId === 'innervoice-rewrite' ? 'rewrite' : 'analyze',
    pendingTimestamp: Date.now(),
  })

  // Open the extension popup
  chrome.action.openPopup()
})

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    // Forward the request to the active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getSelectedText' }, (response) => {
          sendResponse(response || { text: '' })
        })
      } else {
        sendResponse({ text: '' })
      }
    })
    return true // Keep message channel open for async response
  }
})