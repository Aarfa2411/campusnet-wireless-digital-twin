# Wireless Network Digital Twin for Smart Campus
## Project Context & Product Requirements Document (PRD)

**Project Type:** Web-Based Network Simulation  
**Domain:** Wireless Communication / Smart Campus / Network Visualization  
**Development Environment:** Google Antigravity  
**Technology Stack:** HTML5, CSS3, Vanilla JavaScript  
**Development Time Limit:** 5 Hours  
**Project Status:** MVP Development  
**Document Purpose:** Single source of truth for project requirements, implementation, testing, and demonstration.

---

# 1. Project Overview

## 1.1 Project Title

**Wireless Network Digital Twin for Smart Campus**

## 1.2 Project Summary

The Wireless Network Digital Twin for Smart Campus is an interactive, browser-based application that creates a virtual representation of a college campus and simulates wireless network coverage, user distribution, signal strength, and access-point congestion.

The application displays a campus map containing buildings, pathways, Wi-Fi access points, signal coverage zones, and simulated users. A lightweight JavaScript simulation estimates signal strength using the distance between users and access points. It also calculates access-point loads and identifies potential congestion when the number of connected users approaches or exceeds configured capacity.

Users can interact with the simulation by starting, pausing, and resetting it, as well as adjusting the simulated user population.

The project demonstrates how a digital-twin-inspired visualization can help explain wireless network planning and capacity management in an educational campus environment.

**Important distinction:** This is a simulated digital-twin prototype, not a live digital twin connected to physical campus infrastructure. It uses generated data and simplified models, not measurements from actual Wi-Fi routers.

---

# 2. Problem Statement

College campuses contain classrooms, laboratories, libraries, offices, and common areas where many users depend on wireless connectivity.

Uneven access-point placement, concentrated user activity, and limited network capacity can contribute to weak coverage or congestion. Understanding these conditions can be difficult without a visual representation of the campus network.

This project addresses the educational and visualization aspect of that problem by providing a virtual campus where users can observe simulated wireless coverage, compare access-point loads, and explore how changes in user distribution affect network conditions.

The prototype is intended to demonstrate the concepts of wireless coverage visualization, user distribution, and basic capacity planning without requiring physical networking equipment.

---

# 3. Project Objectives

The application must:

1. Create an interactive virtual map of a college campus.
2. Display at least three Wi-Fi access points.
3. Visualize approximate coverage zones around access points.
4. Represent simulated users at different campus locations.
5. Estimate signal strength using a simplified distance-based model.
6. Assign each simulated user to an appropriate access point.
7. Calculate the number of users connected to each access point.
8. Identify access points with high loads or simulated congestion.
9. Update dashboard statistics when the simulation changes.
10. Provide simple controls for starting, pausing, resetting, and changing the user count.
11. Present the information in a polished, understandable dashboard.
12. Run locally in a modern web browser without requiring a backend.

---

# 4. Target Users

The primary audience includes:

- College faculty evaluating the WMC project.
- Students learning wireless communication and network planning.
- Demonstrators who need to explain network behaviour visually.
- Beginners exploring interactive simulations and JavaScript.

The interface must be understandable to non-technical viewers. Important information should be communicated through labels, visual indicators, summary cards, and a clearly explained legend rather than complicated networking terminology.

---

# 5. Product Scope

## 5.1 Must-Have Features

### A. Virtual Campus Map
- Multiple campus buildings with readable labels.
- Simple pathways or open areas.
- At least three strategically positioned Wi-Fi access points.
- Coloured signal coverage zones.
- Simulated user markers.
- A legend explaining the map symbols.

### B. Wi-Fi Access Points
- AP-01: Academic Block
- AP-02: Library
- AP-03: Student Common Area
- AP-04: Science & Research Complex

### C. Signal Coverage Visualization
- Strong: Green
- Medium: Amber/Yellow
- Weak: Red

### D. Simulated Users
- Adjustable count (0 to 150+).
- Realistic campus distribution and gentle drift.
- Dynamic assignment to APs.

### E. Signal Strength Estimation
- Distance-based Euclidean model.
- Thresholds: Strong <= 110 units, Medium <= 200 units, Weak > 200 units (scaled to map).

### F. Capacity and Congestion
- Normal: < 70%
- High Load: 70% - 89%
- Congested: >= 90%

### G. Controls & UI
- Start / Pause / Reset / Step
- User population slider (0 to 150)
- Summary cards (Total Users, Active APs, Avg Signal, Congestion Alerts)
- Simulation Disclosure banner

---

# 6. Multi-Page Architecture Specification

The system is architected as a modular, client-side, multi-page web application:

1. **`login.html` (Demo Authentication):**
   - Role-based client-side credentials (`Administrator` and `Network Operator`).
   - Session management via `sessionStorage` and `localStorage`.
   - Automatic redirection for protected pages via `requireAuth()`.

2. **`dashboard.html` (Overview Dashboard):**
   - Live KPI cards, signal tier distribution bars, AP load status, and recent audit alerts.

3. **`digital-twin.html` (Interactive Campus Digital Twin):**
   - Full 900×550 SVG map with buildings, pathways, AP radar pulses, distance rings, and Brownian drift physics.

4. **`access-points.html` (Access Point Fleet Management):**
   - Tabular and card views of virtual APs with real-time loads, capacity editor, and enable/disable controls.

5. **`analytics.html` (Performance Analytics & Telemetry):**
   - Detailed signal quality and capacity distribution graphs, plus working CSV report generation.

6. **`alerts.html` (Alerts & Activity Logs):**
   - Chronological event audit log, severity filtering (`danger`, `warning`, `info`), and log CSV export.

7. **`settings.html` (System & Simulation Settings):**
   - Simulation drift velocity, default population, alert thresholds, layer visibility defaults, and operator logout.

