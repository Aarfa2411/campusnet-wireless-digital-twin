/**
 * CampusNet Digital Twin - Sprint 2 Simulation Engine
 * 900x550 In-Memory Engine • Euclidean Distance Model • Dynamic Nearest-AP Assignment
 * Capacity & Congestion Calculations • Gentle Crowd Physics & Boundary Collision
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- 1. Simulation Constants & Thresholds ---
  const COORDINATE_SPACE = { width: 900, height: 550 };
  const BOUNDS = { minX: 35, maxX: 865, minY: 35, maxY: 515 };

  // Explicit PRD Sprint 2 thresholds (virtual units)
  const THRESHOLDS = {
    strong: 110,   // Distance <= 110 units
    medium: 210    // Distance 111 - 210 units ( > 210 is weak )
  };

  // Status capacity percentage rules
  const CAPACITY_RULES = {
    normalMax: 70,  // < 70% is Normal
    highLoadMax: 90 // 70% to < 90% is High Load, >= 90% is Congested
  };

  // --- 2. In-Memory Access Point State ---
  const INITIAL_ACCESS_POINTS = [
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
      status: 'normal' // 'normal' | 'warning' (High Load) | 'danger' (Congested) | 'disabled'
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

  // Deep clone initial state
  let accessPoints = JSON.parse(JSON.stringify(INITIAL_ACCESS_POINTS));

  // --- 3. In-Memory User Population State ---
  let users = [];
  let userCounter = 1;
  let isRunning = false;
  let animationInterval = null;

  // Track previous statuses to avoid alert log spam
  const previousApStatuses = {
    'AP-01': 'normal',
    'AP-02': 'normal',
    'AP-03': 'normal',
    'AP-04': 'normal'
  };

  /**
   * Generates a new simulated user inside campus grounds with natural distribution.
   */
  function createSimulatedUser(index = 0) {
    // Distribute users between campus building clusters and open pathways
    const clusterSeeds = [
      { x: 180, y: 150, radius: 95 }, // Academic Quad
      { x: 680, y: 130, radius: 90 }, // Library Grounds
      { x: 690, y: 410, radius: 100 }, // Commons Courtyard
      { x: 190, y: 410, radius: 90 }, // Science Quad
      { x: 450, y: 275, radius: 110 } // Central Plaza
    ];

    const seed = clusterSeeds[index % clusterSeeds.length];
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * seed.radius;

    const x = Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, seed.x + Math.cos(angle) * distance));
    const y = Math.min(BOUNDS.maxY, Math.max(BOUNDS.minY, seed.y + Math.sin(angle) * distance));

    // Initial small velocity for gentle Brownian crowd drift
    const speed = 0.5 + Math.random() * 0.7;
    const moveAngle = Math.random() * 2 * Math.PI;

    return {
      id: `U-${String(userCounter++).padStart(3, '0')}`,
      x,
      y,
      vx: Math.cos(moveAngle) * speed,
      vy: Math.sin(moveAngle) * speed,
      assignedApId: null,
      distance: 0,
      signalCategory: 'weak' // 'strong' | 'medium' | 'weak' | 'unavailable'
    };
  }

  /**
   * Initializes or adjusts user population array to the target count.
   */
  function setPopulationCount(targetCount) {
    if (targetCount === users.length) return;

    if (targetCount < users.length) {
      users = users.slice(0, targetCount);
    } else {
      const added = targetCount - users.length;
      for (let i = 0; i < added; i++) {
        users.push(createSimulatedUser(users.length + i));
      }
    }

    recalculateAndRender();
  }

  // --- 4. Simulation Engine: Distance, Assignment & Load Calculations ---

  /**
   * Calculates Euclidean distance: d = sqrt((x_u - x_ap)^2 + (y_u - y_ap)^2)
   */
  function calculateEuclideanDistance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  /**
   * Classifies signal category based on distance and configured thresholds.
   */
  function classifySignalCategory(distance) {
    if (distance === null || distance === undefined) return 'unavailable';
    if (distance <= THRESHOLDS.strong) return 'strong';
    if (distance <= THRESHOLDS.medium) return 'medium';
    return 'weak';
  }

  /**
   * Core engine step:
   * 1. Assign each user to nearest enabled AP.
   * 2. Recalculate AP connected users, load percentage, and status.
   * 3. Sync all dashboard KPIs and visual markers from this single state.
   */
  function recalculateSimulationState() {
    const enabledAps = accessPoints.filter(ap => ap.enabled);

    // Reset AP counts
    accessPoints.forEach(ap => {
      ap.connectedUsers = 0;
      ap.loadPercentage = 0;
      if (!ap.enabled) {
        ap.status = 'disabled';
      }
    });

    // 1. Assign each user to the nearest enabled access point
    users.forEach(user => {
      if (enabledAps.length === 0) {
        user.assignedApId = null;
        user.distance = null;
        user.signalCategory = 'unavailable';
        return;
      }

      let nearestAp = null;
      let minDistance = Infinity;

      for (const ap of enabledAps) {
        const dist = calculateEuclideanDistance(user.x, user.y, ap.x, ap.y);
        if (dist < minDistance) {
          minDistance = dist;
          nearestAp = ap;
        }
      }

      user.assignedApId = nearestAp.id;
      user.distance = Math.round(minDistance);
      user.signalCategory = classifySignalCategory(minDistance);

      // Increment count on assigned AP
      nearestAp.connectedUsers++;
    });

    // 2. Recalculate Load Percentages and Statuses for Access Points
    accessPoints.forEach(ap => {
      if (!ap.enabled) {
        ap.status = 'disabled';
        ap.loadPercentage = 0;
        return;
      }

      // Formula: (connected users / configured capacity) * 100
      ap.loadPercentage = (ap.connectedUsers / ap.capacity) * 100;

      // Status classification
      if (ap.loadPercentage >= CAPACITY_RULES.highLoadMax) {
        ap.status = 'danger'; // Congested (>= 90%)
      } else if (ap.loadPercentage >= CAPACITY_RULES.normalMax) {
        ap.status = 'warning'; // High Load (70% - 89.9%)
      } else {
        ap.status = 'normal'; // Normal (< 70%)
      }

      // Detect and log status transitions
      if (previousApStatuses[ap.id] !== ap.status) {
        if (ap.status === 'danger') {
          logAlert(`<strong>${ap.id} Congestion Alert:</strong> ${ap.name} reached ${ap.loadPercentage.toFixed(1)}% load (${ap.connectedUsers}/${ap.capacity} users).`, 'danger');
        } else if (ap.status === 'warning' && previousApStatuses[ap.id] === 'normal') {
          logAlert(`<strong>${ap.id} High Load:</strong> ${ap.name} at ${ap.loadPercentage.toFixed(1)}% capacity.`, 'warning');
        }
        previousApStatuses[ap.id] = ap.status;
      }
    });
  }

  // --- 5. Gentle Crowd Physics & Boundary Handling ---
  function updatePhysicsPositions() {
    users.forEach(user => {
      // Gentle random acceleration perturbation (Brownian walk)
      user.vx += (Math.random() - 0.5) * 0.35;
      user.vy += (Math.random() - 0.5) * 0.35;

      // Dampen velocity to prevent erratic sprint (speed cap 1.2 map units/tick)
      const currentSpeed = Math.hypot(user.vx, user.vy);
      const maxSpeed = 1.2;
      if (currentSpeed > maxSpeed) {
        user.vx = (user.vx / currentSpeed) * maxSpeed;
        user.vy = (user.vy / currentSpeed) * maxSpeed;
      }

      user.x += user.vx;
      user.y += user.vy;

      // Boundary bouncing to keep users firmly within campus grounds
      if (user.x < BOUNDS.minX) {
        user.x = BOUNDS.minX;
        user.vx = Math.abs(user.vx);
      } else if (user.x > BOUNDS.maxX) {
        user.x = BOUNDS.maxX;
        user.vx = -Math.abs(user.vx);
      }

      if (user.y < BOUNDS.minY) {
        user.y = BOUNDS.minY;
        user.vy = Math.abs(user.vy);
      } else if (user.y > BOUNDS.maxY) {
        user.y = BOUNDS.maxY;
        user.vy = -Math.abs(user.vy);
      }
    });
  }

  // --- 6. DOM & SVG Rendering Functions ---

  const usersContainer = document.getElementById('layer-users');
  const apCardsContainer = document.getElementById('ap-cards-container');

  // KPI elements
  const valTotalUsers = document.getElementById('val-total-users');
  const subtextTotalUsers = document.getElementById('subtext-total-users');
  const valActiveAps = document.getElementById('val-active-aps');
  const subtextActiveAps = document.getElementById('subtext-active-aps');
  const valAvgSignal = document.getElementById('val-avg-signal');
  const subtextAvgSignal = document.getElementById('subtext-avg-signal');
  const valCongestionAlerts = document.getElementById('val-congestion-alerts');
  const subtextCongestionAlerts = document.getElementById('subtext-congestion-alerts');
  const alertCounterBadge = document.getElementById('alert-counter-badge');

  /**
   * Renders access point monitor cards in the right-hand panel.
   */
  function renderApCards() {
    if (!apCardsContainer) return;
    apCardsContainer.innerHTML = '';

    const fragment = document.createDocumentFragment();

    accessPoints.forEach(ap => {
      const card = document.createElement('article');
      card.className = `ap-card status-${ap.status}`;
      card.id = `card-${ap.id.toLowerCase()}`;

      // Status pill label and styling
      let pillText = 'Normal';
      let pillClass = 'pill-normal';
      let badgeClass = '';

      if (ap.status === 'disabled') {
        pillText = 'Disabled';
        pillClass = 'pill-disabled';
        badgeClass = 'badge-disabled';
      } else if (ap.status === 'danger') {
        pillText = 'Congested';
        pillClass = 'pill-danger';
        badgeClass = 'badge-danger';
      } else if (ap.status === 'warning') {
        pillText = 'High Load';
        pillClass = 'pill-warning';
        badgeClass = 'badge-warning';
      }

      // Progress bar fill class
      let fillClass = 'fill-normal';
      if (ap.status === 'disabled') {
        fillClass = 'fill-normal';
      } else if (ap.loadPercentage > 100) {
        fillClass = 'fill-overload';
      } else if (ap.status === 'danger') {
        fillClass = 'fill-danger';
      } else if (ap.status === 'warning') {
        fillClass = 'fill-warning';
      }

      // Visual width capped at 100% for progress track, but label displays actual percentage!
      const visualBarWidth = ap.enabled ? Math.min(ap.loadPercentage, 100).toFixed(1) : '0';
      const displayLoadText = ap.enabled ? `${ap.loadPercentage.toFixed(1)}%` : 'OFF';

      card.innerHTML = `
        <div class="ap-card-top">
          <div class="ap-card-identity">
            <span class="ap-id-badge ${badgeClass}">${ap.id}</span>
            <div class="ap-name-group">
              <h3 class="ap-name">${ap.name}</h3>
              <span class="ap-location">${ap.location}</span>
            </div>
          </div>
          <div class="ap-actions">
            <button class="btn-ap-toggle ${ap.enabled ? 'btn-ap-on' : 'btn-ap-off'}" data-toggle-ap="${ap.id}" title="Click to toggle AP power">
              ${ap.enabled ? 'Disable' : 'Enable'}
            </button>
            <span class="status-pill ${pillClass}">${pillText}</span>
          </div>
        </div>
        <div class="ap-metric-row">
          <div class="ap-metric-col">
            <span class="metric-label">Users / Capacity</span>
            <span class="metric-value"><strong>${ap.connectedUsers}</strong> / ${ap.capacity}</span>
          </div>
          <div class="ap-metric-col text-right">
            <span class="metric-label">Load</span>
            <span class="metric-value ${ap.status === 'danger' ? 'text-danger' : (ap.status === 'warning' ? 'text-warning' : '')}">
              <strong>${displayLoadText}</strong>
            </span>
          </div>
        </div>
        <div class="progress-bar-track" role="progressbar" aria-valuenow="${visualBarWidth}" aria-valuemin="0" aria-valuemax="100" aria-label="${ap.id} load">
          <div class="progress-bar-fill ${fillClass}" style="width: ${visualBarWidth}%;"></div>
        </div>
      `;

      fragment.appendChild(card);
    });

    apCardsContainer.appendChild(fragment);

    // Attach power toggle event handlers
    const toggleButtons = apCardsContainer.querySelectorAll('[data-toggle-ap]');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const apId = btn.getAttribute('data-toggle-ap');
        toggleAccessPoint(apId);
      });
    });
  }

  /**
   * Toggles an access point enabled/disabled state.
   */
  function toggleAccessPoint(apId) {
    const ap = accessPoints.find(a => a.id === apId);
    if (!ap) return;

    ap.enabled = !ap.enabled;
    logAlert(`<strong>${ap.id} Power Toggle:</strong> ${ap.name} turned ${ap.enabled ? 'ON' : 'OFF'}. Network failover re-evaluated.`, ap.enabled ? 'info' : 'warning');
    recalculateAndRender();
  }

  /**
   * Renders simulated user nodes to the SVG map layer.
   */
  function renderSvgUsers() {
    if (!usersContainer) return;
    usersContainer.innerHTML = '';

    const fragment = document.createDocumentFragment();

    users.forEach(user => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', user.x.toFixed(1));
      circle.setAttribute('cy', user.y.toFixed(1));
      circle.setAttribute('r', '4');
      circle.setAttribute('class', `user-dot user-dot-${user.signalCategory}`);
      circle.setAttribute('data-id', user.id);

      // Tooltip inspectability
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      const apInfo = user.assignedApId ? `${user.assignedApId} (${user.distance} units)` : 'No AP in range';
      title.textContent = `Client: ${user.id}\nServing: ${apInfo}\nSignal: ${user.signalCategory.toUpperCase()}`;
      circle.appendChild(title);

      fragment.appendChild(circle);
    });

    usersContainer.appendChild(fragment);
  }

  /**
   * Updates map markers and coverage circles based on AP state.
   */
  function updateMapMarkersAndCoverage() {
    accessPoints.forEach(ap => {
      const marker = document.getElementById(`marker-${ap.id.toLowerCase()}`);
      const covGroup = document.getElementById(`cov-${ap.id.toLowerCase()}`);

      if (marker) {
        marker.classList.remove('active', 'warning', 'danger', 'disabled');
        if (!ap.enabled) {
          marker.classList.add('disabled');
        } else {
          marker.classList.add(ap.status === 'danger' ? 'danger' : (ap.status === 'warning' ? 'warning' : 'active'));
        }
      }

      if (covGroup) {
        covGroup.classList.toggle('is-disabled', !ap.enabled);
      }
    });
  }

  /**
   * Updates the 4 KPI summary cards from single in-memory state.
   */
  function renderKpiCards() {
    // 1. Total Users
    if (valTotalUsers) valTotalUsers.textContent = users.length;
    if (subtextTotalUsers) {
      if (users.length === 0) {
        subtextTotalUsers.textContent = 'Network idle (0 active nodes)';
      } else {
        subtextTotalUsers.textContent = `${users.length} active student & faculty nodes`;
      }
    }

    // 2. Active Access Points
    const enabledCount = accessPoints.filter(a => a.enabled).length;
    if (valActiveAps) {
      valActiveAps.innerHTML = `${enabledCount} <span class="kpi-subvalue">/ ${accessPoints.length}</span>`;
    }
    if (subtextActiveAps) {
      const pct = Math.round((enabledCount / accessPoints.length) * 100);
      const dotColorClass = enabledCount === 4 ? 'dot-normal' : (enabledCount > 0 ? 'text-warning' : 'text-danger');
      subtextActiveAps.innerHTML = `<span class="status-indicator-dot ${dotColorClass}" aria-hidden="true"></span> ${pct}% AP fleet active`;
    }

    // 3. Average Signal Status
    if (valAvgSignal && subtextAvgSignal) {
      if (users.length === 0 || enabledCount === 0) {
        valAvgSignal.innerHTML = enabledCount === 0 && users.length > 0 ? 'Unavailable <span class="kpi-score" style="color:#ef4444">(0%)</span>' : 'N/A <span class="kpi-subvalue">(0 users)</span>';
        subtextAvgSignal.textContent = enabledCount === 0 ? 'All access points offline' : 'No active clients connected';
      } else {
        const strongCount = users.filter(u => u.signalCategory === 'strong').length;
        const mediumCount = users.filter(u => u.signalCategory === 'medium').length;
        const weakCount = users.filter(u => u.signalCategory === 'weak').length;

        // Signal Quality Score = weighted percentage
        const qualityScore = Math.round(((strongCount * 1.0 + mediumCount * 0.7 + weakCount * 0.3) / users.length) * 100);

        let qualityTag = 'Optimal';
        let qualityColor = '#10b981';

        if (qualityScore < 50) {
          qualityTag = 'Degraded';
          qualityColor = '#ef4444';
        } else if (qualityScore < 75) {
          qualityTag = 'Good';
          qualityColor = '#f59e0b';
        }

        valAvgSignal.innerHTML = `${qualityTag} <span class="kpi-score" style="color: ${qualityColor}">(${qualityScore}%)</span>`;
        subtextAvgSignal.textContent = `Strong: ${strongCount} | Med: ${mediumCount} | Weak: ${weakCount}`;
      }
    }

    // 4. Congestion Alerts
    const congestedAps = accessPoints.filter(a => a.enabled && a.status === 'danger');
    const warningAps = accessPoints.filter(a => a.enabled && a.status === 'warning');

    if (valCongestionAlerts && subtextCongestionAlerts) {
      if (congestedAps.length > 0) {
        valCongestionAlerts.textContent = `${congestedAps.length} Congested`;
        valCongestionAlerts.className = 'kpi-value text-danger';
        subtextCongestionAlerts.textContent = `${congestedAps.map(a => a.id).join(', ')} exceeded 90% capacity`;
      } else if (warningAps.length > 0) {
        valCongestionAlerts.textContent = `${warningAps.length} High Load`;
        valCongestionAlerts.className = 'kpi-value text-warning';
        subtextCongestionAlerts.textContent = `${warningAps.map(a => a.id).join(', ')} approaching limit (>=70%)`;
      } else {
        valCongestionAlerts.textContent = '0 Congested';
        valCongestionAlerts.className = 'kpi-value';
        subtextCongestionAlerts.textContent = 'All access points within limits';
      }
    }

    if (alertCounterBadge) {
      alertCounterBadge.textContent = `${congestedAps.length + warningAps.length} Active`;
    }
  }

  /**
   * Central render pipeline: recalculates and renders all UI components.
   */
  function recalculateAndRender() {
    recalculateSimulationState();
    renderKpiCards();
    renderApCards();
    renderSvgUsers();
    updateMapMarkersAndCoverage();
  }

  // --- 7. Event Logging Helper ---
  const alertFeedList = document.getElementById('alert-feed-list');

  function logAlert(message, type = 'info') {
    if (!alertFeedList) return;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const li = document.createElement('li');
    li.className = `alert-item ${type === 'danger' ? 'alert-warning' : (type === 'warning' ? 'alert-warning' : 'alert-info')}`;
    li.innerHTML = `
      <span class="alert-bullet" aria-hidden="true">${type === 'danger' || type === 'warning' ? '⚠️' : 'ℹ️'}</span>
      <div class="alert-content">
        <span class="alert-timestamp">${timeStr}</span>
        <span class="alert-message">${message}</span>
      </div>
    `;
    alertFeedList.prepend(li);

    while (alertFeedList.children.length > 6) {
      alertFeedList.removeChild(alertFeedList.lastChild);
    }
  }

  // --- 8. Simulation Controls (Start, Pause, Reset, Slider) ---
  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnStep = document.getElementById('btn-step');
  const btnReset = document.getElementById('btn-reset');
  const simStateText = document.getElementById('sim-state-text');
  const populationSlider = document.getElementById('user-population-slider');
  const sliderCountBadge = document.getElementById('slider-user-count');

  function startSimulation() {
    if (isRunning) return;
    isRunning = true;

    btnStart.classList.add('btn-primary');
    btnStart.classList.remove('btn-secondary');
    btnPause.classList.remove('btn-primary');
    btnPause.classList.add('btn-secondary');

    if (simStateText) {
      simStateText.textContent = 'Active (Crowd Movement & Roam)';
      simStateText.style.color = '#10b981';
    }

    logAlert('Simulation started: Crowd movement and dynamic roam recalculation active.');

    // 60ms time-step for smooth observable drift
    animationInterval = setInterval(() => {
      updatePhysicsPositions();
      recalculateAndRender();
    }, 60);
  }

  function pauseSimulation() {
    if (!isRunning) return;
    isRunning = false;

    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }

    btnPause.classList.add('btn-primary');
    btnPause.classList.remove('btn-secondary');
    btnStart.classList.remove('btn-primary');
    btnStart.classList.add('btn-secondary');

    if (simStateText) {
      simStateText.textContent = 'Paused (State Frozen)';
      simStateText.style.color = '#f59e0b';
    }

    logAlert('Simulation paused.');
  }

  function stepSimulation() {
    if (isRunning) {
      pauseSimulation();
    }
    updatePhysicsPositions();
    recalculateAndRender();

    btnPause.classList.add('btn-primary');
    btnPause.classList.remove('btn-secondary');
    btnStart.classList.remove('btn-primary');
    btnStart.classList.add('btn-secondary');

    if (simStateText) {
      simStateText.textContent = 'Stepped (1 Frame Advanced)';
      simStateText.style.color = '#38bdf8';
    }

    logAlert('Simulation stepped forward by 1 discrete tick.');
  }

  function resetSimulation() {
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
    isRunning = false;

    // Reset AP state
    accessPoints = JSON.parse(JSON.stringify(INITIAL_ACCESS_POINTS));

    // Reset population
    users = [];
    userCounter = 1;
    for (let i = 0; i < 48; i++) {
      users.push(createSimulatedUser(i));
    }

    if (populationSlider) populationSlider.value = 48;
    if (sliderCountBadge) sliderCountBadge.textContent = '48 users';

    btnStart.classList.remove('btn-primary');
    btnStart.classList.add('btn-secondary');
    btnPause.classList.remove('btn-primary');
    btnPause.classList.add('btn-secondary');

    if (simStateText) {
      simStateText.textContent = 'Reset (Initial 48-User Baseline)';
      simStateText.style.color = '#38bdf8';
    }

    logAlert('Simulation reset to initial state (48 users, all APs online).');
    recalculateAndRender();
  }

  if (btnStart) btnStart.addEventListener('click', startSimulation);
  if (btnPause) btnPause.addEventListener('click', pauseSimulation);
  if (btnStep) btnStep.addEventListener('click', stepSimulation);
  if (btnReset) btnReset.addEventListener('click', resetSimulation);

  // User Population Slider
  if (populationSlider) {
    populationSlider.addEventListener('input', (e) => {
      const count = parseInt(e.target.value, 10);
      if (sliderCountBadge) sliderCountBadge.textContent = `${count} users`;
      setPopulationCount(count);
    });
  }

  // --- 9. Layer Toggles ---
  const toggleCoverage = document.getElementById('toggle-coverage');
  const toggleLabels = document.getElementById('toggle-labels');
  const toggleRings = document.getElementById('toggle-rings');
  const toggleUsers = document.getElementById('toggle-users');

  const layerCoverage = document.getElementById('layer-coverage');
  const layerLabels = document.getElementById('layer-labels');
  const layerRings = document.getElementById('layer-rings');

  if (toggleCoverage && layerCoverage) {
    toggleCoverage.addEventListener('change', (e) => {
      layerCoverage.classList.toggle('is-hidden', !e.target.checked);
    });
  }

  if (toggleLabels && layerLabels) {
    toggleLabels.addEventListener('change', (e) => {
      layerLabels.classList.toggle('is-hidden', !e.target.checked);
    });
  }

  if (toggleRings && layerRings) {
    toggleRings.addEventListener('change', (e) => {
      layerRings.classList.toggle('is-hidden', !e.target.checked);
    });
  }

  if (toggleUsers && usersContainer) {
    toggleUsers.addEventListener('change', (e) => {
      usersContainer.classList.toggle('is-hidden', !e.target.checked);
    });
  }

  // --- 10. Click AP Marker to Toggle Power or Highlight Card ---
  const apMarkers = document.querySelectorAll('.ap-marker');
  apMarkers.forEach(marker => {
    marker.addEventListener('click', () => {
      const apId = marker.getAttribute('data-id');
      const targetCard = document.getElementById(`card-${apId.toLowerCase()}`);
      if (targetCard) {
        document.querySelectorAll('.ap-card').forEach(c => c.style.outline = 'none');
        targetCard.style.outline = '2px solid #38bdf8';
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => {
          targetCard.style.outline = 'none';
        }, 1600);
      }
    });
  });

  // --- 11. Initial Startup ---
  // Seed initial 48 users
  for (let i = 0; i < 48; i++) {
    users.push(createSimulatedUser(i));
  }

  // Initial calculation and render
  recalculateAndRender();
  logAlert('<strong>Digital Twin Initialized:</strong> 4 APs configured in 900x550 space. Initial 48 users mapped.');
});
