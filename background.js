// Background service worker for AniWorld Helper

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'video_ended') {
        // Make sure the message came from an iframe content script inside a tab
        if (sender.tab && sender.tab.id) {
            // Send a message to the main page content script on the same tab to advance to the next episode
            chrome.tabs.sendMessage(sender.tab.id, { action: 'navigate_next' });
        }
    }
});
