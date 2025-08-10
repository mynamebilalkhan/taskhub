const { invoke } = window.__TAURI__.core;

let debugMsgEl;

async function signUp() {
  debugMsgEl.textContent = "Signing up...";

  const firstname = document.getElementById("signup-firstname").value;
  const lastname = document.getElementById("signup-lastname").value;
  const username = document.getElementById("signup-username").value;
  const password = document.getElementById("signup-password").value;
  // const companyName = document.getElementById("signup-company").value;
  const companyName = "freelance";

  if (!isValidPassword(password)) {
    debugMsgEl.textContent =
      "Password must be at least 8 characters long and contain at least one uppercase letter.";
    return;
  }

  try {
    // Calls your Rust command "register_user"
    const result = await invoke("register_user", {
      username,
      password,
      firstname,
      lastname,
      companyName
    });

    if (result === true) {
      debugMsgEl.textContent = "Sign-up successful!";
      // window.location.href = "index.html";
    } else {
      debugMsgEl.textContent = "Sign-up failed. Please try again.";
    }
  } catch (error) {
    console.error("Sign-up error:", error);
    debugMsgEl.textContent = `Error: ${error}`;
  }
}

// Helper function to validate the password
function isValidPassword(pwd) {
  // 1) Must be at least 8 characters
  if (pwd.length < 8) {
    return false;
  }
  // 2) Must have at least one uppercase letter
  const uppercaseRegex = /[A-Z]/;
  if (!uppercaseRegex.test(pwd)) {
    return false;
  }
  return true;
}

window.addEventListener("DOMContentLoaded", () => {
  debugMsgEl = document.querySelector("#debug-msg");

  document.querySelector("#signup-button").addEventListener("click", (e) => {
    e.preventDefault();
    signUp();
  });
});
