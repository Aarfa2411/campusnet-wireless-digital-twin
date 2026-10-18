/**
 * CampusNet Digital Twin - Authentication Module (Demo Auth)
 * Client-side session management using sessionStorage / localStorage
 */

const DemoAuth = (() => {
  const SESSION_KEY = 'campusnet_demo_user';

  // Configured demonstration accounts (Clearly documented as client-side demo credentials)
  const DEMO_USERS = [
    {
      email: 'admin@campus.edu',
      password: 'admin123',
      name: 'Dr. Sarah Jenkins',
      role: 'Administrator',
      avatar: 'SJ'
    },
    {
      email: 'operator@campus.edu',
      password: 'operator123',
      name: 'Alex Rivera',
      role: 'Network Operator',
      avatar: 'AR'
    }
  ];

  function getCurrentUser() {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Error reading auth session:', e);
      return null;
    }
  }

  function login(email, password, rememberMe = false) {
    const user = DEMO_USERS.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );

    if (user) {
      const sessionData = {
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        loginTime: new Date().toISOString()
      };

      if (rememberMe) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      }

      // Record login event in shared alert state
      if (window.CampusState) {
        window.CampusState.addAlert(`User logged in: ${user.name} (${user.role})`, 'info', 'AUTH');
      }

      return { success: true, user: sessionData };
    }

    return {
      success: false,
      message: 'Invalid email or password. Please use the documented demo credentials.'
    };
  }

  function logout() {
    const user = getCurrentUser();
    if (user && window.CampusState) {
      window.CampusState.addAlert(`User logged out: ${user.name}`, 'info', 'AUTH');
    }

    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
  }

  /**
   * Protects pages: redirects unauthenticated users to login.html
   */
  function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
      const currentPath = encodeURIComponent(window.location.pathname.split('/').pop() || 'dashboard.html');
      window.location.href = `login.html?redirect=${currentPath}`;
      return null;
    }

    // Populate user profile info in top bar if present
    document.addEventListener('DOMContentLoaded', () => {
      populateUserUI(user);
    });

    return user;
  }

  function populateUserUI(user) {
    const nameEl = document.getElementById('user-profile-name');
    const roleEl = document.getElementById('user-profile-role');
    const avatarEl = document.getElementById('user-profile-avatar');
    const logoutBtn = document.getElementById('btn-logout');

    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role;
    if (avatarEl) avatarEl.textContent = user.avatar;

    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    }
  }

  return {
    getCurrentUser,
    login,
    logout,
    requireAuth,
    DEMO_USERS
  };
})();

window.DemoAuth = DemoAuth;
