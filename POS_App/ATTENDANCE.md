# Attendance System — User Guide

This document explains how to use the anti-cheat attendance system built into the POS app. It is split into two sections: one for **managers** and one for **staff members**.

---

## Table of Contents

1. [How It Works (Overview)](#how-it-works)
2. [Default Staff & PINs](#default-staff--pins)
3. [Manager Guide](#manager-guide)
   - [Opening the Attendance Screen](#opening-the-attendance-screen)
   - [Enrolling a Staff Member's Phone](#enrolling-a-staff-members-phone)
   - [Daily Check-In: Generating a QR Code](#daily-check-in-generating-a-qr-code)
   - [Manual Override (Late / Forgot to Check In)](#manual-override)
   - [Reading the Audit Trail](#reading-the-audit-trail)
   - [Adding a New Staff Member](#adding-a-new-staff-member)
   - [Dev / Reset Tools](#dev--reset-tools)
4. [Staff Guide (Non-Manager)](#staff-guide-non-manager)
   - [First Time: Enrolling Your Phone](#first-time-enrolling-your-phone)
   - [Every Day: Checking In](#every-day-checking-in)
   - [End of Shift: Checking Out](#end-of-shift-checking-out)
5. [Why You Cannot Cheat](#why-you-cannot-cheat)
6. [Troubleshooting](#troubleshooting)

---

## How It Works

```
Manager generates QR on POS screen
        ↓
Staff scans QR on their enrolled phone
        ↓
Staff enters their personal PIN on their phone
        ↓
System records check-in (time, device, IP logged)
```

- Every QR code is **one-time use** and expires in **45 seconds**.
- Only the **enrolled phone** of each staff member can use the code.
- Check-in only works when the phone is connected to the **same Wi-Fi** as the POS machine.
- The manager never has to touch the staff member's phone.

---

## Default Staff & PINs

These five staff members are pre-loaded in the system. **Change the PINs after the first use.**

| Name   | Role    | PIN  |
|--------|---------|------|
| Ahmed  | Manager | 1234 |
| Ali    | Waiter  | 2222 |
| Sara   | Cashier | 3333 |
| Umar   | Waiter  | 4444 |
| Fatima | Kitchen | 5555 |

> Ahmed is the only manager by default. Only managers can generate challenges and do manual overrides.

---

## Manager Guide

### Opening the Attendance Screen

1. Open the POS app on the desktop computer.
2. Click the **Settings** button (gear icon, bottom-left of the screen).
3. The **Attendance Admin** screen will open.

You will see:
- **Today's Staff Board** — check-in/out status for all staff today.
- **Recent Audit** — last 20 attendance events with timestamps and device info.
- **QR Challenge Panel** — generate a one-time QR code for check-in/out.
- **Add Staff** form — create new staff members.
- **Dev Tools** — reset buttons for testing (not for daily use).

---

### Enrolling a Staff Member's Phone

Enrollment links a specific phone to a specific staff member. It must be done **once per phone, with the manager present**.

**On the POS screen (Attendance Admin):**
1. Note the **Phone URL** shown at the top of the QR panel — it looks like:
   ```
   http://192.168.1.X:3000/attendance/
   ```
2. Tell the staff member to open that URL on their phone's browser.

**On the staff member's phone:**
1. Open the URL in the browser.
2. Tap the **Enroll** tab.
3. Enter the staff member's **name** (must match exactly as registered).
4. Enter the **Manager PIN** (Ahmed's PIN: `1234`).
5. Tap **Enroll This Device**.
6. The phone will show a **Device Token** (a long string of letters and numbers).
7. **Screenshot or copy this token** — it is shown only once. The phone is now enrolled.

> If enrollment is successful, the phone is bound to that staff member. Nobody else's code will work on this phone.

---

### Daily Check-In: Generating a QR Code

Do this every morning (or whenever a staff member needs to check in or out).

1. Go to **Attendance Admin** on the POS screen.
2. In the **QR Challenge** panel, select the staff member from the dropdown.
3. Select the action: **Check In** or **Check Out**.
4. Click **Generate QR Code**.
5. A QR code appears on screen. It is valid for **45 seconds**.
6. Ask the staff member to scan it with their enrolled phone.

The staff member will then enter their PIN on their phone and tap Submit. The POS screen will show the result.

---

### Manual Override

Use this when a staff member forgot to check in, or there is a technical issue.

1. Go to **Attendance Admin**.
2. In the **Manual Entry** section, select the staff member.
3. Select the action (Check In or Check Out).
4. Enter the correct time if needed.
5. Enter your **Manager PIN**.
6. Click **Submit Manual Entry**.

All manual entries are flagged in the audit trail with the note `manual_override` so they can be reviewed later.

---

### Reading the Audit Trail

The **Recent Audit** section shows the last 20 events. Each row contains:

| Field      | Meaning                                         |
|------------|-------------------------------------------------|
| Staff      | Who checked in or out                           |
| Action     | `check_in` or `check_out`                       |
| Time       | Exact timestamp                                 |
| Device     | Short ID of the phone used                      |
| IP         | Network address the request came from           |
| Note       | `manual_override` if a manager entered it       |

---

### Adding a New Staff Member

1. Go to **Attendance Admin**.
2. Scroll to the **Add Staff** form.
3. Fill in:
   - **Full Name**
   - **Role** (e.g., Waiter, Cashier, Kitchen)
   - **PIN** (4–6 digits, staff member chooses this)
   - Check the **Manager** box if the new person is a manager
4. Click **Add Staff**.
5. After adding, follow the **Enrolling a Staff Member's Phone** steps above.

---

### Dev / Reset Tools

> These are for setup and testing only. Do not use during normal operations.

- **Reset All Staff** — deletes all staff records and re-seeds the 5 default staff (Ahmed, Ali, Sara, Umar, Fatima).
- **Reset All Attendance** — clears all check-in/out history and audit records. Staff enrollments are kept.

---

## Staff Guide (Non-Manager)

### First Time: Enrolling Your Phone

You only do this once. Your manager must be present.

1. Make sure your phone is connected to the **restaurant's Wi-Fi** (same network as the POS machine).
2. Ask your manager for the **Phone URL**. It looks like:
   ```
   http://192.168.1.X:3000/attendance/
   ```
3. Open that URL in your phone's browser (Chrome or Safari work fine).
4. Tap the **Enroll** tab.
5. Type your **name** exactly as it is registered (your manager can confirm the spelling).
6. Your manager will type their **Manager PIN** into the field.
7. Tap **Enroll This Device**.
8. You will see a long **Device Token** on screen.
   - **Take a screenshot** or copy it somewhere safe.
   - You do not need to enter this token again, but keep it in case there is a problem.
9. Your phone is now registered. You are done with enrollment.

> Do not try to enroll on a second phone. Only your first enrolled phone will work for check-ins.

---

### Every Day: Checking In

Do this at the start of every shift.

1. Make sure your phone is on the **restaurant's Wi-Fi**.
2. Go to your manager and say you are ready to check in.
3. The manager will generate a **QR code** on the POS screen for you.
4. Open the attendance URL in your phone's browser:
   ```
   http://192.168.1.X:3000/attendance/
   ```
   *(You can bookmark this for quick access.)*
5. Tap the **Check In / Out** tab.
6. Scan the QR code — OR — if you can see the screen, the code is auto-filled. Just tap **Scan QR / Enter Code**.
7. Your name will appear. Enter your **PIN** and tap **Submit**.
8. You will see a confirmation: **"Check-in recorded"** with the time.

> The QR code expires in 45 seconds. If you miss it, ask the manager to generate a new one.

---

### End of Shift: Checking Out

The process is exactly the same as checking in.

1. Ask your manager to generate a QR code — this time for **Check Out**.
2. Scan it on your phone, enter your PIN, tap Submit.
3. You will see **"Check-out recorded"** with the time.

---

## Why You Cannot Cheat

The system has several layers of protection:

| Protection              | What it prevents                                              |
|-------------------------|---------------------------------------------------------------|
| Enrolled phone only     | A colleague cannot check in for you from their phone         |
| One-time QR code        | A screenshot of an old QR code will not work again           |
| 45-second expiry        | You cannot use a code someone else scanned earlier           |
| Same Wi-Fi required     | You must be physically inside the restaurant to check in     |
| PIN required            | Even if someone steals your phone, they need your PIN        |
| Immutable audit trail   | Every event is logged with time, device, and IP address      |
| Manual overrides flagged| Any correction made by a manager is clearly marked           |

---

## Troubleshooting

**"Device not enrolled" error on phone**
- The phone has not been enrolled yet. Ask the manager to enroll it (see Enrolling a Staff Member's Phone).

**"Challenge expired" error**
- The 45-second window passed. Ask the manager to generate a new QR code.

**"Challenge already used" error**
- Someone already submitted this QR code. Ask the manager for a new one.

**"Unauthorized device" error**
- You are using a different phone from the one that was enrolled. Use your original enrolled phone. If you changed phones, ask the manager to re-enroll the new device.

**"Wrong PIN" error**
- Double-check your PIN with your manager. PINs are case-sensitive digits only.

**Cannot open the phone URL**
- Make sure your phone is connected to the restaurant Wi-Fi, not mobile data.
- Ask the manager to confirm the correct IP address shown on the Attendance Admin screen — it may have changed if the router was restarted.

**QR code not showing on POS screen**
- Refresh the Attendance Admin screen and try generating again.
- If the problem persists, restart the POS app.

**Staff member does not appear in the dropdown**
- The staff member has not been added to the system. The manager must use the Add Staff form.

---

*For any issues not covered here, ask the manager to check the Recent Audit trail for details on what went wrong.*
