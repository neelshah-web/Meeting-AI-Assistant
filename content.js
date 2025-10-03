// Content script for Meeting AI Assistant
// This script can be used to detect meeting platforms and provide additional functionality

(function() {
    'use strict';
    
    // Detect if we're on a meeting platform
    const meetingPlatforms = {
        zoom: /zoom\.us/,
        teams: /teams\.microsoft\.com/,
        meet: /meet\.google\.com/,
        webex: /webex\.com/,
        gotomeeting: /gotomeeting\.com/
    };
    
    let currentPlatform = null;
    
    // Check which platform we're on
    for (const [platform, regex] of Object.entries(meetingPlatforms)) {
        if (regex.test(window.location.hostname)) {
            currentPlatform = platform;
            break;
        }
    }
    
    // Add floating button on all pages, but with enhanced features on meeting platforms
    console.log(`Meeting AI Assistant: Active on ${window.location.hostname}`);
    if (currentPlatform) {
        console.log(`Meeting AI Assistant: Detected ${currentPlatform} meeting platform`);
    }
    
    // Add a floating button for quick access
    addFloatingButton();
    
    // Check if overlay should be restored (retry if extension context not ready)
    scheduleRestoreOverlayState();
    
    // Listen for meeting state changes
    observeMeetingState();
    
    // Keep extension active when navigating
    window.addEventListener('beforeunload', () => {
        // Store current state
        if (window.meetingAIButton) {
            localStorage.setItem('meetingAI_buttonPosition', JSON.stringify({
                left: window.meetingAIButton.button.style.left,
                top: window.meetingAIButton.button.style.top
            }));
        }
    });
    
    // Restore button position on page load
    window.addEventListener('load', () => {
        const savedPosition = localStorage.getItem('meetingAI_buttonPosition');
        if (savedPosition && window.meetingAIButton) {
            const position = JSON.parse(savedPosition);
            if (position.left && position.top) {
                window.meetingAIButton.button.style.left = position.left;
                window.meetingAIButton.button.style.top = position.top;
                window.meetingAIButton.button.style.right = 'auto';
            }
        }
    });
    
    // Handle page navigation (SPA support)
    let lastUrl = location.href;
    const navigationObserver = new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            console.log('Page navigation detected, ensuring button is present');
            setTimeout(() => {
                if (!document.getElementById('meeting-ai-float-btn')) {
                    addFloatingButton();
                }
            }, 1000);
        }
    });
    
    // Start observing when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            navigationObserver.observe(document, { subtree: true, childList: true });
        });
    } else {
        navigationObserver.observe(document, { subtree: true, childList: true });
    }
    
    // Ensure button is added when page is fully loaded
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (!document.getElementById('meeting-ai-float-btn')) {
                console.log('Adding button on window load');
                addFloatingButton();
            }
        }, 500);
    });
    
    // Re-add button periodically if it gets removed (more frequent checks)
    setInterval(() => {
        if (!document.getElementById('meeting-ai-float-btn')) {
            console.log('Button missing, re-adding...');
            addFloatingButton();
        }
    }, 2000);
    
    // Also check when window gains focus
    window.addEventListener('focus', () => {
        setTimeout(() => {
            if (!document.getElementById('meeting-ai-float-btn')) {
                console.log('Window focused, ensuring button is present');
                addFloatingButton();
            }
            
            // Also check if overlay should be restored when window gains focus
            if (!document.getElementById('meeting-ai-overlay')) {
                scheduleRestoreOverlayState();
            }
        }, 500);
    });
    
    // Check when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            setTimeout(() => {
                if (!document.getElementById('meeting-ai-float-btn')) {
                    console.log('Page became visible, ensuring button is present');
                    addFloatingButton();
                }
                
                // Also check if overlay should be restored
                if (!document.getElementById('meeting-ai-overlay')) {
                    scheduleRestoreOverlayState();
                }
            }, 500);
        }
    });

    // Retry helper to restore overlay only when extension context is ready
    function scheduleRestoreOverlayState(retries = 10) {
        try {
            const contextReady = !!(window.chrome && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local);
            if (contextReady) {
                restoreOverlayState();
                return;
            }
        } catch (_) {}
        if (retries <= 0) return;
        setTimeout(() => scheduleRestoreOverlayState(retries - 1), 300);
    }
    
    function addFloatingButton() {
        // Check if we can access document.body
        if (!document.body) {
            console.log('Document body not ready, retrying...');
            setTimeout(addFloatingButton, 100);
            return;
        }
        
        // Remove existing button if it exists
        const existingButton = document.getElementById('meeting-ai-float-btn');
        if (existingButton) {
            existingButton.remove();
        }
        
        console.log('Creating Meeting AI floating button');
        
        const button = document.createElement('div');
        button.id = 'meeting-ai-float-btn';
        button.innerHTML = '🎤';
        button.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            width: 60px !important;
            height: 60px !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            z-index: 2147483647 !important;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3) !important;
            font-size: 24px !important;
            transition: all 0.3s ease !important;
            border: 3px solid rgba(255, 255, 255, 0.2) !important;
            backdrop-filter: blur(10px) !important;
            user-select: none !important;
            pointer-events: auto !important;
        `;
        
        // Add pulsing animation for better visibility
        const style = document.createElement('style');
        style.textContent = `
            @keyframes meeting-ai-pulse {
                0% { box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(102, 126, 234, 0.7); }
                70% { box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3), 0 0 0 10px rgba(102, 126, 234, 0); }
                100% { box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(102, 126, 234, 0); }
            }
            #meeting-ai-float-btn:hover {
                animation: meeting-ai-pulse 2s infinite;
            }
        `;
        document.head.appendChild(style);
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.15)';
            button.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.4)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
        });
        
        button.addEventListener('click', (e) => {
            console.log('Floating button clicked');
            e.preventDefault();
            e.stopPropagation();
            // Toggle the floating overlay
            toggleFloatingOverlay();
        });
        
        try {
            document.body.appendChild(button);
            console.log('Meeting AI button added successfully');
        } catch (error) {
            console.error('Failed to add button to body:', error);
            return;
        }
        
        // Enhanced tooltip with more content
        const tooltip = document.createElement('div');
        tooltip.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">🎤 Meeting AI Assistant</div>
            <div style="font-size: 11px; opacity: 0.9;">Click to start recording & transcription</div>
            <div style="font-size: 10px; opacity: 0.7; margin-top: 2px;">Platform: ${currentPlatform || 'Generic'}</div>
        `;
        tooltip.style.cssText = `
            position: fixed;
            top: 85px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 12px;
            z-index: 999998;
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: none;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            max-width: 200px;
            line-height: 1.3;
        `;
        
        try {
            document.body.appendChild(tooltip);
        } catch (error) {
            console.error('Failed to add tooltip to body:', error);
        }
        
        button.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateY(-5px)';
        });
        
        button.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateY(0)';
        });
        
        // Make button draggable for better positioning
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        button.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click only
                isDragging = true;
                dragOffset.x = e.clientX - button.offsetLeft;
                dragOffset.y = e.clientY - button.offsetTop;
                button.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const newX = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - dragOffset.x));
                const newY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.y));
                
                button.style.left = newX + 'px';
                button.style.top = newY + 'px';
                button.style.right = 'auto';
                
                // Update tooltip position
                tooltip.style.left = (newX + 65) + 'px';
                tooltip.style.top = newY + 'px';
                tooltip.style.right = 'auto';
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                button.style.cursor = 'pointer';
            }
        });
        
        // Keep button visible when page changes
        const observer = new MutationObserver(() => {
            if (!document.getElementById('meeting-ai-float-btn')) {
                addFloatingButton();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Store button state
        window.meetingAIButton = {
            button: button,
            tooltip: tooltip,
            observer: observer
        };
    }
    
    // Floating overlay functionality
    function toggleFloatingOverlay() {
        console.log('Toggle floating overlay called');
        const existingOverlay = document.getElementById('meeting-ai-overlay');
        
        if (existingOverlay) {
            // Close existing overlay and save state
            console.log('Closing existing overlay');
            saveOverlayState(false);
            existingOverlay.remove();
            return;
        }
        
        // Create floating overlay and save state
        console.log('Creating new floating overlay');
        createFloatingOverlay();
        saveOverlayState(true);
    }
    
    // Save overlay state to storage
    let overlaySaveTimeout = null;
    function saveOverlayState(isOpen, position = null) {
        try {
            if (!window.chrome || !chrome.runtime || !chrome.runtime.id || !chrome.storage || !chrome.storage.local) {
                // Extension context not ready; skip silently
                return;
            }
            const state = {
                isOpen: isOpen,
                timestamp: Date.now(),
                position: position
            };
            // Debounce saves to avoid frequent writes during drag
            if (overlaySaveTimeout) clearTimeout(overlaySaveTimeout);
            overlaySaveTimeout = setTimeout(() => {
                try {
                    chrome.storage.local.set({ overlayState: state }, () => {
                        if (chrome.runtime && chrome.runtime.lastError) {
                            // Skip silently when context invalidated
                            return;
                        }
                        console.log('Overlay state saved:', state);
                    });
                } catch (e) {
                    // Skip silently when context invalidated
                }
            }, 150);
        } catch (error) {
            console.error('Error saving overlay state:', error);
        }
    }
    
    // Restore overlay state from storage
    function restoreOverlayState() {
        try {
            if (!window.chrome || !chrome.runtime || !chrome.runtime.id || !chrome.storage || !chrome.storage.local) {
                // Extension context not ready; skip silently
                return;
            }
            chrome.storage.local.get(['overlayState'], (result) => {
                if (result.overlayState && result.overlayState.isOpen) {
                    // Check if state is recent (within last 30 minutes)
                    const thirtyMinutes = 30 * 60 * 1000;
                    const timeDiff = Date.now() - result.overlayState.timestamp;
                    
                    if (timeDiff < thirtyMinutes) {
                        console.log('Restoring overlay state');
                        setTimeout(() => {
                            createFloatingOverlay();
                            if (result.overlayState.position) {
                                // Restore position if available
                                const overlay = document.getElementById('meeting-ai-overlay');
                                if (overlay) {
                                    overlay.style.left = result.overlayState.position.left;
                                    overlay.style.top = result.overlayState.position.top;
                                    overlay.style.right = 'auto';
                                }
                            }
                        }, 1000); // Delay to ensure page is loaded
                    } else {
                        // Clear old state
                        try {
                            chrome.storage.local.remove(['overlayState']);
                        } catch (e) {
                            console.warn('Could not clear old overlay state:', e);
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error restoring overlay state:', error);
        }
    }
    
    function createFloatingOverlay() {
        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = 'meeting-ai-overlay';
        overlay.style.cssText = `
            position: fixed !important;
            top: 50px !important;
            right: 20px !important;
            width: 400px !important;
            height: 600px !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border-radius: 15px !important;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
            z-index: 2147483647 !important;
            border: 3px solid rgba(255, 255, 255, 0.2) !important;
            backdrop-filter: blur(10px) !important;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
            color: white !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
        `;
        
        // Create header with close button
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 15px 20px !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
        `;
        
        const title = document.createElement('h1');
        title.textContent = '🎤 Meeting AI';
        title.style.cssText = `
            margin: 0 !important;
            font-size: 20px !important;
            font-weight: 300 !important;
            color: white !important;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            background: rgba(255, 255, 255, 0.1) !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            border-radius: 50% !important;
            width: 30px !important;
            height: 30px !important;
            color: white !important;
            cursor: pointer !important;
            font-size: 16px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            transition: all 0.3s ease !important;
        `;
        
        closeBtn.addEventListener('click', () => {
            // Save closed state for overlay only; do NOT stop recording
            saveOverlayState(false);
            overlay.remove();
        });
        
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Create content container directly (no iframe)
        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = `
            width: 100% !important;
            height: calc(100% - 70px) !important;
            padding: 15px !important;
            overflow-y: auto !important;
            box-sizing: border-box !important;
        `;
        
        // Create the popup content directly
        createPopupContent(contentContainer);
        
        // Make overlay draggable
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragOffset.x = e.clientX - overlay.offsetLeft;
            dragOffset.y = e.clientY - overlay.offsetTop;
            header.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const newX = Math.max(0, Math.min(window.innerWidth - 400, e.clientX - dragOffset.x));
                const newY = Math.max(0, Math.min(window.innerHeight - 600, e.clientY - dragOffset.y));
                
                overlay.style.left = newX + 'px';
                overlay.style.top = newY + 'px';
                overlay.style.right = 'auto';
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                header.style.cursor = 'grab';
                
                // Save position when dragging stops
                const position = {
                    left: overlay.style.left,
                    top: overlay.style.top
                };
                saveOverlayState(true, position);
            }
        });
        
        // Assemble overlay
        overlay.appendChild(header);
        overlay.appendChild(contentContainer);
        
        // Add to page
        try {
            document.body.appendChild(overlay);
            console.log('Meeting AI floating overlay added to DOM successfully');
            
            // Add animation
            overlay.style.opacity = '0';
            overlay.style.transform = 'scale(0.8) translateY(-20px)';
            overlay.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                overlay.style.opacity = '1';
                overlay.style.transform = 'scale(1) translateY(0)';
                console.log('Meeting AI floating overlay animation completed');
            }, 10);
            
        } catch (error) {
            console.error('Failed to add overlay to DOM:', error);
        }
    }
    
    function createPopupContent(container) {
        // Create the popup HTML structure directly
        container.innerHTML = `
            <div class="recording-section" style="
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 15px;
                backdrop-filter: blur(10px);
            ">
                <button id="recordBtn" class="record-btn start" style="
                    width: 100%;
                    padding: 15px;
                    border: none;
                    border-radius: 25px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-bottom: 10px;
                    background: #4CAF50;
                    color: white;
                ">Start Recording</button>
                <div id="recordingIndicator" class="recording-indicator" style="
                    display: none;
                    text-align: center;
                    color: #ff4444;
                    font-weight: bold;
                    animation: pulse 1s infinite;
                ">● Recording...</div>
                <div id="timer" class="timer" style="
                    display: none;
                    text-align: center;
                    font-size: 18px;
                    font-weight: bold;
                    margin: 10px 0;
                    font-family: 'Courier New', monospace;
                ">00:00</div>
                <div id="status" class="status" style="
                    text-align: center;
                    font-size: 14px;
                    margin-top: 10px;
                    opacity: 0.8;
                ">Click to start recording</div>
            </div>
            
            <div id="liveTranscriptSection" class="live-transcript" style="
                background: rgba(0, 0, 0, 0.3);
                border-radius: 8px;
                padding: 12px;
                margin: 15px 0;
                text-align: left;
                min-height: 80px;
                max-height: 150px;
                overflow-y: auto;
                font-size: 13px;
                line-height: 1.4;
                border: 2px solid rgba(255, 255, 255, 0.1);
                display: none;
            ">
                <div class="transcript-label" style="
                    font-size: 11px;
                    opacity: 0.7;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                ">Live Transcript</div>
                <div id="liveTranscript" class="no-transcript">Start recording to see live transcription...</div>
            </div>
            
            <div id="completeTranscriptSection" class="complete-transcript" style="
                background: rgba(0, 0, 0, 0.4);
                border-radius: 8px;
                padding: 15px;
                margin: 15px 0;
                text-align: left;
                max-height: 200px;
                overflow-y: auto;
                font-size: 13px;
                line-height: 1.5;
                border: 2px solid rgba(255, 255, 255, 0.2);
                display: none;
            ">
                <div class="transcript-label" style="
                    font-size: 11px;
                    opacity: 0.7;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                ">Complete Transcript</div>
                <div id="completeTranscript"></div>
            </div>
            
            <div class="transcripts-section" style="
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 20px;
                backdrop-filter: blur(10px);
            ">
                <input type="text" id="searchBox" placeholder="Search transcripts..." style="
                    width: 100%;
                    padding: 10px;
                    border: none;
                    border-radius: 20px;
                    margin-bottom: 15px;
                    font-size: 14px;
                    box-sizing: border-box;
                ">
                <div id="transcriptList" style="
                    max-height: 200px;
                    overflow-y: auto;
                ">
                    <div class="no-transcripts" style="
                        text-align: center;
                        opacity: 0.7;
                        font-style: italic;
                    ">No transcripts yet</div>
                </div>
            </div>
        `;
        
        // Initialize or reattach the Meeting Assistant functionality
        initializeOverlayFunctionality(container);
    }
    
    function initializeOverlayFunctionality(container) {
        // If a controller already exists, just reattach the UI to it
        if (window.assistant && typeof window.assistant.attachToContainer === 'function') {
            window.assistant.attachToContainer(container);
            return;
        }
        
        // Create a simplified version of the MeetingAssistant class (controller + UI)
        const assistant = {
            transcripts: [],
            isRecording: false,
            mediaRecorder: null,
            audioChunks: [],
            startTime: null,
            timerInterval: null,
            recognition: null,
            finalTranscript: '',
            finalWords: [],
            lastInterimWords: [],
            recognitionStarted: false,
            recognitionActive: false,
            _recognitionCooldown: false,
            _recognitionStartRequested: false,
            
            // Get elements (initial binding)
            recordBtn: container.querySelector('#recordBtn'),
            status: container.querySelector('#status'),
            searchBox: container.querySelector('#searchBox'),
            transcriptList: container.querySelector('#transcriptList'),
            recordingIndicator: container.querySelector('#recordingIndicator'),
            timer: container.querySelector('#timer'),
            liveTranscriptSection: container.querySelector('#liveTranscriptSection'),
            liveTranscript: container.querySelector('#liveTranscript'),
            completeTranscriptSection: container.querySelector('#completeTranscriptSection'),
            completeTranscript: container.querySelector('#completeTranscript'),
            
            async init() {
                this.setupEventListeners();
                this.setupSpeechRecognition();
                await this.loadTranscripts();
                this.setupSyncListeners();
            },

            // Reattach to a newly created overlay/container without stopping recording
            attachToContainer(newContainer) {
                this.recordBtn = newContainer.querySelector('#recordBtn');
                this.status = newContainer.querySelector('#status');
                this.searchBox = newContainer.querySelector('#searchBox');
                this.transcriptList = newContainer.querySelector('#transcriptList');
                this.recordingIndicator = newContainer.querySelector('#recordingIndicator');
                this.timer = newContainer.querySelector('#timer');
                this.liveTranscriptSection = newContainer.querySelector('#liveTranscriptSection');
                this.liveTranscript = newContainer.querySelector('#liveTranscript');
                this.completeTranscriptSection = newContainer.querySelector('#completeTranscriptSection');
                this.completeTranscript = newContainer.querySelector('#completeTranscript');

                // Bind listeners to the new elements
                this.setupEventListeners();

                // If recording is active, immediately reflect state and timer
                if (this.isRecording) {
                    try {
                        this.timer.style.display = 'block';
                        const elapsed = Date.now() - (this.startTime || Date.now());
                        const minutes = Math.floor(elapsed / 60000);
                        const seconds = Math.floor((elapsed % 60000) / 1000);
                        this.timer.textContent = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
                    } catch (_) {}
                }

                // Refresh transcripts list and UI to current state
                this.displayTranscripts(this.transcripts || []);
                this.updateUI();
                // Ensure live transcript content remains visible if recording
                if (this.isRecording) {
                    this.liveTranscriptSection.style.display = 'block';
                }
            },
            
            setupEventListeners() {
                this.recordBtn.onclick = () => this.toggleRecording();
                this.searchBox.oninput = (e) => this.searchTranscripts(e.target.value);
            },
            
            
            async toggleRecording() {
                if (!this.isRecording) {
                    await this.startRecording();
                } else {
                    await this.stopRecording();
                }
            },
            
            async startRecording() {
                try {
                    console.log('Starting recording - requesting screen sharing permission...');
                    this.status.textContent = 'Requesting screen sharing permission...';
                    
                    // Always request screen sharing permission first to capture system audio
                    let stream;
                    try {
                        console.log('Requesting display media for system audio capture...');
                        stream = await navigator.mediaDevices.getDisplayMedia({ 
                            audio: {
                                echoCancellation: false,
                                noiseSuppression: false,
                                autoGainControl: false,
                                sampleRate: 44100,
                                suppressLocalAudioPlayback: false
                            },
                            // Request minimal video to force the screen-share picker UI
                            video: {
                                frameRate: 1,
                                width: 1,
                                height: 1
                            },
                            suppressLocalAudioPlayback: false
                        });
                        console.log('System audio capture successful - can record YouTube, videos, etc.');
                        this.status.textContent = 'Recording system audio (including videos)...';
                        // Immediately stop the video track; keep audio only
                        try {
                            stream.getVideoTracks().forEach(t => t.stop());
                        } catch (e) {
                            console.log('No video tracks to stop or could not stop:', e);
                        }
                    } catch (displayError) {
                        console.log('Screen sharing denied or failed, falling back to microphone:', displayError && (displayError.name + ' ' + displayError.message));
                        
                        // Show user-friendly message about screen sharing
                        if (displayError.name === 'NotAllowedError') {
                            this.status.textContent = 'Screen sharing denied. Using microphone instead...';
                        } else {
                            this.status.textContent = 'Screen sharing failed (' + (displayError.name || 'Error') + '). Using microphone...';
                        }
                        
                        // Fallback to microphone
                        try {
                            stream = await navigator.mediaDevices.getUserMedia({ 
                                audio: {
                                    echoCancellation: false,
                                    noiseSuppression: false,
                                    autoGainControl: true,
                                    sampleRate: 44100
                                } 
                            });
                            console.log('Microphone capture successful');
                            this.status.textContent = 'Recording microphone...';
                        } catch (micError) {
                            throw micError; // Let the outer catch handle microphone errors
                        }
                    }
                    
                    let mimeType = 'audio/webm;codecs=opus';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = 'audio/webm';
                        if (!MediaRecorder.isTypeSupported(mimeType)) {
                            mimeType = 'audio/mp4';
                            if (!MediaRecorder.isTypeSupported(mimeType)) {
                                mimeType = '';
                            }
                        }
                    }
                    
                    this.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
                    this.audioChunks = [];
                    
                    this.mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            this.audioChunks.push(event.data);
                        }
                        // Start speech recognition on first audio chunk to reduce no-speech errors
                        if (this.recognition && !this.recognitionStarted && !this.recognitionActive && !this._recognitionCooldown && !this._recognitionStartRequested) {
                            this.startRecognitionSafe('first-chunk');
                        }
                    };
                    
                    this.mediaRecorder.onstop = async () => {
                        await this.processAudio();
                        stream.getTracks().forEach(track => track.stop());
                    };
                    
                    this.mediaRecorder.start(1000);
                    
                    if (!this.useDeepgram && this.recognition) {
                        this.finalTranscript = '';
                        this.finalWords = [];
                        this.lastInterimWords = [];
                        this.recognitionStarted = false;
                        this.recognitionActive = false;
                        this._recognitionCooldown = false;
                        // Show appropriate message based on audio source
                        const isSystemAudio = this.status.textContent.includes('system audio');
                        const message = isSystemAudio 
                            ? '<div style="color: #2196F3; font-weight: bold;">🎧 Listening to system audio (YouTube, videos, etc.)...</div>'
                            : '<div style="color: #FF9800; font-weight: bold;">🎤 Listening to microphone...</div>';
                        this.liveTranscript.innerHTML = message;
                        // recognition will be started on first dataavailable
                    }

                    // Removed Deepgram realtime initialization
                    
                    this.isRecording = true;
                    this.startTime = Date.now();
                    this.startTimer();
                    this.updateUI();
                    
                } catch (error) {
                    console.error('Error starting recording:', error);
                    let errorMessage = 'Could not access microphone';
                    
                    if (error.name === 'NotAllowedError') {
                        errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
                    } else if (error.name === 'NotFoundError') {
                        errorMessage = 'No microphone found. Please connect a microphone and try again.';
                    } else if (error.name) {
                        errorMessage = 'Recording error: ' + error.name + ' - ' + (error.message || '');
                    }
                    
                    this.status.textContent = errorMessage;
                }
            },
            
            async stopRecording() {
                console.log('Stopping recording, final transcript before stop:', this.finalTranscript);
                
                // Stop media recorder first
                if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                    this.mediaRecorder.stop();
                }
                
                // Give speech recognition time to process final results
                if (this.recognition) {
                    try {
                        // Force speech recognition to finalize any interim results
                        if (this.recognition.continuous) {
                            // Stop and immediately restart to force finalization
                            try { this.recognition.stop(); } catch (_) {}
                            await new Promise(resolve => setTimeout(resolve, 500));
                            
                            // Try to start and immediately stop again to get final results
                            try {
                                if (!this.recognitionActive) this.recognition.start();
                                await new Promise(resolve => setTimeout(resolve, 100));
                                try { this.recognition.stop(); } catch (_) {}
                            } catch (e) {
                                console.log('Could not restart for finalization:', e);
                            }
                        }
                        
                        // Wait a bit more for any pending results
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        console.log('Final transcript after waiting:', this.finalTranscript);
                        this.recognitionStarted = false;
                        this.recognitionActive = false;
                    } catch (error) {
                        console.warn('Error stopping speech recognition:', error);
                    }
                }

                // No Deepgram socket cleanup required
                
                this.isRecording = false;
                this.stopTimer();
                this.updateUI();
            },
            
            startTimer() {
                this.timer.style.display = 'block';
                this.timerInterval = setInterval(() => {
                    const elapsed = Date.now() - this.startTime;
                    const minutes = Math.floor(elapsed / 60000);
                    const seconds = Math.floor((elapsed % 60000) / 1000);
                    this.timer.textContent = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
                }, 1000);
            },
            
            stopTimer() {
                if (this.timerInterval) {
                    clearInterval(this.timerInterval);
                    this.timerInterval = null;
                }
            },
            
            updateUI() {
                if (this.isRecording) {
                    this.recordBtn.textContent = 'Stop Recording';
                    this.recordBtn.style.background = '#f44336';
                    this.recordingIndicator.style.display = 'block';
                    this.liveTranscriptSection.style.display = 'block';
                } else {
                    this.recordBtn.textContent = 'Start Recording';
                    this.recordBtn.style.background = '#4CAF50';
                    this.status.textContent = 'Processing recording...';
                    this.recordingIndicator.style.display = 'none';
                }
            },
            
            resetUI() {
                this.recordBtn.textContent = 'Start Recording';
                this.recordBtn.style.background = '#4CAF50';
                this.status.textContent = 'Click to start recording (will request screen sharing for video audio)';
                this.timer.textContent = '00:00';
                this.timer.style.display = 'none';
                this.recordingIndicator.style.display = 'none';
                this.liveTranscriptSection.style.display = 'none';
                this.completeTranscriptSection.style.display = 'none';
                this.liveTranscript.innerHTML = '<div>Click Start Recording to capture system audio from videos and get live transcription...</div>';
                this.finalTranscript = '';
            },
            
            async processAudio() {
                try {
                    this.status.textContent = 'Saving transcript...';
                    console.log('Processing audio, final transcript:', this.finalTranscript);
                    
                    // Rebuild full transcript from final words + last interim to ensure nothing lost
                    const words = (this.finalWords || []).slice();
                    const interim = (this.lastInterimWords || []).slice();
                    const combined = words.concat(interim);
                    let transcript = combined.join(' ').trim();
                    
                    if (transcript && transcript.length > 0) {
                        console.log('Transcript found, saving:', transcript);
                        this.completeTranscript.innerHTML = '<div>' + transcript + '</div>';
                        this.completeTranscriptSection.style.display = 'block';
                        
                        const recordingDuration = Date.now() - this.startTime;
                        await this.saveTranscript(transcript, Math.round(recordingDuration/1000) + 's');
                        this.status.textContent = 'Transcript saved successfully!';
                        
                        setTimeout(() => {
                            this.resetUI();
                            this.loadTranscripts();
                        }, 3000);
                    } else {
                        console.log('No transcript detected, checking if we should save anyway');
                        // Even if no speech was detected via speech recognition, 
                        // let's save a placeholder if recording was long enough
                        const recordingDuration = Date.now() - this.startTime;
                        if (recordingDuration > 5000) { // 5 seconds
                            // Save with empty transcript text but include duration info in metadata
                            await this.saveTranscript('', Math.round(recordingDuration/1000) + 's');
                            this.status.textContent = 'Recording saved (no speech detected)';
                        } else {
                            this.status.textContent = 'Recording too short or no speech detected';
                        }
                        
                        setTimeout(() => {
                            this.resetUI();
                            this.loadTranscripts();
                        }, 3000);
                    }
                    
                } catch (error) {
                    console.error('Error processing audio:', error);
                    this.status.textContent = 'Error saving transcript';
                    setTimeout(() => {
                        this.resetUI();
                    }, 5000);
                }
            },
            
            setupSpeechRecognition() {
                if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                    this.recognition = new SpeechRecognition();
                    
                    // Enhanced settings for better speech detection from system audio
                    this.recognition.continuous = true;
                    this.recognition.interimResults = true;
                    this.recognition.lang = 'en-US';
                    this.recognition.maxAlternatives = 5; // More alternatives for better accuracy with system audio
                    
                    // Additional settings for better detection
                    if ('webkitSpeechRecognition' in window) {
                        this.recognition.serviceURI = 'wss://www.google.com/speech-api/v2/recognize';
                    }
                    
                    this.recognition.onresult = (event) => {
                        let interimText = '';
                        console.log('Speech recognition result received:', event.results.length, 'results');
                        for (let i = event.resultIndex; i < event.results.length; i++) {
                            const result = event.results[i];
                            let bestTranscript = result[0].transcript;
                            let bestConfidence = result[0].confidence;
                            for (let j = 0; j < result.length; j++) {
                                if (result[j].confidence > bestConfidence) {
                                    bestTranscript = result[j].transcript;
                                    bestConfidence = result[j].confidence;
                                }
                            }
                            console.log('Speech result:', bestTranscript, 'confidence:', bestConfidence, 'final:', result.isFinal);
                            if (result.isFinal) {
                                const words = bestTranscript.trim().split(/\s+/).filter(Boolean);
                                if (words.length) {
                                    this.finalWords.push.apply(this.finalWords, words);
                                    this.finalTranscript = this.finalWords.join(' ') + ' ';
                                }
                            } else {
                                interimText += bestTranscript + ' ';
                            }
                        }
                        // Track last interim as words
                        this.lastInterimWords = interimText.trim().split(/\s+/).filter(Boolean);
                        this.updateLiveTranscript();
                    };
                    
                    this.recognition.onerror = (event) => {
                        console.error('Speech recognition error:', event.error);
                        
                        // Be more aggressive about restarting - restart on most errors
                        if (this.isRecording) {
                            if (event.error === 'network') {
                                console.log('Network error - retrying in 2 seconds...');
                                setTimeout(() => this.restartRecognition(), 2000);
                            } else if (event.error === 'no-speech') {
                                console.log('No speech detected, continuing to listen...');
                                setTimeout(() => this.restartRecognition(), 500);
                            } else if (event.error === 'audio-capture') {
                                console.log('Audio capture error - retrying...');
                                setTimeout(() => this.restartRecognition(), 1000);
                            } else if (event.error === 'not-allowed') {
                                console.log('Microphone access denied');
                                this.status.textContent = 'Microphone access denied';
                            } else {
                                console.log('Other error - retrying:', event.error);
                                setTimeout(() => this.restartRecognition(), 1000);
                            }
                        }
                    };
                    
                    this.recognition.onend = () => {
                        console.log('Speech recognition ended');
                        this.recognitionActive = false;
                        this._recognitionStartRequested = false;
                        if (this.isRecording) {
                            console.log('Restarting speech recognition...');
                            setTimeout(() => this.restartRecognition(), 150);
                        }
                    };
                    
                    this.recognition.onstart = () => {
                        console.log('Speech recognition started');
                        this.recognitionActive = true;
                        this.recognitionStarted = true;
                        this._recognitionStartRequested = false;
                    };
                    
                    this.recognition.onspeechstart = () => {
                        console.log('Speech detected');
                    };
                    
                    this.recognition.onspeechend = () => {
                        console.log('Speech ended');
                    };
                }
            },

            // Deepgram methods removed
            
            startRecognitionSafe(source) {
                if (!this.recognition || !this.isRecording) return;
                if (this.recognitionActive || this._recognitionCooldown || this._recognitionStartRequested) return;
                try {
                    this._recognitionStartRequested = true;
                    this.recognition.start();
                    console.log('Recognition start requested from', source);
                } catch (err) {
                    // Swallow duplicate start errors silently
                    // If it's already started, treat as active
                    if ((err && ('' + err).toLowerCase().includes('already started')) || (err && err.name === 'InvalidStateError')) {
                        this.recognitionActive = true;
                        this.recognitionStarted = true;
                        this._recognitionStartRequested = false;
                        return;
                    }
                    // Set a short cooldown to avoid rapid retries on invalid-state
                    this._recognitionCooldown = true;
                    setTimeout(() => { this._recognitionCooldown = false; }, 500);
                    this._recognitionStartRequested = false;
                }
            },

            restartRecognition() {
                if (!this.isRecording || !this.recognition) return;
                // Prevent rapid restarts
                if (this._restartPending) return;
                this._restartPending = true;
                console.log('Attempting to restart speech recognition...');
                
                // Best effort stop, ignore errors
                try { this.recognition.stop(); } catch (_) {}
                
                setTimeout(() => {
                    if (!this.isRecording || !this.recognition) { this._restartPending = false; return; }
                    try {
                        if (!this.recognitionActive) this.recognition.start();
                        console.log('Speech recognition restarted successfully');
                    } catch (startError) {
                        console.warn('Failed to restart recognition:', startError);
                        // Retry after longer backoff
                        setTimeout(() => {
                            this._restartPending = false;
                            if (this.isRecording) this.restartRecognition();
                        }, 2000);
                        return;
                    }
                    this._restartPending = false;
                }, 300);
            },
            
            updateLiveTranscript() {
                // Build lines of exactly up to 8 words per line; never delete committed words
                const words = this.finalWords.slice();
                const interim = this.lastInterimWords.slice();
                const allWords = words.concat(interim);
                const lines = [];
                for (let i = 0; i < allWords.length; i += 8) {
                    lines.push(allWords.slice(i, i + 8).join(' '));
                }
                // Render lines; last line may include interim words styled
                const totalFinalLines = Math.ceil(words.length / 8);
                let html = '';
                for (let li = 0; li < lines.length; li++) {
                    const lineStartIndex = li * 8;
                    const isFinalLine = (li < totalFinalLines - 1) || (interim.length === 0 && li === totalFinalLines - 1);
                    if (isFinalLine) {
                        html += '<div>' + lines[li] + '</div>';
                    } else {
                        // Mixed line with some final words and some interim words
                        const finalCountInThisLine = Math.max(0, Math.min(8, words.length - lineStartIndex));
                        const finalPart = allWords.slice(lineStartIndex, lineStartIndex + finalCountInThisLine).join(' ');
                        const interimPart = allWords.slice(lineStartIndex + finalCountInThisLine, lineStartIndex + 8).join(' ');
                        html += '<div>' + finalPart + (interimPart ? ' <span style="opacity:0.6;font-style:italic;">' + interimPart + '</span>' : '') + '</div>';
                    }
                }
                if (!html) {
                    html = '<div>Listening...</div>';
                }
                this.liveTranscript.innerHTML = html;
                this.liveTranscript.scrollTop = this.liveTranscript.scrollHeight;
            },
            
            async saveTranscript(text, duration = null) {
                const transcript = {
                    id: Date.now().toString(),
                    text: text,
                    date: new Date().toISOString(),
                    timestamp: Date.now(),
                    duration: duration
                };
                
                try {
                    let transcripts = [];
                    let usedLocalStorage = false;
                    try {
                        const result = await chrome.storage.local.get(['transcripts']);
                        transcripts = result.transcripts || [];
                    } catch (_) {
                        // Extension context invalid: fall back to localStorage
                        try {
                            const raw = localStorage.getItem('meeting_ai_transcripts');
                            transcripts = raw ? JSON.parse(raw) : [];
                            usedLocalStorage = true;
                        } catch (_) {
                            transcripts = [];
                            usedLocalStorage = true;
                        }
                    }
                    transcripts.unshift(transcript);
                    if (transcripts.length > 100) transcripts.splice(100);
                    if (usedLocalStorage) {
                        localStorage.setItem('meeting_ai_transcripts', JSON.stringify(transcripts));
                    } else {
                        await chrome.storage.local.set({ transcripts });
                    }
                    console.log('Transcript saved:', transcript.id, usedLocalStorage ? '(localStorage)' : '(chrome.storage)');
                    // Notify other tabs/overlays
                    try { this.bc && this.bc.postMessage({ type: 'transcripts_updated' }); } catch (_) {}
                } catch (error) {
                    console.error('Error saving transcript:', error);
                }
            },
            
            async loadTranscripts() {
                try {
                    let transcripts = [];
                    let usedLocalStorage = false;
                    try {
                        const result = await chrome.storage.local.get(['transcripts']);
                        transcripts = result.transcripts || [];
                    } catch (_) {
                        // Extension context invalid: fall back to localStorage
                        try {
                            const raw = localStorage.getItem('meeting_ai_transcripts');
                            transcripts = raw ? JSON.parse(raw) : [];
                            usedLocalStorage = true;
                        } catch (_) {
                            transcripts = [];
                            usedLocalStorage = true;
                        }
                    }
                    this.transcripts = transcripts;
                    this.displayTranscripts(this.transcripts);
                } catch (error) {
                    console.error('Error loading transcripts:', error);
                }
            },
            
            displayTranscripts(transcripts) {
                if (transcripts.length === 0) {
                    this.transcriptList.innerHTML = '<div style="text-align: center; opacity: 0.7; font-style: italic;">No transcripts yet</div>';
                    return;
                }
                
                // Clear existing content
                this.transcriptList.innerHTML = '';
                
                // Create transcript items with proper event listeners
                transcripts.forEach(transcript => {
                    const date = new Date(transcript.date);
                    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                    // Create a better preview - show more text or indicate if no speech detected
                    let preview;
                    if (transcript.text && transcript.text.trim() && !transcript.text.includes('Recording completed at')) {
                        // Show more of the actual transcript (up to 150 characters)
                        preview = transcript.text.trim().substring(0, 150) + (transcript.text.trim().length > 150 ? '...' : '');
                    } else {
                        // Show a placeholder for recordings with no speech
                        const date = new Date(transcript.date);
                        preview = '🎙️ Recording from ' + date.toLocaleDateString() + ' - No speech detected';
                    }
                    
                    // Create transcript item container
                    const transcriptItem = document.createElement('div');
                    transcriptItem.style.cssText = 
                        'background: rgba(255, 255, 255, 0.1);' +
                        'padding: 10px;' +
                        'margin-bottom: 8px;' +
                        'border-radius: 10px;' +
                        'transition: all 0.3s ease;' +
                        'border: 1px solid rgba(255, 255, 255, 0.1);' +
                        'cursor: pointer;';
                    
                    // Create header with date and actions
                    const header = document.createElement('div');
                    header.style.cssText = 
                        'display: flex;' +
                        'justify-content: space-between;' +
                        'align-items: flex-start;' +
                        'margin-bottom: 8px;';
                    
                    // Date element
                    const dateElement = document.createElement('div');
                    dateElement.style.cssText = 'font-size: 12px; opacity: 0.7;';
                    dateElement.textContent = dateStr;
                    
                    // Actions container
                    const actionsContainer = document.createElement('div');
                    
                    // Share button
                    const shareBtn = document.createElement('button');
                    shareBtn.innerHTML = '📤 Share';
                    shareBtn.style.cssText = 
                        'padding: 4px 8px;' +
                        'border: 1px solid rgba(76, 175, 80, 0.5);' +
                        'border-radius: 12px;' +
                        'background: rgba(76, 175, 80, 0.8);' +
                        'color: white;' +
                        'font-size: 11px;' +
                        'cursor: pointer;' +
                        'margin-right: 4px;';
                    
                    shareBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        console.log('Share button clicked for transcript:', transcript.id);
                        this.shareTranscript(transcript.id);
                    });
                    
                    // Delete button
                    const deleteBtn = document.createElement('button');
                    deleteBtn.innerHTML = '🗑️';
                    deleteBtn.style.cssText = 
                        'padding: 4px 8px;' +
                        'border: 1px solid rgba(244, 67, 54, 0.5);' +
                        'border-radius: 12px;' +
                        'background: rgba(244, 67, 54, 0.8);' +
                        'color: white;' +
                        'font-size: 11px;' +
                        'cursor: pointer;';
                    
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        console.log('Delete button clicked for transcript:', transcript.id);
                        this.deleteTranscript(transcript.id);
                    });
                    
                    // Preview element - style differently based on content
                    const previewElement = document.createElement('div');
                    if (transcript.text && transcript.text.trim() && !transcript.text.includes('Recording completed at')) {
                        // Style for actual transcript content
                        previewElement.style.cssText = 
                            'font-size: 14px; ' +
                            'margin-top: 5px; ' +
                            'line-height: 1.4; ' +
                            'color: rgba(255, 255, 255, 0.9); ' +
                            'background: rgba(0, 0, 0, 0.1); ' +
                            'padding: 8px; ' +
                            'border-radius: 6px; ' +
                            'font-family: system-ui, -apple-system, sans-serif;';
                        previewElement.textContent = preview;
                    } else {
                        // Style for no-speech placeholder
                        previewElement.style.cssText = 
                            'font-size: 13px; ' +
                            'margin-top: 5px; ' +
                            'line-height: 1.3; ' +
                            'color: rgba(255, 255, 255, 0.6); ' +
                            'font-style: italic; ' +
                            'text-align: center; ' +
                            'padding: 8px;';
                        previewElement.textContent = preview;
                    }
                    
                    // Assemble elements
                    actionsContainer.appendChild(shareBtn);
                    actionsContainer.appendChild(deleteBtn);
                    header.appendChild(dateElement);
                    header.appendChild(actionsContainer);
                    transcriptItem.appendChild(header);
                    transcriptItem.appendChild(previewElement);
                    
                    // Add hover effects
                    transcriptItem.addEventListener('mouseenter', () => {
                        transcriptItem.style.background = 'rgba(255, 255, 255, 0.15)';
                    });
                    
                    transcriptItem.addEventListener('mouseleave', () => {
                        transcriptItem.style.background = 'rgba(255, 255, 255, 0.1)';
                    });
                    
                    // Add click to open transcript
                    transcriptItem.addEventListener('click', () => {
                        console.log('Opening transcript:', transcript.id);
                        this.openTranscript(transcript.id);
                    });
                    
                    // Add to list
                    this.transcriptList.appendChild(transcriptItem);
                });
            },
            
            searchTranscripts(query) {
                if (!query.trim()) {
                    this.displayTranscripts(this.transcripts);
                    return;
                }
                
                const filtered = this.transcripts.filter(transcript => 
                    transcript.text.toLowerCase().includes(query.toLowerCase())
                );
                
                this.displayTranscripts(filtered);
            },
            
            openTranscript(id) {
                const transcript = this.transcripts.find(t => t.id === id);
                if (transcript) {
                    try {
                        chrome.runtime.sendMessage({ action: 'openTranscriptTab', id: id });
                    } catch (e) {
                        console.warn('Failed to request opening transcript tab:', e);
                    }
                }
            },
            
            async shareTranscript(id) {
                const transcript = this.transcripts.find(t => t.id === id);
                if (!transcript) return;
                
                try {
                    const date = new Date(transcript.date);
                    const shareText = 'Meeting Transcript - ' + date.toLocaleDateString() + '\n\n' + transcript.text;
                    
                    if (navigator.share) {
                        await navigator.share({
                            title: 'Meeting Transcript - ' + date.toLocaleDateString(),
                            text: shareText
                        });
                    } else {
                        await navigator.clipboard.writeText(shareText);
                        alert('Transcript copied to clipboard!');
                    }
                } catch (error) {
                    console.error('Error sharing transcript:', error);
                    alert('Failed to share transcript');
                }
            },
            
            async deleteTranscript(id) {
                if (!confirm('Are you sure you want to delete this transcript?')) return;
                
                try {
                    console.log('Attempting to delete transcript:', id);
                    let usedLocalStorage = false;
                    let filteredTranscripts = [];
                    try {
                        // Try chrome storage first
                        const result = await chrome.storage.local.get(['transcripts']);
                        const transcripts = result.transcripts || [];
                        filteredTranscripts = transcripts.filter(t => t.id !== id);
                        await chrome.storage.local.set({ transcripts: filteredTranscripts });
                    } catch (_) {
                        // Fallback to localStorage
                        try {
                            const raw = localStorage.getItem('meeting_ai_transcripts');
                            const transcripts = raw ? JSON.parse(raw) : [];
                            filteredTranscripts = transcripts.filter(t => t.id !== id);
                            localStorage.setItem('meeting_ai_transcripts', JSON.stringify(filteredTranscripts));
                            usedLocalStorage = true;
                        } catch (e2) {
                            throw e2;
                        }
                    }
                    // Update local array and refresh display
                    this.transcripts = filteredTranscripts;
                    this.displayTranscripts(this.transcripts);
                    
                    console.log('Transcript deleted successfully');
                    
                    // Show success message
                    this.showSuccessMessage('Transcript deleted successfully!');
                    
                    // Notify other tabs/overlays
                    try { this.bc && this.bc.postMessage({ type: 'transcripts_updated' }); } catch (_) {}
                    
                } catch (error) {
                    console.error('Error deleting transcript:', error);
                    alert('Failed to delete transcript: ' + error.message);
                }
            },

            setupSyncListeners() {
                const self = this;
                // chrome.storage change listener (works across all extension contexts)
                try {
                    if (chrome && chrome.storage && chrome.storage.onChanged) {
                        chrome.storage.onChanged.addListener((changes, area) => {
                            if (area === 'local' && changes.transcripts) {
                                try {
                                    const updated = changes.transcripts.newValue || [];
                                    self.transcripts = updated;
                                    self.displayTranscripts(self.transcripts);
                                } catch (_) {}
                            }
                        });
                    }
                } catch (_) {}
                
                // window storage event (localStorage same-origin only)
                try {
                    window.addEventListener('storage', (e) => {
                        if (e && e.key === 'meeting_ai_transcripts') {
                            try {
                                const updated = e.newValue ? JSON.parse(e.newValue) : [];
                                self.transcripts = updated;
                                self.displayTranscripts(self.transcripts);
                            } catch (_) {}
                        }
                    });
                } catch (_) {}
                
                // BroadcastChannel for cross-tab signaling
                try {
                    if ('BroadcastChannel' in window) {
                        this.bc = new BroadcastChannel('meeting_ai_transcripts');
                        this.bc.onmessage = (msg) => {
                            if (msg && msg.data && msg.data.type === 'transcripts_updated') {
                                // Reload from storage on signal
                                self.loadTranscripts();
                            }
                        };
                    }
                } catch (_) {}
            },
            
            showSuccessMessage(message) {
                // Create success message element
                const successDiv = document.createElement('div');
                successDiv.textContent = message;
                successDiv.style.cssText = 
                    'position: fixed;' +
                    'top: 20px;' +
                    'left: 50%;' +
                    'transform: translateX(-50%);' +
                    'background: #28a745;' +
                    'color: white;' +
                    'padding: 10px 20px;' +
                    'border-radius: 20px;' +
                    'font-size: 14px;' +
                    'z-index: 2147483648;' +
                    'opacity: 0;' +
                    'transition: opacity 0.3s ease;';
                
                document.body.appendChild(successDiv);
                
                // Animate in
                setTimeout(() => {
                    successDiv.style.opacity = '1';
                }, 10);
                
                // Remove after 3 seconds
                setTimeout(() => {
                    successDiv.style.opacity = '0';
                    setTimeout(() => {
                        if (successDiv.parentNode) {
                            successDiv.parentNode.removeChild(successDiv);
                        }
                    }, 300);
                }, 3000);
            }
        };
        
        // Make assistant globally accessible for onclick handlers
        window.assistant = assistant;
        
        // Initialize the assistant
        assistant.init();
    }
    
    function observeMeetingState() {
        // This function can be expanded to detect when meetings start/end
        // and automatically suggest starting recording
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check for meeting-specific elements that indicate meeting state
                    checkMeetingState();
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    function checkMeetingState() {
        // Platform-specific logic to detect meeting state
        let inMeeting = false;
        
        switch (currentPlatform) {
            case 'zoom':
                inMeeting = document.querySelector('[data-testid="meeting-window"]') !== null;
                break;
            case 'teams':
                inMeeting = document.querySelector('[data-tid="calling-stage"]') !== null;
                break;
            case 'meet':
                inMeeting = document.querySelector('[data-meeting-title]') !== null;
                break;
            default:
                // Generic detection
                inMeeting = document.querySelector('video') !== null;
        }
        
        // You could add logic here to show notifications or auto-start recording
        if (inMeeting) {
            console.log('Meeting AI Assistant: Meeting detected');
        }
    }
    
    // Listen for messages from the extension
    try {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request && request.action === 'getMeetingInfo') {
                sendResponse({
                    platform: currentPlatform,
                    url: window.location.href,
                    title: document.title
                });
                return;
            }
            if (request && (request.action === 'toggleOverlay' || request.action === 'openOverlay' || request.action === 'closeOverlay')) {
                const overlay = document.getElementById('meeting-ai-overlay');
                if (request.action === 'toggleOverlay') {
                    if (overlay) {
                        overlay.remove();
                        try { chrome.storage && chrome.storage.local && chrome.storage.local.set({ overlayState: { isOpen: false, timestamp: Date.now() } }); } catch (_) {}
                    } else {
                        try { createFloatingOverlay(); saveOverlayState(true); } catch (_) {}
                    }
                } else if (request.action === 'openOverlay') {
                    if (!overlay) { try { createFloatingOverlay(); saveOverlayState(true); } catch (_) {} }
                } else if (request.action === 'closeOverlay') {
                    if (overlay) { overlay.remove(); try { saveOverlayState(false); } catch (_) {} }
                }
            }
            if (request.action === 'toggleOverlay') {
                try {
                    toggleFloatingOverlay();
                    sendResponse && sendResponse({ success: true });
                } catch (e) {
                    sendResponse && sendResponse({ success: false, error: e && e.message });
                }
                return true;
            }
        });
    } catch (error) {
        console.log('Could not set up message listener:', error);
    }
    
})();
