// Independent task event listener setup function
function setupTaskListenersIndependently(page, container) {
  console.log('🚀 Independent task listener setup for:', page.name);
  
  const attemptSetup = (attempt = 1, maxAttempts = 5) => {
    console.log(`📋 Attempt ${attempt}/${maxAttempts} to set up task listeners for:`, page.name);
    
    const modal = container.querySelector("#add-task-modal");
    const saveBtn = container.querySelector("#save-task-btn");
    const cancelBtn = container.querySelector("#cancel-task-btn");
    const addTaskBtn = container.querySelector("#add-task-btn");
    
    console.log('Task elements found:', {
      modal: !!modal,
      saveBtn: !!saveBtn,
      cancelBtn: !!cancelBtn,
      addTaskBtn: !!addTaskBtn
    });
    
    if (modal && saveBtn && cancelBtn && addTaskBtn) {
      // Set up add task button
      if (addTaskBtn._taskAddHandler) {
        addTaskBtn.removeEventListener("click", addTaskBtn._taskAddHandler);
      }
      const addHandler = () => {
        console.log('📝 Opening task creation modal for page:', page.name, '- Page ID:', page.id);
        modal.classList.remove("hidden");
      };
      addTaskBtn._taskAddHandler = addHandler;
      addTaskBtn.addEventListener("click", addHandler);
      
      // Set up save button
      if (saveBtn._taskSaveHandler) {
        saveBtn.removeEventListener("click", saveBtn._taskSaveHandler);
      }
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
        
        if (!payload.title || !payload.title.trim()) {
          console.error("Task title is required");
          return;
        }
        
        try {
          const created = await window.__TAURI__.core.invoke("create_task_for_page", payload);
          console.log('✅ Task created successfully:', created, 'for page:', page.name);
          
          // Reload page data if function is available
          if (window.reloadCurrentPageData) {
            await window.reloadCurrentPageData();
          }
          
          modal.classList.add("hidden");
          
          // Reset form
          container.querySelector("#task-title").value = "";
          container.querySelector("#task-description").value = "";
          container.querySelector("#task-due-date").value = "";
          container.querySelector("#task-status").value = "";
          container.querySelector("#task-priority").value = "";
          container.querySelector("#task-assigned-id").selectedIndex = 0;
          container.querySelector("#task-industry").value = "";
          
        } catch (e) {
          console.error("❌ Error creating task for page", page.name, ":", e);
        }
      };
      saveBtn._taskSaveHandler = saveHandler;
      saveBtn.addEventListener("click", saveHandler);
      
      // Set up cancel button
      if (cancelBtn._taskCancelHandler) {
        cancelBtn.removeEventListener("click", cancelBtn._taskCancelHandler);
      }
      const cancelHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('❌ Cancel button clicked for page:', page.name);
        modal.classList.add("hidden");
        
        // Reset form
        container.querySelector("#task-title").value = "";
        container.querySelector("#task-description").value = "";
        container.querySelector("#task-due-date").value = "";
        container.querySelector("#task-status").value = "";
        container.querySelector("#task-priority").value = "";
        container.querySelector("#task-assigned-id").selectedIndex = 0;
        container.querySelector("#task-industry").value = "";
      };
      cancelBtn._taskCancelHandler = cancelHandler;
      cancelBtn.addEventListener("click", cancelHandler);
      
      console.log('✅ All task event listeners set up successfully for:', page.name);
      return true;
    } else {
      console.log(`⏳ Task elements not ready for ${page.name}, retrying in 200ms...`);
      if (attempt < maxAttempts) {
        setTimeout(() => attemptSetup(attempt + 1, maxAttempts), 200);
      } else {
        console.error(`❌ Failed to set up task listeners after ${maxAttempts} attempts for:`, page.name);
      }
      return false;
    }
  };
  
  // Start setup immediately and also with a small delay
  attemptSetup();
  setTimeout(() => attemptSetup(), 100);
}

export async function init(workspace, container) {
  window.currentLines.forEach(line => line.remove());
  window.currentLines = [];
  const folders = await window.__TAURI__.core.invoke("fetch_folders");
const vaults = await window.__TAURI__.core.invoke("fetch_vaults");

const workspaceFolder = folders.find(f => f.id == workspace.folderId);
let breadcrumb = "";

if (workspaceFolder) {
  const pathParts = [];
  let current = workspaceFolder;
  while (current) {
    pathParts.unshift(current.name);
    current = folders.find(f => f.id === current.parentId);
  }

  breadcrumb = pathParts.join(" / ");
}
  container.innerHTML = `
    <div class="content-header">
      <h2>${workspace.name}</h2>
      <div class="content-header-actions">
        <button class="content-header-button"><img src="assets/images/dots-button.svg"/></button>
        <button class="content-header-button expand-header-button"><img src="assets/images/expand.svg" /></button>
      </div>
    </div>
    <div class="breadcrumb">${breadcrumb}</div>


    <div id="workspace-main-content" class="content-card"></div>
    
    <!-- Page Loading Overlay -->
    <div id="page-loading-overlay" class="page-loading-overlay hidden">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading...</div>
      </div>
    </div>
    
    <!-- Page Error Message -->
    <div id="page-error-message" class="page-error-message hidden"></div>
    
    <div class="workspace-description-wrapper hidden">
        <div class="workspace-description-header">
            <p class="version-title">Platform Updates: Version 4.4.1</p>
        </div>
        <div class="workspace-description">
            <p class="workspace-description-title">Vector Vault Improvements</p>
            <ul class="workspace-description-list">
                <li>View and access files directly within your chat interface</li>
                <li>More flexible document handling - chat with multiple documents simultaneously</li>
                <li>Enhanced file management for managers, including unsharing capabilities</li>
                <li>Support for PowerPoint files (PPT/PPTX) in chat</li>
                <li>Improved file name visibility with hover labels in dashboard</li>
            </ul>
        </div>
        <div class="workspace-description">
            <p class="workspace-description-title">Multiple File Support</p>
            <ul class="workspace-description-list">
                <li>Upload up to 10 files directly in one conversation</li>
                <li>Select multiple files from My Data for chat interactions</li>
                <li>Work with multiple sheets in analytics-ready format</li>
                <li>Enhanced source tracking with multi-source view in responses</li>
            </ul>
        </div>
        <div class="workspace-description">
            <p class="workspace-description-title">Artifact System Updates</p>
            <ul class="workspace-description-list">
                <li>Edit your Code and Markdown artifacts seamlessly</li>
                <li>Track changes with new versioning system</li>
                <li>More robust storage architecture for better performance</li>
            </ul>
        </div>
        <div class="workspace-description">
            <p class="workspace-description-title">Extended Connectivity...</p>
        </div>   
    </div>    
    <div class="workspace-tabs-wrapper">
      <div class="workspace-tabs-inner">
        <button class="page-nav-arrow" id="page-tabs-left">&#x276E;</button>

        <div class="workspace-tabs-scrollable" id="workspace-tabs">
        
        </div>

        <button class="page-nav-arrow" id="page-tabs-right">&#x276F;</button>
        <button class="add-tab-circle" id="add-page-tab">+</button>
        <button class="add-tab-circle hidden" id="open-workspace-fab-menu">+</button>
      </div>
    </div> 
    `;
    initSidebarToggle();
    
    // Open the global FAB menu when the workspace FAB button is clicked
    const openWorkspaceFabButton = container.querySelector("#open-workspace-fab-menu");
    const globalFabMenuElement = document.getElementById("fab-menu");
    if (openWorkspaceFabButton && globalFabMenuElement) {
      openWorkspaceFabButton.addEventListener("click", (event) => {
        event.stopPropagation();
        globalFabMenuElement.classList.remove("hidden");
      });
    }
  
  try {
    const pages = await window.__TAURI__.core.invoke("fetch_pages_for_workspace", {
      workspaceId: workspace.id
    });
    renderTabs(pages);
  } catch (err) {
    console.error("Error loading pages:", err);
  }

  function renderTabs(pages) {
    const scrollContainer = container.querySelector("#workspace-tabs");
    scrollContainer.innerHTML = "";
  
    const leftArrow = container.querySelector("#page-tabs-left");
    const rightArrow = container.querySelector("#page-tabs-right");
    const addButton = container.querySelector("#add-page-tab");
    const mainContent = container.querySelector("#workspace-main-content");

    if (!container.querySelector("#page-tab-context-menu")) {
      const menu = document.createElement("div");
      menu.className = "context-menu hidden";
      menu.id = "page-tab-context-menu";
      menu.innerHTML = `<button>New</button> <button id="delete-page-btn">Delete</button> <button id="delete-page-btn">Duplicate</button> <button id="rename-page-btn">Rename Page</button>`;
      container.appendChild(menu);
    }
    if (pages.length === 0) {
      mainContent.innerHTML = "";
    } else {
      console.log('🏠 Loading default/first page:', pages[0].name, '- Page ID:', pages[0].id);
      renderPageContent(pages[0]);
      
      // Additional verification for default page after a delay
      setTimeout(() => {
        console.log('🔍 Verifying default page functionality after load:', pages[0].name);
        const mainContent = container.querySelector("#workspace-main-content");
        const pageWrapper = mainContent?.querySelector('.page-content-wrapper');
        
        if (pageWrapper) {
          const taskTable = pageWrapper.querySelector(".task-table-wrapper");
          const addTaskBtn = pageWrapper.querySelector("#add-task-btn");
          const pageBlocks = pageWrapper.querySelector("#page-blocks-container");
          
          console.log('📋 Default page elements check:', {
            taskTable: !!taskTable,
            taskTableVisible: taskTable ? !taskTable.classList.contains('hidden') : false,
            addTaskBtn: !!addTaskBtn,
            pageBlocks: !!pageBlocks,
            pageId: pages[0].id,
            pageName: pages[0].name
          });
          
          // Force task listener setup if needed
          if (taskTable && addTaskBtn) {
            console.log('🔧 Ensuring task listeners are set up for default page');
            setupTaskListenersIndependently(pages[0], pageWrapper);
          }
        }
      }, 1000);
    }
  
    pages.forEach((page, idx) => {
      const btn = document.createElement("button");
      btn.classList.add("workspace-tab");
      if (idx === 0) btn.classList.add("active");
  
      btn.dataset.pageId = page.id;
      btn.textContent = page.name;
  
      btn.addEventListener("click", () => {
        container.querySelectorAll(".workspace-tab").forEach(t => t.classList.remove("active"));
        btn.classList.add("active");
        
        console.log('🔄 Switching to page:', page.name);
        switchToExistingPage(page);
        
        // Verify page functionality after switching (for existing pages)
        setTimeout(() => {
          console.log('🔧 Verifying page functionality after switch:', page.name);
          const mainContent = container.querySelector("#workspace-main-content");
          const pageWrapper = mainContent?.querySelector('.page-content-wrapper');
          
          if (pageWrapper) {
            const taskTable = pageWrapper.querySelector(".task-table-wrapper");
            const pageBlocks = pageWrapper.querySelector("#page-blocks-container");
            
            // Apply styling if task table exists but doesn't have styling
            if (taskTable && !(taskTable.style.border && taskTable.style.borderRadius)) {
              console.log('🎨 Applying missing task table styling for:', page.name);
              taskTable.style.background = 'white';
              taskTable.style.border = '1px solid #e5e7eb';
              taskTable.style.borderRadius = '8px';
              taskTable.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
              taskTable.style.marginBottom = '16px';
            }
            
            // Set up task listeners for switched pages
            console.log('🔧 Setting up task listeners for switched page:', page.name);
            setupTaskListenersIndependently(page, pageWrapper);
            
            console.log('📋 Page verification:', {
              taskTable: !!taskTable,
              pageBlocks: !!pageBlocks,
              hasProperStyling: taskTable ? !!(taskTable.style.border && taskTable.style.borderRadius) : false
            });
          }
        }, 800);
      });
  
      scrollContainer.appendChild(btn);
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        
        const menu = container.querySelector("#page-tab-context-menu");
        if (!menu) return;
      
        
        // Calculate position to keep menu within viewport
        const menuHeight = 200; // Approximate height of the context menu
        const menuWidth = 210; // Width from CSS
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Calculate top position
        let top = e.clientY;
        if (top + menuHeight > viewportHeight) {
          top = viewportHeight - menuHeight - 10; // 10px margin from bottom
        }
        if (top < 10) {
          top = 10; // 10px margin from top
        }
        
        // Calculate left position
        let left = e.clientX;
        if (left + menuWidth > viewportWidth) {
          left = viewportWidth - menuWidth - 10; // 10px margin from right
        }
        if (left < 10) {
          left = 10; // 10px margin from left
        }
        
        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;
        menu.classList.remove("hidden");
      
        
        menu.dataset.pageId = page.id;
      });

      const deleteBtn = container.querySelector("#delete-page-btn");
      deleteBtn.addEventListener("click", async () => {
        const menu = container.querySelector("#page-tab-context-menu");
        const pageId = parseInt(menu.dataset.pageId);
        if (!pageId) return;

        const confirmed = confirm("Are you sure you want to delete this page?");
        if (!confirmed) return;

        try {
          await window.__TAURI__.core.invoke("delete_page", { pageId });

          
          const index = pages.findIndex(p => p.id === pageId);
          if (index !== -1) {
            pages.splice(index, 1);
            renderTabs(pages);
          }
        } catch (err) {
          console.error("Failed to delete page:", err);
        } finally {
          menu.classList.add("hidden");
        }
      });
      
        const renameBtn = container.querySelector("#rename-page-btn");
    renameBtn.addEventListener("click", (e) => {
      const menu = container.querySelector("#page-tab-context-menu");
      const pageId = parseInt(menu.dataset.pageId, 10);
      if (!pageId) return;
      const tabBtn = container.querySelector(`.workspace-tab[data-page-id="${pageId}"]`);
      if (!tabBtn) return;

      const currentName = tabBtn.textContent;
      
      // Create rename modal (same structure as add-page-modal)
      let modal = container.querySelector("#rename-page-modal");
      
      // If modal doesn't exist, create it
      if (!modal) {
        modal = document.createElement("div");
        modal.className = "modal-overlay hidden";
        modal.id = "rename-page-modal";
        modal.innerHTML = `
          <div class="modal">
            <h3>Rename Page</h3>
            <input type="text" id="rename-page-name" placeholder="Page Name">
            <div class="modal-actions">
              <button id="confirm-rename-btn">Rename</button>
              <button id="cancel-rename-btn">Cancel</button>
            </div>
          </div>
        `;
        container.appendChild(modal);
      }

      // Show modal and set current name
      modal.classList.remove("hidden");
      const input = modal.querySelector("#rename-page-name");
      input.value = currentName;
      input.focus();
      input.select(); // Select all text for easy editing

      const confirmBtn = modal.querySelector("#confirm-rename-btn");
      const cancelBtn = modal.querySelector("#cancel-rename-btn");

      // Remove existing event listeners to prevent multiple bindings
      const newConfirmBtn = confirmBtn.cloneNode(true);
      const newCancelBtn = cancelBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

      // Confirm rename
      newConfirmBtn.onclick = async () => {
        const newName = input.value.trim();
        if (!newName) {
          console.warn('Page name cannot be empty');
          return;
        }
        
        if (newName === currentName) {
          modal.classList.add("hidden");
          return;
        }

        try {
          console.log('🏷️ Renaming page:', currentName, '->', newName);
          
          // Show loading state (optional: disable button)
          newConfirmBtn.disabled = true;
          newConfirmBtn.textContent = 'Renaming...';
          
          await window.__TAURI__.core.invoke('rename_page', { 
            pageId: pageId, 
            newName: newName 
          });
          
          // Update tab text
          tabBtn.textContent = newName;
          
          // Update page object in pages array
          const pageIndex = pages.findIndex(p => p.id === pageId);
          if (pageIndex !== -1) {
            pages[pageIndex].name = newName;
          }
          
          modal.classList.add("hidden");
          console.log('✅ Page renamed successfully:', newName);
          
          // Reset button state
          newConfirmBtn.disabled = false;
          newConfirmBtn.textContent = 'Rename';
        } catch (err) {
          console.error('❌ Failed to rename page:', err);
          
          // Reset button state
          newConfirmBtn.disabled = false;
          newConfirmBtn.textContent = 'Rename';
          
          // Show error message
          const errorMsg = document.createElement('div');
          errorMsg.style.color = 'red';
          errorMsg.style.fontSize = '12px';
          errorMsg.style.marginTop = '5px';
          errorMsg.textContent = 'Failed to rename page: ' + err;
          
          // Remove any existing error messages
          const existingError = modal.querySelector('.error-message');
          if (existingError) {
            existingError.remove();
          }
          
          errorMsg.className = 'error-message';
          input.parentNode.insertBefore(errorMsg, input.nextSibling);
          
          // Remove error message after 5 seconds
          setTimeout(() => {
            if (errorMsg.parentNode) {
              errorMsg.remove();
            }
          }, 5000);
        }
      };

      // Cancel rename
      newCancelBtn.onclick = () => {
        modal.classList.add("hidden");
      };

      // Close modal on Escape key
      const handleKeyPress = (e) => {
        if (e.key === 'Escape') {
          modal.classList.add("hidden");
          document.removeEventListener('keydown', handleKeyPress);
        } else if (e.key === 'Enter') {
          newConfirmBtn.click();
          document.removeEventListener('keydown', handleKeyPress);
        }
      };
      document.addEventListener('keydown', handleKeyPress);

      // Close modal when clicking outside
      modal.onclick = (e) => {
        if (e.target === modal) {
          modal.classList.add("hidden");
          document.removeEventListener('keydown', handleKeyPress);
        }
      };

      menu.classList.add("hidden");
    });
      document.addEventListener("click", (e) => {
        const menu = container.querySelector("#page-tab-context-menu");
        if (!menu) return;
      
        if (!e.target.closest("#page-tab-context-menu")) {
          menu.classList.add("hidden");
        }
      });
    });
    
    addButton.onclick = () => {
      let modal = container.querySelector("#add-page-modal");
      
      // Ako ne postoji, napravi ga
      if (!modal) {
        modal = document.createElement("div");
        modal.className = "modal-overlay hidden";
        modal.id = "add-page-modal";
        modal.innerHTML = `
          <div class="modal">
            <h3>Add New Page</h3>
            <input type="text" id="new-page-name" placeholder="Page Title">
            <div class="modal-actions">
              <button id="create-page-btn">Create</button>
              <button id="cancel-page-btn">Cancel</button>
            </div>
          </div>
        `;
        container.appendChild(modal);
      }
    
      modal.classList.remove("hidden");
      const input = modal.querySelector("#new-page-name");
      input.value = "";
      input.focus();
    
      const createBtn = modal.querySelector("#create-page-btn");
      const cancelBtn = modal.querySelector("#cancel-page-btn");
    
      createBtn.onclick = async () => {
        const name = input.value.trim();
        if (!name) return;
    
        try {
          const newPage = await window.__TAURI__.core.invoke("create_page_for_workspace", {
            name,
            workspaceId: workspace.id
          });
          pages.push(newPage);
          renderTabs(pages);
          
          // Automatically switch to the new page
          setTimeout(() => {
            const newTab = container.querySelector(`[data-page-id="${newPage.id}"]`);
            if (newTab) {
              // Remove active class from all tabs
              container.querySelectorAll(".workspace-tab").forEach(t => t.classList.remove("active"));
              // Add active class to new tab
              newTab.classList.add("active");
              // Render the new page content
              renderPageContent(newPage);
              console.log('✅ Switched to newly created page:', newPage.name);
              
              // Additional delay to ensure page is fully initialized with all features
              setTimeout(() => {
                console.log('🔧 Verifying complete page initialization for:', newPage.name);
                const mainContent = container.querySelector("#workspace-main-content");
                const pageWrapper = mainContent?.querySelector('.page-content-wrapper');
                
                if (pageWrapper) {
                  // Check for essential elements
                  const taskForm = pageWrapper.querySelector("#task-title");
                  const addTaskBtn = pageWrapper.querySelector("#add-task-btn");
                  const taskTable = pageWrapper.querySelector(".task-table-wrapper");
                  const pageBlocks = pageWrapper.querySelector("#page-blocks-container");
                  
                  console.log('📋 Page elements check:', {
                    taskForm: !!taskForm,
                    addTaskBtn: !!addTaskBtn,
                    taskTable: !!taskTable,
                    pageBlocks: !!pageBlocks,
                    pageWrapper: !!pageWrapper
                  });
                  
                  if (taskForm && addTaskBtn && taskTable && pageBlocks) {
                    console.log('✅ All essential page elements found and ready for:', newPage.name);
                    
                    // Apply and verify task table styling
                    if (taskTable) {
                      const hasProperStyling = taskTable.style.border && taskTable.style.borderRadius;
                      console.log('🎨 Task table styling check:', { hasProperStyling });
                      
                      if (!hasProperStyling) {
                        console.log('🎨 Applying task table styling for new page:', newPage.name);
                        taskTable.style.background = 'white';
                        taskTable.style.border = '1px solid #e5e7eb';
                        taskTable.style.borderRadius = '8px';
                        taskTable.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                        taskTable.style.marginBottom = '16px';
                        console.log('✅ Task table styling applied for:', newPage.name);
                      }
                    }
                    
                    // CRITICAL FIX: Set up task listeners for the new page
                    console.log('🔧 Setting up task listeners for new page:', newPage.name, 'with ID:', newPage.id);
                    setupTaskListenersIndependently(newPage, pageWrapper);
                    
                  } else {
                    console.warn('⚠️ Some page elements missing for:', newPage.name);
                  }
                } else {
                  console.error('❌ Page wrapper not found for:', newPage.name);
                }
              }, 1000); // Increased delay to ensure complete initialization
            }
          }, 100);
        } catch (e) {
          console.error("Failed to create page:", e);
        } finally {
          modal.classList.add("hidden");
        }
      };
    
      cancelBtn.onclick = () => {
        modal.classList.add("hidden");
      };
    };

    if (mainContent) {
        mainContent.addEventListener("scroll", () => {
        window.currentLines.forEach(line => line.position());
      });
    }
    leftArrow.onclick = () => scrollContainer.scrollBy({ left: -120, behavior: "smooth" });
    rightArrow.onclick = () => scrollContainer.scrollBy({ left: 120, behavior: "smooth" });
  }
  
  function formatDate(isoString) {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }
  // Function to switch to existing page (just reload data, don't recreate page)
  function switchToExistingPage(page) {
    console.log('🔄 Switching to existing page:', page.name);
    
    // Check if page content already exists
    const mainContent = container.querySelector("#workspace-main-content");
    const pageWrapper = mainContent?.querySelector('.page-content-wrapper');
    
    if (!pageWrapper) {
      // Page content doesn't exist, create it
      console.log('📄 Page content not found, creating for:', page.name);
      renderPageContent(page);
      return;
    }
    
    // Page content exists, just reload data
    console.log('📊 Reloading data for existing page:', page.name);
    reloadPageDataForSwitch(page, pageWrapper);
  }
  
  // Function to reload data when switching to existing page
  async function reloadPageDataForSwitch(page, pageWrapper) {
    try {
      console.log('🔄 Loading data for page:', page.name);
      
      // Show loading overlay with initial message
      showPageLoadingOverlay('Loading page data...');
      
      // Update global page reference
      window.currentPage = page;
      
      // Fetch data for this specific page with individual loading states
      showPageLoadingOverlay('Loading...');
      const tasks = await window.__TAURI__.core.invoke("fetch_tasks_for_page", { pageId: page.id });
      
      showPageLoadingOverlay('Loading...');
      const notes = await window.__TAURI__.core.invoke("fetch_textbox_for_page", { pageId: page.id });
      
      showPageLoadingOverlay('Loading...');
      const images = await window.__TAURI__.core.invoke("fetch_images_for_page", { pageId: page.id });
      
      showPageLoadingOverlay('Loading...');
      const cards = await window.__TAURI__.core.invoke("fetch_cards_for_page", { pageId: page.id });
      
      console.log('📋 Data loaded for page', page.name, ':', {
        tasks: tasks.length,
        notes: notes.length,
        images: images.length,
        cards: cards.length
      });
      
      // Use manual reload to ensure page-scoped rendering
      await manualPageReload(page, pageWrapper, tasks, notes, images, cards);
      
      // Set up task listeners for the switched page
      console.log('🔧 Setting up task listeners for switched page:', page.name);
      setupTaskListenersIndependently(page, pageWrapper);
      
      // Hide loading overlay
      hidePageLoadingOverlay();
      
      console.log('✅ Successfully switched to page:', page.name);
      
    } catch (error) {
      console.error('❌ Error loading data for page', page.name, ':', error);
      hidePageLoadingOverlay();
      // Show error message to user
      showPageErrorMessage('Failed to load page data: ' + error);
    }
  }
  
  // Manual page reload function as fallback
  async function manualPageReload(page, pageWrapper, tasks, notes, images, cards) {
    console.log('🔧 Manual page reload for:', page.name);
    
    // Clear existing content
    const pageBlocksContainer = pageWrapper.querySelector('#page-blocks-container');
    const taskTableWrapper = pageWrapper.querySelector('.task-table-wrapper');
    const cardsSection = pageWrapper.querySelector('.cards-section');
    const cardsGrid = pageWrapper.querySelector('#cards-grid');
    const tbody = pageWrapper.querySelector('tbody');
    
    if (pageBlocksContainer) {
      pageBlocksContainer.innerHTML = '';
    }
    
    if (tbody) {
      tbody.innerHTML = '';
    }
    if (cardsGrid) {
      cardsGrid.innerHTML = '';
    }
    
    // Render tasks
    if (Array.isArray(tasks) && tasks.length > 0) {
      console.log('📋 Rendering', tasks.length, 'tasks for', page.name);
      tasks.forEach(task => {
        if (tbody) {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              <span class="clickable-task-title" data-task-id="${task.id}" style="cursor: pointer; color: #3b82f6; text-decoration: underline;">${task.title || 'Untitled'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${task.description || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${task.status || 'pending'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${task.priority || 'medium'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${task.dueDate || ''}</td>
          `;
          tbody.appendChild(row);
        }
      });
      
      // Show task table
      if (taskTableWrapper) {
        taskTableWrapper.classList.remove('hidden');
        taskTableWrapper.style.background = 'white';
        taskTableWrapper.style.border = '1px solid #e5e7eb';
        taskTableWrapper.style.borderRadius = '8px';
        taskTableWrapper.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        taskTableWrapper.style.marginBottom = '16px';
      }
      // Attach click handlers for task titles (open workspace)
      pageWrapper.querySelectorAll('.clickable-task-title').forEach(titleElement => {
        titleElement.addEventListener('click', async (e) => {
          e.preventDefault();
          const taskId = parseInt(titleElement.getAttribute('data-task-id'));
          try {
            const workspace = await window.__TAURI__.core.invoke('fetch_workspaces_for_task', { taskId });
            if (window.openWorkspaceTab) {
              window.openWorkspaceTab(workspace);
              setTimeout(() => {
                if (window.highlightWorkspaceById) {
                  window.highlightWorkspaceById(workspace.id);
                }
              }, 100);
            }
          } catch (err) {
            console.error('Failed to open workspace for task:', taskId, err);
          }
        });
      });
    } else {
      taskTableWrapper?.classList.add('hidden');
    }
    
    // Render notes and images
    if (pageBlocksContainer) {
      notes.forEach(note => {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'page-block';
        noteDiv.innerHTML = `
          <div class="note content-editable" contenteditable="true">${note.content || ''}</div>
        `;
        pageBlocksContainer.appendChild(noteDiv);
      });
      
      images.forEach(image => {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'page-block';
        imageDiv.innerHTML = `
          <img src="${image.url}" alt="Page image" style="max-width: 100%; height: auto;">
        `;
        pageBlocksContainer.appendChild(imageDiv);
      });
    }

    // Render cards for this page
    if (cardsSection && cardsGrid) {
      if (Array.isArray(cards) && cards.length > 0) {
        cardsSection.classList.remove('hidden');
        cards.forEach(card => {
          const el = document.createElement('div');
          el.classList.add('task-card', `color-${card.id % 6}`);
          el.setAttribute('data-card-id', card.id);

          const x = card.x || 0;
          const y = card.y || 0;
          el.id = `card-${card.id}`;
          el.style.position = 'absolute';
          el.style.transform = `translate(${x}px, ${y}px)`;
          el.setAttribute('data-x', x);
          el.setAttribute('data-y', y);
          el.innerHTML = `
            <div class="task-card-title clickable-card-title" data-card-id="${card.id}" style="cursor: pointer; color: #3b82f6; text-decoration: underline;">${card.name}</div>
            <div class="task-card-field"><strong>Status:</strong> ${card.status || '–'}</div>
            <div class="task-card-field"><strong>Description:</strong> ${card.description || '–'}</div>
            <div class="task-card-field"><strong>Created:</strong> ${formatDate(card.createdDateTime)}</div>
          `;
          cardsGrid.appendChild(el);
        });
        // Attach click handlers for card titles
        pageWrapper.querySelectorAll('.clickable-card-title').forEach(titleElement => {
          titleElement.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const cardId = parseInt(titleElement.getAttribute('data-card-id'));
            try {
              const workspace = await window.__TAURI__.core.invoke('fetch_workspaces_for_card', { cardId });
              if (window.openWorkspaceTab) {
                window.openWorkspaceTab(workspace);
                setTimeout(() => {
                  if (window.highlightWorkspaceById) {
                    window.highlightWorkspaceById(workspace.id);
                  }
                }, 100);
              }
            } catch (err) {
              console.error('Failed to open workspace for card:', cardId, err);
            }
          });
        });
      } else {
        cardsSection.classList.add('hidden');
      }
    }

    // Fetch and draw card connections for this page
    try {
      const connections = await window.__TAURI__.core.invoke('fetch_card_connections_for_page', { pageId: page.id });
      if (connections && connections.length > 0) {
        if (!window.currentLines) window.currentLines = [];
        if (!window.workspaceLines) window.workspaceLines = {};
        if (!window.workspaceLines[page.workspaceId]) window.workspaceLines[page.workspaceId] = [];

        try {
          window.workspaceLines[page.workspaceId].forEach(line => line.remove());
          window.workspaceLines[page.workspaceId] = [];
        } catch (e) {}

        connections.forEach(conn => {
          const fromEl = document.getElementById(`card-${conn.fromCardId}`);
          const toEl = document.getElementById(`card-${conn.toCardId}`);
          if (fromEl && toEl) {
            try {
              const line = new LeaderLine(fromEl, toEl, { color: '#98A2B3', size: 2, endPlug: 'arrow3', startPlug: 'disc', path: 'fluid' });
              window.currentLines.push(line);
              window.workspaceLines[page.workspaceId].push(line);
              line.position();
            } catch (_) {}
          }
        });
      }
    } catch (_) {}
    
    console.log('✅ Manual reload complete for:', page.name);
  }

  function renderPageContent(page) {
    const mainContent = container.querySelector("#workspace-main-content");
    if (!mainContent) return;
  
  fetch('pages/page.html')
  .then(res => res.text())
  .then(html => {
    mainContent.innerHTML = html;
    return import('./page.js');
  })
  .then(({ init }) => {
    console.log('🚀 Initializing NEW page with complete functionality:', page.name);
    const pageWrapper = mainContent.querySelector('.page-content-wrapper');
    if (!pageWrapper) {
      console.error('❌ Page wrapper not found for page:', page.name);
      return;
    }
    
    // Initialize page with all our enhanced functionality
    init(page, pageWrapper);
    console.log('✅ Page initialization complete for:', page.name);
    
    // Set up task event listeners independently (alternate solution)
    console.log('🔧 Setting up task listeners independently for:', page.name);
    setupTaskListenersIndependently(page, pageWrapper);
    
    // Add window resize listener for line positioning
    window.addEventListener('resize', () => {
      if (window.currentLines && Array.isArray(window.currentLines)) {
        window.currentLines.forEach(line => {
          try {
            if (line && line.position) {
              line.position();
            }
          } catch (e) {
            console.warn('Failed to refresh line position on resize:', e);
          }
        });
      }
    });
    
    // Update Page Tags and External Links for workspace after page initialization
    setTimeout(async () => {
      try {
        const notes = await window.__TAURI__.core.invoke("fetch_textbox_for_page", { pageId: page.id });
        console.log('📝 Loading notes for page tags and external links update:', notes?.length || 0, 'notes');
        if (notes && notes.length > 0) {
          if (window.updatePageTags) {
            window.updatePageTags(notes);
            console.log('✅ Page tags updated for workspace');
          }
          if (window.updateExternalLinks) {
            window.updateExternalLinks(notes);
            console.log('✅ External links updated for workspace');
          }
        } else {
          // Clear page tags and external links if no notes
          if (window.updatePageTags) {
            window.updatePageTags([]);
            console.log('🧹 Page tags cleared (no notes)');
          }
          if (window.updateExternalLinks) {
            window.updateExternalLinks([]);
            console.log('🧹 External links cleared (no notes)');
          }
        }
        
        // Load and render card connection lines
        try {
          const connections = await window.__TAURI__.core.invoke("fetch_card_connections_for_page", { pageId: page.id });
          console.log('🔗 Workspace.js loading card connections for page:', page.id, 'found:', connections.length);
          if (connections && connections.length > 0) {
            console.log('🔗 Processing', connections.length, 'card connections in workspace.js');
            
            // Clear existing lines
            if (window.currentLines && Array.isArray(window.currentLines)) {
              window.currentLines.forEach(line => {
                try {
                  if (line && line.remove) line.remove();
                } catch (e) {
                  console.warn('Failed to remove existing line:', e);
                }
              });
            }
            window.currentLines = [];
            
            // Initialize workspace lines if needed
            if (!window.workspaceLines) {
              window.workspaceLines = {};
            }
            if (!window.workspaceLines[page.workspaceId]) {
              window.workspaceLines[page.workspaceId] = [];
            }
            
            // Create new lines
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
                  console.log('✅ Line created between cards:', conn.fromCardId, '->', conn.toCardId);
                } catch (e) {
                  console.error('Failed to create line between cards:', e);
                }
              } else {
                console.warn('Card elements not found:', { fromCard: `card-${conn.fromCardId}`, toCard: `card-${conn.toCardId}` });
              }
            });
            
            console.log('🎉 Card connection lines loaded successfully in workspace.js for page:', page.id);
          } else {
            console.log('ℹ️ No card connections found for page:', page.id, 'in workspace.js');
          }
        } catch (error) {
          console.log("Could not fetch card connections in workspace.js for page:", page.id, "error:", error);
        }
      } catch (error) {
        console.log("Could not fetch notes for sidebar updates:", error);
      }
    }, 800); // Increased delay to ensure cards are fully positioned before drawing lines
  });
  }
  // Optimized localStorage sidebar toggle
  function initSidebarToggle() {
    const toggleButton = document.querySelector('.expand-header-button');
    const sidebar = document.querySelector('.file-navigation'); // Make sure this element exists
    const buttonIcon = toggleButton?.querySelector('img');
    
    if (!toggleButton || !buttonIcon) {
        console.warn('Toggle button or icon not found');
        return;
    }

    // If .file-navigation doesn't exist, you might want to target a different element
    // For example, if you want to toggle the entire sidebar/navigation area:
    const targetElement = sidebar || document.querySelector('.sidebar') || document.querySelector('nav') || document.querySelector('.navigation');
    
    if (!targetElement) {
        console.warn('No target element found for sidebar toggle');
        return;
    }
    
    const updateUI = (isHidden) => {
        targetElement.classList.toggle('hidden', isHidden);
        buttonIcon.src = `assets/images/${isHidden ? 'collapse' : 'expand'}.svg`;
        localStorage.setItem('sidebar-collapsed', isHidden);
        
        // Optional: Add smooth transition
        targetElement.style.transition = 'transform 0.3s ease';
        if (isHidden) {
            targetElement.style.transform = 'translateX(-100%)';
        } else {
            targetElement.style.transform = 'translateX(0)';
        }
    };
    
    // Initialize from storage
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    updateUI(isCollapsed);
    
    // Add click handler
    toggleButton.addEventListener('click', () => {
        const currentlyHidden = targetElement.classList.contains('hidden');
        updateUI(!currentlyHidden);
    });
}

  // Show page loading overlay with custom message
  function showPageLoadingOverlay(message = 'Loading...') {
    const loadingOverlay = document.getElementById('page-loading-overlay');
    const loadingText = document.querySelector('#page-loading-overlay .loading-text');
    
    if (loadingOverlay) {
      if (loadingText) {
        loadingText.textContent = message;
      }
      loadingOverlay.classList.remove('hidden');
      console.log('📄 Page loading:', message);
    }
  }

  // Hide page loading overlay
  function hidePageLoadingOverlay() {
    const loadingOverlay = document.getElementById('page-loading-overlay');
    
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
      console.log('✅ Page loading completed');
    }
  }

  // Show page error message
  function showPageErrorMessage(message) {
    const messageEl = document.getElementById('page-error-message');
    if (!messageEl) return;
    
    messageEl.textContent = message;
    messageEl.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageEl.classList.add('hidden');
    }, 5000);
  }

  
}

window.logout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
};