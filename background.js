// Background service worker for AniWorld Helper

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'video_ended') {
        // Make sure the message came from an iframe content script inside a tab
        if (sender.tab && sender.tab.id) {
            // Send a message to the main page content script on the same tab to advance to the next episode
            chrome.tabs.sendMessage(sender.tab.id, { action: 'navigate_next' });
        }
        return;
    }

    if (message.action === 'trusted_click') {
        clickAsRealUserGesture(message, sender)
            .then((result) => sendResponse(result))
            .catch((error) => sendResponse({ ok: false, error: error.message }));
        return true; // keep the message channel open for the async response
    }
});

// A content script cannot create a user activation, so the browser keeps refusing
// autoplay on hoster origins. Dispatching the click through the debugger produces a
// trusted input event, which the autoplay policy accepts.
async function clickAsRealUserGesture(message, sender) {
    const tabId = sender.tab && sender.tab.id;
    if (!tabId) return { ok: false, error: 'no tab' };

    // Coordinates must be relative to the top-level viewport, so ask the main frame
    // for the offset of the player iframe.
    const resolved = await chrome.tabs.sendMessage(tabId, {
        action: 'resolve_click_coords',
        localX: message.x,
        localY: message.y
    }, { frameId: 0 });

    if (!resolved || typeof resolved.x !== 'number' || typeof resolved.y !== 'number') {
        return { ok: false, error: 'could not resolve player frame position' };
    }

    const target = { tabId };
    await chrome.debugger.attach(target);

    try {
        await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x: resolved.x,
            y: resolved.y,
            button: 'left',
            clickCount: 1
        });
        await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x: resolved.x,
            y: resolved.y,
            button: 'left',
            clickCount: 1
        });
    } finally {
        await chrome.debugger.detach(target);
    }

    return { ok: true, x: resolved.x, y: resolved.y };
}
