# Ishaara (इशारा) — Silent Seat-to-Conductor Transit Safety Prototype

> **A silent, inclusive transit safety system designed to protect women facing harassment on public buses.**  
> Built for college submission, viva presentation, and live demonstration.

---

## 🌟 The Core Problem & Philosophy
Existing "panic buttons" on public buses frequently fail because:
1. **Harassment escalates if detected:** Pressing a loud alarm or yelling alerts the harasser, provoking immediate retaliation or physical violence before help arrives.
2. **Social hesitation / Bystander effect:** Women often hesitate to cause a public scene or stop the entire bus for staring, stalking, or inappropriate touching.
3. **Digital divide:** Not all commuters have smartphones or active mobile data packages.

**Ishaara flips the paradigm:**
- **Silent Alert:** Only the conductor's handheld device vibrates with the passenger's exact seat zone (e.g., `R4C`).
- **Routine De-escalation:** Conductor responds under the guise of regular duty (routine ticket check, offering front seats) to halt harassment without singling out the victim.
- **Glance-Safe Disguise:** The passenger's smartphone disguises itself as a live transit timetable so nearby onlookers see nothing suspicious.
- **Inclusive Tri-Channel Access:** Supports smartphones (NFC / QR), basic ₹1,000 feature phones (SMS shortcode), and no-phone situations (the verbal *"Sakhi stop"* code phrase).
- **Privacy-by-Architecture (Zero-PII):** Depot console aggregates spatial and temporal hotspots without ever logging names, phone numbers, or facial biometrics.

---

## 🚀 Quick Start (1-Click Run)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm run dev
# or
npm start
```
The server will boot on `http://localhost:3000` and automatically detect your Wi-Fi LAN IP (e.g. `http://192.168.1.15:3000`), printing an ASCII QR code in your terminal.

---

## 📱 How to Run the Live College Demo

### Method A: All-in-One Trio Simulator (On Laptop)
Open:
```
http://localhost:3000
```
- Displays the **Passenger Phone**, **Conductor Device**, and **Depot Console** side-by-side.
- Actions taken on any screen synchronize across all screens in real time via Socket.IO!

---

### Method B: True Multi-Device Demo (Real Smartphone + Laptop)
1. Ensure your smartphone and laptop are connected to the **same Wi-Fi network**.
2. On your laptop, click **"Scan Phone QR"** in the top navigation bar (or look at the terminal QR code).
3. Scan the QR code with your smartphone camera.
4. Your smartphone will open directly into **Passenger Mode** for Seat `R4C`!
5. On your phone:
   - Choose a harassment type (or leave blank).
   - **Press and hold the button for 1 second** (prevents accidental taps).
   - Your phone will vibrate and immediately show the disguised transit timetable!
6. On your laptop:
   - The Conductor screen will vibrate/buzz with Seat `R4C` flashing red!
   - Follow the L1–L4 de-escalation protocol.
   - Click "I'm safe now" on your phone; the conductor and depot console update instantly!

---

## 🖨️ Printable Bus Seat Stickers (`/stickers`)
Click **"Seat Stickers"** in the top bar or visit:
```
http://localhost:3000/?view=stickers
```
- Generates high-resolution bus seat back stickers with Devnagari (`इशारा`) and English branding.
- Each sticker includes a **live QR code tailored to that specific seat zone** (`R4C`, `F1L`, `F2C`, etc.).
- Hit **"Print Stickers (Ctrl+P)"** to print onto standard A4 paper or sticker sheets. Stick them onto chairs in your college viva hall for an unforgettable interactive demonstration!

---

## 📡 The 3 Access Channels

| Channel | User Context | How It Works |
| :--- | :--- | :--- |
| **1. NFC / QR Web App** | Modern smartphone users | Touch phone to seat sticker (NFC) or scan QR. Zero app install needed. Uses 1-second press-and-hold and glance-safe timetable disguise. |
| **2. GSM SMS Shortcode** | ₹1,000 feature phone (no internet) | Text seat code e.g. `R4C 2` to shortcode `56161`. Conductor alerted instantly; passenger replies `OK` when safe. |
| **3. "Sakhi stop" Code Phrase** | Dead battery or no phone | Passenger asks conductor: *“भैया, सखी स्टॉप कब आएगा?”* ("When does Sakhi stop come?"). Conductor responds normally and logs her seat zone on his device. |

---

## 🛡️ Conductor 4-Step De-escalation Protocol

1. **L1 — Routine Ticket Check:** Conductor walks over and inspects tickets around her seat. Conductor presence alone halts ~70% of non-contact harassment without singling anyone out.
2. **L2 — Front Seat Offer:** Conductor announces: *“Madam, a vacant seat is available up front.”* Moves her to the reserved women's section without confrontation.
3. **L3 — Direct Suspect Inspection:** Conductor inspects the suspect's destination ticket and issues a firm warning that the vehicle is monitored.
4. **L4 — Police Escalation:** (Only if the passenger agrees) The driver halts at the nearest Nirbhaya squad or police post while live GPS coordinates stream to the depot.

---

## 📊 Depot Safety Intelligence & Zero-PII Guarantee
- **Real-Time KPIs:** Tracks 7-day incident volume, median response duration (avg ~1m 30s), resolution safety rate (>80%), and channel breakdown.
- **Spatial Hotspots:** Identifies top risk stretches (e.g. *Andheri Stn → Chakala*, *Kurla Depot → Saki Naka*).
- **Temporal Peaks:** 24-hour histogram highlights evening peak hours (18:00–21:00) to guide municipal deployment of Nirbhaya marshals.
- **Privacy by Architecture:** Zero passenger names, phone numbers, or facial recognition images are ever stored in the database.

---

## 📂 Project Structure
```
ishara/
├── server/
│   └── server.js          # Express + Socket.IO + LAN IP & QR generator + SMS gateway
├── src/
│   ├── App.jsx            # Multi-view coordinator & presentation dashboard
│   ├── main.jsx           # React entry point
│   ├── index.css          # Theme, device frames, animations, and print styles
│   ├── components/
│   │   ├── PassengerView.jsx         # NFC, 1s hold, SMS & phrase modes
│   │   ├── ConductorView.jsx         # Live bus layout, alert buzz, de-escalation steps
│   │   ├── DepotView.jsx             # Analytics, KPIs, hotspot bars & CSV export
│   │   ├── BusLayoutMap.jsx          # 2D bus seat grid (8 rows x 3 columns)
│   │   ├── GlanceTimetable.jsx       # Disguised timetable screen
│   │   ├── FeaturePhoneSimulator.jsx # Retro GSM SMS messenger
│   │   ├── PairingModal.jsx          # Wi-Fi pairing QR code drawer
│   │   └── StickerGenerator.jsx      # Printable A4 seat stickers
│   ├── constants/
│   │   └── busData.js     # Transit stops, seat codes, scripts, and 7-day dataset
│   └── utils/
│       └── socket.js      # Socket.IO client singleton
├── package.json
└── vite.config.js
```

---

## 👩‍💻 Credits & Presentation Notes
Developed as a civic transit innovation prototype for women commuters. Designed for public transport undertakings such as **BEST (Mumbai)**, **DTC (Delhi)**, and **BMTC (Bengaluru)**.
