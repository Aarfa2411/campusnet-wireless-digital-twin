/**
 * CampusNet Digital Twin - Shared State Engine
 * Centralized data store synchronized via localStorage across all pages.
 * Handles Euclidean distance calculations, nearest-AP assignment, capacity tracking,
 * alerts logging, and crowd drift physics.
 */

const CampusState = (() => {
  const STORAGE_KEY = 'campusnet_sim_state';

  // Constants
  const COORDINATE_SPACE = { width: 900, height: 550 };
  const BOUNDS = { minX: 35, maxX: 865, minY: 35, maxY: 515 };

  const THRESHOLDS = {
    strong: 110,
    medium: 210
  };

  const DEFAULT_ACCESS_POINTS = [
    {
      id: 'AP-01',
      name: 'Academic Block A',
      location: 'Lecture Quad (x:180, y:150)',
      x: 180,
      y: 150,
      capacity: 30,
      enabled: true,
      connectedUsers: 0,
      loadPercentage: 0,
      status: 'normal'
    },
    {
      id: 'AP-02',
      name: 'Central Library',
      location: 'Rotunda Study (x:680, y:130)',
      x: 680,
      y: 130,
      capacity: 35,
      enabled: true,
      connectedUsers: 0,
      loadPercentage: 0,
      status: 'normal'
    },
    {
      id: 'AP-03',
      name: 'Student Commons',
      location: 'Food & Lounge (x:690, y:410)',
      x: 690,
      y: 410,
      capacity: 40,
      enabled: true,
      connectedUsers: 0,
      loadPercentage: 0,
      status: 'normal'
    },
    {
      id: 'AP-04',
      name: 'Science & Tech Wing',
      location: 'Engineering Quad (x:190, y:410)',
      x: 190,
      y: 410,
      capacity: 25,
      enabled: true,
      connectedUsers: 0,
      loadPercentage: 0,
      status: 'normal'
    }
  ];

  const DEFAULT_SETTINGS = {
    movementSpeed: 1.0,
    defaultPopulation: 48,
    congestionThreshold: 90,
    warningThreshold: 70,
    showCoverage: true,
    showLabels: true,
    showRings: true,
    showUsers: true
  };

  // Internal state
  let state = {
    accessPoints: JSON.parse(JSON.stringify(DEFAULT_ACCESS_POINTS)),
    users: [],
    alerts: [],
    settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    isRunning: false,
    lastUpdate: Date.now()
  };

  let subscribers = [];

  function init() {
    loadFromStorage();

    // If users are empty, seed initial population
    if (!state.users || state.users.length === 0) {
      seedUsers(state.settings.defaultPopulation || 48);
    }

    recalculate();

    // Listen for storage events from other open tabs/windows
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          state = JSON.parse(e.newValue);
          notifySubscribers();
        } catch (err) {
          console.error('Failed to sync storage:', err);
        }
      }
    });
  }

  function loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.accessPoints && parsed.users) {
          state = parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load saved state from localStorage, using defaults.', e);
    }
  }

  function saveToStorage() {
    try {
      state.lastUpdate = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
    notifySubscribers();
  }

  function seedUsers(count = 48) {
    const clusterSeeds = [
      { x: 180, y: 150, radius: 95 },
      { x: 680, y: 130, radius: 90 },
      { x: 690, y: 410, radius: 100 },
      { x: 190, y: 410, radius: 90 },
      { x: 450, y: 275, radius: 110 }
    ];

    state.users = [];
    for (let i = 0; i < count; i++) {
      const seed = clusterSeeds[i % clusterSeeds.length];
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * seed.radius;

      const x = Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, seed.x + Math.cos(angle) * distance));
      const y = Math.min(BOUNDS.maxY, Math.max(BOUNDS.minY, seed.y + Math.sin(angle) * distance));

      const speed = 0.5 + Math.random() * 0.7;
      const moveAngle = Math.random() * 2 * Math.PI;

      state.users.push({
        id: `U-${String(i + 1).padStart(3, '0')}`,
        x,
        y,
        vx: Math.cos(moveAngle) * speed,
        vy: Math.sin(moveAngle) * speed,
        assignedApId: null,
        distance: 0,
        signalCategory: 'weak'
      });
    }
  }

  function calculateDistance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  function classifySignal(dist) {
    if (dist === null || dist === undefined) return 'unavailable';
    if (dist <= THRESHOLDS.strong) return 'strong';
    if (dist <= THRESHOLDS.medium) return 'medium';
    return 'weak';
  }

  function recalculate() {
    const enabledAps = state.accessPoints.filter(ap => ap.enabled);

    // Reset AP counts
    state.accessPoints.forEach(ap => {
      ap.connectedUsers = 0;
      ap.loadPercentage = 0;
      if (!ap.enabled) {
        ap.status = 'disabled';
      }
    });

    // Assign users to nearest enabled AP
    state.users.forEach(user => {
      if (enabledAps.length === 0) {
        user.assignedApId = null;
        user.distance = null;
        user.signalCategory = 'unavailable';
        return;
      }

      let nearest = null;
      let minDist = Infinity;

      for (const ap of enabledAps) {
        const d = calculateDistance(user.x, user.y, ap.x, ap.y);
        if (d < minDist) {
          minDist = d;
          nearest = ap;
        }
      }

      user.assignedApId = nearest.id;
      user.distance = Math.round(minDist);
      user.signalCategory = classifySignal(minDist);
      nearest.connectedUsers++;
    });

    // Calculate loads and detect thresholds
    const warnThresh = state.settings.warningThreshold || 70;
    const congThresh = state.settings.congestionThreshold || 90;

    state.accessPoints.forEach(ap => {
      if (!ap.enabled) {
        ap.status = 'disabled';
        ap.loadPercentage = 0;
        return;
      }

      ap.loadPercentage = (ap.connectedUsers / ap.capacity) * 100;

      const oldStatus = ap.status;
      if (ap.loadPercentage >= congThresh) {
        ap.status = 'danger'; // Congested
        if (oldStatus !== 'danger') {
          addAlert(`Congestion detected on ${ap.id} (${ap.name}): ${ap.connectedUsers}/${ap.capacity} users (${ap.loadPercentage.toFixed(1)}%)`, 'danger', ap.id);
        }
      } else if (ap.loadPercentage >= warnThresh) {
        ap.status = 'warning'; // High Load
        if (oldStatus === 'normal') {
          addAlert(`High Load warning on ${ap.id} (${ap.name}): ${ap.connectedUsers}/${ap.capacity} users (${ap.loadPercentage.toFixed(1)}%)`, 'warning', ap.id);
        }
      } else {
        ap.status = 'normal';
      }
    });
  }

  function stepPhysics() {
    const speedMultiplier = state.settings.movementSpeed || 1.0;

    state.users.forEach(u => {
      u.vx += (Math.random() - 0.5) * 0.35 * speedMultiplier;
      u.vy += (Math.random() - 0.5) * 0.35 * speedMultiplier;

      const spd = Math.hypot(u.vx, u.vy);
      const maxSpd = 1.3 * speedMultiplier;
      if (spd > maxSpd) {
        u.vx = (u.vx / spd) * maxSpd;
        u.vy = (u.vy / spd) * maxSpd;
      }

      u.x += u.vx;
      u.y += u.vy;

      if (u.x < BOUNDS.minX) { u.x = BOUNDS.minX; u.vx = Math.abs(u.vx); }
      if (u.x > BOUNDS.maxX) { u.x = BOUNDS.maxX; u.vx = -Math.abs(u.vx); }
      if (u.y < BOUNDS.minY) { u.y = BOUNDS.minY; u.vy = Math.abs(u.vy); }
      if (u.y > BOUNDS.maxY) { u.y = BOUNDS.maxY; u.vy = -Math.abs(u.vy); }
    });

    recalculate();
    saveToStorage();
  }

  function setPopulation(targetCount) {
    targetCount = Math.max(0, Math.min(150, parseInt(targetCount, 10) || 0));
    if (targetCount === state.users.length) return;

    if (targetCount < state.users.length) {
      state.users = state.users.slice(0, targetCount);
    } else {
      const clusterSeeds = [
        { x: 180, y: 150, radius: 95 },
        { x: 680, y: 130, radius: 90 },
        { x: 690, y: 410, radius: 100 },
        { x: 190, y: 410, radius: 90 },
        { x: 450, y: 275, radius: 110 }
      ];

      const toAdd = targetCount - state.users.length;
      for (let i = 0; i < toAdd; i++) {
        const idx = state.users.length + 1;
        const seed = clusterSeeds[idx % clusterSeeds.length];
        const angle = Math.random() * 2 * Math.PI;
        const dist = Math.random() * seed.radius;

        state.users.push({
          id: `U-${String(idx).padStart(3, '0')}`,
          x: Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, seed.x + Math.cos(angle) * dist)),
          y: Math.min(BOUNDS.maxY, Math.max(BOUNDS.minY, seed.y + Math.sin(angle) * dist)),
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          assignedApId: null,
          distance: 0,
          signalCategory: 'weak'
        });
      }
    }

    addAlert(`User population adjusted to ${targetCount} users.`, 'info', 'SYSTEM');
    recalculate();
    saveToStorage();
  }

  function toggleAp(apId) {
    const ap = state.accessPoints.find(a => a.id === apId);
    if (!ap) return;

    ap.enabled = !ap.enabled;
    addAlert(
      `Access Point ${ap.id} (${ap.name}) was ${ap.enabled ? 'ENABLED' : 'DISABLED'}. Network re-balanced.`,
      ap.enabled ? 'info' : 'warning',
      ap.id
    );

    recalculate();
    saveToStorage();
  }

  function updateApCapacity(apId, newCapacity) {
    const ap = state.accessPoints.find(a => a.id === apId);
    if (!ap) return;

    const cap = Math.max(5, Math.min(100, parseInt(newCapacity, 10) || ap.capacity));
    ap.capacity = cap;
    addAlert(`Configured capacity for ${ap.id} changed to ${cap} users.`, 'info', ap.id);

    recalculate();
    saveToStorage();
  }

  function addAlert(message, type = 'info', apId = 'SYSTEM') {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const dateStr = now.toLocaleDateString();

    const alertItem = {
      id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: timeStr,
      date: dateStr,
      rawTime: Date.now(),
      message,
      type, // 'info', 'warning', 'danger'
      apId
    };

    state.alerts.unshift(alertItem);
    if (state.alerts.length > 50) {
      state.alerts.pop();
    }
  }

  function clearAlerts() {
    state.alerts = [];
    addAlert('Alert and activity log history cleared by operator.', 'info', 'AUDIT');
    saveToStorage();
  }

  function resetSimulation() {
    state.accessPoints = JSON.parse(JSON.stringify(DEFAULT_ACCESS_POINTS));
    seedUsers(state.settings.defaultPopulation || 48);
    state.isRunning = false;
    addAlert('Simulation reset to baseline nominal state (48 users, all APs online).', 'info', 'SYSTEM');
    recalculate();
    saveToStorage();
  }

  function updateSettings(newSettings) {
    state.settings = { ...state.settings, ...newSettings };
    addAlert('System and simulation settings updated.', 'info', 'CONFIG');
    saveToStorage();
  }

  function generateReportCSV() {
    let csv = '=== CAMPUSNET WIRELESS DIGITAL TWIN SIMULATION REPORT ===\n';
    csv += `Generated At: ${new Date().toLocaleString()}\n`;
    csv += `Simulation Disclosure: All metrics, signal estimates and user locations are simulated.\n\n`;

    // Overview KPIs
    const enabledCount = state.accessPoints.filter(a => a.enabled).length;
    const congestedCount = state.accessPoints.filter(a => a.enabled && a.status === 'danger').length;
    const strongCount = state.users.filter(u => u.signalCategory === 'strong').length;
    const mediumCount = state.users.filter(u => u.signalCategory === 'medium').length;
    const weakCount = state.users.filter(u => u.signalCategory === 'weak').length;
    const avgScore = state.users.length > 0 && enabledCount > 0
      ? Math.round(((strongCount * 1.0 + mediumCount * 0.7 + weakCount * 0.3) / state.users.length) * 100)
      : 0;

    csv += '--- NETWORK OVERVIEW ---\n';
    csv += `Total Users,${state.users.length}\n`;
    csv += `Active Access Points,${enabledCount} of ${state.accessPoints.length}\n`;
    csv += `Average Signal Health,${avgScore}%\n`;
    csv += `Congested Access Points,${congestedCount}\n`;
    csv += `Strong Signal Clients,${strongCount}\n`;
    csv += `Medium Signal Clients,${mediumCount}\n`;
    csv += `Weak Signal Clients,${weakCount}\n\n`;

    // Access Point Table
    csv += '--- ACCESS POINT CAPACITY & LOAD ---\n';
    csv += 'AP ID,Name,Location,Status,Connected Users,Capacity,Load Percentage\n';
    state.accessPoints.forEach(ap => {
      csv += `"${ap.id}","${ap.name}","${ap.location}","${ap.status.toUpperCase()}",${ap.connectedUsers},${ap.capacity},${ap.loadPercentage.toFixed(1)}%\n`;
    });
    csv += '\n';

    // Recent Alerts
    csv += '--- RECENT SIMULATED ALERTS ---\n';
    csv += 'Timestamp,Type,Target AP,Message\n';
    state.alerts.slice(0, 20).forEach(al => {
      csv += `"${al.date} ${al.timestamp}","${al.type.toUpperCase()}","${al.apId}","${al.message.replace(/"/g, '""')}"\n`;
    });

    return csv;
  }

  function subscribe(fn) {
    subscribers.push(fn);
    return () => {
      subscribers = subscribers.filter(s => s !== fn);
    };
  }

  function notifySubscribers() {
    subscribers.forEach(fn => {
      try { fn(state); } catch (e) { console.error('Subscriber error:', e); }
    });
  }

  init();

  return {
    getState: () => state,
    recalculate,
    stepPhysics,
    setPopulation,
    toggleAp,
    updateApCapacity,
    addAlert,
    clearAlerts,
    resetSimulation,
    updateSettings,
    generateReportCSV,
    saveToStorage,
    subscribe,
    BOUNDS,
    THRESHOLDS,
    COORDINATE_SPACE
  };
})();

window.CampusState = CampusState;
