const { invoke } = window.__TAURI__.core;

window.currentLines = [];

function setActiveMenuItem(clickedLi) {
    document.querySelectorAll('.menu li').forEach(li => li.classList.remove('active'));
    clickedLi.classList.add('active');
  }
  
  window.loadDashboard = async function (event, vaultId) {
    // If event is present and is a click, set active
    if (event instanceof PointerEvent) {
      setActiveMenuItem(event.currentTarget);
    } else {
      const firstLi = document.querySelector('.menu li');
      if (firstLi) setActiveMenuItem(firstLi);
    }

    // Close all existing tabs before loading new vault
    if (window.closeAllTabs) {
      window.closeAllTabs();
    }

    // 1) Fetch the dashboard HTML partial
    const res = await fetch('pages/dashboard.html');
    const html = await res.text();
    document.querySelector('#main-content').innerHTML = html;

    // 2) Dynamically import dashboard.js
    const { init } = await import('./dashboard.js');

    // 3) Pass the vaultId to `init()`
    init(vaultId);
  };
  
  window.loadVaults = async function (event) {
    if (event?.currentTarget) setActiveMenuItem(event.currentTarget);
    const res = await fetch('pages/myvaults.html');
    const html = await res.text();
    document.querySelector('#main-content').innerHTML = html;
    const { init } = await import('./myvaults.js');
    init();
  };
  
  // Placeholder for future menu items
  window.loadSpeedometer = async function (event) {
    if (event?.currentTarget) setActiveMenuItem(event.currentTarget);
    console.log("Loading speedometer page...");
  };
  
  window.loadCalendar = async function (event) {
    if (event?.currentTarget) setActiveMenuItem(event.currentTarget);
    try {
      const res = await fetch('pages/calendar.html');
      const html = await res.text();
      document.querySelector('#main-content').innerHTML = html;
  
      const { init } = await import('./calendar.js');
      init();
    } catch (err) {
      console.error("Error loading calendar page:", err);
    }
  };
  
window.loadSettings = async function (event) {
  if (event?.currentTarget) setActiveMenuItem(event.currentTarget);
  try {
    const res = await fetch('pages/settings.html');
    const html = await res.text();
    document.querySelector('#main-content').innerHTML = html;

    // Dynamically import the script
    const { init } = await import('./settings.js');
    init();
  } catch (err) {
    console.error("Error loading settings page:", err);
  }
};

window.loadSubscription = async function (event) {
  if (event?.currentTarget) setActiveMenuItem(event.currentTarget);
  try {
    const res = await fetch('pages/subscription.html');
    const html = await res.text();
    document.querySelector('#main-content').innerHTML = html;

    // Dynamically import the script
    const { init } = await import('./subscription.js');
    init();
  } catch (err) {
    console.error("Error loading subscription page:", err);
  }
};

window.logout = async function (event) {
  try {
    await invoke("sign_out");
    // Clear session data (example: remove token from localStorage)
    // localStorage.removeItem('authToken');

    // Redirect to the login page
    window.location.href = 'index.html';
  } catch (error) {
    console.error("Sign-out error:", error);
    alert("Failed to sign out.");
  }
};

window.addEventListener('DOMContentLoaded', () => {
  window.loadVaults();
});