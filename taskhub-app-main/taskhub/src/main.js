const { invoke } = window.__TAURI__.core;

let debugMsgEl;

async function signIn() {
  debugMsgEl.textContent = "Signing in...";

  const username = document.getElementById("signin-username").value;
  const password = document.getElementById("signin-password").value;

  try {
    // Call rust function.
    const response = await invoke("sign_in", { username, password });
    console.log(response);

    debugMsgEl.textContent = `Sign-in successful! User ID: ${response}`;
    // Redirect to the new page
    window.location.href = "newIndex.html";
    // window.location.href = "projectexample.html";
  } catch (error) {
    console.error("Sign-in error:", error);
    alert("Failed to sign in.");

    debugMsgEl.textContent = error;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  debugMsgEl = document.querySelector("#debug-msg");

  // Sign-in button click event listener
  document.querySelector("#signin-button").addEventListener("click", (e) => {
    e.preventDefault();
    signIn();
  });
});
