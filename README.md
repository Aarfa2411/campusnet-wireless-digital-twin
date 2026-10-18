# Wireless Network Digital Twin for Smart Campus — Enterprise Management System

A multi-page, light-theme Smart Campus Wireless Network Management System featuring a real-time digital twin, dynamic client radio simulation, access point fleet management, performance analytics, audit logging, and demo authentication.

> **Simulation Disclosure:**  
> **Simulation Mode:** All client locations, signal categories, traffic loads, and telemetry data are simulated for educational evaluation and system planning. No real Wi-Fi measurements are collected, and no connections to physical hardware routers are made.

**Live Demo** : https://campusnet-wireless-digital-twin.vercel.app/

---

## 1. System Overview & Architecture

The **CampusNet Wireless Digital Twin** is built as a complete, static, multi-page web application using **HTML5, CSS3, and Vanilla JavaScript**. It eliminates monolithic single-page dashboard constraints by offering dedicated functional views connected through a unified persistent sidebar and top navigation.

### Key Architectural Highlights
- **100% Static Deployment:** Compatible with any static web server, GitHub Pages, or local directory opening. Zero backend server or database dependencies.
- **Shared In-Memory & Storage State (`shared-state.js`):** `CampusState` provides a single source of truth across all pages. Changes made on one page (e.g. toggling an AP or adjusting capacity in AP Management) immediately propagate across all views and open browser tabs via browser `storage` events.
- **Client-Side Demo Authentication (`auth.js`):** Dedicated login experience supporting role-based demo profiles (Administrator and Network Operator) with session persistence and automatic protected-route redirection.
- **Light Theme Design System (`style.css`):** Crisp white content cards (`#ffffff`), subtle borders (`#e2e8f0`), deep slate typography (`#0f172a`), royal blue primary accents (`#2563eb`), and emerald/amber/rose network health indicators.

---

## 2. Multi-Page Application Sitemap

| Page | URL Path | Key Responsibilities & Capabilities |
|---|---|---|
| **Entry Router** | `index.html` | Inspects demo authentication state and routes to `dashboard.html` or `login.html`. |
| **Page 1: Login** | `login.html` | Split-layout branded demo login, password reveal toggle, quick-fill demo credential chips, validation error display. |
| **Page 2: Overview Dashboard** | `dashboard.html` | High-level campus KPI metrics, signal quality breakdown, live AP load progress bars, recent alert summary, quick navigation actions. |
| **Page 3: Campus Digital Twin** | `digital-twin.html` | 900×550 SVG interactive campus map with 5 buildings, 4 AP beacons with radar pulse, crowd movement physics, Start/Pause/Step/Reset controls, and 0–150 client density slider. |
| **Page 4: AP Management** | `access-points.html` | Access point fleet table & responsive card grid, per-AP capacity editor, enable/disable power switches, search and status filter chips. |
| **Page 5: Analytics & Reports** | `analytics.html` | Signal tier breakdown (Strong, Medium, Weak), AP capacity utilization comparison, data table, and working CSV report download. |
| **Page 6: Alerts & Activity Logs** | `alerts.html` | Real-time audit trail of capacity spikes, equipment power cycles, physics resets, severity filtering, search, log clearing, and CSV export. |
| **Page 7: System Settings** | `settings.html` | Movement speed multiplier, default population, configurable warning/danger thresholds with validation, SVG layer defaults, and logout. |

---

## 3. Demo Login Credentials

This application utilizes client-side demo authentication for educational demonstration purposes. The following demo credentials are provided:

| Role | Email Address | Password | Permissions & View |
|---|---|---|---|
| **Administrator** | `admin@campus.edu` | `admin123` | Full administrative control, fleet management, and settings configuration |
| **Network Operator** | `operator@campus.edu` | `operator123` | Day-to-day network monitoring, alert auditing, and telemetry analysis |

> **Quick Login Tip:** On `login.html`, click either the **Administrator** or **Network Operator** quick-fill button to automatically populate the email and password fields.

---

## 4. Simulation Engine & Wireless Model

- **Coordinate Space:** Fixed virtual viewport of $900 \times 550$ units with campus boundaries ($x: 35-865, y: 35-515$).
- **5 Campus Buildings:**
  1. *Academic Block A* (Lecture Quad, $x: 180, y: 150$)
  2. *Central Library* (Rotunda Study, $x: 680, y: 130$)
  3. *Student Commons* (Dining & Quad, $x: 690, y: 410$)
  4. *Science & Tech Wing* (Engineering Labs, $x: 190, y: 410$)
  5. *Admin Center & Quad* (Central Plaza Clocktower, $x: 450, y: 275$)
- **Signal Tier Distance Thresholds:**
  $$\text{Distance } d = \sqrt{(x_{\text{client}} - x_{\text{ap}})^2 + (y_{\text{client}} - y_{\text{ap}})^2}$$
  - 🟢 **Strong Signal:** $d \le 110$ units
  - 🟡 **Medium Signal:** $110 < d \le 210$ units
  - 🔴 **Weak Signal:** $d > 210$ units
  - ⚪ **Unavailable:** When all active APs are offline
- **Capacity & Congestion Rules:**
  $$\text{Load Percentage} = \left(\frac{\text{Connected Users}}{\text{Configured Capacity}}\right) \times 100\%$$
  - **Normal:** $< 70\%$ (Emerald green)
  - **High Load (Warning):** $70\% - 89.9\%$ (Amber warning)
  - **Congested (Danger):** $\ge 90\%$ (Rose red alert)
- **Dynamic Failover:** If an AP is powered off, clients instantly associate with the nearest remaining enabled AP.

---

## 5. Local Run & Deployment Instructions

### Option 1: Local HTTP Server (Active on Port 3000)
Run Python's built-in web server from the project directory:
```powershell
# Windows PowerShell
python -m http.server 3000
```
Open your web browser and navigate to:
```
http://localhost:3000/
```
Or directly to the login page:
```
http://localhost:3000/login.html
```

### Option 2: Direct Browser Launch
Open `login.html` directly in any standard browser (Chrome, Edge, Firefox, Safari):
```powershell
Start-Process "http://localhost:3000/login.html"
```

### Option 3: GitHub Pages / Static Hosting
1. Commit the repository to GitHub:
   ```bash
   git add .
   git commit -m "CampusNet Multi-Page Web Application"
   git push origin main
   ```
2. Navigate to **Repository Settings > Pages**.
3. Under **Branch**, select `main` and root `/`.
4. Your site will be published at `https://<username>.github.io/<repo-name>/login.html`.

---

## 6. Demonstration Workflow Script (3-Minute Tour)

1. **Login & Authentication (`login.html`):**
   - Click the **Administrator** demo pill to auto-fill credentials.
   - Click **Sign In**. Observe immediate authentication and redirect to `dashboard.html`.
2. **Review Fleet Health (`dashboard.html`):**
   - Inspect the 4 KPI summary cards (Simulated Clients, Active APs, Average Signal Health, Congestion Incidents).
   - Review the Signal Tier breakdown bars and individual AP capacity ratios.
3. **Experience the Digital Twin (`digital-twin.html`):**
   - Observe the 5 buildings, walkways, plaza fountain, and 4 access points.
   - Click **Start** to see Brownian crowd movement and real-time color transitions.
   - Drag the **Population Slider** from 48 to 110 users. Watch access points transition from Normal into Warning ($70\%$) and Congestion ($90\%$).
   - Toggle **Disable AP-01**. Notice connected clients dynamically failover to adjacent APs.
4. **Fleet Operations (`access-points.html`):**
   - Filter APs by status (*Congested*, *Disabled*).
   - Adjust capacity of AP-04 from 25 to 45 users; observe immediate load recalculation.
5. **Analytics & Report Export (`analytics.html`):**
   - Review telemetry graphs and signal quality distribution.
   - Click **Download Report (CSV)** to download the generated report file.
6. **Audit Trail Review (`alerts.html`):**
   - Verify all capacity alerts, power cycles, and configuration changes are chronologically logged.
   - Click **Congestion (Danger)** filter to isolate critical alerts.
7. **System Customization & Logout (`settings.html`):**
   - Adjust movement speed to $1.5\times$ or alter congestion threshold to $92\%$. Click **Save Changes**.
   - Click **Sign Out of Demo Session**. Verify redirect back to `login.html`.

---

## 7. Limitations & Disclosures

- **Demo Authentication:** Authentication uses `sessionStorage` and `localStorage` to emulate realistic operator roles. It is designed for demonstration and is not cryptographically secured.
- **RF Propagation Simplification:** Calculations use 2D Euclidean distance without multi-wall attenuation or radio frequency reflection modeling.
- **Data Persistence:** Settings and simulation state persist locally in the user's web browser storage and reset when storage is cleared.
