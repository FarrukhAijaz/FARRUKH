# Waiter POS

A desktop-based Restaurant Order Management System built with **Electron**, **React**, **Tailwind CSS**, and **SQLite (lowdb)**. Handles real-time table statuses, menu management, and automated kitchen printing — fully offline, no server required.

---

## Screenshots

| Table Map | Order View |
|---|---|
| 10 color-coded table tiles with live status | Menu grid + order sidebar with Punch / Bill / Checkout |

---

## Features

- **Table Map** — 5 status states: Empty → Active → In Progress → Served → Waiting for Payment
- **Menu Grid** — Category-filtered food tiles with `+` / `−` quantity controls
- **Order Sidebar** — Running totals, special instructions, action buttons
- **Punch → Kitchen** — Sends order to printer (mock logs to console; real mode uses thermal printer)
- **Interim Bill** — Prints pre-checkout receipt
- **Checkout** — Finalises payment, resets table
- **Offline-first** — All data stored locally in a JSON file via `lowdb`
- **Thermal Printer** — Configurable USB/Serial or Network TCP/IP via `node-thermal-printer`

---

## Requirements (Fresh Install)

### System

| Requirement | Minimum Version | Notes |
|---|---|---|
| **Node.js** | v18.x LTS | [nodejs.org](https://nodejs.org) — v20+ recommended for best compatibility |
| **npm** | v8+ | Bundled with Node.js |
| **Git** | any | To clone the repo |

### Windows — additional build tools (needed only if packaging from source)

```powershell
# Run as Administrator
npm install -g windows-build-tools
# OR install Visual Studio Build Tools manually from:
# https://visualstudio.microsoft.com/visual-cpp-build-tools/
```

### Linux — additional packages

```bash
# Ubuntu / Debian
sudo apt install -y build-essential libx11-dev libxkbfile-dev libsecret-1-dev fakeroot rpm

# Fedora / RHEL
sudo dnf install -y make gcc gcc-c++ libX11-devel libxkbfile-devel libsecret-devel rpm-build
```

> These are only required when **building the package** (`npm run build:linux`).  
> For development (`npm run dev`) you just need Node.js.

---

## Installation (Development)

```bash
# 1. Clone the repository
git clone <repo-url> waiter-pos
cd waiter-pos

# 2. Install dependencies
npm install

# 3. Start the development app (with hot-reload)
npm run dev
```

The Electron window opens maximised. The database (`waiter-pos-db.json`) is created automatically on first launch in your OS user-data directory:

| OS | Location |
|---|---|
| Windows | `%APPDATA%\waiter-pos\waiter-pos-db.json` |
| Linux | `~/.config/waiter-pos/waiter-pos-db.json` |
| macOS | `~/Library/Application Support/waiter-pos/waiter-pos-db.json` |

To reset the database (re-seed tables and menu), delete that file and restart the app.

---

## Printer Configuration

By default the app runs in **mock mode** — every Punch and Interim Bill prints a formatted receipt to the terminal console. No hardware needed.

To connect a real thermal printer, edit the settings in the database file or expose a Settings screen:

| Key | Default | Description |
|---|---|---|
| `printer_mock` | `true` | Set to `false` to use real printer |
| `printer_type` | `network` | `network` (TCP/IP) or `usb` |
| `printer_interface` | `192.168.1.100:9100` | IP:port for network, or `/dev/usb/lp0` for USB |

Supported printer protocol: **EPSON ESC/POS** (most thermal printers).

---

## Packaging for Distribution

### Build for all platforms

```bash
# Windows — produces a .exe NSIS installer
npm run build:win

# Linux — produces .AppImage, .deb, and .snap
npm run build:linux

# macOS — produces a .dmg
npm run build:mac
```

> **Cross-compilation note:** You can only build for your current OS natively.  
> To build Windows installers from Linux, use a Windows CI runner (e.g. GitHub Actions with `windows-latest`).

---

### Windows installer

```bash
npm run build:win
```

Output: `dist/waiter-pos-1.0.0-setup.exe`

- Creates a desktop shortcut automatically
- Includes an uninstaller via Add/Remove Programs
- Silent install: `waiter-pos-1.0.0-setup.exe /S`

**Windows system requirements for end users:**
- Windows 10 or later (64-bit)
- No additional runtime required — Electron bundles its own Node.js

---

### Linux packages

```bash
npm run build:linux
```

Output files in `dist/`:

| File | Format | Install command |
|---|---|---|
| `waiter-pos-1.0.0.AppImage` | Portable — no install needed | `chmod +x waiter-pos-*.AppImage && ./waiter-pos-*.AppImage` |
| `waiter-pos_1.0.0_amd64.deb` | Debian/Ubuntu package | `sudo dpkg -i waiter-pos_*.deb` |
| `waiter-pos-1.0.0.x86_64.snap` | Snap package | `sudo snap install waiter-pos_*.snap --dangerous` |

**Recommended for most Linux users:** use the `.AppImage` — it runs on any modern x86-64 Linux distro with no install step.

**Linux system requirements for end users:**
- Ubuntu 18.04+ / Fedora 30+ / Debian 10+ (or equivalent glibc ≥ 2.17)
- No additional runtime required

---

## Project Structure

```
waiter-pos/
├── src/
│   ├── main/                    # Electron main process (Node.js)
│   │   ├── index.js             # App entry, window creation
│   │   ├── db/                  # lowdb JSON database + seeds
│   │   ├── ipc/                 # IPC handlers (tables, menu, orders, printer)
│   │   └── services/
│   │       └── printerService.js  # Mock + real thermal printer
│   ├── preload/
│   │   └── index.js             # contextBridge API bridge (window.api)
│   └── renderer/src/            # React frontend
│       ├── App.jsx              # View-switcher shell
│       ├── store/               # Zustand state (tables, menu, orders)
│       └── components/
│           ├── TableMap/        # Table grid + status tiles
│           ├── MenuGrid/        # Food tiles + category filter
│           ├── OrderSidebar/    # Order list + action buttons
│           └── Layout/          # OrderView layout
├── tailwind.config.js
├── electron.vite.config.mjs
├── electron-builder.yml         # Packaging config
└── package.json
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 39 |
| Frontend | React 19, Tailwind CSS 3 |
| State management | Zustand |
| Local database | lowdb 1 (JSON file, no native binaries) |
| Icons | Lucide React |
| Bundler | electron-vite (Vite 5) |
| Packaging | electron-builder |
| Printer | node-thermal-printer (ESC/POS) |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start in development mode with HMR |
| `npm run build` | Compile all processes (main + preload + renderer) |
| `npm run build:win` | Build + package Windows `.exe` installer |
| `npm run build:linux` | Build + package Linux AppImage / deb / snap |
| `npm run build:mac` | Build + package macOS `.dmg` |
| `npm run start` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
