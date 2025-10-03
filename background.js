// Background service worker for Meeting AI Assistant

chrome.runtime.onInstalled.addListener(() => {
    console.log('Meeting AI Assistant installed');
    
    // Initialize storage
    chrome.storage.local.get(['transcripts'], (result) => {
        if (!result.transcripts) {
            chrome.storage.local.set({ transcripts: [] });
        }
    });
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTranscript') {
        getTranscriptById(request.id).then(sendResponse);
        return true; // Will respond asynchronously
    }
    
    if (request.action === 'deleteTranscript') {
        deleteTranscript(request.id).then(sendResponse);
        return true;
    }
    
    if (request.action === 'exportTranscripts') {
        exportTranscripts().then(sendResponse);
        return true;
    }
    
    if (request.action === 'openTranscriptTab') {
        try {
            const url = chrome.runtime.getURL('transcript.html') + '?id=' + request.id;
            chrome.tabs.create({ url }, () => sendResponse && sendResponse({ success: true }));
        } catch (e) {
            sendResponse && sendResponse({ success: false, error: e.message });
        }
        return true;
    }
    
});

// Toggle the in-page floating overlay when the toolbar icon is clicked
try {
    chrome.action.onClicked.addListener((tab) => {
        try {
            if (tab && tab.id) {
                chrome.tabs.sendMessage(tab.id, { action: 'toggleOverlay' }, () => {
                    // Ignore errors for restricted pages (e.g., chrome://, Web Store, PDF)
                    if (chrome.runtime && chrome.runtime.lastError) {
                        // No-op
                    }
                });
            }
        } catch (_) {}
    });
} catch (_) {}

// Ensure overlay stays consistent when changing active tabs or updating pages
try {
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
        try {
            const overlayState = await chrome.storage.local.get(['overlayState']);
            const isOpen = overlayState && overlayState.overlayState && overlayState.overlayState.isOpen;
            if (isOpen && activeInfo && activeInfo.tabId) {
                chrome.tabs.sendMessage(activeInfo.tabId, { action: 'openOverlay' }, () => {
                    // Ignore errors for restricted pages
                });
            }
        } catch (_) {}
    });
} catch (_) {}

try {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete') {
            chrome.storage.local.get(['overlayState'], (data) => {
                try {
                    const isOpen = data && data.overlayState && data.overlayState.isOpen;
                    if (isOpen && tabId) {
                        chrome.tabs.sendMessage(tabId, { action: 'openOverlay' }, () => {
                            // Ignore errors
                        });
                    }
                } catch (_) {}
            });
        }
    });
} catch (_) {}

async function getTranscriptById(id) {
    try {
        const result = await chrome.storage.local.get(['transcripts']);
        const transcripts = result.transcripts || [];
        const transcript = transcripts.find(t => t.id === id);
        return { success: true, transcript };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function deleteTranscript(id) {
    try {
        const result = await chrome.storage.local.get(['transcripts']);
        const transcripts = result.transcripts || [];
        const filteredTranscripts = transcripts.filter(t => t.id !== id);
        await chrome.storage.local.set({ transcripts: filteredTranscripts });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function exportTranscripts() {
    try {
        const result = await chrome.storage.local.get(['transcripts']);
        const transcripts = result.transcripts || [];
        
        // Create exportable format
        const exportData = {
            exportDate: new Date().toISOString(),
            totalTranscripts: transcripts.length,
            transcripts: transcripts.map(t => ({
                date: t.date,
                text: t.text,
                id: t.id
            }))
        };
        
        return { success: true, data: exportData };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
