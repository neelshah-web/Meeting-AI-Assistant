// Content script for Meeting AI Assistant - Floating Panel

(function() {
    'use strict';

    let overlay = null;
    let floatingButton = null;
    let isOverlayOpen = false;
    let meetingAssistant = null;

    // Initialize the floating button and panel
    function init() {
        if (floatingButton) return; // Already initialized

        createFloatingButton();
        createOverlayPanel();
        restoreState();
    }

    // Create the floating circular button
    function createFloatingButton() {
        if (document.getElementById('meeting-ai-float-btn')) return;

        floatingButton = document.createElement('div');
        floatingButton.id = 'meeting-ai-float-btn';
        floatingButton.innerHTML = '🎤';
        floatingButton.title = 'Meeting AI Assistant';

        floatingButton.addEventListener('click', toggleOverlay);

        document.body.appendChild(floatingButton);
    }

    // Create the slide-in overlay panel
    function createOverlayPanel() {
        if (document.getElementById('meeting-ai-overlay')) return;

        overlay = document.createElement('div');
        overlay.id = 'meeting-ai-overlay';
        overlay.innerHTML = `
            <div class="panel-header">
                <div class="panel-title">
                    🎤 Meeting AI Assistant
                </div>
                <button class="close-btn" id="close-panel">×</button>
            </div>
            <div class="panel-content">
                <div class="section">
                    <button id="recordBtn" class="record-btn start">Start Recording</button>
                    <div id="recordingIndicator" class="recording-indicator">● Recording...</div>
                    <div id="timer" class="timer">00:00</div>
                    <div id="status" class="status">Click to start recording</div>

                    <div id="liveTranscriptSection" class="live-transcript">
                        <div class="transcript-label">Live Transcript</div>
                        <div id="liveTranscript" class="no-transcript">Start recording to see live transcription...</div>
                    </div>

                    <div id="completeTranscriptSection" class="complete-transcript">
                        <div class="transcript-label">Complete Transcript</div>
                        <div id="completeTranscript"></div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Previous Recordings</div>
                    <input type="text" id="searchBox" class="search-box" placeholder="Search transcripts...">
                    <div id="transcriptList" class="transcript-list">
                        <div class="no-transcripts">No transcripts yet</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Add event listeners
        document.getElementById('close-panel').addEventListener('click', closeOverlay);

        // Initialize the Meeting Assistant logic
        initializeMeetingAssistant();
    }

    // Toggle overlay open/close
    function toggleOverlay() {
        if (isOverlayOpen) {
            closeOverlay();
        } else {
            openOverlay();
        }
    }

    // Open the overlay
    function openOverlay() {
        if (!overlay) createOverlayPanel();
        overlay.classList.add('show');
        isOverlayOpen = true;
        saveState();

        // Hide the floating button when overlay is open
        if (floatingButton) {
            floatingButton.style.opacity = '0';
            floatingButton.style.pointerEvents = 'none';
        }
    }

    // Close the overlay
    function closeOverlay() {
        if (overlay) {
            overlay.classList.remove('show');
        }
        isOverlayOpen = false;
        saveState();

        // Show the floating button when overlay is closed
        if (floatingButton) {
            floatingButton.style.opacity = '1';
            floatingButton.style.pointerEvents = 'auto';
        }
    }

    // Save state to localStorage
    function saveState() {
        try {
            chrome.storage.local.set({ overlayOpen: isOverlayOpen });
        } catch (e) {
            console.warn('Could not save state:', e);
        }
    }

    // Restore state from localStorage
    function restoreState() {
        try {
            chrome.storage.local.get(['overlayOpen'], (result) => {
                if (result.overlayOpen) {
                    openOverlay();
                }
            });
        } catch (e) {
            console.warn('Could not restore state:', e);
        }
    }

    // Initialize Meeting Assistant functionality
    function initializeMeetingAssistant() {
        meetingAssistant = new MeetingAssistantContent();
    }

    // Meeting Assistant Content class
    class MeetingAssistantContent {
        constructor() {
            this.transcripts = [];
            this.isRecording = false;
            this.mediaRecorder = null;
            this.audioChunks = [];
            this.startTime = null;
            this.timerInterval = null;
            this.recognition = null;
            this.liveTranscriptText = '';
            this.finalTranscript = '';

            this.initializeElements();
            this.loadTranscripts();
            this.setupEventListeners();
            this.setupSpeechRecognition();
        }

        initializeElements() {
            this.recordBtn = document.getElementById('recordBtn');
            this.status = document.getElementById('status');
            this.searchBox = document.getElementById('searchBox');
            this.transcriptList = document.getElementById('transcriptList');
            this.recordingIndicator = document.getElementById('recordingIndicator');
            this.timer = document.getElementById('timer');
            this.liveTranscriptSection = document.getElementById('liveTranscriptSection');
            this.liveTranscript = document.getElementById('liveTranscript');
            this.completeTranscriptSection = document.getElementById('completeTranscriptSection');
            this.completeTranscript = document.getElementById('completeTranscript');
        }

        setupEventListeners() {
            if (this.recordBtn) {
                this.recordBtn.addEventListener('click', () => this.toggleRecording());
            }
            if (this.searchBox) {
                this.searchBox.addEventListener('input', (e) => this.searchTranscripts(e.target.value));
            }
        }

        setupSpeechRecognition() {
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();

                this.recognition.continuous = true;
                this.recognition.interimResults = true;
                this.recognition.lang = 'en-US';

                this.recognition.onresult = (event) => {
                    let interimTranscript = '';
                    let finalTranscript = this.finalTranscript;

                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;

                        if (event.results[i].isFinal) {
                            finalTranscript += transcript + ' ';
                        } else {
                            interimTranscript += transcript;
                        }
                    }

                    this.finalTranscript = finalTranscript;
                    this.updateLiveTranscript(finalTranscript, interimTranscript);
                };

                this.recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    if (this.isRecording && event.error !== 'no-speech') {
                        setTimeout(() => this.restartRecognition(), 1000);
                    }
                };

                this.recognition.onend = () => {
                    if (this.isRecording) {
                        setTimeout(() => this.restartRecognition(), 100);
                    }
                };
            }
        }

        restartRecognition() {
            if (this.isRecording && this.recognition) {
                try {
                    this.recognition.start();
                } catch (e) {
                    console.warn('Could not restart recognition:', e);
                }
            }
        }

        updateLiveTranscript(finalText, interimText) {
            const displayText = finalText + (interimText ? `<span style="opacity: 0.5; font-style: italic;">${interimText}</span>` : '');

            if (displayText.trim()) {
                this.liveTranscript.innerHTML = displayText;
                this.liveTranscript.scrollTop = this.liveTranscript.scrollHeight;
            } else {
                this.liveTranscript.innerHTML = '<div class="no-transcript">Listening...</div>';
            }
        }

        async toggleRecording() {
            if (!this.isRecording) {
                await this.startRecording();
            } else {
                await this.stopRecording();
            }
        }

        async startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });

                this.mediaRecorder = new MediaRecorder(stream);
                this.audioChunks = [];

                this.mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        this.audioChunks.push(event.data);
                    }
                };

                this.mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                    await this.processAudio(audioBlob);
                    stream.getTracks().forEach(track => track.stop());
                };

                this.mediaRecorder.start(1000);

                if (this.recognition) {
                    this.finalTranscript = '';
                    try {
                        this.recognition.start();
                    } catch (e) {
                        console.warn('Could not start speech recognition:', e);
                    }
                }

                this.isRecording = true;
                this.startTime = Date.now();
                this.startTimer();
                this.updateUI();

            } catch (error) {
                console.error('Error starting recording:', error);
                this.status.textContent = 'Could not access microphone';
            }
        }

        async stopRecording() {
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }

            if (this.recognition) {
                try {
                    this.recognition.stop();
                } catch (e) {
                    console.warn('Error stopping speech recognition:', e);
                }
            }

            this.isRecording = false;
            this.stopTimer();
            this.updateUI();
        }

        startTimer() {
            if (this.timer) {
                this.timer.style.display = 'block';
                this.timerInterval = setInterval(() => {
                    const elapsed = Date.now() - this.startTime;
                    const minutes = Math.floor(elapsed / 60000);
                    const seconds = Math.floor((elapsed % 60000) / 1000);
                    this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }, 1000);
            }
        }

        stopTimer() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
        }

        updateUI() {
            if (this.isRecording) {
                this.recordBtn.textContent = 'Stop Recording';
                this.recordBtn.className = 'record-btn stop';
                this.status.textContent = 'Recording in progress...';
                if (this.recordingIndicator) this.recordingIndicator.style.display = 'block';
                if (this.liveTranscriptSection) this.liveTranscriptSection.classList.add('show');
            } else {
                this.recordBtn.textContent = 'Start Recording';
                this.recordBtn.className = 'record-btn start';
                this.status.textContent = 'Processing recording...';
                if (this.recordingIndicator) this.recordingIndicator.style.display = 'none';
            }
        }

        resetUI() {
            this.recordBtn.textContent = 'Start Recording';
            this.recordBtn.className = 'record-btn start';
            this.status.textContent = 'Click to start recording';
            if (this.timer) {
                this.timer.textContent = '00:00';
                this.timer.style.display = 'none';
            }
            if (this.recordingIndicator) this.recordingIndicator.style.display = 'none';
            if (this.liveTranscriptSection) this.liveTranscriptSection.classList.remove('show');
            if (this.completeTranscriptSection) this.completeTranscriptSection.classList.remove('show');
            if (this.liveTranscript) this.liveTranscript.innerHTML = '<div class="no-transcript">Start recording to see live transcription...</div>';
            this.finalTranscript = '';
        }

        async processAudio(audioBlob) {
            try {
                this.status.textContent = 'Saving transcript...';

                let transcript = this.finalTranscript.trim();

                if (transcript) {
                    if (this.completeTranscript && this.completeTranscriptSection) {
                        this.completeTranscript.innerHTML = transcript;
                        this.completeTranscriptSection.classList.add('show');
                    }

                    await this.saveTranscript(transcript);
                    this.status.textContent = 'Transcript saved successfully!';

                    setTimeout(() => {
                        this.resetUI();
                        this.loadTranscripts();
                    }, 3000);
                } else {
                    this.status.textContent = 'No speech detected in recording';
                    setTimeout(() => {
                        this.resetUI();
                    }, 3000);
                }

            } catch (error) {
                console.error('Error processing audio:', error);
                this.status.textContent = 'Error saving transcript';
                setTimeout(() => {
                    this.resetUI();
                }, 5000);
            }
        }

        async saveTranscript(text) {
            const transcript = {
                id: Date.now().toString(),
                text: text,
                date: new Date().toISOString(),
                timestamp: Date.now()
            };

            const result = await chrome.storage.local.get(['transcripts']);
            const transcripts = result.transcripts || [];

            transcripts.unshift(transcript);

            if (transcripts.length > 100) {
                transcripts.splice(100);
            }

            await chrome.storage.local.set({ transcripts });
        }

        async loadTranscripts() {
            try {
                const result = await chrome.storage.local.get(['transcripts']);
                this.transcripts = result.transcripts || [];
                this.displayTranscripts(this.transcripts);
            } catch (error) {
                console.error('Error loading transcripts:', error);
            }
        }

        displayTranscripts(transcripts) {
            if (!this.transcriptList) return;

            if (transcripts.length === 0) {
                this.transcriptList.innerHTML = '<div class="no-transcripts">No transcripts yet</div>';
                return;
            }

            this.transcriptList.innerHTML = transcripts.map(transcript => {
                const date = new Date(transcript.date);
                const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                const preview = transcript.text.substring(0, 80) + (transcript.text.length > 80 ? '...' : '');

                return `
                    <div class="transcript-item" data-id="${transcript.id}">
                        <div class="transcript-header">
                            <div class="transcript-date">${dateStr}</div>
                            <div class="transcript-actions">
                                <button class="action-btn" data-action="view" data-id="${transcript.id}">👁️ View</button>
                                <button class="action-btn" data-action="delete" data-id="${transcript.id}">🗑️</button>
                            </div>
                        </div>
                        <div class="transcript-preview">${preview}</div>
                    </div>
                `;
            }).join('');

            // Add event listeners for buttons
            this.transcriptList.querySelectorAll('.action-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    const id = btn.dataset.id;

                    if (action === 'view') {
                        this.openTranscript(id);
                    } else if (action === 'delete') {
                        this.deleteTranscript(id);
                    }
                });
            });
        }

        searchTranscripts(query) {
            if (!query.trim()) {
                this.displayTranscripts(this.transcripts);
                return;
            }

            const filtered = this.transcripts.filter(transcript =>
                transcript.text.toLowerCase().includes(query.toLowerCase())
            );

            this.displayTranscripts(filtered);
        }

        openTranscript(id) {
            const transcript = this.transcripts.find(t => t.id === id);
            if (transcript) {
                chrome.runtime.sendMessage({
                    action: 'openTranscriptTab',
                    id: id
                });
            }
        }

        async deleteTranscript(id) {
            if (!confirm('Are you sure you want to delete this transcript?')) {
                return;
            }

            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'deleteTranscript',
                    id: id
                });

                if (response.success) {
                    this.transcripts = this.transcripts.filter(t => t.id !== id);
                    this.displayTranscripts(this.transcripts);
                }
            } catch (error) {
                console.error('Error deleting transcript:', error);
            }
        }
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'toggleOverlay') {
            toggleOverlay();
            sendResponse({ success: true });
        }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-initialize if elements are removed
    setInterval(() => {
        if (!document.getElementById('meeting-ai-float-btn')) {
            createFloatingButton();
        }
    }, 3000);

})();
