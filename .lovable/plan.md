

# 🔐 NFC Crypto Vault

A simple, offline-capable Android web app that encrypts text and stores it on NFC tags, with biometric or password-based authentication.

## Core Features

### 1. Installable Offline App (PWA)
The app will be a Progressive Web App that installs to your Android home screen and works fully offline — no internet needed after the first visit.

### 2. Encrypt & Write to NFC
- Type or paste text you want to secure
- Authenticate with your fingerprint or a password
- The app encrypts the text using AES-256-GCM (top-tier encryption)
- Tap your phone to an NFC tag to write the encrypted data

### 3. Read & Decrypt from NFC
- Tap your phone to an NFC tag to read encrypted data
- Authenticate with fingerprint or password to decrypt
- View the original text

### 4. Authentication Options
- **Biometric (fingerprint/face)** — uses the Web Authentication API to verify your identity
- **Password fallback** — enter a password that's used to derive the encryption key

## Pages & Flow

### Home Screen
- Clean, modern landing with two big action buttons: **"Encrypt & Write"** and **"Read & Decrypt"**
- App name and lock icon branding

### Encrypt & Write Flow
1. Enter text to encrypt
2. Choose auth method (biometric or password)
3. Authenticate
4. Hold phone to NFC tag → data written
5. Success confirmation

### Read & Decrypt Flow
1. Hold phone to NFC tag → data read
2. Choose auth method (biometric or password)
3. Authenticate
4. Decrypted text displayed
5. Option to copy to clipboard

## Design
- Modern, clean light theme with subtle blue/indigo accents
- Large touch-friendly buttons optimized for one-handed use
- Clear status indicators (scanning, writing, success, error)
- Smooth transitions between steps

## Technical Notes
- All encryption happens locally on your device — nothing is sent to any server
- Uses the Web Crypto API (AES-256-GCM) built into the browser
- Web NFC API for reading/writing NFC tags (Android Chrome)
- No backend or database needed — fully client-side

