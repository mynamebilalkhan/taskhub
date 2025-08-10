const { invoke } = window.__TAURI__.core;
window.currentLines = [];
window.addEventListener("DOMContentLoaded", () => {

  // Sign-in button click event listener
    document.querySelector("#menu-settings-button").addEventListener("click", (e) => {
    e.preventDefault();
    console.log("Settings button clicked!");
    window.location.href = "settings.html";
    });
    document.querySelector("#menu-my-project-button").addEventListener("click", (e) => {
        e.preventDefault();
        console.log("my button clicked!");
        window.location.href = "myvaults.html";
    });
    document.querySelector("#menu-all-projects-button").addEventListener("click", (e) => {
        e.preventDefault();
        console.log("all button clicked!");
        window.location.href = "mainwindow.html";
    });
    document.querySelector("#menu-dashboard-button").addEventListener("click", (e) => {
        e.preventDefault();
        console.log("dashboard button clicked!");
        window.location.href = "dashboard.html";
    });
});
