class MeetingAssistant {
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
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        this.searchBox.addEventListener('input', (e) => this.searchTranscripts(e.target.value));
        
        // Load transcripts when popup opens
        this.loadTranscripts();
    }
    
    
    setupSpeechRecognition() {
        // Check if browser supports speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            // Enhanced settings for better speech detection
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 1;
            
            // Add these settings for better detection
            if ('webkitSpeechRecognition' in window) {
                this.recognition.serviceURI = 'wss://www.google.com/speech-api/v2/recognize';
            }
            
            this.recognition.onstart = () => {
                console.log('Speech recognition started');
                this.liveTranscript.innerHTML = '<div class="no-transcript">Listening for speech...</div>';
            };
            
            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = this.finalTranscript;
                
                // Process all results from the current session
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    const confidence = event.results[i][0].confidence;
                    
                    console.log(`Speech result: "${transcript}" (confidence: ${confidence}, final: ${event.results[i].isFinal})`);
                    
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                        console.log('Final transcript updated:', finalTranscript);
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                this.finalTranscript = finalTranscript;
                this.updateLiveTranscript(finalTranscript, interimTranscript);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                
                if (event.error === 'not-allowed') {
                    this.liveTranscript.innerHTML = '<div class="no-transcript">Microphone access denied for speech recognition</div>';
                } else if (event.error === 'network') {
                    console.log('Network error - retrying in 1 second...');
                    // Retry after network error
                    if (this.isRecording) {
                        setTimeout(() => this.restartRecognition(), 1000);
                    }
                } else if (event.error === 'no-speech') {
                    console.log('No speech detected, continuing to listen...');
                    // Don't show error for no-speech, just restart immediately
                    if (this.isRecording) {
                        setTimeout(() => this.restartRecognition(), 100);
                    }
                } else if (event.error === 'audio-capture') {
                    console.log('Audio capture error - retrying...');
                    if (this.isRecording) {
                        setTimeout(() => this.restartRecognition(), 500);
                    }
                } else if (event.error === 'service-not-allowed') {
                    console.log('Service not allowed - retrying...');
                    if (this.isRecording) {
                        setTimeout(() => this.restartRecognition(), 1000);
                    }
                } else {
                    console.warn('Speech recognition error:', event.error, '- retrying...');
                    if (this.isRecording) {
                        setTimeout(() => this.restartRecognition(), 500);
                    }
                }
            };
            
            this.recognition.onend = () => {
                console.log('Speech recognition ended');
                if (this.isRecording) {
                    // Always restart recognition if still recording
                    setTimeout(() => this.restartRecognition(), 100);
                }
            };
            
            this.recognition.onnomatch = () => {
                console.log('No match found, but continuing to listen...');
            };
            
            this.recognition.onspeechstart = () => {
                console.log('Speech detected');
            };
            
            this.recognition.onspeechend = () => {
                console.log('Speech ended');
            };
            
        } else {
            console.warn('Speech recognition not supported in this browser');
            this.liveTranscript.innerHTML = '<div class="no-transcript">Speech recognition not supported in this browser</div>';
        }
    }
    
    restartRecognition() {
        if (this.isRecording && this.recognition) {
            try {
                console.log('Restarting speech recognition...');
                // Stop any existing recognition first
                try {
                    this.recognition.stop();
                } catch (e) {
                    // Ignore errors when stopping
                }
                
                // Start new recognition after a brief delay
                setTimeout(() => {
                    if (this.isRecording) {
                        try {
                            this.recognition.start();
                            console.log('Speech recognition restarted successfully');
                        } catch (startError) {
                            console.warn('Failed to start recognition:', startError);
                            // Try again after a longer delay
                            setTimeout(() => {
                                if (this.isRecording) {
                                    this.restartRecognition();
                                }
                            }, 2000);
                        }
                    }
                }, 200);
                
            } catch (error) {
                console.warn('Could not restart speech recognition:', error);
                // Try again after a longer delay
                setTimeout(() => {
                    if (this.isRecording) {
                        this.restartRecognition();
                    }
                }, 2000);
            }
        }
    }
    
    updateLiveTranscript(finalText, interimText) {
        const displayText = finalText + (interimText ? `<span class="interim-text">${interimText}</span>` : '');
        
        if (displayText.trim()) {
            this.liveTranscript.innerHTML = `<span class="final-text">${displayText}</span>`;
            // Auto-scroll to bottom
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
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                } 
            });
            
            // Check if MediaRecorder supports the desired format
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'audio/mp4';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = ''; // Use default
                    }
                }
            }
            
            this.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { 
                    type: mimeType || 'audio/webm' 
                });
                await this.processAudio(audioBlob);
                
                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                this.status.textContent = 'Recording error occurred';
                this.resetUI();
            };
            
            this.mediaRecorder.start(1000); // Collect data every second
            
            // Start speech recognition for live transcription
            if (this.recognition) {
                this.finalTranscript = '';
                this.liveTranscript.innerHTML = '<div class="no-transcript">Listening...</div>';
                try {
                    this.recognition.start();
                } catch (error) {
                    console.warn('Could not start speech recognition:', error);
                }
            }
            
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
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Microphone is being used by another application.';
            }
            
            this.status.textContent = errorMessage;
        }
    }
    
    async stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        // Stop speech recognition
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.warn('Error stopping speech recognition:', error);
            }
        }
        
        this.isRecording = false;
        this.stopTimer();
        this.updateUI();
    }
    
    startTimer() {
        this.timer.style.display = 'block';
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
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
            this.recordingIndicator.style.display = 'block';
            this.liveTranscriptSection.classList.add('show');
        } else {
            this.recordBtn.textContent = 'Start Recording';
            this.recordBtn.className = 'record-btn start';
            this.status.textContent = 'Processing recording...';
            this.recordingIndicator.style.display = 'none';
        }
    }
    
    resetUI() {
        this.recordBtn.textContent = 'Start Recording';
        this.recordBtn.className = 'record-btn start';
        this.status.textContent = 'Click to start recording';
        this.timer.textContent = '00:00';
        this.timer.style.display = 'none';
        this.recordingIndicator.style.display = 'none';
        this.liveTranscriptSection.classList.remove('show');
        this.completeTranscriptSection.classList.remove('show');
        this.liveTranscript.innerHTML = '<div class="no-transcript">Start recording to see live transcription...</div>';
        this.finalTranscript = '';
    }
    
    async processAudio(audioBlob) {
        try {
            this.status.textContent = 'Saving transcript...';
            
            // Use the live transcript from speech recognition
            let transcript = this.finalTranscript.trim();
            
            if (transcript) {
                // Show complete transcript
                this.completeTranscript.innerHTML = `<div class="final-text">${transcript}</div>`;
                this.completeTranscriptSection.classList.add('show');
                
                await this.saveTranscript(transcript);
                this.status.textContent = 'Transcript saved successfully!';
                
                // Show success for a moment, then reset
                setTimeout(() => {
                    this.resetUI();
                    this.loadTranscripts(); // Refresh the transcript list
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
        
        // Get existing transcripts from Chrome storage
        const result = await chrome.storage.local.get(['transcripts']);
        const transcripts = result.transcripts || [];
        
        // Add new transcript at the beginning
        transcripts.unshift(transcript);
        
        // Keep only last 100 transcripts per user (or 100 total for guest)
        if (transcripts.length > 100) {
            transcripts.splice(100);
        }
        
        // Save back to storage
        await chrome.storage.local.set({ transcripts });
        
        console.log('Transcript saved:', transcript.id);
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
                            <button class="action-btn share-btn" onclick="event.stopPropagation(); window.meetingAssistant.shareTranscript('${transcript.id}')">📤 Share</button>
                            <button class="action-btn view-btn" onclick="event.stopPropagation(); window.meetingAssistant.openTranscript('${transcript.id}')">👁️ View</button>
                            <button class="action-btn delete-btn" onclick="event.stopPropagation(); window.meetingAssistant.deleteTranscript('${transcript.id}')">🗑️</button>
                        </div>
                    </div>
                    <div class="transcript-preview" onclick="window.meetingAssistant.openTranscript('${transcript.id}')">${preview}</div>
                </div>
            `;
        }).join('');
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
            // Open transcript in a new tab
            chrome.tabs.create({
                url: chrome.runtime.getURL('transcript.html') + '?id=' + id
            });
        }
    }
    
    async shareTranscript(id) {
        const transcript = this.transcripts.find(t => t.id === id);
        if (!transcript) {
            alert('Transcript not found');
            return;
        }
        
        try {
            // Create a shareable text format
            const date = new Date(transcript.date);
            const shareText = `Meeting Transcript - ${date.toLocaleDateString()}\n\n${transcript.text}`;
            
            if (navigator.share) {
                // Use Web Share API if available
                await navigator.share({
                    title: `Meeting Transcript - ${date.toLocaleDateString()}`,
                    text: shareText
                });
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(shareText);
                
                // Show feedback
                const shareBtn = event.target;
                const originalText = shareBtn.innerHTML;
                shareBtn.innerHTML = '✅ Copied!';
                shareBtn.style.background = 'rgba(76, 175, 80, 1)';
                
                setTimeout(() => {
                    shareBtn.innerHTML = originalText;
                    shareBtn.style.background = 'rgba(76, 175, 80, 0.8)';
                }, 2000);
            }
        } catch (error) {
            console.error('Error sharing transcript:', error);
            
            // Fallback: show share options
            this.showShareOptions(transcript);
        }
    }
    
    showShareOptions(transcript) {
        const date = new Date(transcript.date);
        const shareText = `Meeting Transcript - ${date.toLocaleDateString()}\n\n${transcript.text}`;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            border-radius: 15px;
            padding: 30px;
            max-width: 400px;
            width: 90%;
            text-align: center;
        `;
        
        content.innerHTML = `
            <h3 style="margin-top: 0; color: #333;">Share Transcript</h3>
            <p style="color: #666; margin-bottom: 20px;">Choose how you'd like to share this transcript:</p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
                <button onclick="window.meetingAssistant.copyTranscript('${transcript.id}')" style="padding: 10px 15px; border: none; border-radius: 8px; background: #667eea; color: white; cursor: pointer;">📋 Copy Text</button>
                <button onclick="window.meetingAssistant.emailTranscript('${transcript.id}')" style="padding: 10px 15px; border: none; border-radius: 8px; background: #28a745; color: white; cursor: pointer;">✉️ Email</button>
                <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="padding: 10px 15px; border: none; border-radius: 8px; background: #6c757d; color: white; cursor: pointer;">Cancel</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    async copyTranscript(id) {
        const transcript = this.transcripts.find(t => t.id === id);
        if (transcript) {
            const date = new Date(transcript.date);
            const shareText = `Meeting Transcript - ${date.toLocaleDateString()}\n\n${transcript.text}`;
            
            try {
                await navigator.clipboard.writeText(shareText);
                alert('Transcript copied to clipboard!');
            } catch (error) {
                console.error('Error copying:', error);
                alert('Failed to copy transcript');
            }
        }
        
        // Close modal
        const modal = document.querySelector('[style*="position: fixed"]');
        if (modal) modal.remove();
    }
    
    emailTranscript(id) {
        const transcript = this.transcripts.find(t => t.id === id);
        if (transcript) {
            const date = new Date(transcript.date);
            const subject = encodeURIComponent(`Meeting Transcript - ${date.toLocaleDateString()}`);
            const body = encodeURIComponent(`Meeting Transcript from ${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n\n${transcript.text}`);
            
            window.open(`mailto:?subject=${subject}&body=${body}`);
        }
        
        // Close modal
        const modal = document.querySelector('[style*="position: fixed"]');
        if (modal) modal.remove();
    }
    
    async deleteTranscript(id) {
        if (!confirm('Are you sure you want to delete this transcript? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'deleteTranscript',
                id: id
            });
            
            if (response.success) {
                // Remove from local array
                this.transcripts = this.transcripts.filter(t => t.id !== id);
                this.displayTranscripts(this.transcripts);
                
                // Show brief success message
                const status = document.createElement('div');
                status.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #28a745;
                    color: white;
                    padding: 10px 15px;
                    border-radius: 8px;
                    z-index: 10000;
                `;
                status.textContent = 'Transcript deleted';
                document.body.appendChild(status);
                
                setTimeout(() => {
                    status.remove();
                }, 3000);
            } else {
                throw new Error(response.error || 'Failed to delete transcript');
            }
        } catch (error) {
            console.error('Error deleting transcript:', error);
            alert('Failed to delete transcript: ' + error.message);
        }
    }
}

// Initialize the app when popup loads
document.addEventListener('DOMContentLoaded', () => {
    window.meetingAssistant = new MeetingAssistant();
});
