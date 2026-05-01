# Waiter Mobile

A React Native (Expo) companion app for the Waiter POS desktop system. Waiters use this on their phones/tablets to take orders, view live table status, and punch orders directly to the kitchen — all over the local Wi-Fi network.

---

## How It Works

```
Phone (Expo Go)  ──Wi-Fi──>  Desktop PC (POS_App running on port 3000)
```

The desktop Electron app runs a built-in Express server on port 3000. This mobile app connects to it, fetches the menu and table statuses, and sends orders back. The desktop table map updates in real time when an order is punched.

---

## Requirements

### On the Desktop PC

- The **POS_App** must be running (`npm run dev` inside `POS_App/`)
- The PC and phone must be on the **same Wi-Fi network**
- **Port 3000** must be open in the firewall

  **Linux:** Usually open by default.

  **Windows:** Go to *Windows Defender Firewall → Advanced Settings → Inbound Rules → New Rule → Port → TCP → 3000 → Allow*.

### On Your Phone / Tablet

- **Android:** Install [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) from the Play Store
- **iOS:** Install [Expo Go](https://apps.apple.com/app/expo-go/id982107779) from the App Store

### On the Development Machine

| Requirement | Version |
|---|---|
| Node.js | v18+ (v20+ recommended) |
| npm | v8+ |

---

## Installation

```bash
# From the waiter-mobile folder
npm install
```

All dependencies are declared in `package.json`. The key packages are:

| Package | Purpose |
|---|---|
| `expo` ~54 | Expo SDK and CLI |
| `react-native` 0.81 | React Native framework |
| `@react-navigation/native` | Screen navigation |
| `@react-navigation/native-stack` | Stack navigator |
| `react-native-screens` | Native screen optimization |
| `react-native-safe-area-context` | Safe area handling (notch, etc.) |
| `zustand` | State management |
| `axios` | HTTP requests to the desktop server |
| `nativewind` + `tailwindcss` | Tailwind CSS styling for React Native |
| `react-native-reanimated` | Animation support |

---

## Running the App

### Step 1 — Start the Desktop POS first

```bash
# In the POS_App folder
npm run dev
```

You should see this line in the terminal:
```
[SERVER] Express API running on port 3000
```

### Step 2 — Find your PC's IP address

**Linux / Mac:**
```bash
ip addr show   # Look for 192.168.x.x under your Wi-Fi interface
# OR
hostname -I
```

**Windows:**
```
ipconfig       # Look for "IPv4 Address" under your Wi-Fi adapter
```

### Step 3 — Start Expo

```bash
cd waiter-mobile
npx expo start
```

A QR code will appear in the terminal.

### Step 4 — Open on your device

- **Android:** Open **Expo Go** → tap **Scan QR Code** → scan the QR
- **iPhone/iPad:** Open the **Camera app** → scan the QR → tap the Expo link

### Step 5 — Connect to the desktop

On the Connect screen that opens, type your PC's IP address (e.g. `192.168.1.15`) and tap **Connect**.

---

## Using the App

1. **Connect Screen** — Enter the desktop PC's IP address and tap Connect
2. **Tables Screen** — See all 10 tables with live status and running order totals. Pull down to refresh
3. **Menu Screen** — Select a table to open the menu:
   - The **"Already Ordered"** panel (yellow) shows items already on the table's open order
   - Browse categories using the tabs at the top
   - Tap **+** to add items to your cart, **−** to remove
   - Add optional special instructions
   - Tap **PUNCH ORDER** (red button) to send to the kitchen
   - If the table already has an open order, new items are **merged in** — the kitchen only prints the newly added items
4. After punching, you're returned to the Tables screen which auto-refreshes

---

## Project Structure

```
waiter-mobile/
├── App.js                        # Navigation stack (Connect → Tables → Menu)
├── babel.config.js               # Babel config with NativeWind plugin
├── tailwind.config.js            # Tailwind content paths
├── package.json
└── src/
    ├── api.js                    # Axios wrapper for all server calls
    ├── store/
    │   └── useAppStore.js        # Zustand store (state + actions)
    └── screens/
        ├── ConnectScreen.jsx     # IP input + connect
        ├── TableSelectScreen.jsx # Table grid with status + order summary
        └── MenuScreen.jsx        # Category tabs + item grid + punch button
```

---

## API Endpoints (provided by POS_App)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/menu` | All menu items |
| `GET` | `/api/tables` | All tables with embedded current order |
| `GET` | `/api/tables/:id/order` | Full open order for a specific table |
| `POST` | `/api/order` | Punch an order (create or append) |

### POST /api/order body

```json
{
  "tableId": 1,
  "items": [
    { "id": 1, "name": "Samosa", "price": 110, "qty": 2 },
    { "id": 26, "name": "Chai", "price": 65, "qty": 1 }
  ],
  "specialInstructions": "Extra spicy"
}
```

### Response

```json
{ "success": true, "orderId": 5, "isNew": true }
```

`isNew: true` means a fresh order was created. `isNew: false` means items were added to an existing open order.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Cannot reach server" on Connect screen | Check PC IP is correct, both devices on same Wi-Fi, POS_App is running, port 3000 is not blocked |
| QR code doesn't load on phone | Make sure phone and PC are on the same Wi-Fi — Expo needs LAN access |
| Tables show but menu is empty | Verify the desktop DB has menu items (run `./start.sh --fresh` to re-seed) |
| Order punched but table doesn't update on desktop | Desktop auto-refreshes via IPC — check the browser console for errors |
| App crashes on startup | Run `npx expo start --clear` to clear the Metro cache |
