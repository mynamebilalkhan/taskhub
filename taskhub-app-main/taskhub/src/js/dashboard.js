let documentsRootId = null;
let singleVaultId;
export function init(vaultIdParam) {
  window.currentLines.forEach(line => line.remove());
  window.currentLines = [];
  const { invoke } = window.__TAURI__.core;
  if (!invoke) {
    console.error('Tauri API not present');
    return;
  }

  const filterIcon = document.getElementById("filter-icon");
  const filterDropdown = document.getElementById("filterDropdown");

  filterIcon?.addEventListener("click", function (event) {
    filterDropdown.classList.toggle("show");
    event.stopPropagation();
  });

  // Close dropdown when clicking outside
  window.addEventListener('click', function (e) {
    if (!filterIcon?.contains(e.target) && !filterDropdown?.contains(e.target)) {
      filterDropdown?.classList.remove('show');
    }
  });




  if (vaultIdParam) {
    singleVaultId = parseInt(vaultIdParam, 10);
  } else {
    const stored = localStorage.getItem("currentVaultId");
    singleVaultId = stored ? parseInt(stored, 10) : null;
  }

  function disableScroll() {
    document.body.style.overflow = 'hidden';
  }

  function enableScroll() {
    document.body.style.overflow = '';
  }

  // TODO: This should be present if in workspace only, right????
  // Blue button:
  const fabBtn = document.querySelector(".fab");
  const fabMenu = document.getElementById("fab-menu");

  fabBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    fabMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    const clickedFab = e.target.closest(".fab");
    const clickedMenu = e.target.closest("#fab-menu");

    if (!clickedFab && !clickedMenu) {
      fabMenu.classList.add("hidden");
    }
  });
  document.getElementById("footer-add-folder").addEventListener("click", async () => {
    const userId = await invoke("get_current_user_id");

    // Show the custom prompt
    const folderName = await showCustomPrompt({
      title: "Add Folder",
      label: "Folder Name:",
      okText: "Create",
      defaultValue: ""
    });
    if (!folderName) return;

    await invoke("create_folder_for_vault", {
      name: folderName,
      createdBy: userId,
      createdByUser: "demo",
      parentId: documentsRootId,
      vaultId: singleVaultId.toString(),
    });

    loadTreeView(); // refresh after adding
  });
  // async function addFileFromFAB(isImage = false) {
  //   // 1) see if something is selected in the tree
  //   const selected = document.querySelector('.active-label');
  //   if (!selected) {
  //     return;
  //   }

  //   // 2) check if it’s a folder
  //   if (!selected.classList.contains('folder-label')) {
  //     return;
  //   }

  //   // 3) read the folderId, etc.
  //   const folderId = parseInt(selected.dataset.folderId, 10);
  //   if (!folderId) {
  //     return;
  //   }

  //   try {
  //     // 4) Tauri "open_single_file_picker"
  //     const filePath = await invoke("open_single_file_picker");
  //     if (!filePath) {
  //       // user canceled
  //       return;
  //     }

  //     // 5) Extract filename
  //     const fileName = filePath.split(/[\\/]/).pop() ?? "";

  //     // If we want an image, check extension
  //     if (isImage) {
  //       const ext = fileName.toLowerCase().split('.').pop();
  //       const validExtensions = ["jpg", "jpeg", "png"];
  //       if (!validExtensions.includes(ext)) {
  //         console.log("Please select an image file");
  //         return;
  //       }
  //     }

  //     // 6) Read file contents as base64
  //     const fileContents = await invoke("read_file_as_base64", {
  //       path: filePath
  //     });

  //     // 7) pass to your Rust command to create the file
  //     const userId = await invoke("get_current_user_id");
  //     await invoke("create_file_for_folder", {
  //       name: fileName,
  //       path: `/${folderId}/`,
  //       folderId,
  //       createdBy: userId,
  //       createdByUser: "demo",
  //       fileContentsBase64: fileContents,
  //     });

  //     // 8) Refresh your tree
  //     loadTreeView();
  //     ensureAddTabButton();
  //   } catch (err) {
  //     console.error("Error adding file from FAB:", err);
  //   }
  // }

  async function addFileFromFAB(isImage = false) {
    try {
      // Check if we're in a workspace context
      const activeTab = document.querySelector(".tab.active");
      if (!activeTab) {
        console.warn('⚠️ No active tab found for file upload');
        return;
      }
      
      // Get workspace ID from the active tab
      const workspaceId = activeTab.dataset.workspaceId;
      if (!workspaceId) {
        console.warn('⚠️ No workspace ID found for file upload');
        return;
      }
      
      // Check if there's an active page tab within the workspace
      const activePageTab = document.querySelector(".workspace-tab.active");
      const pageId = activePageTab ? parseInt(activePageTab.dataset.pageId) : null;

      // 4) Tauri "open_single_file_picker"
      const filePath = await invoke("open_single_file_picker");
      if (!filePath) {
        // user canceled
        return;
      }

      // Log the file path
      console.log("File path:", filePath);

      // 5) Extract filename
      const fileName = filePath.split(/[\\/]/).pop() ?? "";

      // File type validation
      const allowedExtensions = ["pdf", "xlsx", "doc", "docx", "txt"];
      const fileExtension = fileName.split('.').pop().toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        alert("Please select a valid file type: pdf, xlsx, doc, docx, txt");
        return;
      }

      // 6) Use Tauri command to upload file directly
       // The file path will be passed to the Rust side which will handle reading and uploading
      console.log("Calling Tauri upload_file command");
      
      // Convert pageId and workspaceId to strings for the Tauri command
      const pageIdStr = pageId ? pageId.toString() : null;
      const workspaceIdStr = workspaceId ? workspaceId.toString() : null;
      
      try {
        const result = await invoke("upload_file", {
          filePath: filePath,
          fileName: fileName,
          pageId: pageIdStr,
          workspaceId: workspaceIdStr
        });
        
        console.log("Upload result:", result);
        
        if (!result) {
          throw new Error("Upload failed");
        }
        
        // Create a file object from the result
        const fileObject = {
          id: result.id || result.fileId || Date.now(), // Use appropriate ID from result or fallback
          name: fileName,
          path: result.path || filePath,
          createdDateTime: new Date().toISOString(),
          createdByUser: window.currentUser?.displayName || 'You'
        };
        
        // Render the new file as a draggable block
        await renderNewFile(fileObject, pageId);
      } catch (error) {
        console.error("Error uploading file:", error);
        throw new Error(`Upload failed: ${error}`);
      }
      
      // File upload completed successfully
       console.log("File upload completed successfully");

      // 10) Refresh your tree
      loadTreeView();
      ensureAddTabButton();
    } catch (err) {
      console.error("Error adding file from FAB:", err);
    }
  }

  async function addImageFromFAB(pageId) {

    try {
      // 4) Tauri "open_single_file_picker"
      const filePath = await invoke("open_single_file_picker");
      if (!filePath) {
        // user canceled
        return;
      }

      // 5) Extract filename
      const fileName = filePath.split(/[\\/]/).pop() ?? "";

      // If we want an image, check extension
      const ext = fileName.toLowerCase().split('.').pop();
      const validExtensions = ["jpg", "jpeg", "png"];
      if (!validExtensions.includes(ext)) {
        console.log("Please select an image file");
        return;
      }


      // 6) Read file contents as base64
      const fileContents = await invoke("read_file_as_base64", {
        path: filePath
      });

      // 7) pass to your Rust command to create the file
      let image = await invoke("create_image_for_page", {
        name: fileName,
        pageId: pageId,
        fileContentsBase64: fileContents,
      });
      await renderNewImage(image, pageId);
      
      // Trigger page reload for consistency
      console.log('🔄 Triggering page reload after image creation');
      try {
        if (window.reloadCurrentPageData) {
          await window.reloadCurrentPageData();
          console.log('✅ Page reloaded after image creation');
        }
      } catch (error) {
        console.log('Could not trigger page reload:', error);
      }

    } catch (err) {
      console.error("Error adding file from FAB:", err);
    }
  }
  fabMenu?.addEventListener("click", async (e) => {
    const item = e.target.closest(".fab-item");
    if (!item) return; // ignore clicks that aren't on a .fab-item

    // 1) close the menu
    fabMenu.classList.add("hidden");

    // 2) figure out which button was clicked
    const action = item.dataset.fabAction;
    switch (action) {
      case "tasklist":
        {
          const activeTab = document.querySelector(".workspace-tab.active");
          if (!activeTab) {
            return;
          }

          const workspaceId = document.querySelector(".tab.active")?.dataset.workspaceId;
          const tabPane = document.getElementById(`tab-${workspaceId}`);
          const pageWrapper = tabPane?.querySelector(".page-content-wrapper");

          if (!pageWrapper) {
            console.warn("No page wrapper found for task modal.");
            return;
          }

          const taskModal = pageWrapper.querySelector("#add-task-modal");
          if (!taskModal) {
            return;
          }
          pageWrapper.classList.remove("hidden");
          taskModal.classList.remove("hidden");

          const input = taskModal.querySelector("#task-title");
          if (input) input.focus();
          break;
        }
      case "card":
      case "card":
        {
          const activePageTab = document.querySelector(".workspace-tab.active");
          if (!activePageTab) {
            return;
          }

          const workspaceId = document.querySelector(".tab.active")?.dataset.workspaceId;
          const tabPane = document.getElementById(`tab-${workspaceId}`);
          const pageWrapper = tabPane?.querySelector(".page-content-wrapper");

          if (!pageWrapper) {
            return;
          }

          try {
            const cardModal = pageWrapper.querySelector("#add-card-modal");
            pageWrapper.classList.remove("hidden");
            if (cardModal) {
              cardModal.classList.remove("hidden");
            } else {
              const module = await import("./page.js");
              if (module && module.openCardModal) {
                await module.openCardModal(pageWrapper);
              }
            }
          } catch (err) {
            console.error("Failed to open card modal:", err);
          }
        }
        break;
      case "image":
        const activePageTab = document.querySelector(".workspace-tab.active");
        if (!activePageTab) {
          console.warn('⚠️ No active workspace tab found for image creation');
          return;
        }
        const pageId = parseInt(activePageTab.dataset.pageId);
        console.log('🖼️ Creating image for page ID:', pageId, 'from tab:', activePageTab.textContent);

        if (!pageId || isNaN(pageId)) {
          console.error('❌ Invalid page ID for image creation:', pageId);
          return;
        }

        await addImageFromFAB(pageId);
        break;
      case "file":
        await addFileFromFAB(false);
        break;
      case "note":
        {
          const activePageTab = document.querySelector(".workspace-tab.active");
          if (!activePageTab) {
            console.warn('⚠️ No active workspace tab found for note creation');
            return;
          }

          const pageId = parseInt(activePageTab.dataset.pageId);
          console.log('📝 Creating note for page ID:', pageId, 'from tab:', activePageTab.textContent);
          
          if (!pageId || isNaN(pageId)) {
            console.error('❌ Invalid page ID for note creation:', pageId);
            return;
          }

          const workspaceId = document.querySelector(".tab.active")?.dataset.workspaceId;
          const tabPane = document.getElementById(`tab-${workspaceId}`);
          const pageWrapper = tabPane?.querySelector(".page-content-wrapper");
          
          // If we're in workspace context, try to find the page wrapper differently
          let finalPageWrapper = pageWrapper;
          if (!finalPageWrapper) {
            // Try to find page wrapper in workspace context
            const workspaceContent = document.querySelector("#workspace-main-content .page-content-wrapper");
            if (workspaceContent) {
              finalPageWrapper = workspaceContent;
              console.log('📄 Found page wrapper in workspace context');
            }
          }
          
          if (!finalPageWrapper) {
            console.error('❌ No page wrapper found for note creation');
            return;
          }
          
          finalPageWrapper.classList.remove("hidden");
          const module = await import("./page.js");
          if (module && module.addEmptyNoteToPage) {
            console.log('🚀 Calling addEmptyNoteToPage with pageId:', pageId);
            await module.addEmptyNoteToPage(pageId, finalPageWrapper);
            console.log('✅ Note creation completed');
          }
        }
        break;
      case "page":
        {
          // Create a new page in the current workspace
          const activeWorkspaceTab = document.querySelector(".tab.active");
          const workspaceId = parseInt(activeWorkspaceTab?.dataset.workspaceId, 10);
          if (!workspaceId) {
            console.warn('⚠️ No active workspace for creating a page');
            break;
          }
          try {
            const name = await showCustomPrompt({
              title: "Add Page",
              label: "Page Title:",
              okText: "Create",
              defaultValue: "New Page"
            });
            if (!name) break;

            const newPage = await invoke("create_page_for_workspace", { name, workspaceId });

            // Try to switch to the new page tab if present
            const tabPane = document.getElementById(`tab-${workspaceId}`);
            const newTab = tabPane?.querySelector(`[data-page-id="${newPage.id}"]`);
            if (newTab) {
              newTab.click();
            } else if (window.switchToExistingPage) {
              // Fallback: load the page content directly
              const module = await import('./workspace.js');
              if (module && module.switchToExistingPage) {
                module.switchToExistingPage(newPage);
              }
            }
          } catch (err) {
            console.error('Failed to create page from FAB:', err);
          }
        }
        break;
      default:
        break;
    }
  });

  const contextMenu = document.getElementById("context-menu");
  let clickedNodeInfo = null;
  let currentSelectedWorkspaceId = null;

  // ========== Dashboard Loading Utilities ==========
  
  /**
   * Show dashboard loading overlay
   */
  function showDashboardLoading(message = 'Loading...') {
    const loadingOverlay = document.getElementById('dashboard-loading-overlay');
    const loadingText = document.querySelector('#dashboard-loading-overlay .loading-text');
    
    if (loadingOverlay) {
      if (loadingText) {
        loadingText.textContent = message;
      }
      loadingOverlay.classList.remove('hidden');
    }
  }

  /**
   * Hide dashboard loading overlay
   */
  function hideDashboardLoading() {
    const loadingOverlay = document.getElementById('dashboard-loading-overlay');
    
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
  }

  /**
   * Show loading for specific dashboard operation with custom message
   */
  function showLoadingWithMessage(message) {
    showDashboardLoading(message);
  }

  // Function to apply hierarchical restrictions to context menu
  function applyHierarchicalMenuRestrictions(elementType) {
    const menuItems = {
      'add-workspace': contextMenu.querySelector('button[data-action="add-workspace"]'),
      'webpage': contextMenu.querySelector('button[data-action="webpage"]'),
      'add-file': contextMenu.querySelector('button[data-action="add-file"]'),
      'add-folder': contextMenu.querySelector('button[data-action="add-folder"]'),
      'add-url': contextMenu.querySelector('button[data-action="add-url"]'),
      'add-file-o365': contextMenu.querySelector('button[data-action="add-file-o365"]'),
      'add-textbox': contextMenu.querySelector('button[data-action="add-textbox"]')
    };

    // Reset all items to hidden first
    Object.values(menuItems).forEach(item => {
      if (item) {
        item.style.display = 'none';
        item.style.pointerEvents = 'none';
      }
    });

    // Apply hierarchical rules
    switch (elementType) {
      case 'vault':
        // At vault level: Only allow folder creation
        if (menuItems['add-folder']) {
          menuItems['add-folder'].style.display = 'block';
          menuItems['add-folder'].style.pointerEvents = 'auto';
        }
        break;

      case 'folder':
        // At folder level: Allow workspace, subfolder, file, and URL creation
        if (menuItems['add-workspace']) {
          menuItems['add-workspace'].style.display = 'block';
          menuItems['add-workspace'].style.pointerEvents = 'auto';
        }
        if (menuItems['add-folder']) {
          menuItems['add-folder'].style.display = 'block';
          menuItems['add-folder'].style.pointerEvents = 'auto';
        }
        if (menuItems['add-url']) {
          menuItems['add-url'].style.display = 'block';
          menuItems['add-url'].style.pointerEvents = 'auto';
        }
        if (menuItems['add-file']) {
          menuItems['add-file'].style.display = 'block';
          menuItems['add-file'].style.pointerEvents = 'auto';
        }
        break;

      case 'workspace':
        // At workspace level: Allow all content creation (tasks, cards, images, notes handled by different menu)
        // Allow textbox and other workspace-specific content
        if (menuItems['add-textbox']) {
          menuItems['add-textbox'].style.display = 'block';
          menuItems['add-textbox'].style.pointerEvents = 'auto';
        }
        if (menuItems['webpage']) {
          menuItems['webpage'].style.display = 'block';
          menuItems['webpage'].style.pointerEvents = 'auto';
        }
        if (menuItems['add-file']) {
          menuItems['add-file'].style.display = 'block';
          menuItems['add-file'].style.pointerEvents = 'auto';
        }
        if (menuItems['add-file-o365']) {
          menuItems['add-file-o365'].style.display = 'block';
          menuItems['add-file-o365'].style.pointerEvents = 'auto';
        }
        
        // Set the current workspace ID for textbox creation
        if (clickedNodeInfo && clickedNodeInfo.element && clickedNodeInfo.element.dataset.workspaceId) {
          currentSelectedWorkspaceId = parseInt(clickedNodeInfo.element.dataset.workspaceId, 10);
        }
        break;

      default:
        // For unknown types or files, disable all creation options
        break;
    }
  }

  // Show custom context menu
  document.addEventListener("contextmenu", (e) => {
    const label = e.target.closest(".vault-label, .folder-label, .file-label");
    if (label) {
      e.preventDefault();
      let type = "unknown";
      
      if (label.classList.contains("vault-label")) {
        type = "vault";
      } else if (label.classList.contains("folder-label")) {
        type = "folder";
      } else if (label.classList.contains("file-label") && label.dataset.workspaceId) {
        type = "workspace";
      } else if (label.classList.contains("file-label")) {
        type = "file";
      }
      
      clickedNodeInfo = {
        element: label,
        type: type
      };

      // Apply hierarchical menu restrictions
      applyHierarchicalMenuRestrictions(type);

      contextMenu.style.top = `${e.pageY}px`;
      contextMenu.style.left = `${e.pageX}px`;
      contextMenu.classList.remove("hidden");
    } else {
      contextMenu.classList.add("hidden");
    }
  });

  // Hide menu on click elsewhere
  document.addEventListener("click", (e) => {
    const clickedInsideContext = e.target.closest("#context-menu");
    const clickedOnFooterIcon = e.target.closest(".footer-icon");
    const clickedTreeLabel = e.target.closest(".vault-label, .folder-label, .file-label");

    if (!clickedInsideContext && !clickedOnFooterIcon && !clickedTreeLabel) {
      contextMenu.classList.add("hidden");
      // Reset all button displays and pointer events when hiding menu
      contextMenu.querySelectorAll('button').forEach(btn => {
        btn.style.display = '';
        btn.style.pointerEvents = '';
      });
    }
  });

  let currentSelectedFolderId = null;
  let currentSelectedVaultId = null;

  function showCustomPrompt({ title, label, okText, defaultValue = "", multiline = false }) {
    return new Promise((resolve, reject) => {
      const modal = document.getElementById("custom-modal");
      const modalTitle = document.getElementById("modal-title");
      const modalLabel = document.getElementById("modal-label");
      const input = document.getElementById("modal-input");
      const textarea = document.getElementById("modal-textarea");
      const cancelBtn = document.getElementById("modal-cancel-btn");
      const okBtn = document.getElementById("modal-ok-btn");

      if (!modal || !modalTitle || !modalLabel || !input || !textarea) {
        console.error("Modal elements not found in DOM.");
        reject("Modal not found");
        return;
      }

      // Setup text
      modalTitle.textContent = title || "Enter a value";
      modalLabel.textContent = label || "Name:";
      okBtn.textContent = okText || "OK";

      // Show/hide input vs. textarea
      if (multiline) {
        input.classList.add("hidden");
        textarea.classList.remove("hidden");
        textarea.value = defaultValue;
      } else {
        input.classList.remove("hidden");
        textarea.classList.add("hidden");
        input.value = defaultValue;
      }

      // Show modal
      modal.classList.remove("hidden");
      disableScroll();
      // Give focus to whichever is visible
      setTimeout(() => {
        if (multiline) {
          textarea.focus();
        } else {
          input.focus();
        }
      }, 50);

      function cleanup() {
        modal.classList.add("hidden");
        enableScroll();
        cancelBtn.removeEventListener("click", onCancel);
        okBtn.removeEventListener("click", onOk);
      }

      function onCancel() {
        cleanup();
        resolve(null); // user canceled => return null
      }

      function onOk() {
        let val;
        if (multiline) {
          val = textarea.value.trim();
        } else {
          val = input.value.trim();
        }
        cleanup();
        resolve(val);
      }

      cancelBtn.addEventListener("click", onCancel);
      okBtn.addEventListener("click", onOk);
    });
  }

  contextMenu.addEventListener("click", async (e) => {
    const action = e.target.dataset.action;
    if (!action || !clickedNodeInfo) return;

    const { element, type } = clickedNodeInfo;

    // Check if action is allowed for this element type
    const button = e.target;
    if (button.style.pointerEvents === 'none') {
      e.preventDefault();
      return;
    }

    console.log(`Action: ${action} on ${type}`, element);
    contextMenu.classList.add("hidden");

    // Reset all button displays and pointer events after action
    contextMenu.querySelectorAll('button').forEach(btn => {
      btn.style.display = '';
      btn.style.pointerEvents = '';
    });

    const userId = await invoke("get_current_user_id");

    try {
      if (action === "add-folder") {
        if (type === "vault") {
          // The label for vault has data-vault-id
          const vaultId = parseInt(element.dataset.vaultId, 10);
          // Show the custom prompt
          const folderName = await showCustomPrompt({
            title: "Add Folder",
            label: "Folder Name:",
            okText: "Create",
            defaultValue: ""
          });
          if (!folderName) return;

          await invoke("create_folder_for_vault", {
            name: folderName,
            createdBy: userId,
            createdByUser: "demo",
            parentId: documentsRootId,
            vaultId: singleVaultId.toString(),
          });
          loadTreeView(); // Refresh the tree
        } else if (type === "folder") {
          const folderId = parseInt(element.dataset.folderId, 10);
          const vaultId = element.dataset.vaultId;

          const subName = await showCustomPrompt({
            title: "Add Subfolder",
            label: "Subfolder Name:",
            okText: "Create",
          });
          if (!subName) return;

          await invoke("create_folder_for_vault", {
            name: subName,
            createdBy: userId,
            createdByUser: "demo",
            parentId: folderId,
            vaultId: singleVaultId.toString(),
          });
          loadTreeView();
        }
      } else if (action === "add-file") {
        // We only allow adding a file if the user right-clicked a folder.
        if (type === "folder") {
          const folderId = parseInt(element.dataset.folderId, 10);

          try {
            // Use the Rust file picker instead of HTML input
            const filePath = await invoke("open_single_file_picker");

            if (!filePath) {
              // User cancelled the dialog
              return;
            }

            // Extract just the filename from the full path
            const fileName = filePath.split(/[\\/]/).pop();

            // Read the file contents (using Node.js APIs through Tauri)
            const fileContents = await invoke("read_file_as_base64", {
              path: filePath
            });

            await invoke("create_file_for_folder", {
              name: fileName,
              path: `/${folderId}/`,
              folderId,
              createdBy: userId,
              createdByUser: "demo",
              fileContentsBase64: fileContents,
            });

            // Show success message
            showInfoMessage(`File "${fileName}" uploaded successfully`, true);
            
            loadTreeView(); // refresh
          } catch (err) {
            console.error("Error adding file:", err);
            showInfoMessage(`Failed to upload file: ${err}`, false);
          }
        } else {
        }
      } else if (action === "test-o365") {
        try {
          console.log("Testing O365 permissions...");
          const result = await invoke("test_o365_permissions");
          console.log("O365 test result:", result);
          alert(`O365 Test Result: ${result}`);
        } catch (err) {
          console.error("O365 test failed:", err);
          alert(`O365 Test Failed: ${err}`);
        }
      } else if (action === "add-file-o365") {
        // We only allow adding a file if the user right-clicked a folder.
        if (type === "folder") {
          const folderId = parseInt(element.dataset.folderId, 10);

          try {
            // Use the Rust file picker instead of HTML input
            const filePath = await invoke("open_single_file_picker");

            if (!filePath) {
              // User cancelled the dialog
              return;
            }

            // Extract just the filename from the full path
            const fileName = filePath.split(/[\\/]/).pop();

            // Upload file to O365
            console.log(`Uploading ${fileName} to O365 folder ${folderId}...`);
            const o365Path = await invoke("upload_file_to_o365_folder", {
              folderId: folderId,
              filePath: filePath,
            });

            console.log(`File uploaded to O365 at: ${o365Path}`);
            // TODO: We should somehow list those in the loadTreeView.

            loadTreeView(); // refresh
          } catch (err) {
            console.error("Error adding file to O365:", err);
            alert(`Failed to upload file to O365: ${err}`);
          }
        } else {
        }
      } else if (action === "add-workspace") {
        if (type === "folder") {
          const folderId = parseInt(element.dataset.folderId, 10);
          const wsName = await showCustomPrompt({
            title: "Add Workspace",
            label: "Workspace Name:",
            okText: "Create",
          });
          if (!wsName) return;

          await invoke("create_workspace_for_folder", {
            name: wsName,
            createdBy: userId,
            createdByUser: "demo",
            folderId: folderId,
          });
          loadTreeView();
        } else {
        }
      } else if (action === "add-textbox") {
        if (!currentSelectedWorkspaceId) {
          return;
        }

        const textVal = await showCustomPrompt({
          title: "Add Text Box",
          label: "Text Content:",
          okText: "Create",
          multiline: true,          // <-- Use multiline
        });
        if (!textVal) return;

        await invoke("create_textbox_for_workspace", {
          text: textVal,
          workspaceId: currentSelectedWorkspaceId,
          createdBy: userId,
          createdByUser: "demo",
        });
        loadTreeView();
      } else if (action === "add-url") {
        const folderId = parseInt(element.dataset.folderId, 10);
        if (!folderId) {
          return;
        }

        const urlName = await showCustomPrompt({
          title: "Add URL",
          label: "URL Name:",
          okText: "Next",
          defaultValue: "My Link"
        });
        if (!urlName) return;

        const urlVal = await showCustomPrompt({
          title: "Add URL",
          label: "Actual URL:",
          okText: "Create",
          defaultValue: "https://www.blic.rs"
        });
        if (!urlVal) return;

        await invoke("create_url_for_folder", {
          name: urlName,
          urlValue: urlVal,
          folderId: folderId,
        });
        loadTreeView();
      }
    } catch (err) {
      console.error("Error handling action:", err);
    }
  });

  document.addEventListener("click", async (e) => {
    const fileDiv = e.target.closest(".file-label");
    if (!fileDiv) return;

    // === LINK klik ===
    if (fileDiv.dataset.urlId) {
      const urlId = fileDiv.dataset.urlId;
      const allLinks = await invoke("fetch_weburls");
      const link = allLinks.find(l => l.id == urlId);
      if (link) {
        highlightSelectedLabel(fileDiv);
        openLinkTab(link); // 👈 koristi našu novu funkciju
      }
      return;
    }
    if (fileDiv.dataset.noteId) {
      const noteId = fileDiv.dataset.noteId;
      const allNotes = await invoke("fetch_textboxes"); // koristi svoj endpoint
      const note = allNotes.find(n => n.id == noteId);
      if (note) {
        highlightSelectedLabel(fileDiv);

        const workspaceId = note.workspaceId;

        if (openTabs[workspaceId]) {
          const { content } = openTabs[workspaceId];
          const workspaceContainer = content.querySelector(".workspace-container");
          renderNoteInWorkspace(workspaceContainer, note); // 👈 helper funkcija
          activateTab(workspaceId);
        } else {
        }
      }
      return;
    }
    // === WORKSPACE klik (već se obrađuje drugde, može se ignorisati ovde)
    if (fileDiv.dataset.workspaceId) {
      return;
    }


    // Check if this is an O365 file
    const isO365File = fileDiv.dataset.isO365 === "true";

    // === FILE klik (default)
    const fileId = fileDiv.dataset.fileId;
    const fileName = fileDiv.dataset.fileName;
    const folderId = fileDiv.dataset.folderId;

    if (!fileId || !fileName) return;

    // Highlight the clicked file
    highlightSelectedLabel(fileDiv);

    // Show Save File modal for file download
    try {
      const apiUrl = window.__TAURI__?.core?.invoke ? 'http://127.0.0.1:5000' : '';
      const secureFileName = fileName.replace(/\s+/g, '_').replace(/[^\w\s.-]/g, '');
      const downloadUrl = `${apiUrl}/uploads/folders/${folderId}/${encodeURIComponent(secureFileName)}`;
      
      showSaveFileModal(fileName, downloadUrl);
    } catch (err) {
      console.error("Failed to show save file modal:", err);
      alert(`Failed to show save file modal: ${err}`);
    }
  });


  document.querySelector('#add-file-icon')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if a folder is selected
    const selected = document.querySelector('.active-label');
    if (!selected || !selected.classList.contains('folder-label')) {
      showInfoMessage("Please select a folder first to add files");
      return;
    }

    const menu = document.getElementById('context-menu');
    const iconRect = e.target.getBoundingClientRect();

    // Hide all buttons first
    menu.querySelectorAll('button').forEach(btn => {
      btn.style.display = '';
    });

    // Show Add File, Add File O365, Add Workspace, and Add URL
    const addFileBtn = menu.querySelector('[data-action="add-file"]');
    const addFileO365Btn = menu.querySelector('[data-action="add-file-o365"]');
    const addWorkspaceBtn = menu.querySelector('[data-action="add-workspace"]');
    const addUrlBtn = menu.querySelector('[data-action="add-url"]');

    if (addFileBtn) addFileBtn.style.display = 'block';
    if (addFileO365Btn) addFileO365Btn.style.display = 'block';
    if (addWorkspaceBtn) addWorkspaceBtn.style.display = 'block';
    if (addUrlBtn) addUrlBtn.style.display = 'block';

    menu.style.position = 'fixed';
    menu.style.left = `${iconRect.left}px`;
    menu.style.top = `${iconRect.top - 180}px`; // Adjusted for more menu items 
    menu.classList.remove('hidden');

    // Set the clicked node info to the selected folder
    clickedNodeInfo = {
      element: selected,
      type: "folder"
    };
  });

  // Helper function to show delete messages
  function showDeleteMessage(message, isSuccess = true) {
    const messageEl = document.getElementById('delete-message');
    if (!messageEl) return;

    messageEl.textContent = message;
    messageEl.classList.remove('success', 'error', 'hidden');
    messageEl.classList.add(isSuccess ? 'success' : 'error');

    // Auto-hide after 3 seconds
    setTimeout(() => {
      messageEl.classList.add('hidden');
    }, 3000);
  }

  // General message display function (can be used for info messages)
  function showInfoMessage(message, isSuccess = true) {
    showDeleteMessage(message, isSuccess);
  }

  document.querySelector('#delete-icon')?.addEventListener('click', onDeleteClicked);
  async function onDeleteClicked() {
    console.log("Delete clicked! Delete clicked!");

    // 1) Find what is currently “selected” in the tree
    const selected = document.querySelector('.active-label');
    if (!selected) {
      return;
    }

    // 2) Determine its type
    // Could be .folder-label, .file-label, or .vault-label
    // but within .file-label we might have data-url-id, data-note-id, data-workspace-id, or data-file-id
    if (selected.classList.contains('folder-label')) {
      const folderId = selected.dataset.folderId;
      if (!folderId) {
        return;
      }

      const folderName = selected.querySelector('span')?.textContent?.trim();
      // If you want to block "Documents" specifically:
      if (folderName === "Documents") {
        return;
      }

      const confirmed = confirm(`Are you sure you want to delete Folder #${folderId}?`);
      if (!confirmed) return;

      try {
        await invoke('delete_folder', { folderId: parseInt(folderId, 10) });
        showDeleteMessage(`Folder "${folderName}" deleted successfully!`);
        loadTreeView();
      } catch (err) {
        console.error("Failed to delete folder:", err);
        showDeleteMessage(`Failed to delete folder: ${err}`, false);
      }

    } else if (selected.classList.contains('vault-label')) {
      // If you want to support deleting a Vault (not requested, but possible),
      // you’d create a `delete_vault` in Rust. Otherwise skip.
    } else if (selected.classList.contains('file-label')) {
      // We must see if it’s a workspace, text note, URL, or normal file
      if (selected.dataset.workspaceId) {
        const wsId = selected.dataset.workspaceId;
        if (!wsId) return;
        const confirmed = confirm(`Delete Workspace #${wsId}?`);
        if (!confirmed) return;

        if (openTabs[wsId]) {
          const { tab, content } = openTabs[wsId];
          tab.remove();
          content.remove();
          delete openTabs[wsId];
        }

        try {
          await invoke('delete_workspace', { workspaceId: parseInt(wsId, 10) });
          showDeleteMessage(`Workspace deleted successfully!`);
          loadTreeView();
        } catch (err) {
          console.error("Failed to delete workspace:", err);
          showDeleteMessage(`Failed to delete workspace: ${err}`, false);
        }

      } else if (selected.dataset.urlId) {
        const urlId = selected.dataset.urlId;
        const confirmed = confirm(`Delete URL #${urlId}?`);
        if (!confirmed) return;

        try {
          await invoke('delete_url', { urlId: parseInt(urlId, 10) });
          showDeleteMessage(`URL deleted successfully!`);
          loadTreeView();
        } catch (err) {
          console.error("Failed to delete URL:", err);
          showDeleteMessage(`Failed to delete URL: ${err}`, false);
        }

      } else if (selected.dataset.noteId) {
        const noteId = selected.dataset.noteId;
        const confirmed = confirm(`Delete TextBox #${noteId}?`);
        if (!confirmed) return;

        try {
          await invoke('delete_textbox', { textboxId: parseInt(noteId, 10) });
          showDeleteMessage(`Note deleted successfully!`);
          loadTreeView();
        } catch (err) {
          console.error("Failed to delete TextBox:", err);
          showDeleteMessage(`Failed to delete note: ${err}`, false);
        }

      } else if (selected.dataset.fileId) {
        // Normal file
        const fileId = selected.dataset.fileId;
        const confirmed = confirm(`Delete File #${fileId}?`);
        if (!confirmed) return;

        try {
          await invoke('delete_file', { fileId: parseInt(fileId, 10) });
          showDeleteMessage(`File deleted successfully!`);
          loadTreeView();
        } catch (err) {
          console.error("Failed to delete file:", err);
          showDeleteMessage(`Failed to delete file: ${err}`, false);
        }
      } else {
      }
    }
  }

  // Add click handlers for other footer buttons
  document.querySelector('#share-icon')?.addEventListener('click', () => {
    showInfoMessage("Go to vault and share permission of whole vault. We only support sharing at Vault granularity for now.");
  });

  document.querySelector('#file-up-icon')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if a folder is selected
    const selected = document.querySelector('.active-label');
    if (!selected || !selected.classList.contains('folder-label')) {
      showInfoMessage("Please select a folder first to add files");
      return;
    }
    
    // Get the folder ID from the selected folder
    const folderId = parseInt(selected.dataset.folderId, 10);
    if (!folderId) {
      showInfoMessage("Invalid folder selection");
      return;
    }
    
    // Use Tauri to open file picker
    (async () => {
      try {
        const filePath = await invoke("open_single_file_picker");
        if (!filePath) {
          // User cancelled the dialog
          return;
        }

        // Extract just the filename from the full path
        const fileName = filePath.split(/[\\/]/).pop();

        // Read the file contents (using Node.js APIs through Tauri)
        const fileContents = await invoke("read_file_as_base64", {
          path: filePath
        });

        const userId = await invoke("get_current_user_id");
        
        await invoke("create_file_for_folder", {
          name: fileName,
          path: `/${folderId}/`,
          folderId,
          createdBy: userId,
          createdByUser: "demo",
          fileContentsBase64: fileContents,
        });

        loadTreeView(); // refresh the tree view to show the new file
        showInfoMessage(`File "${fileName}" uploaded successfully`, true);
      } catch (err) {
        console.error("Error uploading file:", err);
        showInfoMessage(`Failed to upload file: ${err}`, false);
      }
    })();
  });

  document.querySelector('#flip-backward-icon')?.addEventListener('click', () => {
    showInfoMessage("To be implemented");
  });

  document.querySelector('#flip-forward-icon')?.addEventListener('click', () => {
    showInfoMessage("To be implemented");
  });

  const treeContainer = document.querySelector('.folder-tree');

  // Load the tree view to display folders
  loadTreeView();
  
  // Load references (workspaces created from tasks)
  loadReferences();
  
     // Listen for workspace creation events to refresh references
   console.log('Setting up workspaceCreated event listener for vault:', singleVaultId);
   
   // Use a more reliable approach - set up a global function that can be called from anywhere
   window.refreshDashboardReferences = () => {
     console.log('refreshDashboardReferences called');
     loadReferences();
   };
   
   // Also keep the event listener as a backup
   window.addEventListener('workspaceCreated', (event) => {
     console.log('workspaceCreated event received:', event.detail);
     const { vaultId } = event.detail;
     if (vaultId === singleVaultId || vaultId === null) {
       console.log('Workspace created, refreshing references');
       loadReferences();
     } else {
       console.log('Vault ID mismatch - expected:', singleVaultId, 'got:', vaultId);
     }
   });
   
   // Test the event listener
   console.log('Testing event listener...');
   setTimeout(() => {
     console.log('Dispatching test event...');
     window.dispatchEvent(new CustomEvent('workspaceCreated', {
       detail: { vaultId: singleVaultId }
     }));
   }, 2000);
   
   // Add a test button to manually refresh references
   const testButton = document.createElement('button');
   testButton.textContent = 'Test Refresh References';
   testButton.style.position = 'fixed';
   testButton.style.top = '10px';
   testButton.style.right = '20px';
   testButton.style.zIndex = '9999';
   testButton.addEventListener('click', () => {
     console.log('Manual test button clicked');
     if (window.refreshDashboardReferences) {
       window.refreshDashboardReferences();
     } else {
       console.log('refreshDashboardReferences not available');
     }
   });
  //  document.body.appendChild(testButton);

  async function loadTreeView() {
    try {
      console.log("loadTreeView called");
      showDashboardLoading('Loading vault contents...');
      if (!treeContainer) {
        console.error("treeContainer not found");
        return;
      }
      console.log("treeContainer found:", treeContainer);
      treeContainer.innerHTML = '';

      // Fetch everything
      const vaults = await invoke("fetch_vaults");
      
      const folders = await invoke("fetch_folders");
      
      const files = await invoke("fetch_files");
      
      const workspaces = await invoke("fetch_workspaces");
      
      const urls = await invoke("fetch_weburls");
      // If we have a singleVaultId, filter to that vault only
      let filteredVaults = vaults;
      if (singleVaultId) {
        filteredVaults = vaults.filter(v => v.id === singleVaultId);
      } else {
        treeContainer.innerHTML = "<p style='padding: 10px; color: #888;'>No vault selected</p>";
        return;
      }

      // Now render only filtered vaults
      for (const vault of filteredVaults) {
        const vaultTitleDiv = document.getElementById("selected-vault-name");
        vaultTitleDiv.textContent = vault.name;
        vaultTitleDiv.classList.add("vault-label");
        // Add the images
        const iconImg = document.createElement('img');
        iconImg.src = "../assets/images/grid-11.svg";
        iconImg.classList.add("iconfliter");
        iconImg.id = "iconfliter";
        iconImg.setAttribute("data-tooltip", "Placeholder Tooltip");
        vaultTitleDiv.appendChild(iconImg);

        const vaultFolders = folders.filter(f => f.vaultId == vault.id);
        
        // Look for a Documents folder, or use the first root-level folder
        let documentFolder = vaultFolders.find(f => f.name === "Documents");
        if (!documentFolder) {
          // If no Documents folder, look for root-level folders (parentId is null or 0)
          const rootFolders = vaultFolders.filter(f => !f.parentId || f.parentId === 0);
          if (rootFolders.length > 0) {
            documentFolder = rootFolders[0];
          }
        }

        if (!documentFolder) {
          console.warn("No root folder found. Creating a default Documents folder.");
          // Create a default Documents folder
          const userId = await invoke("get_current_user_id");
          try {
            await invoke("create_folder_for_vault", {
              name: "Documents",
              createdBy: userId,
              createdByUser: "demo",
              parentId: 0,
              vaultId: vault.id.toString(),
            });
            // Refresh folders and try again
            const updatedFolders = await invoke("fetch_folders");
            const updatedVaultFolders = updatedFolders.filter(f => f.vaultId == vault.id);
            documentFolder = updatedVaultFolders.find(f => f.name === "Documents");
            console.log("Created Documents folder:", documentFolder);
          } catch (err) {
            console.error("Failed to create Documents folder:", err);
            return;
          }
        }
        
        documentsRootId = documentFolder?.id || null;
        console.log("Documents root ID:", documentsRootId);

        let firstLevelFolders;
        if (documentFolder && (documentFolder.parentId === 0 || documentFolder.parentId === null)) {
          // If the chosen documentFolder is a root-level folder, show all root-level folders
          firstLevelFolders = vaultFolders.filter(f => f.parentId === 0 || f.parentId === null);
          console.log("Displaying all root-level folders:", firstLevelFolders);
        } else {
          // Otherwise, show direct children of the documentFolder
          firstLevelFolders = vaultFolders.filter(f => f.parentId === documentFolder.id);
          console.log("Displaying direct children of document folder:", firstLevelFolders);
        }

        const vaultUl = document.createElement('ul');
        vaultUl.classList.add('vault-folder-list');
        treeContainer.appendChild(vaultUl);

        firstLevelFolders.forEach(folder => {
          const folderLi = document.createElement('li');
          folderLi.classList.add('folder');

          folderLi.innerHTML = `
              <div class="folder-label" data-folder-id="${folder.id}" data-vault-id="${folder.vaultId}">
                <img src="../assets/images/chevron-down.svg" class="arrow-icon">
                <img src="../assets/images/icon-folder.svg" class="tree-icon">
                <span>${folder.name}</span>
              </div>
              <ul></ul>
            `;

          const label = folderLi.querySelector('.folder-label');
          const subList = folderLi.querySelector('ul');
          const arrow = folderLi.querySelector('.arrow-icon');

          // Add click handler with toggle behavior and selection
          label.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Handle selection
            highlightSelectedLabel(label);
            
            // Handle expand/collapse toggle
            const isVisible = subList.style.display !== 'none';
            if (arrow) arrow.src = isVisible ? '../assets/images/chevron-right.svg' : '../assets/images/chevron-down.svg';
            subList.style.display = isVisible ? 'none' : '';
          });

          // Always load all children recursively on initial load (expanded by default)
          loadFolderChildrenExpanded(subList, folder.id, folders, files, workspaces);
          loadFiles(subList, folder.id, files);
          loadWorkspaces(subList, folder.id, workspaces);
          loadUrls(subList, folder.id);

          vaultUl.appendChild(folderLi);
        });
      }
      hideDashboardLoading();
    } catch (err) {
      console.error('Error when loading loadTreeView:', err);
      hideDashboardLoading();
      showInfoMessage("Failed to load vault contents: " + err);
    }
  }

  async function loadReferences() {
    try {
      if (!singleVaultId) {
        console.log("No vault selected, skipping references load");
        return;
      }

      console.log("Loading references for vault:", singleVaultId);
      
      // Fetch workspaces created from tasks for this vault
      const workspaces = await invoke("fetch_workspaces_by_vault_from_task", { vaultId: singleVaultId });
      console.log("Fetched workspaces for references:", workspaces);
      
      // Get the references container
      const referencesContainer = document.querySelector('.references');
      if (!referencesContainer) {
        console.error("References container not found");
        return;
      }

      // Clear existing references
      referencesContainer.innerHTML = '';

      // Add each workspace as a reference
      workspaces.forEach(workspace => {
        const li = document.createElement('li');
        li.innerHTML = `
          <img src="../assets/images/text-align-left.svg" alt="link icon" 
               style="vertical-align: middle; margin-right: 5px;">
          ${workspace.name}
        `;
        
        // Add click handler to open the workspace
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
          openWorkspaceTab(workspace, false);
        });
        
        referencesContainer.appendChild(li);
      });

      console.log(`Loaded ${workspaces.length} references`);
    } catch (error) {
      console.error("Error loading references:", error);
    }
  }

  function loadFolderChildren(container, parentId, folders, files, workspaces) {
    const childFolders = folders.filter(f => f.parentId == parentId);

    childFolders.forEach(folder => {
      const folderLi = document.createElement('li');
      folderLi.classList.add('folder');

      folderLi.innerHTML = `
          <div class="folder-label" data-folder-id="${folder.id}" data-vault-id="${folder.vaultId}">
            <img src="../assets/images/chevron-right.svg" class="arrow-icon">
            <img src="../assets/images/icon-folder.svg" class="tree-icon">
            <span>${folder.name}</span>
          </div>
          <ul class="hidden"></ul>
        `;

      const label = folderLi.querySelector('.folder-label');
      const subList = folderLi.querySelector('ul');
      const arrow = folderLi.querySelector('.arrow-icon');

      label.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = subList.classList.contains('hidden');
        if (arrow) arrow.src = isHidden ? '../assets/images/chevron-down.svg' : '../assets/images/chevron-right.svg';
        subList.classList.toggle('hidden', !isHidden);
        if (isHidden) {
          highlightSelectedLabel(label);
          loadFolderChildren(subList, folder.id, folders, files, workspaces);
          loadFiles(subList, folder.id, files);
          loadWorkspaces(subList, folder.id, workspaces);
          loadUrls(subList, folder.id);
        } else {
          subList.innerHTML = '';
        }
      });

      container.appendChild(folderLi);
    });
  }

  // New function that loads children expanded with toggle behavior
  function loadFolderChildrenExpanded(container, parentId, folders, files, workspaces) {
    const childFolders = folders.filter(f => f.parentId == parentId);

    childFolders.forEach(folder => {
      const folderLi = document.createElement('li');
      folderLi.classList.add('folder');

      folderLi.innerHTML = `
          <div class="folder-label" data-folder-id="${folder.id}" data-vault-id="${folder.vaultId}">
            <img src="../assets/images/chevron-down.svg" class="arrow-icon">
            <img src="../assets/images/icon-folder.svg" class="tree-icon">
            <span>${folder.name}</span>
          </div>
          <ul></ul>
        `;

      const label = folderLi.querySelector('.folder-label');
      const subList = folderLi.querySelector('ul');
      const arrow = folderLi.querySelector('.arrow-icon');

      // Add click handler with toggle behavior and selection
      label.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Handle selection
        highlightSelectedLabel(label);
        
        // Handle expand/collapse toggle
        const isVisible = subList.style.display !== 'none';
        if (arrow) arrow.src = isVisible ? '../assets/images/chevron-right.svg' : '../assets/images/chevron-down.svg';
        subList.style.display = isVisible ? 'none' : '';
      });

      // Always load all children recursively (initially expanded)
      loadFolderChildrenExpanded(subList, folder.id, folders, files, workspaces);
      loadFiles(subList, folder.id, files);
      loadWorkspaces(subList, folder.id, workspaces);
      loadUrls(subList, folder.id);

      container.appendChild(folderLi);
    });
  }

  function loadFiles(container, folderId, files) {
    const relevant = files.filter(f => f.folderId === folderId);
    relevant.forEach(file => {
      console.log("File object:", file); // Debug: log each file to see its properties
      console.log("iso365File property:", file.iso365File); // Debug: specifically check iso365File

      const fileLi = document.createElement('li');
      fileLi.classList.add('file');
      // Function to get file icon based on extension
      function getFileIcon(fileName, isO365File) {
        // Use Outlook icon for O365 files
        if (isO365File === true) {
          return '../assets/outlook-icon.png';
        }
        
        const extension = fileName.split('.').pop().toLowerCase();
        const iconMap = {
          'pdf': '../assets/images/pdf.png',
          'txt': '../assets/images/txt.png',
          'doc': '../assets/images/doc.png',
          'docx': '../assets/images/docx.png',
          'xls': '../assets/images/xls.png',
          'xlsx': '../assets/images/xls.png'
        };
        return iconMap[extension] || '../assets/images/icon-file.svg';
      }
      
      // Get appropriate file icon
      const fileIcon = getFileIcon(file.name, file.iso365File);
      
      // Create a container div for the file with relative positioning
      const fileContainer = document.createElement('div');
      fileContainer.style.position = 'relative';
      fileContainer.style.display = 'flex';
      fileContainer.style.alignItems = 'center';
      
      // Create the file label
      const fileLabel = document.createElement('div');
      fileLabel.className = 'file-label';
      fileLabel.setAttribute('data-file-id', file.id);
      fileLabel.setAttribute('data-file-name', file.name);
      fileLabel.setAttribute('data-folder-id', folderId);
      if (file.iso365File === true) {
        fileLabel.setAttribute('data-is-o365', 'true');
      }
      fileLabel.innerHTML = `
        <img src="${fileIcon}" class="tree-icon">
        <span>${file.name}</span>
      `;
      
      // Create delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = '×';
      deleteBtn.className = 'delete-btn';
      deleteBtn.style.cssText = `
        position: absolute;
        right: 0px;
        top: -5px;
        width: 16px;
        height: 16px;
        border: none;
        background: rgba(255, 0, 0, 0.7);
        color: white;
        border-radius: 50%;
        cursor: pointer;
        font-size: 12px;
        line-height: 1;
        display: none;
        z-index: 10;
        padding: 0;
      `;
      
      // Show/hide delete button on hover
      fileContainer.addEventListener('mouseenter', () => {
        deleteBtn.style.display = 'block';
      });
      fileContainer.addEventListener('mouseleave', () => {
        deleteBtn.style.display = 'none';
      });
      
      // Delete button click handler
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        console.log('🗑️ Delete button clicked for file ID:', file.id);
        
        try {
          await window.__TAURI__.core.invoke('delete_file', { 
            fileId: file.id 
          });
          
          console.log('✅ File deleted successfully');
          
          // Remove the file element from the DOM
          fileLi.remove();
          
          // Show success message
          showInfoMessage(`File "${file.name}" deleted successfully`, true);
          
          // Refresh the tree view to reflect the changes
          loadTreeView();
        } catch (error) {
          console.error('❌ Failed to delete file:', error);
          showInfoMessage(`Failed to delete file: ${error}`, false);
        }
      });
      
      // Append elements
      fileContainer.appendChild(fileLabel);
      fileContainer.appendChild(deleteBtn);
      fileLi.appendChild(fileContainer);
      container.appendChild(fileLi);
    });
  }

  function loadWorkspaces(container, folderId, workspaces) {
    const relevant = workspaces.filter(w => w.folderId == folderId && !w.createdFromTask);

    relevant.forEach(async ws => {
      const wsLi = document.createElement('li');
      wsLi.classList.add('file');
      
      // Initially create without arrow - we'll add it if there are children
      wsLi.innerHTML = `
          <div class="file-label" data-workspace-id="${ws.id}">
            <img src="../assets/images/icon-file.svg" class="tree-icon">
            <span>${ws.name}</span>
          </div>
          <ul class="workspace-children"></ul>
        `;
      container.appendChild(wsLi);

      const label = wsLi.querySelector(".file-label");
      const childrenUl = wsLi.querySelector(".workspace-children");

      try {
        const allLinks = await invoke("fetch_weburls");
        const links = allLinks.filter(link => link.workspaceId === ws.id);

        const allNotes = await invoke("fetch_textboxes");
        const notes = allNotes.filter(n => n.workspaceId === ws.id);

        // If workspace has children, add arrow icon
        const hasChildren = links.length > 0 || notes.length > 0;
        if (hasChildren) {
          const arrowIcon = document.createElement('img');
          arrowIcon.src = '../assets/images/chevron-down.svg';
          arrowIcon.classList.add('arrow-icon');
          label.insertBefore(arrowIcon, label.firstChild);
        }

        label.addEventListener("click", () => {
          highlightSelectedLabel(label);
          currentSelectedWorkspaceId = ws.id;
          openWorkspaceTab(ws);
          
          // Toggle workspace children visibility if there are any
          if (hasChildren) {
            const arrow = label.querySelector('.arrow-icon');
            const isVisible = childrenUl.style.display !== 'none';
            if (arrow) arrow.src = isVisible ? '../assets/images/chevron-right.svg' : '../assets/images/chevron-down.svg';
            childrenUl.style.display = isVisible ? 'none' : '';
          }
        });

        // Add links
        links.forEach(link => {
          const linkLi = document.createElement("li");
          linkLi.classList.add("file");
          linkLi.innerHTML = `
              <div class="file-label" data-url-id="${link.id}" title="${link.url}">
                <img src="../assets/images/link-03.svg" class="tree-icon">
                <span>${link.name}</span>
              </div>
            `;
          childrenUl.appendChild(linkLi);
        });

        // Add notes
        notes.forEach(note => {
          const noteLi = document.createElement("li");
          noteLi.classList.add("file");
          noteLi.innerHTML = `
               <div class="file-label" data-note-id="${note.id}">
                 <img src="../assets/images/icon-note.svg" class="tree-icon">
                 <span>${note.text.slice(0, 20)}...</span>
               </div>
             `;
          childrenUl.appendChild(noteLi);
        });

      } catch (err) {
        console.error("Error when loading workspace children:", err);
      }
    });
  }

  // Load tree at start with loading indicator
  showDashboardLoading('Initializing vault...');
  restoreOpenTabs();

  // Save File Modal functionality
  function showSaveFileModal(fileName, fileUrl) {
    const modal = document.getElementById('save-file-modal');
    const fileNameElement = document.getElementById('save-file-name');
    const chooseLocationBtn = document.getElementById('choose-location');
    const cancelBtn = document.getElementById('save-file-cancel-btn');
    const closeBtn = document.getElementById('save-file-close-btn');

    if (!modal) {
      console.error('Save file modal not found');
      return;
    }

    // Set file name
    fileNameElement.textContent = fileName;

    // Show modal
    modal.classList.remove('hidden');

    // Remove existing event listeners to prevent duplicates
    const newChooseLocationBtn = chooseLocationBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    const newCloseBtn = closeBtn.cloneNode(true);

    chooseLocationBtn.parentNode.replaceChild(newChooseLocationBtn, chooseLocationBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

    // Choose Location button
    newChooseLocationBtn.addEventListener('click', async () => {
      try {
        if (window.__TAURI__?.core?.invoke) {
          // Tauri environment - show save dialog
          const savePath = await window.__TAURI__.core.invoke('save_file_dialog', { fileName: fileName });
          
          if (savePath) {
            const success = await window.__TAURI__.core.invoke('download_file_to_location', {
              fileUrl: fileUrl,
              savePath: savePath
            });
            
            if (success) {
              showInfoMessage(`File saved successfully to: ${savePath}`);
            } else {
              showInfoMessage('Failed to save file to chosen location', false);
            }
          }
        } else {
          // Web environment - fallback to regular download
          const a = document.createElement('a');
          a.href = fileUrl;
          a.download = fileName;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showInfoMessage('Download initiated');
        }
      } catch (error) {
        console.error('Error choosing save location:', error);
        showInfoMessage(`Error saving file: ${error}`, false);
      }
      modal.classList.add('hidden');
    });

    // Cancel and Close buttons
    const closeModal = () => {
      modal.classList.add('hidden');
    };

    newCancelBtn.addEventListener('click', closeModal);
    newCloseBtn.addEventListener('click', closeModal);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Make functions globally accessible
  window.showSaveFileModal = showSaveFileModal;
  window.loadTreeView = loadTreeView;
}
async function loadUrls(container, folderId) {
  const { invoke } = window.__TAURI__.core;
  if (!invoke) {
    console.error('Tauri API not present');
    return;
  }
  const links = await invoke("fetch_weburls_for_folder", { folderId: folderId });
  links.forEach(link => {
    const urlLi = document.createElement('li');
    urlLi.classList.add('file');
    urlLi.innerHTML = `
         <div class="file-label" data-url-id="${link.id}" title="${link.urlValue}">
           <img src="../assets/images/link-03.svg" class="tree-icon">
           <span>${link.name}</span>
         </div>
       `;
    // clicking a URL should open it just like in your file click handler
    urlLi.querySelector('.file-label').addEventListener('click', async (e) => {
      e.stopPropagation();
      highlightSelectedLabel(e.currentTarget);
      openLinkTab(link);
    });
    container.appendChild(urlLi);
  });
}
function ensureAddTabButton() {
  const tabsBar = document.getElementById('tabs-bar');
  if (!document.getElementById("add-workspace-tab")) {
    const addBtn = document.createElement("button");
    addBtn.id = "add-workspace-tab";
    addBtn.innerHTML = "+";
    addBtn.classList.add("add-workspace-tab");
    addBtn.style.marginRight = "10px";
    addBtn.style.marginLeft = "10px";
    addBtn.style.fontSize = "18px";
    addBtn.style.border = "none";
    addBtn.style.background = "none";
    addBtn.style.cursor = "pointer";

    addBtn.addEventListener("click", () => {
      const fakeWorkspace = {
        id: "temp-" + Date.now(),
        name: "New Workspace",
        folderId: null
      };
      openWorkspaceTab(fakeWorkspace, true);
    });
    // Right-click event to show context menu
    addBtn.addEventListener("contextmenu", (e) => {
      e.preventDefault(); // Prevent default browser context menu
      showContextMenu(e.clientX, e.clientY);
    });

    tabsBar.appendChild(addBtn);
  }
  if (!document.getElementById("tab-bar-right")) {
    const bookIcon = document.createElement("img");
    bookIcon.src = "../assets/images/book-02.svg";
    bookIcon.classList.add("tab-bar-right");
    bookIcon.id = "tab-bar-right";

    // Append icon
    tabsBar.appendChild(bookIcon);

    // Add click event to toggle the section visibility
    bookIcon.addEventListener("click", () => {
      const infoSection = document.getElementById("infoSection");
      if (infoSection.style.display === "none") {
        infoSection.style.display = "block";
        bookIcon.src = "../assets/images/book-02.svg"; // change to lock icon
      } else {
        infoSection.style.display = "none";
        bookIcon.src = "../assets/images/book-02.svg"; // change back to book icon
      }
    });
  }

}
const openTabs = {};
function getActiveTabId() {
  return Object.keys(openTabs).find(id => openTabs[id].tab.classList.contains("active"));
}

function updateFabVisibility() {
  const fabBtn = document.querySelector(".fab");
  if (!fabBtn) return;

  // Check if there's an active workspace tab
  const activeTabId = getActiveTabId();
  const hasActiveWorkspace = activeTabId && !activeTabId.startsWith('link-');

  fabBtn.classList.toggle('hidden', !hasActiveWorkspace);
}
async function renderNewImage(image, pageId) {
  // Check if we're in workspace context (has workspace-specific elements)
  const workspaceContainer = document.querySelector("#workspace-main-content");
  const isInWorkspace = workspaceContainer && workspaceContainer.querySelector(".page-content-wrapper");
  
  if (isInWorkspace && window.renderNewImageInWorkspace) {
    // Use workspace-specific rendering function
    console.log("Rendering image in workspace context");
    window.renderNewImageInWorkspace(image, pageId);
    return;
  }
  
  // Original dashboard logic
  const containerEl = document.getElementById("page-blocks-container");
  if (!containerEl) {
    console.error("page-blocks-container not found in dashboard context");
    return;
  }

  const block = document.createElement("div");
  block.classList.add("page-block", "draggable"); // Add draggable class to match page.js
  block.setAttribute("data-type", "image");
  block.setAttribute("data-id", image.id);

  const img = document.createElement("img");
  img.src = `data:image/png;base64,${image.base64}`;
  img.alt = image.name;
  img.classList.add("page-image");

  block.appendChild(img);
  containerEl.appendChild(block);
  const wrapper = containerEl.closest(".page-content-wrapper");
  if (wrapper) {
    wrapper.classList.toggle("hidden");
  }
  enableBlockDragAndDrop(containerEl);
}

// Helper function to get the proper download URL for files
window.getFileDownloadUrl = function(file, pageId) {
  const apiUrl = window.__TAURI__?.core?.invoke ? 'http://127.0.0.1:5000' : '';
  // Apply secure filename logic to match backend's secure_filename() function
  const secureFileName = file.name.replace(/\s+/g, '_').replace(/[^\w\s.-]/g, '');
  console.log('🔧 Helper function - Original filename:', file.name);
  console.log('🔧 Helper function - Secured filename:', secureFileName);
  return `${apiUrl}/uploads/${pageId}/${encodeURIComponent(secureFileName)}`;
}

async function renderNewFile(file, pageId) {
  // Check if we're in workspace context (has workspace-specific elements)
  const workspaceContainer = document.querySelector("#workspace-main-content");
  const isInWorkspace = workspaceContainer && workspaceContainer.querySelector(".page-content-wrapper");
  
  if (isInWorkspace && window.renderNewFileInWorkspace) {
    // Use workspace-specific rendering function
    console.log("Rendering file in workspace context");
    window.renderNewFileInWorkspace(file, pageId);
    return;
  }
  
  // Original dashboard logic
  const containerEl = document.getElementById("page-blocks-container");
  if (!containerEl) {
    console.error("page-blocks-container not found in dashboard context");
    return;
  }

  const block = document.createElement("div");
  block.classList.add("page-block", "file-block", "draggable"); // Add draggable class
  block.setAttribute("data-type", "file");
  block.setAttribute("data-id", file.id);

  // Create file container
  const fileContainer = document.createElement("div");
  fileContainer.style.position = "relative";
  fileContainer.style.display = "block";
  fileContainer.style.padding = "12px";
  fileContainer.style.border = "1px solid #e5e7eb";
  fileContainer.style.borderRadius = "8px";
  fileContainer.style.background = "#f9fafb";
  
  console.log("File Complete: ", file);
  
  // Create file content
  // Function to get file icon based on extension
  function getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const iconMap = {
      'pdf': '../assets/images/pdf.png',
      'txt': '../assets/images/txt.png',
      'doc': '../assets/images/doc.png',
      'docx': '../assets/images/docx.png',
      'xls': '../assets/images/xls.png',
      'xlsx': '../assets/images/xls.png'
    };
    return iconMap[extension] || '../assets/images/icon-file.svg';
  }
  
  const fileContent = document.createElement("div");
  fileContent.style.display = "flex";
  fileContent.style.alignItems = "center";
  fileContent.innerHTML = `
    <img src="${getFileIcon(file.name)}" style="width: 50px; height: 50px; margin-right: 12px;">
    <div style="flex: 1;">
      <div style="font-weight: 500; color: #1f2937;">${file.name}</div>
      <div style="font-size: 12px; color: #6b7280;">
        Created: ${new Date(file.createdDateTime).toLocaleDateString()}
        ${file.createdByUser ? `• by ${file.createdByUser}` : ''}
      </div>
    </div>
    <a href="${getFileDownloadUrl(file, pageId)}" download="${file.name}" target="_blank" style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; text-decoration: none; display: inline-block; text-align: center;">
      Download
    </a>
  `;
  
  fileContainer.appendChild(fileContent);
  block.appendChild(fileContainer);
  containerEl.appendChild(block);
  
  const wrapper = containerEl.closest(".page-content-wrapper");
  if (wrapper) {
    wrapper.classList.toggle("hidden");
  }
  enableBlockDragAndDrop(containerEl);
}
function enableBlockDragAndDrop(container) {
  interact('.page-block.draggable')
    .draggable({
      inertia: true,
      listeners: {
        start(event) {
          event.target.classList.add('dragging');
        },
        move(event) {
          const target = event.target;
          const deltaY = (parseFloat(target.getAttribute('data-dy')) || 0) + event.dy;

          target.style.transform = `translateY(${deltaY}px)`;
          target.setAttribute('data-dy', deltaY);
        },
        end(event) {
          const target = event.target;
          target.classList.remove('dragging');
          target.style.transform = '';
          target.removeAttribute('data-dy');

          const blocks = Array.from(container.querySelectorAll('.page-block'));
          const mouseY = event.client ? event.client.y : event.pageY;

          const draggedIndex = blocks.indexOf(target);

          const swapWith = blocks.find(el => {
            if (el === target) return false;
            const rect = el.getBoundingClientRect();
            return mouseY < rect.top + rect.height / 2;
          });

          if (swapWith) {
            container.insertBefore(target, swapWith);
          } else {
            container.appendChild(target);
          }

          // ažuriraj redosled u bazi
          const reordered = Array.from(container.children);
          reordered.forEach((el, i) => {
            const type = el.dataset.type;
            const id = parseInt(el.dataset.id, 10);
            if (type === "note") {
              window.__TAURI__.core.invoke("update_note_order", {
                noteId: id,
                orderIndex: i
              });
            } else if (type === "image") {
              window.__TAURI__.core.invoke("update_image_order", {
                imageId: id,
                orderIndex: i
              });
            }
          });
        }
      }
    });
}

export function openWorkspaceTab(workspace, forceNew = false) {
  const tabsBar = document.getElementById('tabs-bar');
  const tabsContent = document.getElementById('tabs-content');

  const anyOpen = Object.keys(openTabs).length > 0;

  if (!forceNew && openTabs[workspace.id]) {
    activateTab(workspace.id);
    // Also refresh tasks when switching to an already open workspace
    setTimeout(() => {
      if (window.fetchTasksForWorkspace) {
        console.log('🔄 Refreshing tasks for already open workspace:', workspace.id);
        try {
          window.fetchTasksForWorkspace(workspace.id);
        } catch (error) {
          console.error('❌ Failed to refresh tasks for workspace:', workspace.id, error);
        }
      } else if (window.reloadCurrentPageData) {
        console.log('🔄 Fallback: refreshing page data for workspace:', workspace.id);
        try {
          window.reloadCurrentPageData();
        } catch (error) {
          console.error('❌ Failed to refresh data for workspace:', workspace.id, error);
        }
      }
    }, 100);
    return;
  }

  if (!forceNew && anyOpen) {
    const firstOpenId = getActiveTabId();
    if (!firstOpenId) {
      // fallback ako nema ni jedan aktivan
      firstOpenId = Object.keys(openTabs)[0];
    }
    const { tab, content } = openTabs[firstOpenId];

    delete openTabs[firstOpenId];
    tab.dataset.workspaceId = workspace.id;
    tab.innerHTML = `${workspace.name} <span class="close-tab">×</span>`;
    tab.querySelector('.close-tab').addEventListener('click', () => {
      // Safely remove workspace-specific lines
      if (window.workspaceLines && window.workspaceLines[workspace.id]) {
        window.workspaceLines[workspace.id].forEach(line => {
          try {
            if (line && line.remove) {
              line.remove();
            }
          } catch (err) {
            console.warn('Error removing line:', err);
          }
        });
        delete window.workspaceLines[workspace.id];
      }

      tabsBar.removeChild(tab);
      tabsContent.removeChild(content);
      delete openTabs[workspace.id];
      
      // Clear workspace data when tab is closed
      if (window.currentWorkspaceId === workspace.id) {
        window.currentWorkspaceId = null;
        console.log('🧹 Cleared data for closed workspace:', workspace.id);
      }
      const keys = Object.keys(openTabs);
      if (keys.length) {
        activateTab(keys[keys.length - 1]);
      } else {
        updateFabVisibility();
      }
    });

    tab.addEventListener('click', () => {
      activateTab(workspace.id);
    });

    content.id = `tab-${workspace.id}`;
    content.innerHTML = "";

    fetch('pages/workspace.html')
      .then(res => res.text())
      .then(html => {
        content.innerHTML = html;
        return import('./workspace.js');
      })
      .then(({ init }) => {
        init(workspace, content.querySelector('.workspace-container'));
        // Trigger task fetching for the newly opened workspace
        console.log('🔄 Workspace opened, triggering task fetch for workspace:', workspace.id);
      });

    openTabs[workspace.id] = { tab, content };
    activateTab(workspace.id);
    
    // Highlight the workspace in the sidebar
    setTimeout(() => {
      if (window.highlightWorkspaceById) {
        window.highlightWorkspaceById(workspace.id);
      }
    }, 100);
    
    // Ensure tasks are fetched for the newly opened workspace
    setTimeout(() => {
      if (window.fetchTasksForWorkspace) {
        console.log('🔄 Ensuring task fetch for workspace:', workspace.id);
        try {
          window.fetchTasksForWorkspace(workspace.id);
        } catch (error) {
          console.error('❌ Failed to fetch tasks for workspace:', workspace.id, error);
        }
      } else if (window.reloadCurrentPageData) {
        console.log('🔄 Fallback: reloading page data for workspace:', workspace.id);
        try {
          window.reloadCurrentPageData();
        } catch (error) {
          console.error('❌ Failed to reload data for workspace:', workspace.id, error);
        }
      }
    }, 200);
    
    return;
  }

  const tab = document.createElement('div');
  tab.classList.add('tab');
  tab.dataset.workspaceId = workspace.id;
  tab.innerHTML = `${workspace.name} <span class="close-tab">×</span>`;
  tabsBar.insertBefore(tab, document.getElementById("add-workspace-tab"));

  const content = document.createElement('div');
  content.classList.add('tab-pane');
  content.id = `tab-${workspace.id}`;
  tabsContent.appendChild(content);

  fetch('pages/workspace.html')
    .then(res => res.text())
    .then(html => {
      content.innerHTML = html;
      return import('./workspace.js');
    })
    .then(({ init }) => {
      init(workspace, content.querySelector('.workspace-container'));
      // Trigger task fetching for the newly opened workspace
      console.log('🔄 Workspace opened, triggering task fetch for workspace:', workspace.id);
    });

  openTabs[workspace.id] = { tab, content };

  activateTab(workspace.id);
  
  // Highlight the workspace in the sidebar
  setTimeout(() => {
    if (window.highlightWorkspaceById) {
      window.highlightWorkspaceById(workspace.id);
    }
  }, 100);
  
  // Ensure tasks are fetched for the newly opened workspace
  setTimeout(() => {
    if (window.fetchTasksForWorkspace) {
      console.log('🔄 Ensuring task fetch for workspace:', workspace.id);
      try {
        window.fetchTasksForWorkspace(workspace.id);
      } catch (error) {
        console.error('❌ Failed to fetch tasks for workspace:', workspace.id, error);
      }
    } else if (window.reloadCurrentPageData) {
      console.log('🔄 Fallback: reloading page data for workspace:', workspace.id);
      try {
        window.reloadCurrentPageData();
      } catch (error) {
        console.error('❌ Failed to reload data for workspace:', workspace.id, error);
      }
    }
  }, 200);

  tab.querySelector('.close-tab').addEventListener('click', () => {
    // Safely remove workspace-specific lines
    if (window.workspaceLines && window.workspaceLines[workspace.id]) {
      window.workspaceLines[workspace.id].forEach(line => {
        try {
          if (line && line.remove) {
            line.remove();
          }
        } catch (err) {
          console.warn('Error removing line:', err);
        }
      });
      delete window.workspaceLines[workspace.id];
    }

    // Clear global lines only if they belong to this workspace
    if (window.currentLines) {
      window.currentLines = window.currentLines.filter(line => {
        try {
          // Check if line is still valid before accessing it
          if (line && line.start && line.end) {
            const startEl = line.start;
            const endEl = line.end;
            // If elements belong to this workspace's content, remove the line
            if (content.contains(startEl) || content.contains(endEl)) {
              line.remove();
              return false;
            }
          }
          return true;
        } catch (err) {
          // If error accessing line, it's probably already invalid
          return false;
        }
      });
    }

    if (tab && tab.parentNode && tab.parentNode.contains(tab)) {
      tab.parentNode.removeChild(tab);
    }

    if (content && content.parentNode && content.parentNode.contains(content)) {
      content.parentNode.removeChild(content);
    }

    delete openTabs[workspace.id];
    
    // Clear workspace data when tab is closed
    if (window.currentWorkspaceId === workspace.id) {
      window.currentWorkspaceId = null;
      console.log('🧹 Cleared data for closed workspace:', workspace.id);
    }

    const keys = Object.keys(openTabs);
    if (keys.length) {
      activateTab(keys[keys.length - 1]);
    } else {
      updateFabVisibility();
    }
  });

  tab.addEventListener('click', () => {
    activateTab(workspace.id);
  });
}

function openLinkTab(link) {
  const tabsBar = document.getElementById('tabs-bar');
  const tabsContent = document.getElementById('tabs-content');

  if (openTabs["link-" + link.id]) {
    activateTab("link-" + link.id);
    return;
  }

  const tab = document.createElement('div');
  tab.classList.add('tab');
  tab.dataset.linkId = link.id;
  tab.innerHTML = `${link.name} <span class="close-tab">×</span>`;
  tabsBar.insertBefore(tab, document.getElementById("add-workspace-tab"));

  const content = document.createElement('div');
  content.classList.add('tab-pane');
  content.id = `tab-link-${link.id}`;
  content.innerHTML = `
      <iframe src="${link.url}" style="width: 100%; height: calc(100vh - 100px); border: none;"></iframe>
    `;
  tabsContent.appendChild(content);

  openTabs["link-" + link.id] = { tab, content };
  activateTab("link-" + link.id);

  tab.querySelector('.close-tab').addEventListener('click', () => {
    // Don't remove lines when closing a link tab - they belong to workspaces
    tabsBar.removeChild(tab);
    tabsContent.removeChild(content);
    delete openTabs["link-" + link.id];

    const keys = Object.keys(openTabs);
    if (keys.length) {
      activateTab(keys[keys.length - 1]);
    } else {
      updateFabVisibility();
    }
  });

  tab.addEventListener('click', () => {
    activateTab("link-" + link.id);
  });
}


function renderNoteInWorkspace(container, note) {
  let noteBox = container.querySelector(".workspace-note");
  if (!noteBox) {
    noteBox = document.createElement("div");
    noteBox.classList.add("workspace-note");
    container.appendChild(noteBox);
  }

  noteBox.innerHTML = `
      <h4 style="font-size: 16px;">📝 Note</h4>
      <div class="note-text">${note.text}</div>
    `;
}
function activateTab(workspaceId) {
  console.log('🔄 Activating tab for workspace ID:', workspaceId);
  
  // First, hide all lines from all workspaces
  if (window.workspaceLines) {
    Object.keys(window.workspaceLines).forEach(wsId => {
      if (window.workspaceLines[wsId]) {
        window.workspaceLines[wsId].forEach(line => {
          try {
            if (line && line.hide && typeof line.hide === 'function') {
              line.hide();
            }
          } catch (err) {
            console.warn('Error hiding line:', err);
          }
        });
      }
    });
  }

  // Also hide global lines (for backward compatibility)
  if (window.currentLines && window.currentLines.length > 0) {
    window.currentLines.forEach(line => {
      try {
        if (line && line.hide && typeof line.hide === 'function') {
          line.hide();
        }
      } catch (err) {
        console.warn('Error hiding global line:', err);
      }
    });
  }

  for (const id in openTabs) {
    const { tab, content } = openTabs[id];
    const isActive = id === workspaceId.toString();
    tab.classList.toggle('active', isActive);
    content.style.display = isActive ? 'block' : 'none';

    // If this is the active tab and it's not a link tab, show its lines
    if (isActive && !id.startsWith('link-')) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        // Show lines for this specific workspace
        if (window.workspaceLines && window.workspaceLines[id]) {
          window.workspaceLines[id].forEach(line => {
            try {
              if (line && line.show && typeof line.show === 'function') {
                line.show();
                if (line.position && typeof line.position === 'function') {
                  line.position();
                }
              }
            } catch (err) {
              console.warn('Error showing line:', err);
            }
          });
        }
      }, 0);
    }
  }

  // Update FAB visibility
  updateFabVisibility();
  
  // Highlight the workspace in the sidebar
  if (window.highlightWorkspaceById && !workspaceId.toString().startsWith('link-')) {
    window.highlightWorkspaceById(workspaceId);
  }
  
  // Trigger data reload for the activated workspace
  if (openTabs[workspaceId] && !workspaceId.toString().startsWith('link-')) {
    const { content } = openTabs[workspaceId];
    const workspaceContainer = content.querySelector('.workspace-container');
    
    if (workspaceContainer && window.reloadCurrentPageData) {
      console.log('🔄 Triggering data reload for workspace:', workspaceId);
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        try {
          window.reloadCurrentPageData();
        } catch (error) {
          console.error('❌ Failed to reload data for workspace:', workspaceId, error);
        }
      }, 100);
    } else {
      // If workspace container is not ready, try again after a longer delay
      setTimeout(() => {
        if (window.reloadCurrentPageData) {
          console.log('🔄 Retrying data reload for workspace:', workspaceId);
          try {
            window.reloadCurrentPageData();
          } catch (error) {
            console.error('❌ Failed to reload data for workspace:', workspaceId, error);
          }
        }
      }, 500);
    }
  }
}
export function restoreOpenTabs() {
  const tabsBar = document.getElementById('tabs-bar');
  const tabsContent = document.getElementById('tabs-content');

  if (!tabsBar || !tabsContent) return;

  for (const id in openTabs) {
    const { tab, content } = openTabs[id];
    tabsBar.insertBefore(tab, document.getElementById("add-workspace-tab"));
    tabsContent.appendChild(content);
    content.style.display = 'none'; // osveži prikaz (ne prikazuje sve odjednom)
  }


  const lastOpened = Object.keys(openTabs).at(-1);
  if (lastOpened) {
    activateTab(lastOpened);
  }
  ensureAddTabButton();
}

function highlightSelectedLabel(clickedElement) {
  document.querySelectorAll('.folder-label, .file-label, .vault-label').forEach(el => {
    el.classList.remove('active-label');
  });
  clickedElement.classList.add('active-label');
}

// Function to highlight a workspace by its ID
function highlightWorkspaceById(workspaceId) {
  console.log('🔄 Highlighting workspace in sidebar:', workspaceId);
  
  // Remove active class from all labels
  document.querySelectorAll('.folder-label, .file-label, .vault-label').forEach(el => {
    el.classList.remove('active-label');
  });
  
  // Find the workspace label by its ID and highlight it
  const workspaceLabel = document.querySelector(`.file-label[data-workspace-id="${workspaceId}"]`);
  if (workspaceLabel) {
    workspaceLabel.classList.add('active-label');
    console.log('✅ Workspace highlighted in sidebar:', workspaceId);
  } else {
    console.warn('⚠️ Workspace not found in sidebar:', workspaceId);
  }
}

// Make the function globally available
window.highlightWorkspaceById = highlightWorkspaceById;
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // Custom modal
    const customModal = document.getElementById("custom-modal");
    if (customModal && !customModal.classList.contains("hidden")) {
      customModal.classList.add("hidden");
      enableScroll();
    }

    // Workspace task modal
    const taskModal = document.getElementById("add-task-modal");
    if (taskModal && !taskModal.classList.contains("hidden")) {
      taskModal.classList.add("hidden");
      enableScroll();
    }

  }
});
const searchInput = document.querySelector('.search-bar input');

searchInput?.addEventListener('input', (e) => {
  const term = e.target.value.trim().toLowerCase();

  // First, show all elements
  document.querySelectorAll('.folder-tree li').forEach(li => {
    li.style.display = '';
  });

  if (term === '') return; // If search is empty, show everything

  // Find all matching elements
  const matchingElements = new Set();
  const allLabels = document.querySelectorAll('.folder-tree .file-label, .folder-tree .folder-label, .folder-tree .vault-label');

  allLabels.forEach(label => {
    const text = label.textContent.toLowerCase();
    if (text.includes(term)) {
      const li = label.closest('li');
      if (li) {
        matchingElements.add(li);

        // Add all parent elements to show the path
        let parent = li.parentElement?.closest('li');
        while (parent) {
          matchingElements.add(parent);
          parent = parent.parentElement?.closest('li');
        }

        // Add all child elements to show nested content
        li.querySelectorAll('li').forEach(child => {
          matchingElements.add(child);
        });
      }
    }
  });

  // Hide all elements that are not in the matching set
  document.querySelectorAll('.folder-tree li').forEach(li => {
    if (!matchingElements.has(li)) {
      li.style.display = 'none';
    }
  });
});
const tabsBar = document.getElementById('tabs-bar');
const contextMenu = document.getElementById('customContextMenu');

// Show context menu only when right-clicking on tabs-bar
tabsBar.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  contextMenu.style.top = `${e.clientY}px`;
  contextMenu.style.left = `${e.clientX}px`;
  contextMenu.classList.remove('hidden');
});

// Hide context menu when clicking elsewhere
document.addEventListener('click', () => {
  contextMenu.classList.add('hidden');
});

// Handle menu item clicks
contextMenu.addEventListener('click', (e) => {
  const action = e.target.getAttribute('data-action');
  if (action === 'new-tab') {
    document.getElementById('add-workspace-tab').click();
  } else if (action === 'close-all') {
    // Iterate through all open tabs and close them
    for (const id in openTabs) {
      const { tab, content } = openTabs[id];
      tab.remove();
      content.remove();
    }

    // Clear the openTabs object
    Object.keys(openTabs).forEach(key => delete openTabs[key]);

    // Update FAB visibility
    updateFabVisibility();
  }
  contextMenu.classList.add('hidden');
});

document.getElementById('new-tab-dropdown').addEventListener('click', function () {
  document.getElementById('add-workspace-tab').click();
});

// Save File Modal functionality


document.addEventListener('DOMContentLoaded', function () {
  const wrappers = document.querySelectorAll('.icon-wrapper');

  wrappers.forEach(wrapper => {
    wrapper.addEventListener('click', function () {
      const tooltip = this.getAttribute('data-tooltip');
      alert(`Clicked: ${tooltip}`);
    });
  });
});
