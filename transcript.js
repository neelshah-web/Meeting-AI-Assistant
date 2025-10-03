class TranscriptViewer {
    constructor() {
        this.transcript = null;
        this.originalText = '';
        
        this.initializeElements();
        this.loadTranscript();
        this.setupEventListeners();
    }
    
    initializeElements() {
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.transcriptText = document.getElementById('transcriptText');
        this.transcriptDate = document.getElementById('transcriptDate');
        this.searchBox = document.getElementById('searchBox');
        this.copyBtn = document.getElementById('copyBtn');
        this.shareBtn = document.getElementById('shareBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.deleteBtn = document.getElementById('deleteBtn');
        this.stats = document.getElementById('stats');
        this.wordCount = document.getElementById('wordCount');
        this.charCount = document.getElementById('charCount');
        this.readTime = document.getElementById('readTime');
    }
    
    setupEventListeners() {
        this.searchBox.addEventListener('input', (e) => this.searchText(e.target.value));
        this.copyBtn.addEventListener('click', () => this.copyTranscript());
        this.shareBtn.addEventListener('click', () => this.shareTranscript());
        this.exportBtn.addEventListener('click', () => this.exportTranscript());
        this.deleteBtn.addEventListener('click', () => this.deleteTranscript());
    }
    
    async loadTranscript() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const transcriptId = urlParams.get('id');
            
            if (!transcriptId) {
                throw new Error('No transcript ID provided');
            }
            
            // Get transcript from background script
            const response = await chrome.runtime.sendMessage({
                action: 'getTranscript',
                id: transcriptId
            });
            
            if (!response.success || !response.transcript) {
                throw new Error('Transcript not found');
            }
            
            this.transcript = response.transcript;
            this.originalText = this.transcript.text;
            this.displayTranscript();
            
        } catch (error) {
            console.error('Error loading transcript:', error);
            this.showError(error.message);
        }
    }
    
    displayTranscript() {
        // Hide loading, show content
        this.loading.style.display = 'none';
        this.transcriptText.style.display = 'block';
        this.stats.style.display = 'flex';
        
        // Set date
        const date = new Date(this.transcript.date);
        this.transcriptDate.textContent = date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
        
        // Set transcript text
        this.transcriptText.textContent = this.originalText;
        
        // Update stats
        this.updateStats();
    }
    
    updateStats() {
        const text = this.originalText;
        const words = text.trim().split(/\s+/).length;
        const chars = text.length;
        const readTime = Math.ceil(words / 200); // Average reading speed
        
        this.wordCount.textContent = words.toLocaleString();
        this.charCount.textContent = chars.toLocaleString();
        this.readTime.textContent = readTime;
    }
    
    searchText(query) {
        if (!query.trim()) {
            this.transcriptText.innerHTML = this.escapeHtml(this.originalText);
            return;
        }
        
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        const highlightedText = this.originalText.replace(regex, '<span class="highlight">$1</span>');
        this.transcriptText.innerHTML = highlightedText;
        
        // Scroll to first match
        const firstMatch = this.transcriptText.querySelector('.highlight');
        if (firstMatch) {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    async copyTranscript() {
        try {
            await navigator.clipboard.writeText(this.originalText);
            
            // Show feedback
            const originalText = this.copyBtn.textContent;
            this.copyBtn.textContent = '✅ Copied!';
            this.copyBtn.style.background = '#28a745';
            
            setTimeout(() => {
                this.copyBtn.textContent = originalText;
                this.copyBtn.style.background = '#667eea';
            }, 2000);
            
        } catch (error) {
            console.error('Error copying transcript:', error);
            alert('Failed to copy transcript');
        }
    }
    
    async shareTranscript() {
        try {
            const date = new Date(this.transcript.date);
            const shareText = `Meeting Transcript - ${date.toLocaleDateString()}\n\n${this.originalText}`;
            
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
                const originalText = this.shareBtn.textContent;
                this.shareBtn.textContent = '✅ Copied!';
                this.shareBtn.style.background = '#28a745';
                
                setTimeout(() => {
                    this.shareBtn.textContent = originalText;
                    this.shareBtn.style.background = '#667eea';
                }, 2000);
            }
        } catch (error) {
            console.error('Error sharing transcript:', error);
            
            // Show share options modal
            this.showShareOptions();
        }
    }
    
    showShareOptions() {
        const date = new Date(this.transcript.date);
        const shareText = `Meeting Transcript - ${date.toLocaleDateString()}\n\n${this.originalText}`;
        
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
                <button onclick="window.transcriptViewer.copyToClipboard()" style="padding: 10px 15px; border: none; border-radius: 8px; background: #667eea; color: white; cursor: pointer;">📋 Copy Text</button>
                <button onclick="window.transcriptViewer.emailTranscript()" style="padding: 10px 15px; border: none; border-radius: 8px; background: #28a745; color: white; cursor: pointer;">✉️ Email</button>
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
    
    async copyToClipboard() {
        const date = new Date(this.transcript.date);
        const shareText = `Meeting Transcript - ${date.toLocaleDateString()}\n\n${this.originalText}`;
        
        try {
            await navigator.clipboard.writeText(shareText);
            alert('Transcript copied to clipboard!');
        } catch (error) {
            console.error('Error copying:', error);
            alert('Failed to copy transcript');
        }
        
        // Close modal
        const modal = document.querySelector('[style*="position: fixed"]');
        if (modal) modal.remove();
    }
    
    emailTranscript() {
        const date = new Date(this.transcript.date);
        const subject = encodeURIComponent(`Meeting Transcript - ${date.toLocaleDateString()}`);
        const body = encodeURIComponent(`Meeting Transcript from ${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n\n${this.originalText}`);
        
        window.open(`mailto:?subject=${subject}&body=${body}`);
        
        // Close modal
        const modal = document.querySelector('[style*="position: fixed"]');
        if (modal) modal.remove();
    }
    
    exportTranscript() {
        const date = new Date(this.transcript.date);
        const filename = `transcript_${date.toISOString().split('T')[0]}_${this.transcript.id}.txt`;
        
        const content = `Meeting Transcript
Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
Duration: ${this.wordCount.textContent} words

${this.originalText}`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    async deleteTranscript() {
        if (!confirm('Are you sure you want to delete this transcript? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'deleteTranscript',
                id: this.transcript.id
            });
            
            if (response.success) {
                alert('Transcript deleted successfully');
                window.close();
            } else {
                throw new Error(response.error || 'Failed to delete transcript');
            }
            
        } catch (error) {
            console.error('Error deleting transcript:', error);
            alert('Failed to delete transcript: ' + error.message);
        }
    }
    
    showError(message) {
        this.loading.style.display = 'none';
        this.error.style.display = 'block';
        this.error.innerHTML = `<div>Error: ${message}</div>`;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.transcriptViewer = new TranscriptViewer();
});
