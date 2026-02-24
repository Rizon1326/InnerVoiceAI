/**
 * InnerVoice AI — Content Script
 * Injected into web pages to read selected text
 */

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    const selected = window.getSelection()?.toString()?.trim() || ''
    sendResponse({ text: selected })
  }
  return true // Keep the message channel open for async response
})
