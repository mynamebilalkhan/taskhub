/**
 * Workspace Scope Management System
 * Provides utilities for creating workspace-scoped IDs and managing elements
 * to prevent conflicts when multiple workspaces are open in tabs.
 */

class WorkspaceScope {
    constructor() {
        this.currentWorkspaceId = null;
        this.currentPageId = null;
        this.scopedElements = new Map(); // Track scoped elements for cleanup
        this.eventListeners = new Map(); // Track event listeners for cleanup
    }

    /**
     * Set the current workspace and page context
     */
    setContext(workspaceId, pageId = null) {
        this.currentWorkspaceId = workspaceId;
        this.currentPageId = pageId;
    }

    /**
     * Generate a workspace-scoped ID
     */
    getScopedId(baseId) {
        if (!this.currentWorkspaceId) {
            console.warn('No workspace context set, using base ID:', baseId);
            return baseId;
        }
        
        const prefix = this.currentPageId 
            ? `ws-${this.currentWorkspaceId}-pg-${this.currentPageId}`
            : `ws-${this.currentWorkspaceId}`;
        
        return `${prefix}-${baseId}`;
    }

    /**
     * Get element by scoped ID within current workspace context
     */
    getElementById(baseId) {
        const scopedId = this.getScopedId(baseId);
        return document.getElementById(scopedId);
    }

    /**
     * Create element with scoped ID
     */
    createElement(tagName, baseId, className = null) {
        const element = document.createElement(tagName);
        if (baseId) {
            const scopedId = this.getScopedId(baseId);
            element.id = scopedId;
            
            // Track the element for cleanup
            if (!this.scopedElements.has(this.currentWorkspaceId)) {
                this.scopedElements.set(this.currentWorkspaceId, new Set());
            }
            this.scopedElements.get(this.currentWorkspaceId).add(scopedId);
        }
        if (className) {
            element.className = className;
        }
        return element;
    }

    /**
     * Add event listener with workspace scope tracking
     */
    addEventListener(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
        
        // Track for cleanup
        const workspaceId = this.currentWorkspaceId;
        if (!this.eventListeners.has(workspaceId)) {
            this.eventListeners.set(workspaceId, []);
        }
        this.eventListeners.get(workspaceId).push({
            element,
            event,
            handler,
            options
        });
    }

    /**
     * Query selector within workspace scope
     */
    querySelector(selector) {
        const workspaceContainer = document.getElementById(`tab-${this.currentWorkspaceId}`);
        return workspaceContainer ? workspaceContainer.querySelector(selector) : null;
    }

    /**
     * Query all selectors within workspace scope
     */
    querySelectorAll(selector) {
        const workspaceContainer = document.getElementById(`tab-${this.currentWorkspaceId}`);
        return workspaceContainer ? workspaceContainer.querySelectorAll(selector) : [];
    }

    /**
     * Replace static IDs in HTML content with scoped IDs
     */
    scopeHtmlContent(htmlContent) {
        if (!this.currentWorkspaceId) {
            return htmlContent;
        }

        // List of IDs that need to be scoped
        const idsToScope = [
            'cards-grid', 'task-table-wrapper', 'page-message', 'add-task-btn',
            'task-context-menu', 'page-loading-overlay', 'add-task-modal',
            'task-title', 'task-description', 'task-due-date', 'task-status',
            'task-priority', 'task-assigned-id', 'task-industry', 'save-task-btn',
            'cancel-task-btn', 'column-selector-modal', 'column-checkboxes',
            'cancel-columns-btn', 'apply-columns-btn', 'update-task-modal',
            'update-task-id', 'update-task-title', 'update-task-description',
            'update-task-due-date', 'update-task-status', 'update-task-priority',
            'update-task-assigned-id', 'update-task-industry', 'update-task-save-btn',
            'update-task-cancel-btn', 'add-card-modal', 'card-title', 'card-description',
            'card-status', 'card-priority', 'card-category', 'card-assigned-to',
            'card-due-date', 'save-card-btn', 'cancel-card-btn', 'update-card-modal',
            'update-card-id', 'update-card-title', 'update-card-description',
            'update-card-status', 'update-card-priority', 'update-card-category',
            'update-card-assigned-to', 'update-card-due-date', 'update-card-save-btn',
            'update-card-cancel-btn', 'card-context-menu', 'linkto', 'card-workspace',
            'update-card', 'delete-card', 'custom-modal-task-workspace',
            'modal-title-task-workspace', 'modal-label-task-workspace',
            'modal-input-task-workspace', 'modal-textarea-task-workspace',
            'modal-cancel-btn-task-workspace', 'modal-ok-btn-task-workspace',
            'custom-modal-card-workspace', 'modal-title-card-workspace',
            'modal-label-card-workspace', 'modal-input-card-workspace',
            'modal-textarea-card-workspace', 'modal-cancel-btn-card-workspace',
            'modal-ok-btn-card-workspace', 'delete-note-confirmation-modal',
            'delete-note-confirmation-close-btn', 'delete-note-confirmation-cancel-btn',
            'delete-note-confirmation-delete-btn', 'delete-image-confirmation-modal',
            'delete-image-confirmation-close-btn', 'delete-image-confirmation-cancel-btn',
            'delete-image-confirmation-delete-btn', 'save-file-modal',
            'save-file-close-btn', 'save-file-name', 'choose-location',
            'save-file-cancel-btn', 'workspace-fab', 'workspace-fab-menu',
            'page-blocks-container', 'add-card-fab', 'workspace-tabs',
            'page-tabs-left', 'page-tabs-right', 'add-page-tab', 'open-workspace-fab-menu',
            'page-loading-overlay', 'page-error-message', 'page-tab-context-menu',
            'delete-page-btn', 'duplicate-page-btn', 'rename-page-btn'
        ];

        let scopedContent = htmlContent;
        
        idsToScope.forEach(baseId => {
            const scopedId = this.getScopedId(baseId);
            // Replace id="baseId" with id="scopedId"
            scopedContent = scopedContent.replace(
                new RegExp(`id="${baseId}"`, 'g'),
                `id="${scopedId}"`
            );
            // Replace for="baseId" with for="scopedId" (for labels)
            scopedContent = scopedContent.replace(
                new RegExp(`for="${baseId}"`, 'g'),
                `for="${scopedId}"`
            );
        });

        return scopedContent;
    }

    /**
     * Clean up workspace-specific elements and event listeners
     */
    cleanupWorkspace(workspaceId) {
        // Remove tracked elements
        if (this.scopedElements.has(workspaceId)) {
            this.scopedElements.get(workspaceId).forEach(elementId => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.remove();
                }
            });
            this.scopedElements.delete(workspaceId);
        }

        // Remove event listeners
        if (this.eventListeners.has(workspaceId)) {
            this.eventListeners.get(workspaceId).forEach(({ element, event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
            this.eventListeners.delete(workspaceId);
        }
    }

    /**
     * Get the current workspace container element
     */
    getWorkspaceContainer() {
        return document.getElementById(`tab-${this.currentWorkspaceId}`);
    }

    /**
     * Check if we're in a valid workspace context
     */
    hasValidContext() {
        return this.currentWorkspaceId !== null;
    }
}

// Global instance
window.workspaceScope = new WorkspaceScope();

// Export for ES6 module usage
export { WorkspaceScope };

// Export for CommonJS module usage (fallback)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkspaceScope;
}