export function init() {
  window.currentLines.forEach(line => line.remove());
  window.currentLines = [];
  const { invoke } = window.__TAURI__.core;
  if (!invoke) {
    console.error('Tauri API not available');
    return;
  }

  console.log("Initializing Settings page...");

  // Helper function to show messages
  function showMessage(message, isSuccess = true, elementId = 'settings-message') {
    const messageEl = document.getElementById(elementId);
    if (!messageEl) return;
    
    messageEl.textContent = message;
    messageEl.classList.remove('success', 'error', 'hidden');
    messageEl.classList.add(isSuccess ? 'success' : 'error');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      messageEl.classList.add('hidden');
    }, 3000);
  }

  // Load user profile data on init
  async function loadUserProfile() {
    try {
      const profile = await invoke('get_user_profile');
      if (profile) {
        const usernameInput = document.getElementById('username-input');
        
        if (usernameInput) usernameInput.value = profile.username || '';
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
      showMessage('Failed to load user profile', false, 'general-message');
    }
  }

  // Load profile data when page loads
  loadUserProfile();

  const menuItems = document.querySelectorAll(".settings-menu-item");
  const panels = document.querySelectorAll(".settings-panel");

  // Helper: switch visible panel
  function switchPanel(panelId) {
    panels.forEach((panel) => panel.classList.add("hidden"));
    const activePanel = document.querySelector(`#panel-${panelId}`);
    if (activePanel) activePanel.classList.remove("hidden");

    // Update sidebar highlight
    menuItems.forEach((item) => item.classList.remove("active"));
    const activeItem = document.querySelector(`[data-panel="${panelId}"]`);
    if (activeItem) activeItem.classList.add("active");
  }

  // Attach click events for the left sidebar
  menuItems.forEach((item) => {
    item.addEventListener("click", () => {
      switchPanel(item.dataset.panel);
    });
  });

  // Default to "account"
  switchPanel("account");

  // Handle plan card selection
  const planCards = document.querySelectorAll(".plan-card");
  planCards.forEach((card) => {
    // Entire card is clickable to *select* the plan
    card.addEventListener("click", () => {
      // remove 'selected' from all
      planCards.forEach((c) => c.classList.remove("selected"));
      // highlight the clicked one
      card.classList.add("selected");
      console.log("Plan selected:", getPlanName(card));
    });

    // But the plan button is for "Confirm / Upgrade / Purchase"
    const planButton = card.querySelector(".plan-button");
    if (planButton) {
      // planButton click handler
      planButton.addEventListener("click", (event) => {
        event.stopPropagation(); // prevents also triggering card click
        const planName = getPlanName(card);

        console.log("Upgrade button clicked for plan:", planName);

        // Show message instead of calling Rust function for now
        showMessage("Paying will be available soon, when app is registered with Stripe");
        
        // Original code commented out for future use:
        // invoke("set_current_user_plan", { planName })
        //   .then((checkoutUrl) => {
        //     console.log("Rust responded to set_current_user_plan:", checkoutUrl);
        //     window.open(checkoutUrl, "_blank");
        //   })
        //   .catch((err) => {
        //     console.error("Error calling set_current_user_plan:", err);
        //   });
      });
    }


    // ─── O365 Integration ──────────────────────────────────────────────────────
    // Grab the O365 card, its input and button
    const o365Card = document.querySelector('#panel-account .settings-card');
    const azureInput = o365Card.querySelector('input[type="text"]');
    const connectBtn = o365Card.querySelector('.connect-o365-btn');
    const messageEl = document.getElementById('o365-message');

    invoke('get_external_username')
      .then((username) => {
        if (username) {
          azureInput.value = username;
          // messageEl.textContent = `Current: ${username}`;
        } else {
          // messageEl.textContent = 'No Azure Username set';
        }
      })
      .catch((e) => {
        console.error('Error loading existing Azure Username:', e);
        // messageEl.textContent = 'Error loading current username';
        // messageEl.classList.add('error');
      });

    connectBtn.addEventListener('click', async () => {
      const o365User = azureInput.value.trim();
      if (!o365User) {
        showMessage('Please enter your Azure Username before connecting.', false);
        return;
      }

      try {
        const success = await invoke('add_o365_user', { o365User });

        if (success) {
          showMessage('Office 365 account successfully connected!');
          // Clear the old inline message if it exists
          messageEl.textContent = '';
          messageEl.classList.remove('error', 'success');
        } else {
          showMessage('Failed to connect Office 365 account. Please try again.', false);
        }
      } catch (err) {
        console.error('Failed to link O365 account:', err);
        showMessage(`Error: ${err}`, false);
      }
    });
    // ─────────────────────────────────────────────────────────────────────────────
    
    // Add click handlers for Save and Reset buttons
    const saveBtn = document.getElementById('save-profile-btn');
    const resetBtn = document.getElementById('reset-password-btn');
    
    // Handle profile save
    saveBtn?.addEventListener('click', async () => {
      const usernameInput = document.getElementById('username-input');
      
      const username = usernameInput?.value.trim();
      
      if (!username) {
        showMessage('Please enter a username', false, 'general-message');
        return;
      }
      
      try {
        // Get current email from profile to preserve it
        const profile = await invoke('get_user_profile');
        const email = profile?.email || '';
        
        const success = await invoke('update_user_profile', { username, email });
        if (success) {
          showMessage('Username updated successfully!', true, 'general-message');
        } else {
          showMessage('Failed to update username', false, 'general-message');
        }
      } catch (err) {
        console.error('Failed to update profile:', err);
        showMessage(`Error: ${err}`, false, 'general-message');
      }
    });
    
    // Handle password reset
    resetBtn?.addEventListener('click', async () => {
      // Show "coming soon" message
      showMessage('Password reset will be added soon', false, 'security-message');
      
      // Clear the password fields
      const currentPasswordInput = document.getElementById('current-password-input');
      const newPasswordInput = document.getElementById('new-password-input');
      const confirmPasswordInput = document.getElementById('confirm-password-input');
      
      if (currentPasswordInput) currentPasswordInput.value = '';
      if (newPasswordInput) newPasswordInput.value = '';
      if (confirmPasswordInput) confirmPasswordInput.value = '';
    });
  });

  /**
   * Helper to read the plan's name from the .plan-title
   */
  function getPlanName(cardElement) {
    const planTitleElem = cardElement.querySelector(".plan-title");
    return planTitleElem ? planTitleElem.textContent.trim() : "Unknown Plan";
  }
    
}


// Subscription Plan

    const planOptions = document.querySelectorAll('.plan-option');
    planOptions.forEach(option => {
        option.addEventListener('click', () => {
            planOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            option.querySelector('input[type="radio"]').checked = true;
        });
    });

    // storage plan
       const modal = document.getElementById('upgradeModal');
        const openBtn = document.getElementById('open-upgrade-storage');
        const storageSelect = document.getElementById('storage');
        const priceSpan = document.getElementById('price');

        // Storage pricing
        const pricing = {
            '50GB': 15,
            '100GB': 25,
            '250GB': 50,
            '500GB': 75,
            '1TB': 100,
            '2TB': 180,
            '5TB': 400,
            '10TB': 750
        };

        // Open modal when button is clicked
        openBtn.addEventListener('click', function() {
            openModal();
        });

        // Close modal when clicking outside of it
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });

        function openModal() {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        function closeModal() {
            modal.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
            
            // Reset form
            storageSelect.value = '';
            priceSpan.textContent = '$0';
        }

        function updatePrice() {
            const selectedStorage = storageSelect.value;
            const price = pricing[selectedStorage] || 0;
            priceSpan.textContent = `$${price}`;
        }

        function upgrade() {
            const selectedStorage = storageSelect.value;
            
            if (!selectedStorage) {
                alert('Please select a storage option');
                return;
            }
            
            const price = pricing[selectedStorage];
            
            // Simulate upgrade process
            alert(`Upgrading to ${selectedStorage} for $${price}/month...`);
            closeModal();
            
            // Here you would typically send the data to your server
            console.log('Upgrade details:', {
                storage: selectedStorage,
                price: price
            });
        }