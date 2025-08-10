export function init() {
  window.currentLines.forEach(line => line.remove());
  window.currentLines = [];
  const { invoke } = window.__TAURI__.core;
  if (!invoke) {
    console.error('Tauri API nije dostupan');
    return;
  }

  // Helper function to show messages
  function showMessage(message, isSuccess = true) {
    const messageEl = document.getElementById('vaults-message');
    if (!messageEl) return;
    
    messageEl.textContent = message;
    messageEl.classList.remove('success', 'error', 'hidden');
    messageEl.classList.add(isSuccess ? 'success' : 'error');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      messageEl.classList.add('hidden');
    }, 3000);
  }

  const vaultMenu = document.getElementById("vault-menu");
  const permissionsModal = document.getElementById("permissions-modal");
  const userSelect = document.getElementById("user-select");
  const cancelPermissions = document.getElementById("cancel-permissions");
  const vaultsContainer = document.querySelector(".vaults-container");
  const searchInput = document.getElementById("vault-search");
  const editPermissionsBtn = document.getElementById("edit-permissions");
  const renameVaultBtn = document.getElementById("rename-vault");
  const renameModal = document.getElementById("rename-modal");
  const renameInput = document.getElementById("rename-vault-input");
  const confirmRename = document.getElementById("confirm-rename");
  const cancelRename = document.getElementById("cancel-rename");
  const deleteVaultBtn = document.getElementById("delete-vault");
  

  let selectedVaultId = null;
  let allVaults = [];

  if (!vaultsContainer) {
    console.error("No .vaults-container found!");
    return;
  }

  // ========== Vault Loading Utilities ==========
  
  /**
   * Show vault loading overlay
   */
  function showVaultLoading(message = 'Loading...') {
    const loadingOverlay = document.getElementById('vault-loading-overlay');
    const loadingText = document.querySelector('.loading-text');
    
    if (loadingOverlay) {
      if (loadingText) {
        loadingText.textContent = message;
      }
      loadingOverlay.classList.remove('hidden');
      console.log('🔐 Vault loading started:', message);
    }
  }

  /**
   * Hide vault loading overlay
   */
  function hideVaultLoading() {
    const loadingOverlay = document.getElementById('vault-loading-overlay');
    
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
  }

  /**
   * Show loading for specific vault operation with custom message
   */
  function showLoadingWithMessage(message) {
    showVaultLoading(message);
  }

  async function loadVaults() {
    try {
      showVaultLoading('Loading vaults...');
      
      const vaults = await invoke("fetch_vaults");
      allVaults = vaults;
      renderVaults(vaults);
      
      hideVaultLoading();
    } catch (err) {
      console.error("Failed to load vaults:", err);
      hideVaultLoading();
      showMessage("Failed to load vaults: " + err, false);
    }
  }

  function renderVaults(vaults) {
    vaultsContainer.innerHTML = "";

    vaults.forEach((vault) => {
      const card = document.createElement("div");
      card.className = "vault-card";
      card.setAttribute("data-vault-id", vault.id);

      const header = document.createElement("div");
      header.className = "vault-header";

      const title = document.createElement("h3");
      title.className = "vault-name";
      title.innerHTML = `
          <div class="vault-icon-wrapper">
          <img src="../assets/images/lock.svg" alt="Lock" />
          </div>
          ${vault.name}
      `;

      const actions = document.createElement("div");
      actions.className = "card-actions";

      const expandImg = document.createElement("img");
      expandImg.src = "../assets/images/expand.svg";
      expandImg.alt = "Expand";

      expandImg.addEventListener("click", (e) => {
          e.stopPropagation();
          // This vault ID:
          const vaultId = vault.id;

          localStorage.setItem("currentVaultId", vaultId);

          // Navigate to dashboard.html, appending ?vaultId=someNumber
          window.loadDashboard(null, vaultId);
      });

      const moreImg = document.createElement("img");
      moreImg.src = "../assets/images/dots.svg";
      moreImg.alt = "More";

      actions.appendChild(expandImg);
      actions.appendChild(moreImg);

      header.appendChild(title);
      header.appendChild(actions);
      card.appendChild(header);

      const details = document.createElement("div");
      details.className = "vault-details";

      const createdItem = document.createElement("div");
      createdItem.className = "vault-detail-item";
      createdItem.innerHTML = `
        <img src="../assets/images/calendar.svg" alt="Created" style="width:16px; height:16px; margin-right:6px;" />
        Date created: <span class="vault-value">${formatDate(vault.createdDateTime)}</span>
      `;
      details.appendChild(createdItem);

      const updatedItem = document.createElement("div");
      updatedItem.className = "vault-detail-item";
      updatedItem.innerHTML = `
        <img src="../assets/images/calendar.svg" alt="Updated" style="width:16px; height:16px; margin-right:6px;" />
        Date updated: <span class="vault-value">${formatDate(vault.updatedDateTime || vault.createdDateTime)}</span>       
        `;
      details.appendChild(updatedItem);

      const usersItem = document.createElement("div");
      usersItem.className = "vault-detail-item";
      usersItem.innerHTML = `
        <img src="../assets/images/users.svg" alt="Users" style="width:16px; height:16px; margin-right:6px;" />
        No. of users: <span class="vault-value">${vault.numOfUsers || 0}</span>
      `;
      details.appendChild(usersItem);

      const storageRow = document.createElement("div");
      storageRow.className = "vault-storage-row";

      const storageLabel = document.createElement("div");
      storageLabel.className = "storage-label";
      storageLabel.innerHTML = `<span>Storage</span>`;

      const storageInfo = document.createElement("span");
      storageInfo.className = "storage-used-info";

      const used = vault.usedStorageInGb || 512;
      const total = vault.totalStorageInGb || 1024;
      const percent = Math.min((used / total) * 100, 100);
      storageInfo.textContent = `Used: ${used} GB / ${total} GB`;

      storageRow.appendChild(storageLabel);
      storageRow.appendChild(storageInfo);
      details.appendChild(storageRow);

      const barContainer = document.createElement("div");
      barContainer.className = "storage-bar-container";

      const bar = document.createElement("div");
      bar.className = "storage-bar";
      bar.style.width = `${percent}%`;

      barContainer.appendChild(bar);
      details.appendChild(barContainer);

      card.appendChild(details);
      vaultsContainer.appendChild(card);
    });
  }

  vaultsContainer.addEventListener("click", async (e) => {
    const moreImg = e.target.closest("img[alt='More']");
    if (!moreImg) return;

    e.stopPropagation();

    const vaultCard = moreImg.closest(".vault-card");
    if (!vaultCard) return;

    const vaultId = vaultCard.getAttribute("data-vault-id");
    if (!vaultId) return;

    selectedVaultId = parseInt(vaultId);
    vaultMenu.style.display = "block";
    vaultMenu.style.left = `${e.pageX}px`;
    vaultMenu.style.top = `${e.pageY}px`;
  });

  document.addEventListener("click", () => {
    vaultMenu.style.display = "none";
  });

  vaultMenu.addEventListener("click", (e) => e.stopPropagation());

  // New permission management
  const currentPermissionsList = document.getElementById("current-permissions-list");
  const addPermissionBtn = document.getElementById("add-permission-btn");
  const permissionTypeSelect = document.getElementById("permission-type-select");

  async function loadPermissions() {
    try {
      showVaultLoading('Loading permissions...');
      const permissions = await invoke("get_vault_permissions", { vaultId: selectedVaultId });
      const currentUserId = await invoke("get_current_user_id");
      
      
      // Clear the entire permissions list first
      currentPermissionsList.innerHTML = "";
      
      // Remove duplicates based on userId (keep the latest one)
      const uniquePermissions = permissions.reduce((acc, perm) => {
        acc[perm.userId] = perm;
        return acc;
      }, {});
      
      Object.values(uniquePermissions).forEach(perm => {
        const permItem = document.createElement("div");
        permItem.classList.add("permission-item");
        
        const isCurrentUser = perm.userId === currentUserId;
        
        permItem.innerHTML = `
          <span class="user-info">${perm.userFullName}${isCurrentUser ? " (You)" : ""}</span>
          <select class="permission-type-select" data-user-id="${perm.userId}" ${isCurrentUser ? 'disabled' : ''}>
            <option value="read" ${perm.permissionType === 'read' ? 'selected' : ''}>Read</option>
            <option value="write" ${perm.permissionType === 'write' ? 'selected' : ''}>Write</option>
          </select>
          ${!isCurrentUser ? `<button class="remove-btn" data-user-id="${perm.userId}">Remove</button>` : ''}
        `;
        
        currentPermissionsList.appendChild(permItem);
      });
      
      // Add click handlers for remove buttons
      currentPermissionsList.querySelectorAll(".remove-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const userId = parseInt(e.target.dataset.userId);
          await removePermission(userId);
        });
      });
      
      // Add change handlers for permission type selects
      currentPermissionsList.querySelectorAll(".permission-type-select").forEach(select => {
        select.addEventListener("change", async (e) => {
          const userId = parseInt(e.target.dataset.userId);
          const newPermissionType = e.target.value;
          await updatePermission(userId, newPermissionType);
        });
      });
      
      // Update the user dropdown to exclude users who already have permissions
      await updateUserDropdown(Object.values(uniquePermissions));
      
    } catch (err) {
      console.error("Failed to load permissions:", err);
      showMessage(`Failed to load permissions: ${err}`, false);
    }
  }

  async function updateUserDropdown(existingPermissions) {
    userSelect.innerHTML = '<option value="">Select a user...</option>';
    
    const allUsers = await invoke("get_all_users_for_company", { companyId: 1 });
    const currentUserId = await invoke("get_current_user_id");
    
    const existingUserIds = existingPermissions.map(p => p.userId);
    
    allUsers.forEach(user => {
      if (user[0] !== currentUserId && !existingUserIds.includes(user[0])) {
        const option = document.createElement("option");
        option.value = user[0];
        option.textContent = user[1];
        userSelect.appendChild(option);
      }
    });
  }

  async function updatePermission(userId, newPermissionType) {
    try {
      await invoke("update_vault_user", {
        vaultId: selectedVaultId,
        userId: userId,
        permissionType: newPermissionType
      });
      
      showMessage("Permission updated successfully!");
      // Don't reload permissions to avoid losing user's focus
    } catch (err) {
      console.error("Failed to update permission:", err);
      showMessage(`Failed to update permission: ${err}`, false);
      // Reload to revert the change in UI
      await loadPermissions();
    }
  }

  async function removePermission(userId) {
    try {
      await invoke("remove_vault_permission", {
        vaultId: selectedVaultId,
        userId: userId
      });
      
      showMessage("Permission removed successfully!");
      await loadPermissions();
      
      // Reload vaults to update user count
      loadVaults();
    } catch (err) {
      console.error("Failed to remove permission:", err);
      showMessage(`Failed to remove permission: ${err}`, false);
    }
  }

  editPermissionsBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    vaultMenu.style.display = "none";
    
    permissionsModal.style.display = "flex";
    await loadPermissions();
  });

  cancelPermissions.addEventListener("click", () => {
    permissionsModal.style.display = "none";
  });

  addPermissionBtn.addEventListener("click", async () => {
    const selectedUserId = parseInt(userSelect.value);
    const selectedPermissionType = permissionTypeSelect.value;
    
    if (!selectedUserId) {
      showMessage("Please select a user", false);
      return;
    }
    
    try {
      showVaultLoading('Adding permission...');
      await invoke("update_vault_user", {
        vaultId: selectedVaultId,
        userId: selectedUserId,
        permissionType: selectedPermissionType
      });
      
      showMessage("Permission added successfully!");
      hideVaultLoading();
      await loadPermissions();
      
      // Reload vaults to update user count
      loadVaults();
    } catch (err) {
      console.error("Failed to add permission:", err);
      hideVaultLoading();
      showMessage(`Failed to add permission: ${err}`, false);
    }
  });

  // Rename vault functionality
  renameVaultBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    vaultMenu.style.display = "none";

    // Get the current vault name
    const currentVault = allVaults.find(v => v.id === selectedVaultId);
    if (currentVault) {
      renameInput.value = currentVault.name;
    }

    renameModal.style.display = "flex";
    renameInput.focus();
    renameInput.select();
  });

  cancelRename.addEventListener("click", () => {
    renameModal.style.display = "none";
    renameInput.value = "";
  });

  confirmRename.addEventListener("click", async () => {
    const newName = renameInput.value.trim();
    if (!newName) {
      showMessage("Please enter a vault name", false);
      return;
    }

    try {
      showVaultLoading('Renaming vault...');
      await invoke("rename_vault", {
        vaultId: selectedVaultId,
        newName: newName
      });

      renameModal.style.display = "none";
      showMessage("Vault renamed successfully!");
      hideVaultLoading();
      
      // Reload vaults to show the updated name
      loadVaults();
    } catch (err) {
      console.error("Failed to rename vault:", err);
      hideVaultLoading();
      showMessage(`Failed to rename vault: ${err}`, false);
    }
  });

  // Handle Enter key in rename input
  renameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      confirmRename.click();
    }
  });

  // Get modal elements
  const deleteVaultModal = document.getElementById("delete-vault-modal");
  const confirmDelete = document.getElementById("confirm-delete");
  const cancelDelete = document.getElementById("cancel-delete");

  deleteVaultBtn?.addEventListener("click", async (e) => {
    e.stopPropagation();
    vaultMenu.style.display = "none";
    
    // Show the delete confirmation modal
    deleteVaultModal.style.display = "flex";
  });

  // Handle delete confirmation
  confirmDelete?.addEventListener("click", async () => {
    deleteVaultModal.style.display = "none";
    
    try {
      showVaultLoading('Deleting vault...');
      await invoke("delete_vault", { vaultId: selectedVaultId });
      showMessage("Vault deleted successfully!");
      hideVaultLoading();
      loadVaults();
    } catch (err) {
      console.error("Failed to delete vault:", err);
      hideVaultLoading();
      showMessage(`Failed to delete vault: ${err}`, false);
    }
  });

  // Handle delete cancellation
  cancelDelete?.addEventListener("click", () => {
    deleteVaultModal.style.display = "none";
  });

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = allVaults.filter(v =>
        v.name.toLowerCase().includes(term)
      );
      renderVaults(filtered);
    });
  }

  const addVaultBtn = document.getElementById("add-vault-button");
  const vaultModal = document.getElementById("vault-modal");
  const vaultNameInput = document.getElementById("vault-name-input");
  const confirmVault = document.getElementById("confirm-vault");
  // const cancelVault = document.getElementById("cancel-vault");
  const cancelVaults = document.querySelectorAll(".cancel-vault");

  if (addVaultBtn) {
    addVaultBtn.addEventListener("click", () => {
      vaultModal.style.display = "flex";
    });
  }

  if (cancelVaults.length > 0) {
  cancelVaults.forEach(cancelButton => {
    cancelButton.addEventListener("click", () => {
      vaultModal.style.display = "none";
    });
  });
}

  if (confirmVault) {
    confirmVault.addEventListener("click", async () => {
      const vaultName = vaultNameInput.value.trim();
      if (!vaultName) {
        return;
      }

      const userId = await invoke("get_current_user_id");
      try {
        showVaultLoading('Creating vault...');
        await invoke("create_vault", {
          name: vaultName,
          createdBy: userId,
          createdByName: "d"
        });
        vaultModal.style.display = "none";
        vaultNameInput.value = "";
        showMessage("Vault created successfully!");
        hideVaultLoading();
        loadVaults();
      } catch (err) {
        console.error(err);
        hideVaultLoading();
        showMessage("Failed to create vault: " + err, false);
      }
    });
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  // Initial load with loading indicator
  loadVaults();
}
