import { openWorkspaceTab } from '../js/dashboard.js';

// Make openWorkspaceTab globally available
window.openWorkspaceTab = openWorkspaceTab;
let tempLine = null;
let dragFromEl = null;
let ghost = null;
let grid, prevWidth, prevHeight;
export async function init(page, container) {
    const { invoke } = window.__TAURI__.core;
  
    // Helper function to show messages
    function showMessage(message, type = 'info') {
      const messageEl = container.querySelector('#page-message');
      if (!messageEl) return;
      
      messageEl.textContent = message;
      messageEl.classList.remove('success', 'error', 'info', 'hidden');
      messageEl.classList.add(type);
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        messageEl.classList.add('hidden');
      }, 3000);
    }

    // Helper function to refresh/reset task form
    function refreshTaskForm() {
      const taskForm = container.querySelector("#add-task-modal");
      if (taskForm) {
        container.querySelector("#task-title").value = "";
        container.querySelector("#task-description").value = "";
        container.querySelector("#task-due-date").value = "";
        container.querySelector("#task-status").value = "";
        container.querySelector("#task-priority").value = "";
        container.querySelector("#task-assigned-id").selectedIndex = 0;
        container.querySelector("#task-industry").value = "";
      }
    }

    // Helper function to refresh/reset card form
    function refreshCardForm() {
      const cardForm = container.querySelector("#add-card-modal");
      if (cardForm) {
        container.querySelector("#card-title").value = "";
        container.querySelector("#card-description").value = "";
        container.querySelector("#card-status").selectedIndex = 0;
        container.querySelector("#card-priority").value = "";
        container.querySelector("#card-category").value = "";
        container.querySelector("#card-assigned-to").selectedIndex = 0;
        container.querySelector("#card-due-date").value = "";
      }
    }

    // Helper function to refresh/reset update task form
    function refreshUpdateTaskForm() {
      const updateTaskForm = container.querySelector("#update-task-modal");
      if (updateTaskForm) {
        container.querySelector("#update-task-id").value = "";
        container.querySelector("#update-task-title").value = "";
        container.querySelector("#update-task-description").value = "";
        container.querySelector("#update-task-due-date").value = "";
        container.querySelector("#update-task-status").value = "";
        container.querySelector("#update-task-priority").value = "";
        container.querySelector("#update-task-assigned-id").selectedIndex = 0;
        container.querySelector("#update-task-industry").value = "";
      }
    }

    // Helper function to refresh/reset update card form
    function refreshUpdateCardForm() {
      const updateCardForm = container.querySelector("#update-card-modal");
      if (updateCardForm) {
        container.querySelector("#update-card-id").value = "";
        container.querySelector("#update-card-title").value = "";
        container.querySelector("#update-card-description").value = "";
        container.querySelector("#update-card-status").selectedIndex = 0;
        container.querySelector("#update-card-priority").value = "";
        container.querySelector("#update-card-category").value = "";
        container.querySelector("#update-card-assigned-to").selectedIndex = 0;
        container.querySelector("#update-card-due-date").value = "";
      }
    }

    // Global function to refresh all forms - can be called externally
    window.refreshWorkspaceForms = function() {
      refreshTaskForm();
      refreshCardForm();
      refreshUpdateTaskForm();
      refreshUpdateCardForm();
      console.log("All workspace forms refreshed");
    };
    
    // Function to set up task event listeners
    function setupTaskEventListeners() {
      if (!page || !page.name) {
        console.error('❌ setupTaskEventListeners called without valid page object');
        return;
      }
      
      console.log("setupTaskEventListeners called for page:", page.name, "- Page ID:", page.id);
      console.log('🔧 Setting up task event listeners for page:', page.name);
      
      // Remove tab initialization since we're using unified layout
      console.log('🔄 Unified layout - no tabs needed');
      
      const modal = container.querySelector("#add-task-modal");
      const saveBtn = container.querySelector("#save-task-btn");
      const cancelBtn = container.querySelector("#cancel-task-btn");
      const addTaskBtn = container.querySelector("#add-task-btn");
      
      console.log('Task elements found:', {
        modal: !!modal,
        saveBtn: !!saveBtn,
        cancelBtn: !!cancelBtn,
        addTaskBtn: !!addTaskBtn,
        pageId: page.id,
        pageName: page.name
      });
      
      if (!modal || !saveBtn || !cancelBtn || !addTaskBtn) {
        console.error('❌ Missing task elements, cannot set up listeners for page:', page.name);
        console.error('Missing elements:', {
          modal: !modal ? 'MISSING' : 'found',
          saveBtn: !saveBtn ? 'MISSING' : 'found', 
          cancelBtn: !cancelBtn ? 'MISSING' : 'found',
          addTaskBtn: !addTaskBtn ? 'MISSING' : 'found'
        });
        
        // Try to set up whatever elements we can find
        console.log('🔄 Attempting partial setup with available elements...');
      }
      
      // Set up add task button
      if (addTaskBtn && modal) {
        console.log('🔧 Setting up add task button for page:', page.name);
        
        // Remove existing event listeners
        addTaskBtn.removeEventListener("click", addTaskBtn._taskAddHandler);
        
        // Create the event handler function
        const addHandler = () => {
          console.log('📝 Opening task creation modal for page:', page.name, '- Page ID:', page.id);
          modal.classList.remove("hidden");
        };
        
        // Store reference for cleanup and attach listener
        addTaskBtn._taskAddHandler = addHandler;
        addTaskBtn.addEventListener("click", addHandler);
        console.log('✅ Add task button event listener attached for page:', page.name);
      }
      
      // Set up save button
      if (saveBtn && modal) {
        console.log('🔧 Setting up save button for page:', page.name);
        
        // Remove existing event listeners (simpler approach)
        saveBtn.removeEventListener("click", saveBtn._taskSaveHandler);
        
        // Create the event handler function
        const saveHandler = async (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('💾 Save button clicked for page:', page.name, '- Page ID:', page.id);
          
          const payload = {
            title: container.querySelector("#task-title").value,
            description: container.querySelector("#task-description").value,
            dueDate: container.querySelector("#task-due-date").value,
            status: container.querySelector("#task-status").value,
            priority: container.querySelector("#task-priority").value,
            assignedTo: container.querySelector("#task-assigned-id").value ? 
              parseInt(container.querySelector("#task-assigned-id").value) : null,
            pageId: page.id,
            industry: container.querySelector("#task-industry").value
          };
          
          console.log('📋 Task payload for page', page.name, ':', payload);
          
          // Validate required fields
          if (!payload.title || !payload.title.trim()) {
            showMessage("Task title is required", 'error');
            return;
          }
          
          try {
            showPageLoading('Creating task...');
            const created = await invoke("create_task_for_page", payload);
            console.log('✅ Task created successfully:', created, 'for page:', page.name);
            
            // Reload all page data from server to ensure consistency
            await reloadPageData();
            modal.classList.add("hidden");
            hidePageLoading();
            refreshTaskForm();
            showMessage(`Task created successfully for ${page.name}`, 'success');
            
            // Check if a workspace was created for this task
            try {
              const taskId = created.id; 
              const workspaceForTask = await invoke("fetch_workspaces_for_task", { taskId: taskId });
            } catch (error) {
              console.log('No workspace found for task or error:', error);
            }
            
            if (window.refreshDashboardReferences) {
              
              window.refreshDashboardReferences();
            } else {
              
              // Fallback to event dispatch
              if (created.vaultId) {
              
                const event = new CustomEvent('workspaceCreated', {
                  detail: { vaultId: created.vaultId }
                });
              
                window.dispatchEvent(event);
              } else {
              
                const event = new CustomEvent('workspaceCreated', {
                  detail: { vaultId: null }
                });
              
                window.dispatchEvent(event);
              }
            }
            
            // Refresh the task list to show the new task
            try {
              const allWorkspaceTasks = await invoke("fetch_tasks_for_workspace", { workspaceId: currentPage.workspaceId });
              // Filter tasks to only show tasks for the current page
              const currentPageIdNum = Number(currentPage.id);
              const updatedTasks = allWorkspaceTasks.filter(task => Number(task.pageId) === currentPageIdNum);
              relevantTasks = updatedTasks;
              renderTasks(relevantTasks);
              
            } catch (error) {
              console.error('❌ Failed to refresh task list:', error);
            }
            
            // Refresh the sidebar treeview to show the new workspace
            if (window.loadTreeView) {
              
              window.loadTreeView();
            }
          } catch (e) {
            console.error("❌ Error creating task for page", page.name, ":", e);
            hidePageLoading();
            showMessage(`Failed to create task: ${e}`, 'error');
          }
        };
        
        // Store reference for cleanup and attach listener
        saveBtn._taskSaveHandler = saveHandler;
        saveBtn.addEventListener("click", saveHandler);
        console.log('✅ Save button event listener attached for page:', page.name);
      }
      
      // Set up cancel button
      if (cancelBtn && modal) {
        console.log('🔧 Setting up cancel button for page:', page.name);
        
        // Remove existing event listeners
        cancelBtn.removeEventListener("click", cancelBtn._taskCancelHandler);
        
        // Create the event handler function
        const cancelHandler = (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('❌ Cancel button clicked for page:', page.name);
          modal.classList.add("hidden");
          refreshTaskForm();
        };
        
        // Store reference for cleanup and attach listener
        cancelBtn._taskCancelHandler = cancelHandler;
        cancelBtn.addEventListener("click", cancelHandler);
        
      }
      
    }
    
    // Make setupTaskEventListeners globally available
    window.setupTaskEventListeners = setupTaskEventListeners;
    
    // Fallback direct delete function
    async function deleteNoteDirectly(noteId) {
      try {
    
        await window.__TAURI__.core.invoke("delete_textbox", { 
          textboxId: noteId 
        });
    
        
        if (window.reloadCurrentPageData) {
          await window.reloadCurrentPageData();
        }
        
        showMessage("Note deleted successfully", 'success');
      } catch (error) {
    
        showMessage(`Failed to delete note: ${error}`, 'error');
      }
    }

    // Simple delete note modal function
    function showDeleteNoteModal(noteId) {
      // Create modal overlay
      const modalOverlay = document.createElement('div');
      modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      `;

      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        min-width: 300px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      `;

      modalContent.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #333;">Delete Note</h3>
        <p style="margin: 0 0 20px 0; color: #666;">Are you sure you want to delete this note? This action cannot be undone.</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button id="cancelDelete" style="
            padding: 8px 16px;
            border: 1px solid #ccc;
            background: white;
            border-radius: 4px;
            cursor: pointer;
          ">Cancel</button>
          <button id="confirmDelete" style="
            padding: 8px 16px;
            border: none;
            background: #dc3545;
            color: white;
            border-radius: 4px;
            cursor: pointer;
          ">Delete</button>
        </div>
      `;

      modalOverlay.appendChild(modalContent);
      document.body.appendChild(modalOverlay);

      // Add event listeners
      modalContent.querySelector('#cancelDelete').addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
      });

      modalContent.querySelector('#confirmDelete').addEventListener('click', async () => {
        try {
          console.log('🗑️ Deleting note with ID:', noteId);
          await window.__TAURI__.core.invoke("delete_textbox", { 
            textboxId: noteId 
          });
          console.log('✅ Note deleted successfully');
          
          // Reload page data to reflect changes
          if (window.reloadCurrentPageData) {
            await window.reloadCurrentPageData();
          }
          
          showMessage("Note deleted successfully", 'success');
          document.body.removeChild(modalOverlay);
        } catch (error) {
          console.error('❌ Failed to delete note:', error);
          showMessage(`Failed to delete note: ${error}`, 'error');
          document.body.removeChild(modalOverlay);
        }
      });

      // Close modal when clicking outside
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          document.body.removeChild(modalOverlay);
        }
      });
    }

    // Function to set up delete confirmation modal handlers (following calendar pattern)  
    function setupDeleteConfirmationHandlers() {
      console.log('🔧 Setting up delete confirmation handlers');
      // Note deletion modal handlers - try container first, then document
      let deleteNoteModal = container.querySelector("#delete-note-confirmation-modal");
      let deleteNoteCloseBtn = container.querySelector("#delete-note-confirmation-close-btn");
      let deleteNoteCancelBtn = container.querySelector("#delete-note-confirmation-cancel-btn");
      let deleteNoteDeleteBtn = container.querySelector("#delete-note-confirmation-delete-btn");
      
      // If not found in container, try document
      if (!deleteNoteModal) {
        deleteNoteModal = document.querySelector("#delete-note-confirmation-modal");
        deleteNoteCloseBtn = document.querySelector("#delete-note-confirmation-close-btn");
        deleteNoteCancelBtn = document.querySelector("#delete-note-confirmation-cancel-btn");
        deleteNoteDeleteBtn = document.querySelector("#delete-note-confirmation-delete-btn");
        console.log('🔄 Searched in document scope for modal elements');
      }
      
      console.log('🔍 Delete note modal elements:', {
        modal: !!deleteNoteModal,
        closeBtn: !!deleteNoteCloseBtn,
        cancelBtn: !!deleteNoteCancelBtn,
        deleteBtn: !!deleteNoteDeleteBtn
      });
      
      if (deleteNoteCloseBtn) {
        deleteNoteCloseBtn.addEventListener('click', () => {
          deleteNoteModal.classList.add('hidden');
        });
      }
      
      if (deleteNoteCancelBtn) {
        deleteNoteCancelBtn.addEventListener('click', () => {
          deleteNoteModal.classList.add('hidden');
        });
      }
      
      if (deleteNoteDeleteBtn) {
        deleteNoteDeleteBtn.addEventListener('click', async () => {
          if (window.currentNoteToDelete) {
            try {
              console.log('🗑️ Deleting note with ID:', window.currentNoteToDelete);
              await window.__TAURI__.core.invoke("delete_textbox", { 
                textboxId: window.currentNoteToDelete 
              });
              console.log('✅ Note deleted successfully');
              
              // Find and remove the note element from DOM immediately for better UX
              const noteElement = container.querySelector(`.draggable-item[data-id="${window.currentNoteToDelete}"]`);
              if (noteElement) {
                noteElement.remove();
                console.log('🗑️ Note element removed from DOM');
              }
              
              // Then try to reload page data to reflect changes in other views
              if (typeof window.reloadCurrentPageData === 'function') {
                console.log('🔄 Calling reloadCurrentPageData to refresh UI');
                await window.reloadCurrentPageData();
              } else {
                console.log('ℹ️ No reloadCurrentPageData function available');
              }
              
              showMessage("Note deleted successfully", 'success');
              deleteNoteModal.classList.add('hidden');
            } catch (error) {
              console.error('❌ Failed to delete note:', error);
              showMessage(`Failed to delete note: ${error}`, 'error');
            }
          }
        });
      }
      
      // Image deletion modal handlers
      const deleteImageModal = container.querySelector("#delete-image-confirmation-modal");
      const deleteImageCloseBtn = container.querySelector("#delete-image-confirmation-close-btn");
      const deleteImageCancelBtn = container.querySelector("#delete-image-confirmation-cancel-btn");
      const deleteImageDeleteBtn = container.querySelector("#delete-image-confirmation-delete-btn");
      
      if (deleteImageCloseBtn) {
        deleteImageCloseBtn.addEventListener('click', () => {
          deleteImageModal.classList.add('hidden');
        });
      }
      
      if (deleteImageCancelBtn) {
        deleteImageCancelBtn.addEventListener('click', () => {
          deleteImageModal.classList.add('hidden');
        });
      }
      
      if (deleteImageDeleteBtn) {
        deleteImageDeleteBtn.addEventListener('click', async () => {
          if (window.currentImageToDelete) {
            try {
              console.log('🗑️ Deleting image with ID:', window.currentImageToDelete);
              // Try delete_image first, fall back to delete_textbox if not available
              try {
                await window.__TAURI__.core.invoke("delete_image", { 
                  imageId: window.currentImageToDelete 
                });
              } catch (apiError) {
                console.warn('delete_image API not found, trying delete_textbox:', apiError);
                await window.__TAURI__.core.invoke("delete_textbox", { 
                  textboxId: window.currentImageToDelete 
                });
              }
              console.log('✅ Image deleted successfully');
              
              // Find and remove the image element from DOM immediately for better UX
              const imageElement = container.querySelector(`.draggable-item[data-id="${window.currentImageToDelete}"]`);
              if (imageElement) {
                imageElement.remove();
                console.log('🗑️ Image element removed from DOM');
              }
              
              // Then try to reload page data to reflect changes in other views
              if (typeof window.reloadCurrentPageData === 'function') {
                console.log('🔄 Calling reloadCurrentPageData to refresh UI');
                await window.reloadCurrentPageData();
              } else {
                console.log('ℹ️ No reloadCurrentPageData function available');
              }
              
              showMessage("Image deleted successfully", 'success');
              deleteImageModal.classList.add('hidden');
            } catch (error) {
              console.error('❌ Failed to delete image:', error);  
              showMessage(`Failed to delete image: ${error}`, 'error');
            }  
          }
        });
      }
      
      console.log('✅ Delete confirmation modal handlers set up');
    }
    
    // Make debugging function accessible globally
    window.debugTaskListeners = function() {
      console.log('🔍 Debugging task listeners for page:', page.name);
      const modal = container.querySelector("#add-task-modal");
      const saveBtn = container.querySelector("#save-task-btn");
      const cancelBtn = container.querySelector("#cancel-task-btn");
      const addTaskBtn = container.querySelector("#add-task-btn");
      
      console.log('Current element status:', {
        modal: !!modal,
        saveBtn: !!saveBtn,
        cancelBtn: !!cancelBtn,
        addTaskBtn: !!addTaskBtn,
        container: !!container,
        pageId: page.id,
        pageName: page.name
      });
      
      if (saveBtn) {
        console.log('Save button details:', {
          id: saveBtn.id,
          className: saveBtn.className,
          onclick: !!saveBtn.onclick,
          hasTaskSaveHandler: !!saveBtn._taskSaveHandler,
          listenerCount: saveBtn.getEventListeners ? saveBtn.getEventListeners('click')?.length : 'N/A'
        });
      }
      
      if (cancelBtn) {
        console.log('Cancel button details:', {
          id: cancelBtn.id,
          className: cancelBtn.className,
          hasTaskCancelHandler: !!cancelBtn._taskCancelHandler
        });
      }
      
      return { modal, saveBtn, cancelBtn, addTaskBtn };
    };

    // Test function to demonstrate form refresh functionality
    window.testFormRefresh = function() {
      console.log("=== Testing Form Refresh Functionality ===");
      
      // Fill forms with test data
      const taskTitle = container.querySelector("#task-title");
      const cardTitle = container.querySelector("#card-title");
      
      if (taskTitle) {
        taskTitle.value = "Test Task Title";
        console.log("Task form filled with test data");
      }
      
      if (cardTitle) {
        cardTitle.value = "Test Card Title";
        console.log("Card form filled with test data");
      }
      
      console.log("Now calling refreshWorkspaceForms()...");
      window.refreshWorkspaceForms();
      
      // Verify forms are cleared
      if (taskTitle && taskTitle.value === "") {
        console.log("✅ Task form successfully refreshed");
      }
      
      if (cardTitle && cardTitle.value === "") {
        console.log("✅ Card form successfully refreshed");
      }
      
      console.log("=== Form refresh test completed ===");
    };
    
    // Test function to verify task creation is working
    window.testTaskCreation = function() {
      console.log("=== Testing Task Creation ===");
      
      const addTaskBtn = container.querySelector("#add-task-btn");
      const modal = container.querySelector("#add-task-modal");
      const saveBtn = container.querySelector("#save-task-btn");
      const cancelBtn = container.querySelector("#cancel-task-btn");
      
      console.log("Elements found:", {
        addTaskBtn: !!addTaskBtn,
        modal: !!modal,
        saveBtn: !!saveBtn,
        cancelBtn: !!cancelBtn
      });
      
      if (addTaskBtn) {
        console.log("🎯 Testing add task button...");
        addTaskBtn.click();
        
        setTimeout(() => {
          if (modal && !modal.classList.contains("hidden")) {
            console.log("✅ Task modal opened successfully");
            
            // Fill in some test data
            const titleField = container.querySelector("#task-title");
            const descriptionField = container.querySelector("#task-description");
            
            if (titleField) {
              titleField.value = "Test Task from Console";
              console.log("✅ Title field filled");
            }
            
            if (descriptionField) {
              descriptionField.value = "This is a test task created from console";
              console.log("✅ Description field filled");
            }
            
            console.log("🎯 Task form ready for testing. You can now click Save or Cancel.");
          } else {
            console.log("❌ Task modal did not open");
          }
        }, 100);
      } else {
        console.log("❌ Add task button not found");
      }
      
      console.log("=== Task creation test completed ===");
    };

    // Test function to demonstrate card positioning
    window.testCardPositioning = function() {
      console.log("=== Testing Card Positioning System ===");
      
      console.log("Current cards count:", cards.length);
      console.log("Current cards positions:");
      cards.forEach((card, index) => {
        console.log(`Card ${index + 1}: ${card.name} at (${card.x || 0}, ${card.y || 0})`);
      });
      
      const nextPosition = findAvailableCardPosition();
      console.log("Next available position would be:", nextPosition);
      
      console.log("=== Card positioning test completed ===");
    };

    // Global function to manually recalculate all card positions
    window.redistributeCards = function() {
      console.log("=== Redistributing All Cards ===");
      
      const CARD_WIDTH = 250;
      const CARD_HEIGHT = 150;
      const GRID_SPACING = 20;
      const START_X = 20;
      const START_Y = 20;
      const CARDS_PER_ROW = 4;
      
      cards.forEach((card, index) => {
        const row = Math.floor(index / CARDS_PER_ROW);
        const col = index % CARDS_PER_ROW;
        
        const newX = START_X + (col * (CARD_WIDTH + GRID_SPACING));
        const newY = START_Y + (row * (CARD_HEIGHT + GRID_SPACING));
        
        // Update card position
        card.x = newX;
        card.y = newY;
        
        // Update DOM element
        const cardElement = document.getElementById(`card-${card.id}`);
        if (cardElement) {
          cardElement.style.transform = `translate(${newX}px, ${newY}px)`;
          cardElement.setAttribute("data-x", newX);
          cardElement.setAttribute("data-y", newY);
        }
        
        // Try to update backend
        updateCardPosition(card.id, newX, newY);
        
        console.log(`Card ${card.name} repositioned to (${newX}, ${newY})`);
      });
      
      console.log("✅ All cards redistributed in grid pattern");
    };

    // Preview function to show where the next card would be positioned
    window.previewNextCardPosition = function() {
      const nextPos = findAvailableCardPosition();
      console.log(`🎯 Next card will be positioned at: (${nextPos.x}, ${nextPos.y})`);
      
      // Temporarily show a preview indicator (optional visual feedback)
      const grid = document.getElementById("cards-grid");
      if (grid) {
        const preview = document.createElement("div");
        preview.id = "card-position-preview";
        preview.style.position = "absolute";
        preview.style.width = "240px";
        preview.style.height = "140px";
        preview.style.border = "2px dashed #007bff";
        preview.style.borderRadius = "8px";
        preview.style.backgroundColor = "rgba(0, 123, 255, 0.1)";
        preview.style.transform = `translate(${nextPos.x}px, ${nextPos.y}px)`;
        preview.style.pointerEvents = "none";
        preview.style.zIndex = "1000";
        preview.innerHTML = '<div style="text-align: center; line-height: 140px; color: #007bff; font-weight: bold;">New Card Position</div>';
        
        grid.appendChild(preview);
        
        // Remove after 3 seconds
        setTimeout(() => {
          if (preview && preview.parentNode) {
            preview.parentNode.removeChild(preview);
          }
        }, 3000);
      }
      
      return nextPos;
    };

    // Function to update context menu based on task favorite/pinned status
    async function updateTaskContextMenu(task) {
      const favoriteBtn = container.querySelector('[data-action="add-taskFavourite"]');
      const unfavoriteBtn = container.querySelector('[data-action="remove-taskFavourite"]');
      const pinBtn = container.querySelector('[data-action="add-taskPinned"]');
      const unpinBtn = container.querySelector('[data-action="remove-taskPinned"]');

      try {
        // Check if task is favorited
        const isFavorited = await invoke("is_task_favorited", { taskId: task.id });
        if (isFavorited) {
          favoriteBtn.classList.add("hidden");
          unfavoriteBtn.classList.remove("hidden");
        } else {
          favoriteBtn.classList.remove("hidden");
          unfavoriteBtn.classList.add("hidden");
        }

        // Check if task is pinned
        const isPinned = await invoke("is_task_pinned", { taskId: task.id });
        if (isPinned) {
          pinBtn.classList.add("hidden");
          unpinBtn.classList.remove("hidden");
        } else {
          pinBtn.classList.remove("hidden");
          unpinBtn.classList.add("hidden");
        }
      } catch (err) {
        console.error("Error checking task status:", err);
        // Show default state (add buttons) on error
        favoriteBtn.classList.remove("hidden");
        unfavoriteBtn.classList.add("hidden");
        pinBtn.classList.remove("hidden");
        unpinBtn.classList.add("hidden");
      }
    }

    // Test function to check task favorite/pinned status
    window.testTaskStatus = async function(taskId) {
      console.log(`=== Testing Task Status for Task ID: ${taskId} ===`);
      
      try {
        const isFavorited = await invoke("is_task_favorited", { taskId });
        const isPinned = await invoke("is_task_pinned", { taskId });
        
        console.log(`Task ${taskId} - Favorited: ${isFavorited}, Pinned: ${isPinned}`);
        
        return { isFavorited, isPinned };
      } catch (err) {
        console.error("Error checking task status:", err);
        return { error: err };
      }
    };

    // Test function to toggle task favorite status
    window.testToggleFavorite = async function(taskId) {
      console.log(`=== Testing Toggle Favorite for Task ID: ${taskId} ===`);
      
      try {
        const isFavorited = await invoke("is_task_favorited", { taskId });
        console.log(`Current favorite status: ${isFavorited}`);
        
        if (isFavorited) {
          await invoke("unfavorite_task", { taskId });
          console.log("✅ Task unfavorited successfully");
        } else {
          await invoke("favorite_task", { taskId });
          console.log("✅ Task favorited successfully");
        }
        
        // Check new status
        const newStatus = await invoke("is_task_favorited", { taskId });
        console.log(`New favorite status: ${newStatus}`);
        
      } catch (err) {
        console.error("Error toggling favorite:", err);
      }
    };

    // Test function to toggle task pinned status
    window.testTogglePin = async function(taskId) {
      console.log(`=== Testing Toggle Pin for Task ID: ${taskId} ===`);
      
      try {
        const isPinned = await invoke("is_task_pinned", { taskId });
        console.log(`Current pinned status: ${isPinned}`);
        
        if (isPinned) {
          await invoke("unpin_task", { taskId });
          console.log("✅ Task unpinned successfully");
        } else {
          await invoke("pin_task", { taskId });
          console.log("✅ Task pinned successfully");
        }
        
        // Check new status
        const newStatus = await invoke("is_task_pinned", { taskId });
        console.log(`New pinned status: ${newStatus}`);
        
      } catch (err) {
        console.error("Error toggling pin:", err);
      }
    };

    // Function to refresh all forms when page is initialized
    function refreshAllFormsOnInit() {
      refreshTaskForm();
      refreshCardForm();
      refreshUpdateTaskForm();
      refreshUpdateCardForm();
    }

    // Card positioning system
    function calculateNextCardPosition() {
      const CARD_WIDTH = 250;  // Approximate card width
      const CARD_HEIGHT = 150; // Approximate card height
      const GRID_SPACING = 20; // Space between cards
      const START_X = 20;      // Starting X position
      const START_Y = 20;      // Starting Y position
      const CARDS_PER_ROW = 4; // Max cards per row

      // Get current cards count for this page
      const currentCardsCount = cards.length;
      
      // Calculate row and column based on card count
      const row = Math.floor(currentCardsCount / CARDS_PER_ROW);
      const col = currentCardsCount % CARDS_PER_ROW;
      
      // Calculate position
      const x = START_X + (col * (CARD_WIDTH + GRID_SPACING));
      const y = START_Y + (row * (CARD_HEIGHT + GRID_SPACING));
      
      return { x, y };
    }

    // Function to find a non-overlapping position for a new card
    function findAvailableCardPosition() {
      const CARD_WIDTH = 250;
      const CARD_HEIGHT = 150;
      const GRID_SPACING = 20;
      const START_X = 20;
      const START_Y = 20;
      
      // First try the grid-based approach
      let position = calculateNextCardPosition();
      
      // Check if this position overlaps with existing cards
      let attempts = 0;
      const maxAttempts = 50;
      
      while (attempts < maxAttempts) {
        let hasOverlap = false;
        
        // Check against all existing cards
        for (const existingCard of cards) {
          const existingX = parseInt(existingCard.x) || 0;
          const existingY = parseInt(existingCard.y) || 0;
          
          // Check if rectangles overlap
          if (position.x < existingX + CARD_WIDTH &&
              position.x + CARD_WIDTH > existingX &&
              position.y < existingY + CARD_HEIGHT &&
              position.y + CARD_HEIGHT > existingY) {
            hasOverlap = true;
            break;
          }
        }
        
        if (!hasOverlap) {
          return position;
        }
        
        // If overlap found, try next position
        attempts++;
        const row = Math.floor(attempts / 4);
        const col = attempts % 4;
        position = {
          x: START_X + (col * (CARD_WIDTH + GRID_SPACING)),
          y: START_Y + (row * (CARD_HEIGHT + GRID_SPACING))
        };
      }
      
      // If all attempts failed, just use a staggered approach
      return {
        x: START_X + (cards.length % 5) * 60,
        y: START_Y + Math.floor(cards.length / 5) * 40
      };
    }

    // Function to update card position in backend
    async function updateCardPosition(cardId, x, y) {
      try {
        await invoke("update_card_position", {
          cardId: cardId,
          x: x,
          y: y
        });
      } catch (err) {
        console.log("Note: Could not update card position in backend:", err);
        // This is non-critical, cards will still be positioned correctly in the UI
      }
    }
  
    // Store lines specific to this page/workspace
    if (!window.workspaceLines) {
      window.workspaceLines = {};
    }
    
    // Remove existing lines for this workspace
    if (window.workspaceLines[page.workspaceId]) {
      window.workspaceLines[page.workspaceId].forEach(line => line.remove());
      window.workspaceLines[page.workspaceId] = [];
    }
    
    // Clear global lines (for backward compatibility)
    window.currentLines.forEach(line => line.remove());
    window.currentLines = [];
    let currentCards = []; 
    let clickedCardId = null;
    const cardContextMenu = document.getElementById("card-context-menu");
    
    // Declare data variables that will be updated by reloadPageData
    let tasks, notes, images, cards, files, workspace, workspacesForTasks = {};
    // Simple task storage - no complex workspace-specific storage needed
    let relevantTasks = [];
    
    // Function to update DOM element references for renderTasks
    function updateRenderTasksElements(cardHeader, taskSection, tableWrapper, addTaskBtnWrapper, tbody) {
      // Store current elements for renderTasks to use
      window.pageElements = {
        cardHeader,
        taskSection, 
        tableWrapper,
        addTaskBtnWrapper,
        tbody
      };
    }
    
    // Function to apply consistent page-block styling to task table wrapper
    function applyTaskTableStyling(tableWrapper) {
      if (tableWrapper) {
        tableWrapper.style.background = 'white';
        tableWrapper.style.border = '1px solid #e5e7eb';
        tableWrapper.style.borderRadius = '8px';
        tableWrapper.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        tableWrapper.style.marginBottom = '16px';
      }
    }
    
    // Hide both task table and cards section when there is no content
    function updateEmptyWorkspaceVisibility() {
      const tableWrapper = container.querySelector('.task-table-wrapper');
      const cardsSection = container.querySelector('.cards-section');
      const tasksCount = Array.isArray(relevantTasks) ? relevantTasks.length : 0;
      const cardsCount = Array.isArray(currentCards) ? currentCards.length : 0;

      // Hide task table when there are no tasks
      if (tasksCount === 0) {
        tableWrapper?.classList.add('hidden');
      } else {
        tableWrapper?.classList.remove('hidden');
      }

      // Hide cards section when there are no cards
      if (cardsCount === 0) {
        cardsSection?.classList.add('hidden');
      } else {
        cardsSection?.classList.remove('hidden');
      }
    }
    
    // Function to reload all page data from server
    async function reloadPageData() {
      try {
        // Use current page (for tab switching) or fallback to original page
        const currentPage = window.currentPage || page;
        console.log('🔄 Reloading page data from server for:', currentPage.name, '- Page ID:', currentPage.id, '- Workspace ID:', currentPage.workspaceId);
        
        // Clear current task data to prevent contamination
        tasks = [];
        relevantTasks = [];
        
        // Update current workspace ID
        window.currentWorkspaceId = currentPage.workspaceId;
        
        // Fetch fresh data from server using current workspace ID
        if (!currentPage.workspaceId) {
          console.error('❌ No workspace ID found for page:', currentPage.name);
          return;
        }
        
        // Validate that we're fetching for the correct workspace
        if (window.currentWorkspaceId && window.currentWorkspaceId !== currentPage.workspaceId) {
          console.warn('⚠️ Workspace ID mismatch. Expected:', window.currentWorkspaceId, 'Got:', currentPage.workspaceId);
        }
        
        console.log('📋 Fetching tasks for workspace ID:', currentPage.workspaceId);
        const allWorkspaceTasks = await invoke("fetch_tasks_for_workspace", { workspaceId: currentPage.workspaceId });
        // Filter tasks to only show tasks for the current page
        const currentPageIdNum = Number(currentPage.id);
        tasks = allWorkspaceTasks.filter(task => Number(task.pageId) === currentPageIdNum);
        console.log('📋 Filtered tasks for page', currentPageIdNum, ':', tasks.length, 'out of', allWorkspaceTasks.length, 'total workspace tasks');
        
        notes = await invoke("fetch_textbox_for_page", { pageId: currentPage.id });
        images = await invoke("fetch_images_for_page", { pageId: currentPage.id });
        cards = await invoke("fetch_cards_for_page", { pageId: currentPage.id });
        try {
          const allFiles = await invoke("fetch_files");
          // Convert IDs to numbers for proper comparison
          const pageIdNum = Number(currentPage.id);
          files = allFiles.filter(file => Number(file.pageId) === pageIdNum);
          console.log('📁 Filtered files for page', pageIdNum, ':', files);
        } catch (error) {
          console.log('📁 fetch_files failed, using empty files array:', error);
          files = [];
        }
        workspace = await invoke("fetch_workspace", { workspaceId: currentPage.workspaceId });
        
        // Load card connections for the current page
        const connections = await invoke("fetch_card_connections_for_page", { pageId: currentPage.id });
        console.log('🔗 Fetched card connections in reloadPageData:', connections.length);
        
        // Reload workspaces for tasks
        workspacesForTasks = {};
        await Promise.all(tasks.map(async task => {
          try {
            const wss = await invoke("fetch_workspaces_for_task", { taskId: task.id });
            workspacesForTasks[task.id] = wss; 
          } catch (error) {
            console.log(error);
          }
        }));
        
        // Update relevantTasks with fresh data
        relevantTasks = tasks;
        
        // Clear any existing task table content first
        const existingTbody = container.querySelector("tbody");
        if (existingTbody) {
          existingTbody.innerHTML = "";
        }
        
        // Re-render all components with fresh data
        // Render tasks first to ensure task table is visible
        renderTasks(relevantTasks);
        renderCards(cards);
        
        // Render card connections after cards are rendered
        renderCardConnections(connections);
        
        // Then render page blocks (notes, images, and files)
        renderPageBlocks(notes, images, files, tasks, currentPage.id, currentPage.orderIndex);
        
        // Re-query DOM elements to ensure they're current
        const cardHeader = container.querySelector(".card-header");
        const taskSection = cardHeader?.parentElement;
        const tableWrapper = container.querySelector(".task-table-wrapper");
        const addTaskBtnWrapper = container.querySelector(".add-task-btn");
        const tbody = container.querySelector("tbody");
        
        // Update references for future use
        updateRenderTasksElements(cardHeader, taskSection, tableWrapper, addTaskBtnWrapper, tbody);
        
        // Ensure task table is visible if tasks exist
        if (relevantTasks.length > 0) {
          console.log('✅ Showing task elements in reloadPageData for', currentPage.name, 'with', relevantTasks.length, 'tasks');
          cardHeader?.classList.remove("hidden");
          taskSection?.classList.remove("hidden");
          tableWrapper?.classList.remove("hidden");
          addTaskBtnWrapper?.classList.remove("hidden");
          
          // Apply page-block styling to task table wrapper
          applyTaskTableStyling(tableWrapper);
          console.log('📊 Task table visibility set for', currentPage.name);
        } else {
          console.log('⚠️ No tasks found in reloadPageData for', currentPage.name);
        }

        // Update combined empty-state visibility after full render
        updateEmptyWorkspaceVisibility();
        
        console.log('✅ Page data reloaded successfully for', currentPage.name, ':', {
          tasks: tasks.length,
          notes: notes.length,
          images: images.length,
          cards: cards.length,
          connections: connections.length
        });
        
      } catch (error) {
        console.error('❌ Failed to reload page data:', error);
        throw error;
      }
    }
    
    // Initial data loading
    // Use current page (for tab switching) or fallback to original page
    const currentPage = window.currentPage || page;
    console.log('🔄 Main data fetch for page:', currentPage.name, '- Page ID:', currentPage.id, '- Workspace ID:', currentPage.workspaceId);
    
    if (!currentPage.workspaceId) {
      console.error('❌ No workspace ID found for page:', currentPage.name);
      return;
    }
    
    // Set current workspace ID
    window.currentWorkspaceId = currentPage.workspaceId;
    
    console.log('📋 Fetching tasks for workspace ID:', currentPage.workspaceId);
    const allWorkspaceTasks = await invoke("fetch_tasks_for_workspace", { workspaceId: currentPage.workspaceId });
    // Filter tasks to only show tasks for the current page
    const currentPageIdNum = Number(currentPage.id);
    tasks = allWorkspaceTasks.filter(task => Number(task.pageId) === currentPageIdNum);
    console.log('📋 Filtered tasks for page', currentPageIdNum, ':', tasks.length, 'out of', allWorkspaceTasks.length, 'total workspace tasks');
    
    notes = await invoke("fetch_textbox_for_page", { pageId: currentPage.id });
    const users = await invoke("get_users_for_vault",{ vaultId: currentPage.vaultId});
    cards = await invoke("fetch_cards_for_page", { pageId: currentPage.id });
    try {
      const allFiles = await invoke("fetch_files");
      // Convert IDs to numbers for proper comparison
      const pageIdNum = Number(currentPage.id);
      files = allFiles.filter(file => Number(file.pageId) === pageIdNum);
      console.log('📁 Filtered files for page', pageIdNum, ':', files);
    } catch (error) {
      console.log('📁 fetch_files failed, using empty files array:', error);
      files = [];
    }
    workspace = await invoke("fetch_workspace", { workspaceId: currentPage.workspaceId });
    images = await invoke("fetch_images_for_page", { pageId: currentPage.id });

    const connections = await invoke("fetch_card_connections_for_page", { pageId: currentPage.id });
    const userSelect = container.querySelector("#task-assigned-id");
    const userSelectCard = container.querySelector("#card-assigned-to");
    const userSelectUpdate = container.querySelector("#update-task-assigned-id");
    
    // Load workspaces for tasks
    await Promise.all(tasks.map(async task => {
      try {
        const wss = await invoke("fetch_workspaces_for_task", { taskId: task.id });
        workspacesForTasks[task.id] = wss; 
      } catch (error) {
        console.log(error);
      }
      
    }));

    // Deduplicate users based on user ID
    const uniqueUsers = Array.from(new Map(users.map(user => [user[0], user])).values());
    
    uniqueUsers.forEach(user => {
        const opt1 = document.createElement("option");
        opt1.value = user[0];
        opt1.textContent = user[1];
        userSelect.appendChild(opt1);
      
        const opt2 = document.createElement("option");
        opt2.value = user[0];
        opt2.textContent = user[1];
        userSelectCard.appendChild(opt2);
        
        const opt3 = document.createElement("option");
        opt3.value = user[0];
        opt3.textContent = user[1];
        userSelectUpdate.appendChild(opt3);
      });

    const cardHeader = container.querySelector(".card-header");
    const taskSection = cardHeader?.parentElement;
    const tableWrapper = container.querySelector(".task-table-wrapper");
    const addTaskBtnWrapper = container.querySelector(".add-task-btn");
    const tbody = container.querySelector("tbody");
    
    // Store initial DOM element references
    updateRenderTasksElements(cardHeader, taskSection, tableWrapper, addTaskBtnWrapper, tbody);
  
    const modal = container.querySelector("#add-task-modal");
    const saveBtn = container.querySelector("#save-task-btn");
    const cancelBtn = container.querySelector("#cancel-task-btn");
  
    let currentSort = { column: null, asc: true };
    // Set relevantTasks from fresh data
    relevantTasks = tasks;
    
    // Column configuration
    const availableColumns = [
      { id: 'title', label: 'Name', visible: true, required: true },
      { id: 'industry', label: 'Industry', visible: true },
      { id: 'description', label: 'Description', visible: false },
      { id: 'status', label: 'Status', visible: false },
      { id: 'priority', label: 'Priority', visible: false },
      { id: 'assignedToName', label: 'Assigned To', visible: false },
      { id: 'dueDate', label: 'Due Date', visible: false },
      { id: 'createdByName', label: 'Author', visible: true },
      { id: 'createdDateTime', label: 'Created', visible: true },
      { id: 'lastModifyDateTime', label: 'Edited', visible: true }
    ];
    
    // Load saved column preferences from localStorage
    const savedColumns = localStorage.getItem('taskTableColumns');
    if (savedColumns) {
      const savedConfig = JSON.parse(savedColumns);
      availableColumns.forEach(col => {
        if (savedConfig[col.id] !== undefined && !col.required) {
          col.visible = savedConfig[col.id];
        }
      });
    }
  
    console.log('🔄 Rendering components for page:', currentPage.name);
    console.log('📊 Data counts:', {
      tasks: relevantTasks.length,
      cards: cards.length,
      notes: notes.length,
      images: images.length,
      connections: connections.length,
      pageId: currentPage.id
    });
    
    renderTasks(relevantTasks);
    renderCards(cards);
    renderPageBlocks(notes, images, files, tasks, currentPage.id, currentPage.orderIndex );
    
    // Update visibility after initial rendering
    updateEmptyWorkspaceVisibility();
    
    // Render card connections after initial rendering
    console.log('🔗 Initial render of card connections:', connections.length);
    if (connections && connections.length > 0) {
      renderCardConnections(connections);
    }
    
    // Apply initial styling to task table wrapper
    const initialTableWrapper = container.querySelector(".task-table-wrapper");
    if (initialTableWrapper && relevantTasks.length > 0) {
      applyTaskTableStyling(initialTableWrapper);
    }
    
    // Make reload function globally accessible for notes/images
    window.reloadCurrentPageData = reloadPageData;
    window.currentPage = page;
    window.currentWorkspaceId = currentPage.workspaceId;
    
    // Add a global function to fetch tasks for a specific workspace
    window.fetchTasksForWorkspace = async (workspaceId) => {
      try {
        console.log('🔄 Fetching tasks for workspace:', workspaceId);
        const tasks = await invoke("fetch_tasks_for_workspace", { workspaceId: workspaceId });
        relevantTasks = tasks;
        renderTasks(relevantTasks);
        console.log('✅ Tasks fetched and rendered for workspace:', workspaceId);
        return tasks;
      } catch (error) {
        console.error('❌ Failed to fetch tasks for workspace:', workspaceId, error);
        return [];
      }
    };
    
    // Delete confirmation handlers are now inline - no setup needed
    grid = document.getElementById('cards-grid');
    prevWidth  = grid.clientWidth;
    prevHeight = grid.clientHeight;

    // Initialize all forms with clean state
    refreshAllFormsOnInit();
    
    // Ensure event listeners are properly attached for new pages
    console.log('🔧 Setting up task event listeners after page initialization...');
    setupTaskEventListeners();
    
    // Additional safety check with delay for dynamic content
    setTimeout(() => {
      console.log('🔄 Double-checking task event listeners setup...');
      setupTaskEventListeners();
    }, 500);

    // Unified layout - no tabs needed
    console.log('🔄 Using unified layout without tabs');

    makeCardsDraggable();
    window.addEventListener('resize', onResize);
    
    // Set up FAB button for adding cards
    const addCardFab = container.querySelector("#add-card-fab");
    if (addCardFab) {
      addCardFab.addEventListener("click", () => {
        const cardModal = container.querySelector("#add-card-modal");
        if (cardModal) {
          cardModal.classList.remove("hidden");
        }
      });
    }
    // Initialize currentLines array
    if (!window.currentLines) {
      window.currentLines = [];
    }
    
    // Ensure card connections are rendered after DOM is ready and cards are positioned
    setTimeout(() => {
      if (window.currentLines && window.currentLines.length > 0) {
        window.currentLines.forEach(line => {
          try {
            if (line && line.remove) line.remove();
          } catch (e) {
            console.warn('Failed to remove existing line during timeout:', e);
          }
        });
        window.currentLines = [];
      }
      
      console.log('🔗 Timeout render of card connections:', connections.length);
      if (connections && connections.length > 0) {
        renderCardConnections(connections);
      }
    }, 100);
    const wrapper = container.closest(".page-content-wrapper");
    const hasContent =
      tasks.length > 0 ||
      notes.length > 0 ||
      images.length > 0 ||
      cards.length > 0;
    
    if (wrapper && hasContent) {
      wrapper.classList.remove("hidden");
    }
    window.addEventListener("resize", () => {
      if (window.currentLines && Array.isArray(window.currentLines)) {
        window.currentLines.forEach(line => {
          try {
            if (line && line.position) line.position();
          } catch (e) {
            console.warn('Failed to position line during resize:', e);
          }
        });
      }
      if (window.workspaceLines && window.workspaceLines[page.workspaceId] && Array.isArray(window.workspaceLines[page.workspaceId])) {
        window.workspaceLines[page.workspaceId].forEach(line => {
          try {
            if (line && line.position) line.position();
          } catch (e) {
            console.warn('Failed to position workspace line during resize:', e);
          }
        });
      }
    });
      const tabPane = container.closest(".tab-pane");
      if (tabPane) {
        tabPane.addEventListener("scroll", () => {
          if (window.currentLines && Array.isArray(window.currentLines)) {
            window.currentLines.forEach(line => {
              try {
                if (line && line.position) line.position();
              } catch (e) {
                console.warn('Failed to position line during scroll:', e);
              }
            });
          }
          if (window.workspaceLines && window.workspaceLines[page.workspaceId] && Array.isArray(window.workspaceLines[page.workspaceId])) {
            window.workspaceLines[page.workspaceId].forEach(line => {
              try {
                if (line && line.position) line.position();
              } catch (e) {
                console.warn('Failed to position workspace line during scroll:', e);
              }
            });
          }
        });
      }

    const cardModal = container.querySelector("#add-card-modal");
const saveCardBtn = container.querySelector("#save-card-btn");
const cancelCardBtn = container.querySelector("#cancel-card-btn");
function renderSingleCard(card) {
  const grid = document.getElementById("cards-grid");

  const el = document.createElement("div");
  el.classList.add("task-card", `color-${card.id % 6}`);
  el.setAttribute("data-card-id", card.id);

  const x = card.x || 0;
  const y = card.y || 0;
  el.id = `card-${card.id}`;
  el.style.position = "absolute";
  el.style.transform = `translate(${x}px, ${y}px)`;
  el.setAttribute("data-x", x);
  el.setAttribute("data-y", y);
  el.innerHTML =`
    <div class="task-card-title">${card.name}</div>
    <div class="task-card-field"><strong>Status:</strong> ${card.status || "–"}</div>
    <div class="task-card-field"><strong>Description:</strong> ${card.description || "–"}</div>
    <div class="task-card-field"><strong>Created:</strong> ${formatDate(card.createdDateTime)}</div>
  `;
          

  
  grid.appendChild(el);
  // Cards are now always visible in their tab - no need to toggle hidden class
  // document.querySelector(".cards-section").classList.remove("hidden");
  
  // Initialize global lines if not already initialized
  if (!window.currentLines) {
    window.currentLines = [];
  }
  
  // Initialize workspace lines if not already initialized
  if (!window.workspaceLines) {
    window.workspaceLines = {};
  }
  if (!window.workspaceLines[page.workspaceId]) {
    window.workspaceLines[page.workspaceId] = [];
  }
  
  interact(el).draggable({
    listeners: {
      move(event) {
        const target = event.target;
        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);

        if (window.currentLines && Array.isArray(window.currentLines)) {
          window.currentLines.forEach(line => {
            try {
              if (line && line.position) line.position();
            } catch (e) {
              console.warn('Failed to position line during drag:', e);
            }
          });
        }
        if (window.workspaceLines && window.workspaceLines[page.workspaceId] && Array.isArray(window.workspaceLines[page.workspaceId])) {
          window.workspaceLines[page.workspaceId].forEach(line => {
            try {
              if (line && line.position) line.position();
            } catch (e) {
              console.warn('Failed to position workspace line during drag:', e);
            }
          });
        }
      },
      end(event) {
        const target = event.target;
        const cardId = Number(target.dataset.cardId);
        const x = parseFloat(target.getAttribute('data-x')) || 0;
        const y = parseFloat(target.getAttribute('data-y')) || 0;
        // save position via Tauri
        invoke('update_card_position', { cardId, x, y })
          .catch(err => console.error("Failed to save position:", err));
      }
    },
    inertia: true,
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: '#cards-grid',
        endOnly: true
      })
    ]
  });
}
const addCardBtn = container.querySelector("#add-card-btn");
if (addCardBtn) {
  addCardBtn.addEventListener("click", () => {
    cardModal.classList.remove("hidden");
  });
}
const addTaskBtn = container.querySelector("#add-task-btn");
if (addTaskBtn) {
  addTaskBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
  });
}

// Add click event listener for creating notes on empty whitespace
const pageBlocksContainer = container.querySelector("#page-blocks-container");
if (pageBlocksContainer) {
  pageBlocksContainer.addEventListener("click", async (e) => {
    // Only create note if clicking directly on the container (empty space)
    if (e.target === pageBlocksContainer) {
      console.log('📝 Creating note from empty space click');
      try {
        // Use current page (for tab switching) or fallback to original page
        const currentPage = window.currentPage || page;
        console.log('📝 Creating note for current page:', currentPage.name, '- Page ID:', currentPage.id);
        await addEmptyNoteToPage(currentPage.id, container);
      } catch (error) {
        console.error('❌ Failed to create note from click:', error);
        showMessage('Failed to create note', 'error');
      }
    }
  });
}
document.addEventListener("contextmenu", (e) => {
  const card = e.target.closest(".task-card");
  if (card) {
    e.preventDefault();
    clickedCardId = parseInt(card.dataset.cardId, 10);
    
    const cardDetails = cards.find(c => c.id === clickedCardId);
    
    // Check if card still exists (might have been deleted)
    if (!cardDetails) {
      cardContextMenu.classList.add("hidden");
      return;
    }

    const workspaceBtn = cardContextMenu.querySelector("#card-workspace");
    
    if (cardDetails.workspaceId) {
      workspaceBtn.textContent = "Open Workspace";
      workspaceBtn.dataset.action = "open-workspace";
    } else {
      workspaceBtn.textContent = "Add Workspace";
      workspaceBtn.dataset.action = "add-workspace";
    }

    cardContextMenu.style.top = `${e.pageY}px`;
    cardContextMenu.style.left = `${e.pageX}px`;
    cardContextMenu.classList.remove("hidden");
  } else {
    cardContextMenu.classList.add("hidden");
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("#card-context-menu")) {
    cardContextMenu.classList.add("hidden");
  }
});
cardContextMenu.addEventListener("click", async (e) => {
  const action = e.target.dataset.action;
  if (!action || !clickedCardId) return;

  switch(action) {
    case "link-to":
      await handleLinkTo(clickedCardId);
      break;

    case "add-workspace":
      await handleAddWorkspace(clickedCardId);
      break;
    
    case "open-workspace":
      await handleOpenWorkspace(clickedCardId);
      break;
    
    case "update-card":
      await handleUpdateCard(clickedCardId);
      break;
    
    case "delete-card":
      await handleDeleteCard(clickedCardId);
      break;
  }

  cardContextMenu.classList.add("hidden");
});
cancelCardBtn.addEventListener("click", () => {
  cardModal.classList.add("hidden");
  // Refresh the card form when cancelled
  refreshCardForm();
});
async function handleUpdateTask(task) {
  const updateModal = container.querySelector("#update-task-modal");
  const updateIdField = container.querySelector("#update-task-id");
  const updateTitle = container.querySelector("#update-task-title");
  const updateDescription = container.querySelector("#update-task-description");
  const updateDueDate = container.querySelector("#update-task-due-date");
  const updateStatus = container.querySelector("#update-task-status");
  const updatePriority = container.querySelector("#update-task-priority");
  const updateAssignedId = container.querySelector("#update-task-assigned-id");
  const updateIndustry = container.querySelector("#update-task-industry");
  
  // Populate fields with current task data
  updateIdField.value = task.id;
  updateTitle.value = task.title || "";
  updateDescription.value = task.description || "";
  updateDueDate.value = task.dueDate ? task.dueDate.split('T')[0] : "";
  updateStatus.value = task.status || "";
  updatePriority.value = task.priority || "";
  updateAssignedId.value = task.assignedTo || "";
  updateIndustry.value = task.industry || "";
  
  // Show modal
  updateModal.classList.remove("hidden");
  
  // Set up event handlers
  const updateSaveBtn = container.querySelector("#update-task-save-btn");
  const updateCancelBtn = container.querySelector("#update-task-cancel-btn");
  
  // Remove existing listeners to avoid duplicates
  const newSaveBtn = updateSaveBtn.cloneNode(true);
  updateSaveBtn.parentNode.replaceChild(newSaveBtn, updateSaveBtn);
  
  const newCancelBtn = updateCancelBtn.cloneNode(true);
  updateCancelBtn.parentNode.replaceChild(newCancelBtn, updateCancelBtn);
  
  newCancelBtn.addEventListener("click", () => {
    updateModal.classList.add("hidden");
    // Refresh the update task form when cancelled
    refreshUpdateTaskForm();
  });
  
  // Handle Escape key
  const escapeHandler = (e) => {
    if (e.key === "Escape" && !updateModal.classList.contains("hidden")) {
      updateModal.classList.add("hidden");
      // Refresh the update task form when escaped
      refreshUpdateTaskForm();
      document.removeEventListener("keydown", escapeHandler);
    }
  };
  document.addEventListener("keydown", escapeHandler);
  
  newSaveBtn.addEventListener("click", async () => {
    try {
      const assignedToId = parseInt(container.querySelector("#update-task-assigned-id").value);
      const assignedUser = uniqueUsers.find(u => u[0] === assignedToId);
      const assignedToName = assignedUser ? assignedUser[1] : "";
      
      const updatedTask = await invoke("update_task", {
        taskId: task.id,
        title: updateTitle.value,
        description: updateDescription.value,
        dueDate: updateDueDate.value,
        status: updateStatus.value,
        priority: updatePriority.value,
        assignedTo: assignedToId || null,
        assignedToName: assignedToName,
        industry: updateIndustry.value,
        createdBy: task.createdBy,
        createdByName: task.createdByName,
        createdDateTime: task.createdDateTime,
        parentId: task.parentId || null,
        pageId: task.pageId,
        pageName: task.pageName || page.name || "",
        lastModifyDateTime: new Date().toISOString()
      });
      
              // Refresh the task list to show the updated task
        try {
          const allWorkspaceTasks = await invoke("fetch_tasks_for_workspace", { workspaceId: currentPage.workspaceId });
          // Filter tasks to only show tasks for the current page
          const currentPageIdNum = Number(currentPage.id);
          const updatedTasks = allWorkspaceTasks.filter(task => Number(task.pageId) === currentPageIdNum);
          relevantTasks = updatedTasks;
          renderTasks(relevantTasks);
          console.log('✅ Refreshed task list after update for workspace:', currentPage.workspaceId);
        } catch (error) {
          console.error('❌ Failed to refresh task list after update:', error);
        }
      
      updateModal.classList.add("hidden");
      
      // Refresh the update task form after successful update
      refreshUpdateTaskForm();
      
      showMessage("Task updated successfully", 'success');
    } catch (err) {
      console.error("Failed to update task:", err);
      showMessage(`Failed to update task: ${err}`, 'error');
    }
  });
}

async function handleOpenWorkspace(cardId) {
  const cardDetails = cards.find(c => c.id === cardId);
  
  if (!cardDetails.workspaceId) {
    showMessage("No workspace associated with this card", 'info');
    return;
  }

  try {
    const workspace = await window.__TAURI__.core.invoke("fetch_workspace", { 
      workspaceId: cardDetails.workspaceId 
    });

    if (workspace) {
      await openWorkspaceTab(workspace);  
      showMessage("Workspace opened successfully", 'success');
    } else {
      showMessage("Workspace not found", 'error');
    }
  } catch (err) {
    console.error("Failed to open workspace:", err);
    showMessage(`Failed to open workspace: ${err}`, 'error');
  }
}
async function handleLinkTo(cardId) {
  const availableCards = currentCards.filter(card => card.id != cardId);
  
  if (availableCards.length === 0) {
    showMessage("No other cards available to link", 'info');
    return;
  }

  const selectHtml = `
    <select id="link-to-select" style="width: 100%; padding: 8px;">
      ${availableCards.map(card => `<option value="${card.id}">${card.name}</option>`).join('')}
    </select>
  `;

  const modal = document.getElementById("custom-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalLabel = document.getElementById("modal-label");
  const modalInput = document.getElementById("modal-input");
  const modalTextarea = document.getElementById("modal-textarea");
  const cancelBtn = document.getElementById("modal-cancel-btn");
  const okBtn = document.getElementById("modal-ok-btn");

  modalTitle.textContent = "Link to Card";
  modalLabel.textContent = "Select Card to Link:";
  modalInput.classList.add("hidden");
  modalTextarea.classList.add("hidden");

  const existingSelect = modal.querySelector("#link-to-select");
  if(existingSelect) existingSelect.remove();

  modalLabel.insertAdjacentHTML('afterend', selectHtml);
  const selectElement = document.getElementById("link-to-select");

  modal.classList.remove("hidden");
  document.body.style.overflow = 'hidden';
  selectElement.focus();

  function cleanup() {
    modal.classList.add("hidden");
    document.body.style.overflow = '';
    cancelBtn.removeEventListener("click", onCancel);
    okBtn.removeEventListener("click", onOk);
    selectElement.remove();
  }

  function onCancel() {
    cleanup();
  }

  async function onOk() {
    const targetCardId = selectElement.value;
    cleanup();

    try {
      await window.__TAURI__.core.invoke("create_card_connection", {
        fromCardId: parseInt(cardId, 10),
        toCardId: parseInt(targetCardId, 10),
      });

      showMessage("Cards linked successfully", 'success');
      const connections = await window.__TAURI__.core.invoke("fetch_card_connections_for_page", { pageId: page.id });
      renderCardConnections(connections);
    } catch (err) {
      console.error("Error creating card connection:", err);
      showMessage(`Failed to link cards: ${err}`, 'error');
    }
  }

  cancelBtn.addEventListener("click", onCancel);
  okBtn.addEventListener("click", onOk);
}

async function handleAddWorkspace(cardId) {
  const workspaceName = await showCustomCardPrompt({
    title: "Add Workspace for Card",
    label: "Workspace Name:",
    okText: "Create",
  });

  if (!workspaceName) return;

  try {
    await window.__TAURI__.core.invoke("create_workspace_for_card", {
      name: workspaceName,
      cardId: parseInt(cardId, 10),
      folderId: workspace.folderId
    });
    showMessage("Workspace created successfully for card", 'success');
    
    // Refresh the cards list to get the updated workspace ID
    const updatedCards = await window.__TAURI__.core.invoke("fetch_cards_for_page", { pageId: page.id });
    const updatedCard = updatedCards.find(c => c.id === parseInt(cardId, 10));
    if (updatedCard) {
      // Update the local card data
      const localCardIndex = cards.findIndex(c => c.id === parseInt(cardId, 10));
      if (localCardIndex !== -1) {
        cards[localCardIndex] = updatedCard;
      }
    }
    
    // Call global function to refresh dashboard references
    if (window.refreshDashboardReferences) {
      console.log('Calling refreshDashboardReferences function for card workspace creation');
      window.refreshDashboardReferences();
    } else {
      console.warn('refreshDashboardReferences function not available, trying event dispatch');
      // Fallback to event dispatch
      window.dispatchEvent(new CustomEvent('workspaceCreated', {
        detail: { vaultId: workspace.vaultId }
      }));
    }
  } catch (err) {
    console.error("Error creating workspace for card:", err);
    showMessage(`Failed to create workspace: ${err}`, 'error');
  }
}
saveCardBtn.addEventListener("click", async () => {
  const title = container.querySelector("#card-title").value.trim();
  const description = container.querySelector("#card-description").value.trim();
  const status = container.querySelector("#card-status").value;
  const priority = container.querySelector("#card-priority").value;
  const category = container.querySelector("#card-category").value;
  const assignedTo = parseInt(container.querySelector("#card-assigned-to").value);
  const dueDate = container.querySelector("#card-due-date").value;

  if (!title) {
    showMessage("Please enter a card title", 'error');
    return;
  }

  try {
    // Show loading indicator
    showPageLoading('Creating card...');
    
    const createdCard = await invoke("create_card_for_page", {
      pageId: page.id,
      name: title,
      description,
      status,
      priority,
      category,
      assignedTo,
      dueDate
    });

    // Calculate smart position for the new card
    const newPosition = findAvailableCardPosition();
    
    // Update the card object with the new position
    createdCard.x = newPosition.x;
    createdCard.y = newPosition.y;
    
    // Log positioning for debugging
    console.log(`📍 New card "${createdCard.name}" positioned at (${newPosition.x}, ${newPosition.y})`);
    
    // Try to update position in backend (non-critical if it fails)
    updateCardPosition(createdCard.id, newPosition.x, newPosition.y);

    cards.push(createdCard);
    renderSingleCard(createdCard);
    cardModal.classList.add("hidden");
    
    // Hide loading indicator
    hidePageLoading();
    
    // Refresh the card form after successful creation
    refreshCardForm();
    
    showMessage("Card created successfully", 'success');
    
    // Update visibility after adding card
    updateEmptyWorkspaceVisibility();
    
    // Refresh the sidebar treeview to show the new workspace
    if (window.loadTreeView) {
      console.log('🔄 Refreshing sidebar treeview to show new workspace for card');
      window.loadTreeView();
    }
    
    // Redraw connections after adding new card
    setTimeout(() => {
      if (window.currentLines && Array.isArray(window.currentLines)) {
        window.currentLines.forEach(line => {
          try {
            if (line && line.position) line.position();
          } catch (e) {
            console.warn('Failed to position line after adding card:', e);
          }
        });
      }
      if (window.workspaceLines && window.workspaceLines[page.workspaceId] && Array.isArray(window.workspaceLines[page.workspaceId])) {
        window.workspaceLines[page.workspaceId].forEach(line => {
          try {
            if (line && line.position) line.position();
          } catch (e) {
            console.warn('Failed to position workspace line after adding card:', e);
          }
        });
      }
    }, 100);
  } catch (err) {
    console.error("Failed to create card:", err);
    hidePageLoading(); // Hide loading on error
    showMessage(`Failed to create card: ${err}`, 'error');
  }
});

async function handleUpdateCard(cardId) {
  const updateModal = container.querySelector("#update-card-modal");
  const updateIdField = container.querySelector("#update-card-id");
  const updateTitle = container.querySelector("#update-card-title");
  const updateDescription = container.querySelector("#update-card-description");
  const updateStatus = container.querySelector("#update-card-status");
  const updatePriority = container.querySelector("#update-card-priority");
  const updateCategory = container.querySelector("#update-card-category");
  const updateAssignedTo = container.querySelector("#update-card-assigned-to");
  const updateDueDate = container.querySelector("#update-card-due-date");
  
  // Find the card to update
  const card = cards.find(c => c.id === cardId);
  if (!card) {
    showMessage("Card not found", 'error');
    return;
  }
  
  // Populate fields with current card data
  updateIdField.value = card.id;
  updateTitle.value = card.name || "";
  updateDescription.value = card.description || "";
  updateStatus.value = card.status || "todo";
  updatePriority.value = card.priority || "";
  updateCategory.value = card.category || "";
  updateAssignedTo.value = card.assignedTo || "";
  updateDueDate.value = card.dueDate ? card.dueDate.split('T')[0] : "";
  
  // Populate assigned to dropdown
  const userSelectUpdate = container.querySelector("#update-card-assigned-to");
  userSelectUpdate.innerHTML = '<option value="" disabled>Assigned To</option>';
  
  const uniqueUsers = Array.from(new Map(users.map(user => [user[0], user])).values());
  uniqueUsers.forEach(user => {
    const opt = document.createElement("option");
    opt.value = user[0];
    opt.textContent = user[1];
    if (card.assignedTo === user[0]) {
      opt.selected = true;
    }
    userSelectUpdate.appendChild(opt);
  });
  
  // Show modal
  updateModal.classList.remove("hidden");
  
  // Set up event handlers
  const updateSaveBtn = container.querySelector("#update-card-save-btn");
  const updateCancelBtn = container.querySelector("#update-card-cancel-btn");
  
  // Remove existing listeners
  const newUpdateSaveBtn = updateSaveBtn.cloneNode(true);
  updateSaveBtn.parentNode.replaceChild(newUpdateSaveBtn, updateSaveBtn);
  
  const newUpdateCancelBtn = updateCancelBtn.cloneNode(true);
  updateCancelBtn.parentNode.replaceChild(newUpdateCancelBtn, updateCancelBtn);
  
  // Cancel button
  newUpdateCancelBtn.addEventListener("click", () => {
    updateModal.classList.add("hidden");
    // Refresh the update card form when cancelled
    refreshUpdateCardForm();
  });
  
  // Save button
  newUpdateSaveBtn.addEventListener("click", async () => {
    try {
      const updatedCard = await invoke("update_card", {
        cardId: parseInt(updateIdField.value),
        name: updateTitle.value,
        description: updateDescription.value,
        status: updateStatus.value,
        priority: updatePriority.value,
        category: updateCategory.value,
        dueDate: updateDueDate.value || "2025-02-26",
        assignedTo: updateAssignedTo.value ? parseInt(updateAssignedTo.value) : null,
        assignedToName: updateAssignedTo.value ? 
          updateAssignedTo.options[updateAssignedTo.selectedIndex].text : ""
      });
      
      // Update local card data
      const index = cards.findIndex(c => c.id === cardId);
      if (index !== -1) {
        cards[index] = updatedCard;
      }
      
      // Re-render the card
      const cardElement = container.querySelector(`.task-card[data-card-id="${cardId}"]`);
      if (cardElement) {
        const x = cardElement.getAttribute('data-x') || 0;
        const y = cardElement.getAttribute('data-y') || 0;
        cardElement.innerHTML = `
          <div class="task-card-title">${updatedCard.name}</div>
          <div class="task-card-field"><strong>Status:</strong> ${updatedCard.status || "–"}</div>
          <div class="task-card-field"><strong>Description:</strong> ${updatedCard.description || "–"}</div>
          <div class="task-card-field"><strong>Created:</strong> ${formatDate(updatedCard.createdDateTime)}</div>
        `;
      }
      
      updateModal.classList.add("hidden");
      
      // Refresh the update card form after successful update
      refreshUpdateCardForm();
      
      showMessage("Card updated successfully", 'success');
    } catch (err) {
      console.error("Failed to update card:", err);
      showMessage(`Failed to update card: ${err}`, 'error');
    }
  });
}

async function handleDeleteCard(cardId) {
  if (!confirm("Are you sure you want to delete this card?")) {
    return;
  }
  
  try {
    await invoke("delete_card", { cardId });
    
    // Even if we get a 500 error, the card might have been deleted
    // So we'll proceed with cleanup
    
  } catch (err) {
    console.error("Delete card error:", err);
    // Check if it's a 500 error - if so, the deletion might have succeeded
    if (err.toString().includes("500")) {
      console.log("Got 500 error but proceeding with cleanup as deletion might have succeeded");
    } else {
      showMessage(`Failed to delete card: ${err}`, 'error');
      return;
    }
  }
  
  // Proceed with cleanup regardless (for 500 errors)
  try {
    // Remove from local array by finding and removing the card
    const cardIndex = cards.findIndex(c => c.id === cardId);
    if (cardIndex !== -1) {
      cards.splice(cardIndex, 1);
    }
    
    // Remove from DOM
    const cardElement = container.querySelector(`.task-card[data-card-id="${cardId}"]`);
    if (cardElement) {
      cardElement.remove();
    }
    
    // Remove only the connections that involve the deleted card
    // We need to track which lines to keep
    const linesToRemove = [];
    const linesToKeep = [];
    
    // Check each line to see if it's connected to the deleted card
    if (window.currentLines) {
      window.currentLines.forEach(line => {
        try {
          // Check if either end of the line is the deleted card
          const startId = line.start.id;
          const endId = line.end.id;
          
          if (startId === `card-${cardId}` || endId === `card-${cardId}`) {
            linesToRemove.push(line);
            line.remove();
          } else {
            linesToKeep.push(line);
          }
        } catch (e) {
          // If we can't check the line, remove it to be safe
          linesToRemove.push(line);
          try { line.remove(); } catch (removeErr) {}
        }
      });
      
      // Update the current lines array
      window.currentLines = linesToKeep;
    }
    
    // Do the same for workspace lines
    if (window.workspaceLines && window.workspaceLines[page.workspaceId]) {
      const workspaceLinesToKeep = [];
      
      window.workspaceLines[page.workspaceId].forEach(line => {
        try {
          const startId = line.start.id;
          const endId = line.end.id;
          
          if (startId !== `card-${cardId}` && endId !== `card-${cardId}`) {
            workspaceLinesToKeep.push(line);
          }
          // Lines connected to deleted card will be removed automatically when the element is removed
        } catch (e) {
          // Skip lines that cause errors
        }
      });
      
      window.workspaceLines[page.workspaceId] = workspaceLinesToKeep;
    }
    
    // Reposition remaining lines after DOM changes
    setTimeout(() => {
      if (window.currentLines) {
        window.currentLines.forEach(line => {
          try {
            line.position();
          } catch (e) {
            console.log("Failed to reposition line:", e);
          }
        });
      }
      if (window.workspaceLines && window.workspaceLines[page.workspaceId]) {
        window.workspaceLines[page.workspaceId].forEach(line => {
          try {
            line.position();
          } catch (e) {
            console.log("Failed to reposition line:", e);
          }
        });
      }
    }, 100);
    
    showMessage("Card deleted successfully", 'success');
    
    // Update visibility after card deletion
    updateEmptyWorkspaceVisibility();
  } catch (cleanupErr) {
    console.error("Error during cleanup:", cleanupErr);
  }
}
    
    // Task button event listeners are now handled by setupTaskEventListeners() function
    // This prevents duplicate event listeners and ensures proper page context
  
      function renderTasks(taskList) {
    console.log('🔄 renderTasks called with', taskList.length, 'tasks');
    
    // Debug current page context
    const currentPage = window.currentPage || page;
    console.log('📋 Rendering tasks for page:', currentPage.name, '- Page ID:', currentPage.id);
      
      // Get current DOM elements (they may have been recreated)
      const currentCardHeader = window.pageElements?.cardHeader || container.querySelector(".card-header");
      const currentTaskSection = window.pageElements?.taskSection || currentCardHeader?.parentElement;
      const currentTableWrapper = window.pageElements?.tableWrapper || container.querySelector(".task-table-wrapper");
      const currentAddTaskBtnWrapper = window.pageElements?.addTaskBtnWrapper || container.querySelector(".add-task-btn");
      const currentTbody = window.pageElements?.tbody || container.querySelector("tbody");
      
      console.log('📋 Task elements found:', {
        cardHeader: !!currentCardHeader,
        taskSection: !!currentTaskSection,
        tableWrapper: !!currentTableWrapper,
        addTaskBtnWrapper: !!currentAddTaskBtnWrapper,
        tbody: !!currentTbody
      });
      
      if (!taskList.length) {
        console.log('❌ No tasks - hiding task elements only');
        currentCardHeader?.classList.add("hidden");
        currentTaskSection?.classList.add("hidden");
        currentTableWrapper?.classList.add("hidden");
        currentAddTaskBtnWrapper?.classList.add("hidden");
        updateEmptyWorkspaceVisibility();
        return;
      }

      console.log('✅ Tasks found for page:', currentPage.name, '- showing elements for', taskList.length, 'tasks');
      currentCardHeader?.classList.remove("hidden");
      currentTaskSection?.classList.remove("hidden");
      currentTableWrapper?.classList.remove("hidden");
      currentAddTaskBtnWrapper?.classList.remove("hidden");
      
      // Apply page-block styling to task table wrapper
      applyTaskTableStyling(currentTableWrapper);
      
      // Update table headers
      const thead = container.querySelector(".task-table thead tr");
      if (!thead) {
        console.warn('Task table header not found');
        return;
      }
      thead.innerHTML = "";
      
      availableColumns.forEach(col => {
        if (col.visible) {
          const th = document.createElement("th");
          th.setAttribute("data-column", col.id);
          th.innerHTML = `${col.label} <span class="sort-arrow"><img src="assets/images/arrow-down.svg"/></span>`;
          thead.appendChild(th);
        }
      });
      
      // Add the actions column
      const actionsHeader = document.createElement("th");
      thead.appendChild(actionsHeader);
  
      if (currentTbody) {
        currentTbody.innerHTML = "";
        taskList.forEach(task => {
          const tr = document.createElement("tr");
          let cells = "";
          
          availableColumns.forEach(col => {
            if (col.visible) {
              let value = task[col.id] || "";
              if (col.id === 'createdDateTime' || col.id === 'lastModifyDateTime' || col.id === 'dueDate') {
                value = value ? formatDate(value) : "";
              }
              
              // Make task title clickable to open workspace
              if (col.id === 'title') {
                cells += `<td><span class="clickable-task-title" data-task-id="${task.id}" style="cursor: pointer; color: #3b82f6; text-decoration: underline;">${value}</span></td>`;
              } else {
                cells += `<td>${value}</td>`;
              }
            }
          });
          
          cells += `<td style="text-align:right;"><button class="task-menu-btn"><img src="assets/images/dots.png"/></button></td>`;
          tr.innerHTML = cells;
          currentTbody.appendChild(tr);
        });
      } else {
        console.warn('Task table body not found');
      }
      
      // Re-attach sort handlers
      container.querySelectorAll("th[data-column]").forEach(th => {
        th.addEventListener("click", handleSort);
      });
      
      // Add click handlers for task titles
      container.querySelectorAll(".clickable-task-title").forEach(titleElement => {
        titleElement.addEventListener("click", async (e) => {
          e.preventDefault();
          const taskId = parseInt(titleElement.getAttribute("data-task-id"));
          console.log('🔄 Opening workspace for task:', taskId);
          
          try {
            // Fetch the workspace for this task
            const workspace = await invoke("fetch_workspaces_for_task", { taskId: taskId });
            console.log('✅ Found workspace for task:', workspace);
            
            // Open the workspace using the existing function
            if (window.openWorkspaceTab) {
              window.openWorkspaceTab(workspace);
              
              // Highlight the workspace in the sidebar
              setTimeout(() => {
                if (window.highlightWorkspaceById) {
                  window.highlightWorkspaceById(workspace.id);
                } else {
                  console.warn('⚠️ highlightWorkspaceById function not available');
                }
              }, 100); // Small delay to ensure workspace is opened
            } else {
              console.error('❌ openWorkspaceTab function not available');
            }
          } catch (error) {
            console.error('❌ Failed to open workspace for task:', taskId, error);
            showMessage(`No workspace found for this task`, 'error');
          }
        });
      });
    }
    function onResize() {
      const newW = grid.clientWidth;
      const newH = grid.clientHeight;
      const scaleX = newW / prevWidth;
      const scaleY = newH / prevHeight;
    
      document.querySelectorAll('.card').forEach(t => {
        const oldX = parseFloat(t.dataset.x) || 0;
        const oldY = parseFloat(t.dataset.y) || 0;
        const newX = oldX * scaleX;
        const newY = oldY * scaleY;
        t.style.transform = `translate(${newX}px, ${newY}px)`;
        t.dataset.x = newX;
        t.dataset.y = newY;
      });
    
      prevWidth  = newW;
      prevHeight = newH;
    }
 
  
    function formatDate(isoStr) {
      const date = new Date(isoStr);
      const d = String(date.getDate()).padStart(2, "0");
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const y = date.getFullYear();
      return `${d}.${m}.${y}`;
    }
  
    function handleSort() {
      const column = this.dataset.column;
      const isAsc = currentSort.column === column ? !currentSort.asc : true;
      currentSort = { column, asc: isAsc };

      const sorted = [...relevantTasks].sort((a, b) => {
        const valA = a[column] ?? "";
        const valB = b[column] ?? "";

        if (column.includes("Date") || column === "dueDate") {
          return isAsc
            ? new Date(valA) - new Date(valB)
            : new Date(valB) - new Date(valA);
        }

        return isAsc
          ? valA.toString().localeCompare(valB.toString())
          : valB.toString().localeCompare(valA.toString());
      });

      relevantTasks = sorted;
      renderTasks(sorted);
    }
    
    // Add Column button handler
    const addColumnBtn = container.querySelector(".add-column");
if (addColumnBtn) {
  addColumnBtn.addEventListener("click", () => {
    const modal = container.querySelector("#column-selector-modal");
    const checkboxContainer = container.querySelector("#column-checkboxes");
    
    // Clear and populate checkboxes
    checkboxContainer.innerHTML = "";
    
    // Create columns section header
    const columnsHeader = document.createElement("div");
    columnsHeader.textContent = "Columns";
    columnsHeader.style.fontWeight = "600";
    columnsHeader.style.padding = "16px 16px 8px 16px";
    checkboxContainer.appendChild(columnsHeader);
    
    availableColumns.forEach((col, index) => {
      const columnItem = document.createElement("div");
      columnItem.style.display = "flex";
      columnItem.style.justifyContent = "space-between";
      columnItem.style.alignItems = "center";
      columnItem.style.padding = "8px 16px";
      columnItem.style.borderBottom = index === availableColumns.length - 1 ? "none" : "1px solid #f0f0f0";
      
      // Column name and required indicator
      const columnLabel = document.createElement("div");
      columnLabel.textContent = col.label;
      if (col.required) {
        columnLabel.textContent += " (Required)";
        columnLabel.style.color = "#999";
      }
      columnLabel.style.cursor = col.required ? "not-allowed" : "pointer";
      
      // Eye icon container (acts as checkbox)
    const eyeIcon = document.createElement("div");
eyeIcon.style.cursor = col.required ? "not-allowed" : "pointer";
eyeIcon.style.width = "24px";
eyeIcon.style.height = "24px";
eyeIcon.style.display = "flex";
eyeIcon.style.alignItems = "center";
eyeIcon.style.justifyContent = "center";

// SVG for visible eye (open eye)
const visibleEyeSVG = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5C5 5 2 12 2 12C2 12 5 19 12 19C19 19 22 12 22 12C22 12 19 5 12 5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

// SVG for hidden eye (crossed out eye)
const hiddenEyeSVG = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5C5 5 2 12 2 12C2 12 5 19 12 19C19 19 22 12 22 12C22 12 19 5 12 5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4 4L20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
`;

eyeIcon.innerHTML = col.visible ? visibleEyeSVG : hiddenEyeSVG;
eyeIcon.style.color = col.visible ? "#0066cc" : "#666";

if (!col.required) {
  eyeIcon.addEventListener("click", () => {
    col.visible = !col.visible;
    eyeIcon.innerHTML = col.visible ? visibleEyeSVG : hiddenEyeSVG;
    eyeIcon.style.color = col.visible ? "#0066cc" : "#666";
  });
}
      columnItem.appendChild(columnLabel);
      columnItem.appendChild(eyeIcon);
      checkboxContainer.appendChild(columnItem);
    });
    
    modal.classList.remove("hidden");
  });
}
    // Column selector modal handlers
    const applyColumnsBtn = container.querySelector("#apply-columns-btn");
    const cancelColumnsBtn = container.querySelector("#cancel-columns-btn");
    const columnModal = container.querySelector("#column-selector-modal");
    
    if (applyColumnsBtn) {
      applyColumnsBtn.addEventListener("click", () => {
        const checkboxes = container.querySelectorAll("#column-checkboxes input[type='checkbox']");
        const columnConfig = {};
        
        checkboxes.forEach(cb => {
          const col = availableColumns.find(c => c.id === cb.value);
          if (col && !col.required) {
            col.visible = cb.checked;
            columnConfig[col.id] = cb.checked;
          }
        });
        
        // Save preferences
        localStorage.setItem('taskTableColumns', JSON.stringify(columnConfig));
        
        // Re-render table
        renderTasks(relevantTasks);
        
        columnModal.classList.add("hidden");
      });
    }
    
    if (cancelColumnsBtn) {
      cancelColumnsBtn.addEventListener("click", () => {
        columnModal.classList.add("hidden");
      });
    }
    const taskContextMenu = container.querySelector("#task-context-menu");
    let currentTaskMenuButton = null;

    // Use event delegation since tbody might be recreated
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".task-menu-btn");
      if (!btn) return;
      
      const currentTbody = container.querySelector("tbody");
      if (!currentTbody) return;
  
      e.stopPropagation();
      const tr = btn.closest("tr");
      const rect = btn.getBoundingClientRect();
      const index = Array.from(currentTbody.children).indexOf(tr);
      const task = relevantTasks[index];
     
      const existing = workspacesForTasks[task.id];
      // Find the button by looking for both possible data-action values
      let wsBtn = taskContextMenu.querySelector("button[data-action='add-workspace']");
      if (!wsBtn) {
        wsBtn = taskContextMenu.querySelector("button[data-action='open-workspace']");
      }
      
      if (wsBtn) {
        // Check if workspace exists and has a valid ID
        if (existing && existing.id) {
          wsBtn.textContent = "Open Workspace";
          wsBtn.dataset.action = "open-workspace";
          taskContextMenu.dataset.workspaceId = existing.id;
        } else {
          wsBtn.textContent = "Add Workspace";
          wsBtn.dataset.action = "add-workspace";
          delete taskContextMenu.dataset.workspaceId;
        }
      }
      taskContextMenu.style.top = `${rect.bottom + window.scrollY}px`;
      taskContextMenu.style.left = `${rect.left + window.scrollX - 350}px`;
      taskContextMenu.classList.remove("hidden");
  
      taskContextMenu.dataset.taskIndex = index;
      currentTaskMenuButton = btn;
      
      // Update context menu buttons based on task status
      updateTaskContextMenu(task);
    });
    document.addEventListener("click", (e) => {
      const clickedInsideMenu = e.target.closest(".task-context-menu");
      const clickedButton = e.target.closest(".task-menu-btn");
      if (!clickedInsideMenu && !clickedButton) {
        taskContextMenu.classList.add("hidden");
        currentTaskMenuButton = null;
      }
    });
  
    taskContextMenu.addEventListener("click", async (e) => {
      const action = e.target.dataset.action;
      const taskIndex = taskContextMenu.dataset.taskIndex;
      const task = relevantTasks[taskIndex];
  
      if (action === "update") {
        await handleUpdateTask(task);
      } else if (action === "add-subtask") {
        showMessage("Add subtask feature will be implemented soon", 'info');
      }else if(action === "open-workspace") {
        const wsId = parseInt(taskContextMenu.dataset.workspaceId, 10);
        const ws = workspacesForTasks[task.id];
        if (ws && ws.id) {
          openWorkspaceTab(ws);
          showMessage("Workspace opened successfully", 'success');
        } else {
          showMessage("No workspace found for this task", 'error');
        }
      }else if (action === "add-workspace") {
        const wsName =  await showCustomPrompt({
          title: "Add Workspace for Task " + task.title,
          label: "Workspace Name:",
          okText: "Create",
        });
        if (!wsName) return;

        try {
          await invoke("create_workspace_for_task", {
            name: wsName,
            taskId: task.id,
            folderId: workspace.folderId
          });
          showMessage("Workspace created successfully", 'success');
          // Reload workspaces for tasks
          const wss = await invoke("fetch_workspaces_for_task", { taskId: task.id });
          workspacesForTasks[task.id] = wss;
          
          // Call global function to refresh dashboard references
          if (window.refreshDashboardReferences) {
            console.log('Calling refreshDashboardReferences function for manual workspace creation');
            window.refreshDashboardReferences();
          } else {
            console.warn('refreshDashboardReferences function not available, trying event dispatch');
            // Fallback to event dispatch
            window.dispatchEvent(new CustomEvent('workspaceCreated', {
              detail: { vaultId: workspace.vaultId }
            }));
          }
        } catch (err) {
          console.error("Failed to create workspace:", err);
          showMessage(`Failed to create workspace: ${err}`, 'error');
        }
      }else if (action === "add-taskFavourite") {
        try {
          await invoke("favorite_task", {
            taskId: task.id
          });
          showMessage("Task marked as favourite", 'success');
          // Update context menu to reflect new status
          updateTaskContextMenu(task);
        } catch (err) {
          console.error("Failed to mark task as favourite:", err);
          showMessage(`Failed to mark as favourite: ${err}`, 'error');
        }
      }else if (action === "add-taskPinned") {
        try {
          await invoke("pin_task", {
            taskId: task.id
          });
          showMessage("Task pinned successfully", 'success');
          // Update context menu to reflect new status
          updateTaskContextMenu(task);
        } catch (err) {
          console.error("Failed to pin task:", err);
          showMessage(`Failed to pin task: ${err}`, 'error');
        }
      }else if (action === "remove-taskFavourite") {
        try {
          console.log(`🔄 Attempting to unfavorite task ${task.id}: "${task.title}"`);
          await invoke("unfavorite_task", {
            taskId: task.id
          });
          console.log(`✅ Successfully unfavorited task ${task.id}`);
          showMessage("Task removed from favorites", 'success');
          // Update context menu to reflect new status
          updateTaskContextMenu(task);
        } catch (err) {
          console.error("❌ Failed to unfavorite task:", err);
          console.error("Task details:", { id: task.id, title: task.title });
          showMessage(`Failed to remove from favorites: ${err}`, 'error');
        }
      }else if (action === "remove-taskPinned") {
        try {
          console.log(`🔄 Attempting to unpin task ${task.id}: "${task.title}"`);
          await invoke("unpin_task", {
            taskId: task.id
          });
          console.log(`✅ Successfully unpinned task ${task.id}`);
          showMessage("Task unpinned successfully", 'success');
          // Update context menu to reflect new status
          updateTaskContextMenu(task);
        } catch (err) {
          console.error("❌ Failed to unpin task:", err);
          console.error("Task details:", { id: task.id, title: task.title });
          showMessage(`Failed to unpin task: ${err}`, 'error');
        }
      } else if (action === "delete") {
        const confirmDelete = confirm(`Are you sure you want to delete the task "${task.title}"?`);
        if (!confirmDelete) return;
        
        try {
          await invoke("delete_task", { taskId: task.id });
          
          // Refresh the task list to show the updated list
          try {
            const allWorkspaceTasks = await invoke("fetch_tasks_for_workspace", { workspaceId: currentPage.workspaceId });
            // Filter tasks to only show tasks for the current page
            const currentPageIdNum = Number(currentPage.id);
            const updatedTasks = allWorkspaceTasks.filter(task => Number(task.pageId) === currentPageIdNum);
            relevantTasks = updatedTasks;
            renderTasks(relevantTasks);
            console.log('✅ Refreshed task list after deletion for workspace:', currentPage.workspaceId);
          } catch (error) {
            console.error('❌ Failed to refresh task list after deletion:', error);
          }
          
          showMessage("Task deleted successfully", 'success');
          
          // If no tasks left, update the page blocks
          if (relevantTasks.length === 0) {
            // Use current page (for tab switching) or fallback to original page
        const currentPage = window.currentPage || page;
        renderPageBlocks(notes, images, files, relevantTasks, currentPage.id, currentPage.orderIndex);
          }
        } catch (err) {
          console.error("Failed to delete task:", err);
          showMessage(`Failed to delete task: ${err}`, 'error');
        }
      }
  
      taskContextMenu.classList.add("hidden");
    });
  
    function renderCardConnections(connections) {
      // Clear existing lines for this workspace
      if (window.currentLines && Array.isArray(window.currentLines)) {
        window.currentLines.forEach(line => {
          try {
            if (line && line.remove) line.remove();
          } catch (e) {
            console.warn('Failed to remove line:', e);
          }
        });
      }
      window.currentLines = [];
      
      // Also clear workspace-specific lines
      if (window.workspaceLines && window.workspaceLines[page.workspaceId] && Array.isArray(window.workspaceLines[page.workspaceId])) {
        window.workspaceLines[page.workspaceId].forEach(line => {
          try {
            if (line && line.remove) line.remove();
          } catch (e) {
            console.warn('Failed to remove workspace line:', e);
          }
        });
        window.workspaceLines[page.workspaceId] = [];
      }
      
      // Initialize workspace lines array if needed
      if (!window.workspaceLines) {
        window.workspaceLines = {};
      }
      if (!window.workspaceLines[page.workspaceId]) {
        window.workspaceLines[page.workspaceId] = [];
      }

      connections.forEach(conn => {
        const fromEl = document.getElementById(`card-${conn.fromCardId}`);
        const toEl = document.getElementById(`card-${conn.toCardId}`);
        if (fromEl && toEl) {
          try {
           const line = new LeaderLine(fromEl, toEl, {
              color: "#98A2B3",
              size: 2,
              endPlug: 'arrow3',
              startPlug: 'disc',
              path: 'fluid'
            });
            window.currentLines.push(line);
            window.workspaceLines[page.workspaceId].push(line);
            line.position();
          } catch (e) {
            console.error('Failed to create line between cards:', e);
          }
        }
      });

      // Add scroll event listener to reposition lines when scrolling
      const cardsGrid = document.getElementById("cards-grid");
      if (cardsGrid) {
        cardsGrid.addEventListener('scroll', () => {
          if (window.currentLines && Array.isArray(window.currentLines)) {
            window.currentLines.forEach(line => {
              try {
                if (line && line.position) line.position();
              } catch (e) {
                console.warn('Failed to position line during scroll:', e);
              }
            });
          }
          if (window.workspaceLines && window.workspaceLines[page.workspaceId] && Array.isArray(window.workspaceLines[page.workspaceId])) {
            window.workspaceLines[page.workspaceId].forEach(line => {
              try {
                if (line && line.position) line.position();
              } catch (e) {
                console.warn('Failed to position workspace line during scroll:', e);
              }
            });
          }
        });

        // Add resize event listener to reposition lines when window resizes
        window.addEventListener('resize', () => {
          if (window.currentLines && Array.isArray(window.currentLines)) {
            window.currentLines.forEach(line => {
              try {
                if (line && line.position) line.position();
              } catch (e) {
                console.warn('Failed to position line during resize:', e);
              }
            });
          }
          if (window.workspaceLines && window.workspaceLines[page.workspaceId] && Array.isArray(window.workspaceLines[page.workspaceId])) {
            window.workspaceLines[page.workspaceId].forEach(line => {
              try {
                if (line && line.position) line.position();
              } catch (e) {
                console.warn('Failed to position workspace line during resize:', e);
              }
            });
          }
        });
      }
    }
    
  
      function renderCards(cards) {
        const grid = document.getElementById("cards-grid");
        currentCards = cards;  
        grid.innerHTML = "";
        
        if (cards.length === 0) {
          // Show empty state for cards
          const emptyState = document.createElement("div");
          emptyState.className = "cards-empty-state";
          emptyState.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
              <p>No cards yet</p>
              <p style="font-size: 12px; margin-top: 8px;">Add cards to organize your work</p>
            </div>
          `;
          grid.appendChild(emptyState);
        } else {
          cards.forEach(card => {
            const el = document.createElement("div");
            el.classList.add("task-card", `color-${card.id % 6}`);
            el.setAttribute("data-card-id", card.id);

            const x = card.x || 0;
            const y = card.y || 0;
            el.id = `card-${card.id}`;
            el.style.position = "absolute";
            el.style.transform = `translate(${x}px, ${y}px)`;
            el.setAttribute("data-x", x);
            el.setAttribute("data-y", y);
            el.innerHTML =`
              <div class="task-card-title clickable-card-title" data-card-id="${card.id}" style="cursor: pointer; color: #3b82f6; text-decoration: underline;">${card.name}</div>
              <div class="task-card-field"><strong>Status:</strong> ${card.status || "–"}</div>
              <div class="task-card-field"><strong>Description:</strong> ${card.description || "–"}</div>
              <div class="task-card-field"><strong>Created:</strong> ${formatDate(card.createdDateTime)}</div>
            `;
            
            grid.appendChild(el);
          });
        }
        
        // Ensure cards section visible only when there are cards
        const cardsSection = container.querySelector('.cards-section');
        if (cards.length > 0) {
          cardsSection?.classList.remove('hidden');
        } else {
          cardsSection?.classList.add('hidden');
        }
        
        // Add click handlers for card titles
        container.querySelectorAll(".clickable-card-title").forEach(titleElement => {
          titleElement.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent card dragging when clicking title
            const cardId = parseInt(titleElement.getAttribute("data-card-id"));
            console.log('🔄 Opening workspace for card:', cardId);
            
            try {
              // Fetch the workspace for this card
              const workspace = await invoke("fetch_workspaces_for_card", { cardId: cardId });
              console.log('✅ Found workspace for card:', workspace);
              
              // Open the workspace using the existing function
              if (window.openWorkspaceTab) {
                window.openWorkspaceTab(workspace);
                
                // Highlight the workspace in the sidebar
                setTimeout(() => {
                  if (window.highlightWorkspaceById) {
                    window.highlightWorkspaceById(workspace.id);
                  } else {
                    console.warn('⚠️ highlightWorkspaceById function not available');
                  }
                }, 100); // Small delay to ensure workspace is opened
              } else {
                console.error('❌ openWorkspaceTab function not available');
              }
            } catch (error) {
              console.error('❌ Failed to open workspace for card:', cardId, error);
              showMessage(`No workspace found for this card`, 'error');
            }
          });
        });

        // Update hide/show for empty workspace state
        updateEmptyWorkspaceVisibility();
      }
      
      function makeCardsDraggable() {
        interact('.task-card')
      .draggable({
        listeners: {
          move (event) {
            const target = event.target;
            // calculate new position
            const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
            const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
            // apply transform
            target.style.transform = `translate(${x}px, ${y}px)`;
            // update attributes
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
            if (window.currentLines && Array.isArray(window.currentLines)) {
              window.currentLines.forEach(line => {
                try {
                  if (line && line.position) line.position();
                } catch (e) {
                  console.warn('Failed to position line during card drag:', e);
                }
              });
            }
            if (window.workspaceLines && window.workspaceLines[page.workspaceId] && Array.isArray(window.workspaceLines[page.workspaceId])) {
              window.workspaceLines[page.workspaceId].forEach(line => {
                try {
                  if (line && line.position) line.position();
                } catch (e) {
                  console.warn('Failed to position workspace line during card drag:', e);
                }
              });
            }
          },
          end (event) {
            const target = event.target;
            const cardId = Number(target.dataset.cardId);
            const x = parseFloat(target.getAttribute('data-x')) || 0;
            const y = parseFloat(target.getAttribute('data-y')) || 0;
            // save position via Tauri
            invoke('update_card_position', { cardId, x, y })
              .catch(err => console.error("Failed to save position:", err));
          }
        },
        // Restrict dragging within the grid container:
        modifiers: [
          interact.modifiers.restrictRect({
            restriction: '#cards-grid',
            endOnly: true
          })
        ]
      });
        }
      }
      
      // Export function to add a new image to the current page
      window.renderNewImageInWorkspace = async function(image, pageId) {
        console.log("Adding new image to workspace page:", image);
        
        const container = document.getElementById("page-blocks-container");
        if (!container) {
          console.error("page-blocks-container not found");
          return;
        }

        const block = document.createElement("div");
        block.classList.add("page-block", "draggable"); // Make new images draggable
        block.setAttribute("data-type", "image");
        block.setAttribute("data-id", image.id);

        const img = document.createElement("img");
        img.src = `data:image/png;base64,${image.base64}`;
        img.alt = image.name;
        img.classList.add("page-image");

        block.appendChild(img);
        
        // Insert the image after any task lists but before existing draggable items
        // Find the position to insert: after non-draggable blocks, at the end of draggable items
        const nonDraggableBlocks = container.querySelectorAll('.page-block.non-draggable');
        if (nonDraggableBlocks.length > 0) {
          // Insert after the last non-draggable block
          const lastNonDraggable = nonDraggableBlocks[nonDraggableBlocks.length - 1];
          lastNonDraggable.insertAdjacentElement('afterend', block);
        } else {
          // No task list, append at the beginning
          container.appendChild(block);
        }
        
        // Re-enable drag and drop for the new block
        enableBlockDragAndDrop(container);
        
        console.log("✅ Image added successfully to workspace");
      };

      // Function to extract hashtags from text content - extracts ALL tags from entire text (not just first line)
      function extractHashtagsFromText(text) {
        if (!text) return [];
        
        // Remove HTML tags first to get clean text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const cleanText = tempDiv.textContent || tempDiv.innerText || '';
        
        console.log('🔍 Raw text for hashtag extraction:', JSON.stringify(cleanText));
        
        // Handle Quill editor content more carefully
        // Quill might store content with <p> tags or <br> tags
        let processedText = cleanText;
        
        // If the text contains HTML line breaks, convert them to actual line breaks
        if (cleanText.includes('<br>') || cleanText.includes('<br/>')) {
          processedText = cleanText.replace(/<br\s*\/?>/gi, '\n');
        }
        
        console.log('📝 Processing entire text for hashtags:', JSON.stringify(processedText));
        
        const hashtags = [];
        
        // Improved regex to properly extract hashtags from entire text
        // This regex looks for # followed by word characters, but stops at the first non-word character
        const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
        let match;
        
        while ((match = hashtagRegex.exec(processedText)) !== null) {
          const fullMatch = match[0]; // The full match including #
          const tag = match[1]; // Just the tag name without #
          
          console.log('🔍 Regex match found:', { fullMatch, tag, position: match.index });
          
          // Validate tag (must be at least 2 characters, not all numbers)
          if (tag.length >= 2 && !/^\d+$/.test(tag)) {
            // Normalize to lowercase for consistency
            const normalizedTag = tag.toLowerCase();
            
            if (!hashtags.includes(normalizedTag)) {
              hashtags.push(normalizedTag);
              console.log(`📌 Added hashtag: #${normalizedTag} from: "${fullMatch}"`);
            }
          }
        }
        
        console.log('🏷️ Final hashtags extracted:', hashtags);
        return hashtags;
      }

      // Function to extract all hashtags from notes and create a mapping
      function extractAllHashtagsFromNotes(notes) {
        const tagToNoteMap = new Map();
        
        console.log(`🔍 Processing ${notes.length} notes for hashtag extraction...`);
        
        notes.forEach((note, noteIndex) => {
          console.log(`📝 Processing note ${noteIndex + 1}/${notes.length} (ID: ${note.id})`);
          console.log(`📄 Note text from DB:`, JSON.stringify(note.text));
          
          const hashtags = extractHashtagsFromText(note.text);
          
          if (hashtags.length > 0) {
            console.log(`   Found ${hashtags.length} hashtags:`, hashtags.map(tag => `#${tag}`));
          }
          
          hashtags.forEach(tag => {
            if (!tagToNoteMap.has(tag)) {
              tagToNoteMap.set(tag, []);
            }
            tagToNoteMap.get(tag).push({
              noteId: note.id,
              noteText: note.text,
              tag: tag
            });
          });
        });
        
        console.log(`🏷️ Final tag mapping:`, Object.fromEntries(tagToNoteMap));
        return tagToNoteMap;
      }

      // Debounced function to update page tags
      let updatePageTagsTimeout;
      function debouncedUpdatePageTags(notes) {
        clearTimeout(updatePageTagsTimeout);
        updatePageTagsTimeout = setTimeout(() => {
          window.updatePageTags(notes);
        }, 300); // 300ms delay
      }

      // Debounced function to update external links
      let updateExternalLinksTimeout;
      function debouncedUpdateExternalLinks(notes) {
        clearTimeout(updateExternalLinksTimeout);
        updateExternalLinksTimeout = setTimeout(() => {
          window.updateExternalLinks(notes);
        }, 300); // 300ms delay
      }

      // Function to update the Page Tags section dynamically
      window.updatePageTags = function(notes) {
        const tagContainer = document.querySelector('.section-leftside .tag');
        if (!tagContainer) {
          console.warn('Page Tags container not found');
          return;
        }
        
        const tagToNoteMap = extractAllHashtagsFromNotes(notes);
        
        // Clear existing hardcoded tags
        tagContainer.innerHTML = '';
        
        if (tagToNoteMap.size === 0) {
          const noTagsLi = document.createElement('li');
          noTagsLi.innerHTML = `
            <img src="../assets/images/hash.svg" alt="hash icon" style="vertical-align: middle; margin-right: 5px; opacity: 0.5;">
            <span style="color: #9ca3af; font-style: italic;">No tags found</span>
          `;
          tagContainer.appendChild(noTagsLi);
          return;
        }
        
        // Add dynamic tags
        Array.from(tagToNoteMap.keys()).sort().forEach(tag => {
          const tagLi = document.createElement('li');
          tagLi.style.cursor = 'pointer';
          tagLi.style.transition = 'background-color 0.2s ease';
          tagLi.className = 'dynamic-tag';
          tagLi.dataset.tag = tag;
          
          const noteCount = tagToNoteMap.get(tag).length;
          const countBadge = noteCount > 1 ? ` <span style="background: #e5e7eb; color: #6b7280; padding: 2px 6px; border-radius: 10px; font-size: 11px; margin-left: 5px;">${noteCount}</span>` : '';
          
          tagLi.innerHTML = `
            <img src="../assets/images/hash.svg" alt="hash icon" style="vertical-align: middle; margin-right: 5px;">
            ${tag}${countBadge}
          `;
          
          // Add hover effect
          tagLi.addEventListener('mouseenter', () => {
            tagLi.style.backgroundColor = '#f3f4f6';
          });
          
          tagLi.addEventListener('mouseleave', () => {
            tagLi.style.backgroundColor = '';
          });
          
          // Add click handler to scroll to note
          tagLi.addEventListener('click', () => {
            scrollToNoteWithTag(tag, tagToNoteMap.get(tag));
          });
          
          tagContainer.appendChild(tagLi);
        });
        
        console.log(`✅ Updated Page Tags with ${tagToNoteMap.size} unique tags:`, Array.from(tagToNoteMap.keys()));
      };

      // Test function to verify hashtag extraction (for debugging)
      window.testHashtagExtraction = function(testText) {
        console.log("=== Testing Hashtag Extraction ===");
        console.log("Input text:");
        console.log(testText);
        console.log("\nExtracted hashtags:");
        const tags = extractHashtagsFromText(testText);
        tags.forEach(tag => console.log(`  #${tag}`));
        console.log(`\nTotal: ${tags.length} hashtags found`);
        console.log("=== Test Complete ===");
        return tags;
      };

      // Function to scroll to the first note containing the clicked tag
      function scrollToNoteWithTag(tag, noteInfo) {
        console.log(`🎯 Scrolling to notes with tag: #${tag}`);
        
        // Find the note block in the DOM
        const targetNote = noteInfo[0]; // Get first note with this tag
        const noteBlock = document.querySelector(`[data-type="note"][data-id="${targetNote.noteId}"]`);
        
        if (noteBlock) {
          // Scroll to the note with smooth animation
          noteBlock.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          
          // Highlight the note temporarily
          noteBlock.style.transition = 'all 0.3s ease';
          noteBlock.style.backgroundColor = '#fef3c7';
          noteBlock.style.borderColor = '#f59e0b';
          noteBlock.style.boxShadow = '0 0 0 2px #fbbf24';
          
          // Remove highlight after 2 seconds
          setTimeout(() => {
            noteBlock.style.backgroundColor = '';
            noteBlock.style.borderColor = '';
            noteBlock.style.boxShadow = '';
          }, 2000);
          
          // Show success message
          if (noteInfo.length > 1) {
            console.log(`📝 Found ${noteInfo.length} notes with tag #${tag}. Showing first one.`);
          }
        } else {
          console.warn(`Note with tag #${tag} not found in DOM`);
        }
      }

      // Function to extract URLs from text content
      function extractUrlsFromText(text) {
        if (!text) return [];
        
        // Remove HTML tags first to get clean text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const cleanText = tempDiv.textContent || tempDiv.innerText || '';
        
        // URL regex pattern - matches http, https, ftp, and www URLs
        const urlRegex = /(https?:\/\/[^\s]+|ftp:\/\/[^\s]+|www\.[^\s]+\.[^\s]+)/gi;
        const urls = [];
        let match;
        
        while ((match = urlRegex.exec(cleanText)) !== null) {
          let url = match[0];
          
          // Clean up URL (remove trailing punctuation)
          url = url.replace(/[.,;:!?'")\]}]+$/, '');
          
          // Add protocol if missing for www URLs
          if (url.startsWith('www.') && !url.startsWith('http')) {
            url = 'https://' + url;
          }
          
          // Avoid duplicates
          if (!urls.some(existingUrl => existingUrl.url === url)) {
            urls.push({
              url: url,
              displayUrl: match[0].replace(/[.,;:!?'")\]}]+$/, ''), // Original for display
              domain: extractDomain(url)
            });
          }
        }
        
        return urls;
      }

      // Helper function to extract domain from URL
      function extractDomain(url) {
        try {
          const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
          return urlObj.hostname.replace('www.', '');
        } catch (e) {
          // Fallback for malformed URLs
          return url.split('/')[0].replace('www.', '');
        }
      }

      // Function to extract all URLs from notes and create a mapping
      function extractAllUrlsFromNotes(notes) {
        const urlToNoteMap = new Map();
        
        notes.forEach(note => {
          const urls = extractUrlsFromText(note.text);
          urls.forEach(urlData => {
            const key = urlData.url;
            if (!urlToNoteMap.has(key)) {
              urlToNoteMap.set(key, {
                ...urlData,
                notes: []
              });
            }
            urlToNoteMap.get(key).notes.push({
              noteId: note.id,
              noteText: note.text
            });
          });
        });
        
        return urlToNoteMap;
      }

      // Function to update the External Links section dynamically
      window.updateExternalLinks = function(notes) {
        const linksContainer = document.querySelector('.section-leftside .external-links');
        if (!linksContainer) {
          console.warn('External Links container not found');
          return;
        }
        
        const urlToNoteMap = extractAllUrlsFromNotes(notes);
        
        // Clear existing hardcoded links
        linksContainer.innerHTML = '';
        
        if (urlToNoteMap.size === 0) {
          const noLinksLi = document.createElement('li');
          noLinksLi.innerHTML = `
            <img src="../assets/images/link-03.svg" alt="link icon" style="vertical-align: middle; margin-right: 5px; opacity: 0.5;">
            <span style="color: #9ca3af; font-style: italic;">No links found</span>
          `;
          linksContainer.appendChild(noLinksLi);
          return;
        }
        
        // Add dynamic links, sorted by domain
        Array.from(urlToNoteMap.entries())
          .sort(([,a], [,b]) => a.domain.localeCompare(b.domain))
          .forEach(([url, linkData]) => {
            const linkLi = document.createElement('li');
            linkLi.style.cursor = 'pointer';
            linkLi.style.transition = 'background-color 0.2s ease';
            linkLi.className = 'dynamic-link';
            linkLi.dataset.url = url;
            
            const noteCount = linkData.notes.length;
            const countBadge = noteCount > 1 ? ` <span style="background: #e5e7eb; color: #6b7280; padding: 2px 6px; border-radius: 10px; font-size: 11px; margin-left: 5px;">${noteCount}</span>` : '';
            
            // Truncate long URLs for display
            const displayUrl = linkData.displayUrl.length > 35 ? 
              linkData.displayUrl.substring(0, 35) + '...' : 
              linkData.displayUrl;
              
            linkLi.innerHTML = `
              <img src="../assets/images/link-03.svg" alt="link icon" style="vertical-align: middle; margin-right: 5px;">
              <span class="link-text" title="${linkData.displayUrl}">${displayUrl}</span>${countBadge}
            `;
            
            // Add hover effect
            linkLi.addEventListener('mouseenter', () => {
              linkLi.style.backgroundColor = '#f3f4f6';
            });
            
            linkLi.addEventListener('mouseleave', () => {
              linkLi.style.backgroundColor = '';
            });
            
            // Add click handler to open link and scroll to note
            linkLi.addEventListener('click', (e) => {
              // Check if user wants to open link (Ctrl/Cmd + Click) or scroll to note (regular click)
              if (e.ctrlKey || e.metaKey) {
                // Open link in new tab
                window.open(url, '_blank');
              } else {
                // Scroll to note containing the link
                scrollToNoteWithUrl(url, linkData.notes);
              }
            });
            
            // Add context menu for additional options
            linkLi.addEventListener('contextmenu', (e) => {
              e.preventDefault();
              showLinkContextMenu(e, url, linkData);
            });
            
            linksContainer.appendChild(linkLi);
          });
        
        console.log(`✅ Updated External Links with ${urlToNoteMap.size} unique URLs`);
      };

      // Function to scroll to the first note containing the clicked URL
      function scrollToNoteWithUrl(url, noteInfo) {
        console.log(`🎯 Scrolling to notes with URL: ${url}`);
        
        // Find the note block in the DOM
        const targetNote = noteInfo[0]; // Get first note with this URL
        const noteBlock = document.querySelector(`[data-type="note"][data-id="${targetNote.noteId}"]`);
        
        if (noteBlock) {
          // Scroll to the note with smooth animation
          noteBlock.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          
          // Highlight the note temporarily with blue theme for links
          noteBlock.style.transition = 'all 0.3s ease';
          noteBlock.style.backgroundColor = '#dbeafe';
          noteBlock.style.borderColor = '#3b82f6';
          noteBlock.style.boxShadow = '0 0 0 2px #60a5fa';
          
          // Remove highlight after 2 seconds
          setTimeout(() => {
            noteBlock.style.backgroundColor = '';
            noteBlock.style.borderColor = '';
            noteBlock.style.boxShadow = '';
          }, 2000);
          
          // Show success message
          if (noteInfo.length > 1) {
            console.log(`🔗 Found ${noteInfo.length} notes with this URL. Showing first one.`);
          }
        } else {
          console.warn(`Note with URL ${url} not found in DOM`);
        }
      }

      // Function to show context menu for links
      function showLinkContextMenu(event, url, linkData) {
        // Remove existing context menu
        const existingMenu = document.querySelector('.link-context-menu');
        if (existingMenu) {
          existingMenu.remove();
        }
        
        const contextMenu = document.createElement('div');
        contextMenu.className = 'link-context-menu';
        contextMenu.style.cssText = `
          position: fixed;
          top: ${event.clientY}px;
          left: ${event.clientX}px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          padding: 4px 0;
          min-width: 150px;
          font-size: 14px;
        `;
        
        const menuItems = [
          { text: 'Open Link', action: () => window.open(url, '_blank') },
          { text: 'Copy Link', action: () => navigator.clipboard.writeText(url) },
          { text: 'Scroll to Note', action: () => scrollToNoteWithUrl(url, linkData.notes) }
        ];
        
        menuItems.forEach(item => {
          const menuItem = document.createElement('div');
          menuItem.textContent = item.text;
          menuItem.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
            transition: background-color 0.2s ease;
          `;
          
          menuItem.addEventListener('mouseenter', () => {
            menuItem.style.backgroundColor = '#f3f4f6';
          });
          
          menuItem.addEventListener('mouseleave', () => {
            menuItem.style.backgroundColor = '';
          });
          
          menuItem.addEventListener('click', () => {
            item.action();
            contextMenu.remove();
          });
          
          contextMenu.appendChild(menuItem);
        });
        
        document.body.appendChild(contextMenu);
        
        // Remove menu when clicking elsewhere
        setTimeout(() => {
          const removeMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
              contextMenu.remove();
              document.removeEventListener('click', removeMenu);
            }
          };
          document.addEventListener('click', removeMenu);
        }, 10);
      }

      function renderPageBlocks(notes, images, files, tasks, pageId, orderIndex) {
    console.log('🔄 renderPageBlocks called with:', {
      notes: notes.length,
      images: images.length,
      files: files.length,
      tasks: tasks.length,
      pageId
    });
        const container = document.getElementById("page-blocks-container");
        
        // Clear container first
        container.innerHTML = '';
        
        // Don't manipulate task table - let it stay in its original position
        // The task table should be handled by renderTasks function only
        
        // Prepare draggable items (notes, images, and files) and sort them
        let draggableItems = [
          ...notes.map(n => ({ type: "note", ...n })),
          ...images.map(i => ({ type: "image", ...i })),
          ...files.map(f => ({ type: "file", ...f }))
        ];
        
        // Sort draggable items by orderIndex
        draggableItems.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      
        // Render draggable items after task list
        draggableItems.forEach(item => {
          const block = document.createElement("div");
          block.classList.add("page-block", "draggable");
          block.setAttribute("data-type", item.type);
          block.setAttribute("data-id", item.id);
      
          if (item.type === "note") {
            console.log('🔄 Rendering note with ID:', item.id);
            // Create note container
            const noteContainer = document.createElement("div");
            noteContainer.style.position = "relative";
            
            // Create delete button for note
            const deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = "×";
            deleteBtn.className = "delete-btn";
            deleteBtn.style.cssText = `
              position: absolute;
              top: 5px;
              right: 5px;
              width: 20px;
              height: 20px;
              border: none;
              background: rgba(255, 0, 0, 0.7);
              color: white;
              border-radius: 50%;
              cursor: pointer;
              font-size: 14px;
              line-height: 1;
              display: none;
              z-index: 10;
            `;
            
            // Show/hide delete button on hover
            block.addEventListener("mouseenter", () => {
              console.log('🖱️ Mouse entered note block, showing delete button for note:', item.id);
              deleteBtn.style.display = "block";
            });
            block.addEventListener("mouseleave", () => {
              if (!block.classList.contains("editing")) {
                console.log('🖱️ Mouse left note block, hiding delete button for note:', item.id);
                deleteBtn.style.display = "none";
              }
            });
            
            // Delete button click handler with direct implementation
            deleteBtn.addEventListener("click", async (e) => {
              e.stopPropagation();
              console.log('🗑️ Delete button clicked for note ID:', item.id);
              
              try {
                console.log('🗑️ Deleting note with ID:', item.id);
                await window.__TAURI__.core.invoke("delete_textbox", { 
                  textboxId: item.id 
                });
                console.log('✅ Note deleted successfully');
                
                // Remove the note element from DOM immediately for better UX
                block.remove();
                
                // Then try to reload page data to reflect changes in other views
                if (typeof window.reloadCurrentPageData === 'function') {
                  console.log('🔄 Calling reloadCurrentPageData to refresh UI');
                  await window.reloadCurrentPageData();
                } else {
                  console.log('ℹ️ No reloadCurrentPageData function available, note already removed from DOM');
                }
                
                // Show success message
                const messageEl = container.querySelector('#page-message');
                if (messageEl) {
                  messageEl.textContent = "Note deleted successfully";
                  messageEl.classList.remove('success', 'error', 'info', 'hidden');
                  messageEl.classList.add('success');
                  setTimeout(() => messageEl.classList.add('hidden'), 3000);
                }
              } catch (error) {
                console.error('❌ Failed to delete note:', error);
                
                // Check if it's a 404 error (note doesn't exist) - treat as success
                if (error.toString().includes('404') || error.toString().includes('Not Found')) {
                  console.log('🔄 Note not found on server, but continuing with local cleanup');
                  
                  // Reload page data anyway to clean up UI
                  if (window.reloadCurrentPageData) {
                    await window.reloadCurrentPageData();
                  }
                  
                  // Show success message for 404
                  const messageEl = container.querySelector('#page-message');
                  if (messageEl) {
                    messageEl.textContent = "Note removed successfully";
                    messageEl.classList.remove('success', 'error', 'info', 'hidden');
                    messageEl.classList.add('success');
                    setTimeout(() => messageEl.classList.add('hidden'), 3000);
                  }
                } else {
                  // Show error message for other errors
                  const messageEl = container.querySelector('#page-message');
                  if (messageEl) {
                    messageEl.textContent = `Failed to delete note: ${error}`;
                    messageEl.classList.remove('success', 'error', 'info', 'hidden');
                    messageEl.classList.add('error');
                    setTimeout(() => messageEl.classList.add('hidden'), 3000);
                  }
                }
              }
            });
            
            // Add identifier for debugging
            deleteBtn.setAttribute('data-note-id', item.id);
            console.log('✅ Direct event listener added to delete button for note:', item.id);
            
            const editor = document.createElement("div");
            noteContainer.appendChild(editor);
            noteContainer.appendChild(deleteBtn);
            block.appendChild(noteContainer);
            
            const quill = new Quill(editor, {
              theme: 'snow',
              readOnly: true,
              modules: { toolbar: [['bold', 'italic'], [{ 'list': 'bullet' }], ['clean']] }
            });
            // Clean up the text content when loading from database
            let cleanText = item.text;
            if (cleanText && typeof cleanText === 'string') {
              // Remove HTML tags and convert to plain text
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = cleanText;
              cleanText = tempDiv.textContent || tempDiv.innerText || cleanText;
            }
            quill.root.innerHTML = cleanText;
            editor.addEventListener("click", () => {
              quill.enable(true);
              block.classList.add("editing");
              block.dataset.originalText = quill.getText();
              deleteBtn.style.display = "block"; // Keep delete button visible while editing
            });
      
            // Real-time hashtag and URL updates for existing notes
            quill.on("text-change", async (delta, oldDelta, source) => {
              if (source === 'user') {
                // Get the text content from Quill, not HTML
                const currentText = quill.getText();
                console.log('🔍 Real-time text content from Quill (existing note):', JSON.stringify(currentText));
                
                const hashtags = extractHashtagsFromText(currentText);
                console.log('🔍 Real-time hashtags detected in existing note:', hashtags);
                
                const urls = extractUrlsFromText(currentText);
                console.log('🔗 Real-time URLs detected in existing note:', urls);
                
                // Update page tags and external links in real-time (debounced)
                try {
                  const currentNotes = await window.__TAURI__.core.invoke("fetch_textbox_for_page", { pageId: item.pageId });
                  if (currentNotes) {
                    // Create a temporary note with current content for extraction
                    const tempNotes = currentNotes.map(note => 
                      note.id === item.id ? { ...note, text: currentText } : note
                    );
                    debouncedUpdatePageTags(tempNotes);
                    debouncedUpdateExternalLinks(tempNotes);
                  }
                } catch (error) {
                  console.warn('Could not update hashtags/URLs in real-time for existing note:', error);
                }
              }
            });

            quill.on("selection-change", async (range, oldRange) => {
              if (range === null && oldRange !== null) {
                quill.enable(false);
                block.classList.remove("editing");
                deleteBtn.style.display = "none"; // Hide delete button when done editing
                // Save the text content, not HTML
                const newText = quill.getText().trim();
                console.log('💾 Saving existing note text:', JSON.stringify(newText));
                
                if (newText !== block.dataset.originalText?.trim()) {
                  try {
                    await window.__TAURI__.core.invoke("update_textbox_text", {
                      noteId: item.id,
                      newText,
                      pageId: item.pageId
                    });
                    
                    // Immediately update page tags and external links after saving existing note
                    console.log('🔄 Updating page tags and external links after existing note save');
                    try {
                      const updatedNotes = await window.__TAURI__.core.invoke("fetch_textbox_for_page", { pageId: item.pageId });
                      if (window.updatePageTags && updatedNotes) {
                        window.updatePageTags(updatedNotes);
                        console.log('✅ Page tags updated immediately for existing note');
                      }
                      if (window.updateExternalLinks && updatedNotes) {
                        window.updateExternalLinks(updatedNotes);
                        console.log('✅ External links updated immediately for existing note');
                      }
                    } catch (tagError) {
                      console.warn('Could not update page tags/external links immediately for existing note:', tagError);
                    }
                  } catch (err) {
                    console.error("Failed to update existing note:", err);
                    // Restore original text on error
                    quill.root.innerHTML = block.dataset.originalText || "";
                  }
                }
              }
            });
          }
      
          if (item.type === "image") {
            console.log('🔄 Rendering image with ID:', item.id);
            // Create image container
            const imageContainer = document.createElement("div");
            imageContainer.style.position = "relative";
            imageContainer.style.display = "inline-block";
            
            // Create delete button for image
            const deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = "×";
            deleteBtn.className = "delete-btn";
            deleteBtn.style.cssText = `
              position: absolute;
              top: 5px;
              right: 5px;
              width: 20px;
              height: 20px;
              border: none;
              background: rgba(255, 0, 0, 0.7);
              color: white;
              border-radius: 50%;
              cursor: pointer;
              font-size: 14px;
              line-height: 1;
              display: none;
              z-index: 10;
            `;
            
            // Show/hide delete button on hover
            block.addEventListener("mouseenter", () => {
              console.log('🖱️ Mouse entered image block, showing delete button for image:', item.id);
              deleteBtn.style.display = "block";
            });
            block.addEventListener("mouseleave", () => {
              console.log('🖱️ Mouse left image block, hiding delete button for image:', item.id);
              deleteBtn.style.display = "none";
            });
            
            // Delete button click handler with direct implementation
            deleteBtn.addEventListener("click", async (e) => {
              e.stopPropagation();
              console.log('🗑️ Delete button clicked for image ID:', item.id);
              
              try {
                console.log('🗑️ Deleting image with ID:', item.id);
                
                // Try delete_image first, fall back to delete_textbox if not available
                try {
                  await window.__TAURI__.core.invoke("delete_image", { 
                    imageId: item.id 
                  });
                } catch (apiError) {
                  console.warn('delete_image API not found, trying delete_textbox:', apiError);
                  await window.__TAURI__.core.invoke("delete_textbox", { 
                    textboxId: item.id 
                  });
                }
                
                console.log('✅ Image deleted successfully');
                
                // Remove the image element from DOM immediately for better UX
                block.remove();
                
                // Then try to reload page data to reflect changes in other views
                if (typeof window.reloadCurrentPageData === 'function') {
                  console.log('🔄 Calling reloadCurrentPageData to refresh UI');
                  await window.reloadCurrentPageData();
                } else {
                  console.log('ℹ️ No reloadCurrentPageData function available, image already removed from DOM');
                }
                
                // Show success message
                const messageEl = container.querySelector('#page-message');
                if (messageEl) {
                  messageEl.textContent = "Image deleted successfully";
                  messageEl.classList.remove('success', 'error', 'info', 'hidden');
                  messageEl.classList.add('success');
                  setTimeout(() => messageEl.classList.add('hidden'), 3000);
                }
              } catch (error) {
                console.error('❌ Failed to delete image:', error);
                
                // Check if it's a 404 error (image doesn't exist) - treat as success
                if (error.toString().includes('404') || error.toString().includes('Not Found')) {
                  console.log('🔄 Image not found on server, but continuing with local cleanup');
                  
                  // Reload page data anyway to clean up UI
                  if (window.reloadCurrentPageData) {
                    await window.reloadCurrentPageData();
                  }
                  
                  // Show success message for 404
                  const messageEl = container.querySelector('#page-message');
                  if (messageEl) {
                    messageEl.textContent = "Image removed successfully";
                    messageEl.classList.remove('success', 'error', 'info', 'hidden');
                    messageEl.classList.add('success');
                    setTimeout(() => messageEl.classList.add('hidden'), 3000);
                  }
                } else {
                  // Show error message for other errors
                  const messageEl = container.querySelector('#page-message');
                  if (messageEl) {
                    messageEl.textContent = `Failed to delete image: ${error}`;
                    messageEl.classList.remove('success', 'error', 'info', 'hidden');
                    messageEl.classList.add('error');
                    setTimeout(() => messageEl.classList.add('hidden'), 3000);
                  }
                }
              }
            });
            
            // Add identifier for debugging
            deleteBtn.setAttribute('data-image-id', item.id);
            console.log('✅ Direct event listener added to delete button for image:', item.id);
            
            const img = document.createElement("img");
            img.src = `data:image/png;base64,${item.base64}`;
            img.alt = item.name;
            img.classList.add("page-image");
            
            imageContainer.appendChild(img);
            imageContainer.appendChild(deleteBtn);
            block.appendChild(imageContainer);
          }
          
          if (item.type === "file") {
            console.log('🔄 Rendering file with ID:', item.id);
            // Add draggable class to file blocks
            block.classList.add('draggable');
            block.classList.add('file-block'); // Add file-block class for consistent styling
            
            // Create file container with consistent styling
            const fileContainer = document.createElement("div");
            fileContainer.style.position = "relative";
            fileContainer.style.display = "block";
            fileContainer.style.padding = "12px";
            fileContainer.style.border = "1px solid #e5e7eb";
            fileContainer.style.borderRadius = "8px";
            fileContainer.style.background = "#f9fafb";
            fileContainer.style.marginBottom = "8px";
            
            // Create delete button for file
            const deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = "×";
            deleteBtn.className = "delete-btn";
            deleteBtn.style.cssText = `
              position: absolute;
              top: 5px;
              right: 5px;
              width: 20px;
              height: 20px;
              border: none;
              background: rgba(255, 0, 0, 0.7);
              color: white;
              border-radius: 50%;
              cursor: pointer;
              font-size: 14px;
              line-height: 1;
              display: none;
              z-index: 10;
            `;
            
            // Show/hide delete button on hover
            block.addEventListener("mouseenter", () => {
              deleteBtn.style.display = "block";
            });
            block.addEventListener("mouseleave", () => {
              deleteBtn.style.display = "none";
            });
            
            // Delete button click handler
            deleteBtn.addEventListener("click", async (e) => {
              e.stopPropagation();
              console.log('🗑️ Delete button clicked for file ID:', item.id);
              
              try {
                await window.__TAURI__.core.invoke("delete_file", { 
                  fileId: item.id 
                });
                
                console.log('✅ File deleted successfully');
                
                // Remove the file element from DOM immediately for better UX
                block.remove();
                
                // Then try to reload page data to reflect changes in other views
                if (typeof reloadPageData === 'function') {
                  console.log('🔄 Calling reloadPageData to refresh UI');
                  reloadPageData();
                } else {
                  console.log('ℹ️ No reloadPageData function available, file already removed from DOM');
                }
              } catch (error) {
                console.error('❌ Failed to delete file:', error);
              }
            });
            
            // Create file content with consistent styling matching dashboard.js
            const fileContent = document.createElement("div");
            fileContent.style.display = "flex";
            fileContent.style.alignItems = "center";
            
            // Use the global getFileDownloadUrl function for consistent URL construction
            const downloadUrl = window.getFileDownloadUrl ? window.getFileDownloadUrl(item, pageId) : `${window.__TAURI__?.core?.invoke ? 'http://127.0.0.1:5000' : ''}/uploads/${pageId}/${encodeURIComponent(item.name)}`;
            
            fileContent.innerHTML = `
              <img src="../assets/images/icon-file.svg" style="width: 24px; height: 24px; margin-right: 12px;">
              <div style="flex: 1;">
                <div style="font-weight: 500; color: #1f2937;">${item.name}</div>
                <div style="font-size: 12px; color: #6b7280;">
                  Created: ${new Date(item.createdDateTime).toLocaleDateString()}
                  ${item.createdByUser ? `• by ${item.createdByUser}` : ''}
                </div>
              </div>
              <a href="${downloadUrl}" download="${item.name}" target="_blank" style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; text-decoration: none; display: inline-block;">
                Download
              </a>
            `;
            
            fileContainer.appendChild(fileContent);
            fileContainer.appendChild(deleteBtn);
            block.appendChild(fileContainer);
          }
          
          container.appendChild(block);
        });
      
        enableBlockDragAndDrop(container);
        
        // Update Page Tags and External Links after rendering blocks
        if (notes && notes.length > 0) {
          if (window.updatePageTags) {
            window.updatePageTags(notes);
          }
          if (window.updateExternalLinks) {
            window.updateExternalLinks(notes);
          }
        }
      }
      function enableBlockDragAndDrop(container) {
        // Only apply drag functionality to draggable blocks (images and notes)
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
      
                // Only consider draggable blocks for reordering, but respect task list position at top
                const draggableBlocks = Array.from(container.querySelectorAll('.page-block.draggable'));
                const nonDraggableBlocks = Array.from(container.querySelectorAll('.page-block.non-draggable'));
                const mouseY = event.client ? event.client.y : event.pageY;
      
                const draggedIndex = draggableBlocks.indexOf(target);
      
                const swapWith = draggableBlocks.find(el => {
                  if (el === target) return false;
                  const rect = el.getBoundingClientRect();
                  return mouseY < rect.top + rect.height / 2;
                });
      
                if (swapWith) {
                  // Insert before the swap target, but after any non-draggable blocks
                  container.insertBefore(target, swapWith);
                } else {
                  // Append at the end, but after non-draggable blocks
                  container.appendChild(target);
                }
      
                // Reconstruct order: non-draggable blocks first, then draggable blocks
                const allBlocks = [
                  ...nonDraggableBlocks,
                  ...Array.from(container.querySelectorAll('.page-block.draggable'))
                ];
                const reordered = allBlocks;
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
                  } else if (type === "tasklist") {
                    window.__TAURI__.core.invoke("update_tasklist_order_for_page", {
                      pageId: id,
                      orderIndex: i
                    });
                  }
                });
                
              }
            }
          });
      }
     
  
      export async function addEmptyNoteToPage(pageId, container) {
        console.log('📝 addEmptyNoteToPage called with pageId:', pageId);
        const { invoke } = window.__TAURI__.core;
        const containerEl = document.getElementById("page-blocks-container");
        
        if (!containerEl) {
          console.error('❌ page-blocks-container not found');
          return;
        }
        
        console.log('📦 Creating note with orderIndex:', containerEl.children.length);
      
        const created = await invoke("create_textbox_for_page", {
          text: "",
          pageId,
          orderIndex: containerEl.children.length
        });
        
        console.log('✅ Note created:', created);
      
        const block = document.createElement("div");
        block.classList.add("page-block", "draggable");
        block.setAttribute("data-type", "note");
        block.setAttribute("data-id", created.id);
      
        // Create note container
        const noteContainer = document.createElement("div");
        noteContainer.style.position = "relative";
        
        // Create delete button for note
        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = "×";
        deleteBtn.className = "delete-btn";
        deleteBtn.style.cssText = `
          position: absolute;
          top: 5px;
          right: 5px;
          width: 20px;
          height: 20px;
          border: none;
          background: rgba(255, 0, 0, 0.7);
          color: white;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          display: none;
          z-index: 10;
        `;
        
        // Show/hide delete button on hover
        block.addEventListener("mouseenter", () => {
          console.log('🖱️ Mouse entered note block, showing delete button for note:', created.id);
          deleteBtn.style.display = "block";
        });
        block.addEventListener("mouseleave", () => {
          if (!block.classList.contains("editing")) {
            console.log('🖱️ Mouse left note block, hiding delete button for note:', created.id);
            deleteBtn.style.display = "none";
          }
        });
        
        // Delete button click handler
        deleteBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          console.log('🗑️ Delete button clicked for note ID:', created.id);
          
          try {
            console.log('🗑️ Deleting note with ID:', created.id);
            await window.__TAURI__.core.invoke("delete_textbox", { 
              textboxId: created.id 
            });
            console.log('✅ Note deleted successfully');
            
            // Remove the note element from DOM immediately for better UX
            block.remove();
            
            // Then try to reload page data to reflect changes in other views
            if (typeof window.reloadCurrentPageData === 'function') {
              console.log('🔄 Calling reloadCurrentPageData to refresh UI');
              await window.reloadCurrentPageData();
            } else {
              console.log('ℹ️ No reloadCurrentPageData function available, note already removed from DOM');
            }
            
            // Show success message
            const messageEl = containerEl.querySelector('#page-message');
            if (messageEl) {
              messageEl.textContent = "Note deleted successfully";
              messageEl.classList.remove('success', 'error', 'info', 'hidden');
              messageEl.classList.add('success');
              setTimeout(() => messageEl.classList.add('hidden'), 3000);
            }
          } catch (error) {
            console.error('❌ Failed to delete note:', error);
            
            // Check if it's a 404 error (note doesn't exist) - treat as success
            if (error.toString().includes('404') || error.toString().includes('Not Found')) {
              console.log('🔄 Note not found on server, but continuing with local cleanup');
              
              // Reload page data anyway to clean up UI
              if (window.reloadCurrentPageData) {
                await window.reloadCurrentPageData();
              }
              
              // Show success message for 404
              const messageEl = containerEl.querySelector('#page-message');
              if (messageEl) {
                messageEl.textContent = "Note removed successfully";
                messageEl.classList.remove('success', 'error', 'info', 'hidden');
                messageEl.classList.add('success');
                setTimeout(() => messageEl.classList.add('hidden'), 3000);
              }
            } else {
              // Show error message for other errors
              const messageEl = containerEl.querySelector('#page-message');
              if (messageEl) {
                messageEl.textContent = `Failed to delete note: ${error}`;
                messageEl.classList.remove('success', 'error', 'info', 'hidden');
                messageEl.classList.add('error');
                setTimeout(() => messageEl.classList.add('hidden'), 3000);
              }
            }
          }
        });
        
        // Add identifier for debugging
        deleteBtn.setAttribute('data-note-id', created.id);
        console.log('✅ Direct event listener added to delete button for note:', created.id);
        
        const editorDiv = document.createElement("div");
        noteContainer.appendChild(editorDiv);
        noteContainer.appendChild(deleteBtn);
        block.appendChild(noteContainer);
        containerEl.appendChild(block);
      
        const quill = new Quill(editorDiv, {
          theme: "snow",
          readOnly: false,
          modules: {
            toolbar: [['bold', 'italic'], [{ list: 'bullet' }], ['clean']]
          }
        });
      
        quill.root.innerHTML = "";
        editorDiv.focus();
        block.classList.add("editing");
        block.dataset.originalText = "";
      
        // Real-time hashtag and URL updates as user types
        quill.on("text-change", async (delta, oldDelta, source) => {
          if (source === 'user') {
            // Get the text content from Quill, not HTML
            const currentText = quill.getText();
            console.log('🔍 Real-time text content from Quill:', JSON.stringify(currentText));
            
            const hashtags = extractHashtagsFromText(currentText);
            console.log('🔍 Real-time hashtags detected:', hashtags);
            
            const urls = extractUrlsFromText(currentText);
            console.log('🔗 Real-time URLs detected:', urls);
            
            // Update page tags and external links in real-time (debounced)
            try {
              const currentNotes = await invoke("fetch_textbox_for_page", { pageId });
              if (currentNotes) {
                // Create a temporary note with current content for extraction
                const tempNotes = currentNotes.map(note => 
                  note.id === created.id ? { ...note, text: currentText } : note
                );
                debouncedUpdatePageTags(tempNotes);
                debouncedUpdateExternalLinks(tempNotes);
              }
            } catch (error) {
              console.warn('Could not update hashtags/URLs in real-time:', error);
            }
          }
        });

        quill.on("selection-change", async (range, oldRange) => {
          if (range === null && oldRange !== null) {
            quill.enable(false);
            block.classList.remove("editing");
            deleteBtn.style.display = "block"; // Keep delete button visible while editing
      
            // Save the text content, not HTML
            const newText = quill.getText().trim();
            console.log('💾 Saving note text:', JSON.stringify(newText));
      
            try {
              await invoke("update_textbox_text", {
                noteId: created.id,
                newText: newText,
                pageId
              });
              
              // Immediately update page tags and external links after saving
              console.log('🔄 Updating page tags and external links after note save');
              try {
                const updatedNotes = await invoke("fetch_textbox_for_page", { pageId });
                if (window.updatePageTags && updatedNotes) {
                  window.updatePageTags(updatedNotes);
                  console.log('✅ Page tags updated immediately');
                }
                if (window.updateExternalLinks && updatedNotes) {
                  window.updateExternalLinks(updatedNotes);
                  console.log('✅ External links updated immediately');
                }
              } catch (tagError) {
                console.warn('Could not update page tags/external links immediately:', tagError);
              }
            } catch (err) {
              console.error("Failed to update new note:", err);
              // Don't clear the content on error, just show a warning
              console.warn("Note content preserved despite save error");
            }
          }
        });
      
        enableBlockDragAndDrop(containerEl);
        
        // Update page tags and external links immediately after note creation
        console.log('🔄 Updating page tags and external links after note creation');
        try {
          const updatedNotes = await invoke("fetch_textbox_for_page", { pageId });
          if (window.updatePageTags && updatedNotes) {
            window.updatePageTags(updatedNotes);
            console.log('✅ Page tags updated after note creation');
          }
          if (window.updateExternalLinks && updatedNotes) {
            window.updateExternalLinks(updatedNotes);
            console.log('✅ External links updated after note creation');
          }
        } catch (error) {
          console.log('Could not update page tags/external links after note creation:', error);
        }
        
        console.log('📝 Note added to page successfully');
      }
  function showCustomPrompt({ title, label, okText, defaultValue = "", multiline = false }) {
    return new Promise((resolve, reject) => {
      const modal = document.getElementById("custom-modal-task-workspace");
      const modalTitle = document.getElementById("modal-title-task-workspace");
      const modalLabel = document.getElementById("modal-label-task-workspace");
      const input = document.getElementById("modal-input-task-workspace");
      const textarea = document.getElementById("modal-textarea-task-workspace");
      const cancelBtn = document.getElementById("modal-cancel-btn-task-workspace");
      const okBtn = document.getElementById("modal-ok-btn-task-workspace");
  
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
      //disableScroll();
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
        //enableScroll(); 
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

  function showCustomCardPrompt({ title, label, okText, defaultValue = "", multiline = false }) {
    return new Promise((resolve, reject) => {
      const modal = document.getElementById("custom-modal-card-workspace");
      const modalTitle = document.getElementById("modal-title-card-workspace");
      const modalLabel = document.getElementById("modal-label-card-workspace");
      const input = document.getElementById("modal-input-card-workspace");
      const textarea = document.getElementById("modal-textarea-card-workspace");
      const cancelBtn = document.getElementById("modal-cancel-btn-card-workspace");
      const okBtn = document.getElementById("modal-ok-btn-card-workspace");
  
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
      //disableScroll();
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
        //enableScroll(); 
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

// ========== Page Tab System ==========

/**
 * Initialize tab system for page content
 */
function initializePageTabs() {
  console.log('🔧 Initializing page tabs...');
  
  const tabButtons = document.querySelectorAll('.page-tab-btn');
  const tabPanels = document.querySelectorAll('.page-tab-panel');
  const tabContainer = document.querySelector('.page-tab-container');
  
  console.log('Tab container found:', !!tabContainer);
  console.log('Tab buttons found:', tabButtons.length);
  console.log('Tab panels found:', tabPanels.length);
  
  if (tabButtons.length === 0) {
    console.warn('⚠️ No tab buttons found! Check HTML structure.');
    return;
  }
  
  if (tabPanels.length === 0) {
    console.warn('⚠️ No tab panels found! Check HTML structure.');
    return;
  }

  // Add click event listeners to tab buttons
  tabButtons.forEach((button, index) => {
    console.log(`Adding click listener to tab button ${index}:`, button.getAttribute('data-tab'));
    button.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.getAttribute('data-tab');
      console.log('Tab clicked:', targetTab);
      switchToTab(targetTab);
    });
  });

  console.log('✅ Page tabs initialized successfully');
}

/**
 * Switch to a specific tab
 */
function switchToTab(tabId) {
  console.log(`🔄 Switching to tab: ${tabId}`);
  
  const tabButtons = document.querySelectorAll('.page-tab-btn');
  const tabPanels = document.querySelectorAll('.page-tab-panel');

  console.log('Found buttons:', tabButtons.length);
  console.log('Found panels:', tabPanels.length);

  // Remove active class from all buttons and panels
  tabButtons.forEach(btn => btn.classList.remove('active'));
  tabPanels.forEach(panel => panel.classList.remove('active'));

  // Add active class to selected button and panel
  const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
  const activePanel = document.getElementById(tabId);

  console.log('Active button found:', !!activeButton);
  console.log('Active panel found:', !!activePanel);

  if (activeButton) {
    activeButton.classList.add('active');
    console.log('✅ Button activated');
  }
  if (activePanel) {
    activePanel.classList.add('active');
    console.log('✅ Panel activated');
    
    // Refresh card connection lines when switching to cards tab
    if (tabId === 'cards-tab') {
      setTimeout(() => {
        if (window.currentLines && Array.isArray(window.currentLines)) {
          window.currentLines.forEach(line => {
            try {
              if (line && line.position) {
                line.position();
                console.log('🔗 Line position refreshed after tab switch');
              }
            } catch (e) {
              console.warn('Failed to refresh line position after tab switch:', e);
            }
          });
        }
      }, 200);
    }
  }

  console.log(`✅ Switched to tab: ${tabId}`);
}

// ========== Page Loading System ==========

/**
 * Show page loading overlay
 */
function showPageLoading(message = 'Loading...') {
  const loadingOverlay = document.getElementById('page-loading-overlay');
  const loadingText = loadingOverlay?.querySelector('.loading-text');

  if (loadingOverlay) {
    if (loadingText) {
      loadingText.textContent = message;
    }
    loadingOverlay.classList.remove('hidden');
    console.log('📋 Page loading started:', message);
  }
}

/**
 * Hide page loading overlay
 */
function hidePageLoading() {
  const loadingOverlay = document.getElementById('page-loading-overlay');

  if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
    console.log('✅ Page loading completed');
  }
}

/**
 * Show loading for specific operation with custom message
 */
function showPageLoadingWithMessage(message) {
  showPageLoading(message);
}

// ========== Page Tab Test Functions ==========

/**
 * Test function to demonstrate tab switching
 */
window.testPageTabs = function() {
  console.log("=== Testing Page Tab System ===");
  
  // Check if elements exist
  const tabButtons = document.querySelectorAll('.page-tab-btn');
  const tabPanels = document.querySelectorAll('.page-tab-panel');
  const tabContainer = document.querySelector('.page-tab-container');
  const tabNav = document.querySelector('.page-tab-nav');
  
  console.log("Tab container found:", !!tabContainer);
  console.log("Tab nav found:", !!tabNav);
  console.log("Tab buttons found:", tabButtons.length);
  console.log("Tab panels found:", tabPanels.length);
  
  // Test switching between tabs
  setTimeout(() => {
    console.log("Switching to Cards tab...");
    switchToTab('cards-tab');
    
    setTimeout(() => {
      console.log("Switching back to Tasks tab...");
      switchToTab('tasks-tab');
      console.log("✅ Tab test completed");
    }, 2000);
  }, 1000);
};

/**
 * Test function to demonstrate page loading states
 */
window.testPageLoading = function() {
  console.log("=== Testing Page Loading States ===");
  
  // Test different loading messages
  showPageLoading('Loading tasks...');
  
  setTimeout(() => {
    showPageLoading('Loading cards...');
    setTimeout(() => {
      showPageLoading('Saving changes...');
      setTimeout(() => {
        hidePageLoading();
        console.log("✅ Page loading test completed");
      }, 1000);
    }, 1000);
  }, 1000);
};

/**
 * Get current active tab
 */
window.getCurrentActiveTab = function() {
  const activeTab = document.querySelector('.page-tab-panel.active');
  return activeTab ? activeTab.id : null;
};

/**
 * Switch to specific tab (public function)
 */
window.switchPageTab = function(tabId) {
  switchToTab(tabId);
};

/**
 * Debug function to inspect tab system state
 */
window.debugPageTabs = function() {
  console.log("=== Page Tab Debug Info ===");
  
  const tabContainer = document.querySelector('.page-tab-container');
  const tabNav = document.querySelector('.page-tab-nav');
  const tabContent = document.querySelector('.page-tab-content');
  const tabButtons = document.querySelectorAll('.page-tab-btn');
  const tabPanels = document.querySelectorAll('.page-tab-panel');
  
  console.log("Tab Container:", tabContainer);
  console.log("Tab Nav:", tabNav);
  console.log("Tab Content:", tabContent);
  console.log("Tab Buttons:", tabButtons);
  console.log("Tab Panels:", tabPanels);
  
  if (tabContainer) {
    console.log("Tab Container styles:", window.getComputedStyle(tabContainer));
  }
  
  if (tabNav) {
    console.log("Tab Nav styles:", window.getComputedStyle(tabNav));
  }
  
  tabButtons.forEach((btn, index) => {
    console.log(`Button ${index}:`, btn);
    console.log(`Button ${index} classes:`, btn.className);
    console.log(`Button ${index} data-tab:`, btn.getAttribute('data-tab'));
  });
  
  tabPanels.forEach((panel, index) => {
    console.log(`Panel ${index}:`, panel);
    console.log(`Panel ${index} classes:`, panel.className);
    console.log(`Panel ${index} id:`, panel.id);
  });
};

/**
 * Force show tabs function for debugging
 */
window.forceShowTabs = function() {
  console.log("🔧 Force showing tabs...");
  
  const tabContainer = document.querySelector('.page-tab-container');
  const tabNav = document.querySelector('.page-tab-nav');
  const tabButtons = document.querySelectorAll('.page-tab-btn');
  
  if (tabContainer) {
    tabContainer.style.display = 'flex';
    tabContainer.style.visibility = 'visible';
    tabContainer.style.height = '400px';
    tabContainer.style.border = '5px solid red';
    tabContainer.style.background = 'yellow';
    console.log("✅ Tab container forced visible");
  }
  
  if (tabNav) {
    tabNav.style.display = 'flex';
    tabNav.style.visibility = 'visible';
    tabNav.style.height = '60px';
    tabNav.style.background = 'lightblue';
    console.log("✅ Tab nav forced visible");
  }
  
  tabButtons.forEach((btn, index) => {
    btn.style.display = 'flex';
    btn.style.visibility = 'visible';
    btn.style.background = 'orange';
    btn.style.border = '2px solid black';
    btn.style.padding = '20px';
    btn.style.fontSize = '16px';
    btn.style.fontWeight = 'bold';
    console.log(`✅ Button ${index} forced visible`);
  });
  
  console.log("🎯 All tabs should now be visible!");
};

alert("page.js loaded");