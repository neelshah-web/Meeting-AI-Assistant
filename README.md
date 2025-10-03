# 🎤 Meeting AI Assistant Chrome Extension

A powerful Chrome extension that records meetings with **live transcription**, handles speech breaks automatically, and provides searchable transcript storage.

## ✨ Key Features

- 🎤 **Live Speech-to-Text**: Real-time transcription as you speak
- 🔄 **Handles Speech Breaks**: Continues recording even during pauses
- 🌐 **Works Everywhere**: Floating button on ALL websites
- 💾 **Local Storage**: All transcripts saved locally (private & secure)
- 🔍 **Search Transcripts**: Find any past conversation instantly
- 📱 **Compact Interface**: Everything in one popup window
- 🎯 **Draggable Button**: Position anywhere on screen
- 📋 **Export Options**: Copy or download transcripts

## 🚀 Quick Installation

1. **Download** all extension files to a folder
2. **Open Chrome** → go to `chrome://extensions/`
3. **Enable "Developer mode"** (top right toggle)
4. **Click "Load unpacked"** → select your folder
5. **Grant microphone permission** when prompted

**📖 Detailed instructions:** See [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)

## 🎯 How to Use

### 1. Find the Floating Button
- Look for the 🎤 button on any website (top-right corner)
- **Drag it** to your preferred position
- **Hover** to see platform info and instructions

### 2. Start Recording
- **Click the floating button** OR extension icon
- **Click "Start Recording"**
- **Grant microphone permission** if asked
- **See live transcription** appear in real-time

### 3. During Recording
- ✅ **Live transcript** shows your speech in real-time
- ✅ **Timer** displays recording duration  
- ✅ **Handles speech breaks** automatically
- ✅ **Continues** even during long pauses

### 4. Stop & Save
- **Click "Stop Recording"**
- **Complete transcript** appears
- **Automatically saved** to your history
- **Search** through all saved transcripts

## 🌐 Works Everywhere

- ✅ **All websites** (Google, YouTube, any site)
- ✅ **Meeting platforms** (Zoom, Teams, Meet, Webex)
- ✅ **Survives page navigation** and tab switching
- ✅ **Remembers button position** across sessions

## 🔧 Technical Details

### Speech Recognition
- **Uses browser's built-in Web Speech API** (free & private)
- **Real-time transcription** with continuous listening
- **Automatic restart** after speech breaks or errors
- **Works offline** once page is loaded

### Storage & Privacy
- ✅ **100% Local Storage** - All transcripts saved in Chrome storage
- ✅ **No external servers** - Everything processed locally
- ✅ **No data collection** - Complete privacy
- ✅ **No API costs** - Uses free browser speech recognition

### Compatibility
- ✅ **Chrome/Chromium browsers** (recommended)
- ✅ **Edge browser** (Chromium-based)
- ✅ **All operating systems** (Windows, Mac, Linux)
- ✅ **All websites** - No restrictions

## 📁 Extension Files

```
meeting_ai/
├── manifest.json          # Extension configuration
├── popup.html             # Main recording interface
├── popup.js               # Recording & speech recognition logic
├── content.js             # Floating button & page integration
├── background.js          # Extension service worker
├── transcript.html        # Transcript viewer page
├── transcript.js          # Transcript viewer functionality
├── test.html              # Testing & diagnostic page
├── README.md              # This guide
└── INSTALLATION_GUIDE.md  # Detailed setup instructions
```

## 🔒 Permissions

- **activeTab**: Detect meeting platforms
- **storage**: Save transcripts locally
- **scripting**: Add floating button to pages
- **tabs**: Open recording interface

## 🐛 Troubleshooting

### Floating Button Missing
1. **Refresh page** (Ctrl+R)
2. **Wait 10 seconds** (auto-adds periodically)
3. **Check different website**
4. **Reload extension** in chrome://extensions/

### Recording Issues
1. **Grant microphone permission**
2. **Close other apps** using microphone
3. **Speak clearly** in quiet environment
4. **Check browser console** (F12) for errors

### Speech Recognition Problems
1. **Use Chrome browser** (works best)
2. **Check internet connection**
3. **Reduce background noise**
4. **Try refreshing the page**

## 🎯 Ready to Use!

Your extension is now complete and ready to install! 

**Next Steps:**
1. Follow the installation guide
2. Test on different websites
3. Start recording your meetings
4. Enjoy live transcription! 🎉

---

**Made with ❤️ for better meeting productivity**
