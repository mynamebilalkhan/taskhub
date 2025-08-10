// js/subscription.js
export function init() {
  window.currentLines.forEach(line => line.remove());
  window.currentLines = [];
  console.log("Initializing Subscription page...");
  // If you want to handle any dynamic logic or events for your subscription plans, do it here.
  // E.g., capturing clicks on a .plan-button, etc.
}
