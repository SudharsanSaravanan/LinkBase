# LinkBase

LinkBase is a private, lightweight, progressive web app (PWA) designed for offline-first personal link management. It features a clean monochromatic user interface with local storage, voice search, and voice dictation.

## Features

- Offline Support: Serves as a full Progressive Web App, utilizing IndexedDB for local database storage.
- Private Local Storage: All link data, collections, and configurations remain strictly stored on the user device.
- Voice Search: Simple microphone-triggered search query dictation from the top bar.
- Voice Dictation: Dedicated rounded microphone buttons next to input fields allow filling of link titles and descriptions using speech-to-text.
- Monochromatic Design System: High-contrast, clean theme switching (light and dark) utilizing pure black and white palettes.
- Data Portability: Supports exporting link collections to JSON backup formats or printing formatted PDF list views.
- Zero Dependencies: Built natively using pure vanilla JavaScript, CSS, and HTML.

## Getting Started

1. Serve the project files using a local web server (such as Live Server or http-server).
2. Load the address in any modern web browser.
3. Install the application to your desktop or mobile screen using the native PWA install prompt.

## File Structure

- index.html: Main UI structure and layouts.
- css/main.css: Custom monochromatic styles and layouts.
- js/db.js: IndexedDB wrapper for handling local storage.
- js/voice.js: Native Web Speech API wrapper for speech recognition.
- js/export.js: JSON and PDF exporter utility.
- js/app.js: Main application logic and UI lifecycle events.
- sw.js: Service Worker for offline asset caching.
