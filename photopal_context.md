
# PhotoPal Application Context

## 1. Overview
PhotoPal is a React-based high-performance "Digital Curator"—a system that transforms vast, unorganized media archives into immersive human stories. It uses private, hardware-accelerated AI to discover identities, scenes, and adventures while ensuring total data sovereignty.

## 2. Technology Stack & Data Tier
*   **Philosophy:** Private-by-design. Zero Data Egress.
*   **Kernel:** Centurion v5.1.8. Implements FileSystemHandle virtualization and a background LOD (Level of Detail) pipeline.
*   **Persistence (Data Tier):**
    *   **IndexedDB:** Primary cache for biometric vectors and semantic journals.
    *   **LOD Cache:** Persistent 256px thumbnails stored in local storage to eliminate I/O lag during grid navigation.
*   **AI/ML Strategy:**
    *   **Offline Core:** `face-api.js` for biometric clustering and identity resolution.
    *   **Heuristic Engine:** Heuristic geocoding and temporal repair.
    *   **Semantic Escalation:** Google Gemini (`gemini-3-flash-preview`) for natural language intent and deep semantic synthesis.

## 3. Core Concepts
*   **Universal Link:** Support for Local Disk, Google Takeout, Facebook Data, and generative web memories.
*   **Forensic Reconstruction:** Automatic repair of broken dates/locations using neighbor interpolation.
*   **LOD Handshake:** A background pre-caching mechanism that optimizes the library for instant visual scrolling.
*   **PDX (PhotoPal Data Exchange):** A portable blueprint protocol (v2.2) for moving intelligence between machines.

## 4. Privacy Protocol
PhotoPal operates on a "Strict Local" basis. All folder scanning, biometric clustering, and heuristic geocoding are executed on the user's hardware. Remote API calls (Gemini) are strictly opt-in.
