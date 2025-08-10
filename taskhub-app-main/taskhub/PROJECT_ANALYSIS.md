# TaskHub Tauri Project Analysis & Documentation

## 📋 Project Overview

**TaskHub** is a comprehensive desktop task management application built with **Tauri 2.0** that provides project management, file organization, and Microsoft Office 365 integration capabilities.

- **Version**: 0.1.0
- **Architecture**: Tauri 2.0 (Rust + Vanilla JS)
- **Database**: SQLite (local storage)
- **Integration**: Microsoft O365 Graph API
- **License**: Copyright by RJ Autonomous L.L.C.

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework**: Vanilla HTML/CSS/JavaScript (No framework)
- **Module System**: ES6 Modules
- **Styling**: Custom CSS with Grid/Flexbox
- **External Libraries**:
  - FullCalendar 6.1.8 (Calendar functionality)
  - Quill.js 1.3.6 (Rich text editing)
  - Interact.js (Drag and drop)
  - LeaderLine 1.0.7 (Visual connections)
  - Dagre 0.8.5 (Graph layout)

### Backend Stack
- **Language**: Rust
- **Tauri Version**: 2.0.0
- **Database**: SQLite with rusqlite 0.31.0
- **HTTP Client**: reqwest 0.12
- **Serialization**: serde + serde_json
- **File Operations**: std::fs
- **Base64**: base64 0.22

### Key Dependencies
```toml
# Rust Dependencies
tauri = "2.0.0"
tauri-plugin-shell = "2.0.0"
tauri-plugin-dialog = "2.0.0"
rusqlite = "0.31.0"
libsqlite3-sys = "0.28.0"
reqwest = "0.12"
base64 = "0.22"
dirs = "6.0.0"
serde = "1"
serde_json = "1"
tokio = "1.0"
regex = "1"
anyhow = "1.0"
urlencoding = "1.3"
lazy_static = "1.4"

# Build Dependencies
tauri-build = "2.1.0"
```

## 📁 Project Structure

```
taskhub/
├── src/                           # Frontend source
│   ├── pages/                     # HTML page templates
│   │   ├── dashboard.html         # Main workspace (210 lines)
│   │   ├── myvaults.html          # Vault management (207 lines)
│   │   ├── calendar.html          # Calendar view (137 lines)
│   │   ├── settings.html          # Settings page (1189 lines)
│   │   ├── subscription.html      # Subscription (119 lines)
│   │   ├── workspace.html         # Workspace (8 lines)
│   │   └── page.html              # Page template (230 lines)
│   ├── js/                        # JavaScript modules
│   │   ├── app.js                 # Main app logic (107 lines)
│   │   ├── dashboard.js           # Dashboard functionality (1692 lines)
│   │   ├── page.js                # Page management (1726 lines)
│   │   ├── myvaults.js            # Vault operations (486 lines)
│   │   ├── calendar.js            # Calendar logic (309 lines)
│   │   ├── settings.js            # Settings management (301 lines)
│   │   ├── workspace.js           # Workspace logic (347 lines)
│   │   ├── subscription.js        # Subscription (9 lines)
│   │   └── mainwindow.js          # Window management (27 lines)
│   ├── css/                       # Stylesheets
│   │   ├── main.css               # Main styles
│   │   ├── sidebar.css            # Sidebar styling
│   │   ├── content.css            # Content area
│   │   ├── dashboard.css          # Dashboard specific
│   │   ├── myvaults.css           # Vault styling
│   │   ├── settings.css           # Settings styling
│   │   ├── subscription.css       # Subscription styling
│   │   ├── calendar.css           # Calendar styling
│   │   ├── tabs.css               # Tab styling
│   │   ├── filter-dropdown.css    # Filter components
│   │   ├── workspace.css          # Workspace styling
│   │   └── page.css               # Page styling
│   ├── assets/                    # Static assets
│   │   ├── images/                # Icons and images
│   │   ├── logo.png               # Application logo
│   │   └── [various icons]        # UI icons
│   ├── index.html                 # Login page (73 lines)
│   ├── newIndex.html              # Main dashboard (70 lines)
│   ├── signup.html                # Registration page (71 lines)
│   ├── forgotpassword.html        # Password recovery (43 lines)
│   ├── main.js                    # Entry point (37 lines)
│   ├── signup.js                  # Registration logic (65 lines)
│   ├── styles.css                 # Global styles (234 lines)
│   └── style_signup.css           # Signup styles (51 lines)
├── src-tauri/                     # Rust backend
│   ├── src/
│   │   ├── lib.rs                 # Main API implementation (3978 lines)
│   │   └── main.rs                # Entry point (8 lines)
│   ├── Cargo.toml                 # Rust dependencies
│   ├── tauri.conf.json            # Tauri configuration
│   └── icons/                     # Application icons
├── package.json                   # Node.js dependencies
└── taskhub.db                     # SQLite database
```

## 🎯 Core Features & Functionality

### 1. Authentication & User Management
- **Login/Signup**: Username/password authentication
- **O365 Integration**: Microsoft account authentication
- **User Profiles**: Profile management and updates
- **Company Organization**: Multi-tenant user organization
- **Session Management**: Stay logged in functionality

### 2. Hierarchical Data Structure
```
Company
└── Users
    └── Vaults (Top-level organization)
        └── Folders (File organization)
            └── Workspaces (Project spaces)
                └── Pages (Content containers)
                    ├── Tasks (Individual task items)
                    ├── Cards (Kanban-style items)
                    ├── Text Boxes (Rich text notes)
                    ├── Images (Visual content)
                    ├── URLs (External links)
                    └── Files (Attachments)
```

### 3. Task Management System
- **Task Creation**: Title, description, due date, priority, status
- **Task Assignment**: Assign to specific users
- **Task Categories**: Industry classification
- **Task Status**: Multiple status tracking
- **Task Priority**: Priority levels
- **Task Relationships**: Parent-child task relationships
- **Task Favorites**: Pin and favorite functionality

### 4. File Management
- **Local Storage**: SQLite database for file metadata
- **O365 Integration**: OneDrive file storage and sync
- **File Upload**: Base64 encoded file uploads
- **File Organization**: Folder-based organization
- **File Sharing**: Multi-user file access
- **File Operations**: Upload, download, delete

### 5. Visual Elements & UI Components
- **Cards**: Drag-and-drop Kanban cards with positioning (x, y coordinates)
- **Text Boxes**: Rich text editing with Quill.js
- **Images**: Image upload and display with base64 encoding
- **URLs**: External link management
- **Connections**: Visual links between cards using LeaderLine
- **Tabs**: Multi-tab workspace interface
- **Filters**: Advanced filtering and sorting

### 6. Calendar Integration
- **O365 Calendar**: Microsoft Graph API integration
- **Event Creation**: Create calendar events
- **Event Management**: Edit and delete events
- **FullCalendar Integration**: Rich calendar interface
- **User Events**: Multi-user event management

### 7. Collaboration Features
- **Vault Permissions**: User-level access control
- **User Sharing**: Share vaults with specific users
- **Permission Types**: Different access levels
- **Multi-user Workspaces**: Collaborative project spaces

## 🔧 API Implementation (Rust Backend)

### Core API Functions (50+ functions)

#### Authentication & User Management
- `sign_in(username, password)` - User authentication
- `register_user(username, password, firstname, lastname, company_name)` - User registration
- `sign_out()` - User logout
- `get_user_profile()` - Fetch user profile
- `update_user_profile(username, email)` - Update profile
- `update_user_password(current_password, new_password)` - Password change

#### Vault Management
- `create_vault(name, created_by, created_by_name)` - Create new vault
- `rename_vault(vault_id, new_name)` - Rename vault
- `fetch_vaults()` - Get all vaults
- `delete_vault(vault_id)` - Delete vault
- `get_vault_permissions(vault_id)` - Get vault permissions
- `update_vault_user(user_id, vault_id, permission_type)` - Update permissions

#### Folder Management
- `create_folder_for_vault(name, created_by, created_by_user, parent_id, vault_id)` - Create folder
- `fetch_folders()` - Get all folders
- `delete_folder(folder_id)` - Delete folder

#### Workspace Management
- `create_workspace_for_folder(name, created_by, created_by_user, folder_id)` - Create workspace
- `create_workspace_for_task(name, task_id, folder_id)` - Create workspace from task
- `create_workspace_for_card(name, card_id, folder_id)` - Create workspace from card
- `fetch_workspaces()` - Get all workspaces
- `delete_workspace(workspace_id)` - Delete workspace

#### Page Management
- `create_page_for_workspace(name, workspace_id)` - Create page
- `fetch_pages_for_workspace(workspace_id)` - Get workspace pages
- `delete_page(page_id)` - Delete page
- `rename_page(page_id, new_name)` - Rename page

#### Task Management
- `create_task_for_page(title, description, due_date, status, priority, assigned_to, page_id, industry)` - Create task
- `update_task(task_id, title, description, due_date, status, priority, assigned_to, assigned_to_name, industry, created_by, created_by_name, created_date_time, parent_id, page_id, page_name, last_modify_date_time)` - Update task
- `fetch_tasks_for_page(page_id)` - Get page tasks
- `delete_task(task_id)` - Delete task
- `get_task_by_id(task_id)` - Get specific task
- `get_pinned_tasks_for_user(user_id)` - Get pinned tasks
- `get_favorite_tasks_for_user(user_id)` - Get favorite tasks
- `get_assigned_tasks_for_user(user_id)` - Get assigned tasks
- `get_due_today_tasks_for_user(user_id)` - Get due today tasks
- `favorite_task(task_id)` - Toggle favorite
- `pin_task(task_id)` - Toggle pin

#### Card Management
- `create_card_for_page(name, description, due_date, status, priority, assigned_to, page_id, category)` - Create card
- `update_card(card_id, name, description, status, priority, category, due_date, assigned_to, assigned_to_name)` - Update card
- `fetch_cards_for_page(page_id)` - Get page cards
- `delete_card(card_id)` - Delete card
- `update_card_position(card_id, x, y)` - Update card position
- `create_card_connection(from_card_id, to_card_id)` - Create card connection
- `fetch_card_connections_for_page(page_id)` - Get card connections

#### File Management
- `create_file_for_folder(name, path, folder_id, created_by, created_by_user, file_contents_base64)` - Create file
- `fetch_files()` - Get all files
- `delete_file(file_id)` - Delete file
- `open_local_folder(file_id, file_name)` - Open file
- `open_single_file_picker(window)` - File picker
- `read_file_as_base64(path)` - Read file as base64

#### O365 Integration
- `add_o365_user(o365_user)` - Add O365 user
- `add_o365_company_info(application_id, tenant_id, client_secret, current_company_id)` - Add O365 company info
- `upload_file_to_o365_folder(folder_id, file_path)` - Upload to O365
- `open_o365_file(folder_id, file_name, app_handle)` - Open O365 file
- `get_access_token(current_company_id)` - Get O365 access token
- `fetch_company_data(current_company_id)` - Get O365 company data
- `fetch_o365_user_data(current_user_id)` - Get O365 user data

#### Calendar & Events
- `create_event(title, location, from, to, user_emails, created_by)` - Create calendar event
- `get_all_events_for_current_user()` - Get user events
- `create_graph_api_event(event_data)` - Create O365 event

#### Text Box Management
- `create_textbox_for_page(text, page_id)` - Create text box
- `fetch_textbox_for_page(page_id)` - Get page text boxes
- `delete_textbox(textbox_id)` - Delete text box
- `update_textbox_text(note_id, new_text, page_id)` - Update text box
- `update_note_order(note_id, order_index)` - Update text box order

#### Image Management
- `create_image_for_page(name, page_id, file_contents_base64)` - Create image
- `fetch_images_for_page(page_id)` - Get page images
- `update_image_order(image_id, order_index)` - Update image order

#### URL Management
- `create_url_for_folder(name, url_value, folder_id)` - Create URL
- `fetch_weburls()` - Get all URLs
- `fetch_weburls_for_folder(folder_id)` - Get folder URLs
- `delete_url(url_id)` - Delete URL

#### Order Management
- `update_tasklist_order_for_page(page_id, order_index)` - Update task order

#### Database Operations
- `open_database()` - Open SQLite connection
- `close_database(conn)` - Close database connection
- `insert_or_update_task_in_local_db(json_data)` - Sync task to local DB
- `insert_or_update_file_in_local_db(json_data)` - Sync file to local DB

## 🎨 Frontend Architecture

### Navigation Structure
1. **Login Page** (`index.html`) - Authentication entry point
2. **Main Dashboard** (`newIndex.html`) - Application shell with sidebar navigation

### Sidebar Navigation
- **Dashboard** - Main workspace view
- **Vaults** - Vault management (My Vaults)
- **Speedometer** - Performance metrics (placeholder)
- **Calendar** - Calendar integration
- **Settings** - User and application settings
- **Logout** - Session termination

### Dynamic Page Loading
The application uses a **SPA-like architecture** with dynamic page loading:
- Pages are loaded via `fetch()` requests
- JavaScript modules are dynamically imported
- Content is injected into `#main-content` container
- Active menu items are managed via CSS classes

### Key JavaScript Modules

#### `app.js` - Main Application Logic
- Page loading functions (`loadDashboard`, `loadVaults`, etc.)
- Menu state management
- Logout functionality
- Dynamic module imports

#### `dashboard.js` - Dashboard Functionality (1692 lines)
- File tree management
- Tab system
- Workspace operations
- Task/card management
- Drag and drop functionality

#### `page.js` - Page Management (1726 lines)
- Page content management
- Task creation and editing
- Card operations
- Visual element handling

#### `myvaults.js` - Vault Operations (486 lines)
- Vault creation and management
- User permissions
- Folder operations

#### `calendar.js` - Calendar Logic (309 lines)
- FullCalendar integration
- Event management
- O365 calendar sync

#### `settings.js` - Settings Management (301 lines)
- User profile management
- Application settings
- O365 integration settings

## 🗄️ Database Schema

### Core Tables (Inferred from Rust structs)
- **users** - User authentication and profiles
- **companies** - Multi-tenant organization
- **vaults** - Top-level data organization
- **folders** - File and workspace organization
- **workspaces** - Project spaces
- **pages** - Content containers
- **tasks** - Individual task items
- **cards** - Kanban-style items
- **files** - File metadata and storage
- **images** - Image content
- **textboxes** - Rich text notes
- **urls** - External links
- **events** - Calendar events
- **user_events** - Event-user relationships
- **card_connections** - Visual card links
- **vault_permissions** - User access control

## 🔌 Integration Points

### Microsoft O365 Integration
- **Authentication**: OAuth 2.0 flow
- **OneDrive**: File storage and synchronization
- **Graph API**: Calendar, user data, and file operations
- **Teams**: Potential collaboration features

### External APIs
- **HTTP Client**: reqwest for server communication
- **JSON Processing**: serde_json for data serialization
- **File Operations**: std::fs for local file management

## 🚀 Development Status

### Strengths
- **Comprehensive Feature Set**: Full task management solution
- **Strong O365 Integration**: Deep Microsoft ecosystem integration
- **Modular Architecture**: Well-organized frontend modules
- **Cross-Platform**: Tauri enables desktop deployment
- **Rich UI**: Advanced visual elements and interactions

### Areas for Improvement
- **Code Organization**: Large monolithic `lib.rs` file (3978 lines)
- **Type Safety**: Currently vanilla JS, could benefit from TypeScript
- **Error Handling**: Could be more robust and user-friendly
- **Testing**: No visible test coverage
- **Documentation**: Limited inline documentation
- **Performance**: Large JavaScript files could be optimized

### Technical Debt
- **Rust Code**: Single large file needs refactoring into modules
- **JavaScript**: Could benefit from TypeScript migration
- **CSS**: Multiple stylesheets could be consolidated
- **Dependencies**: Some external libraries could be updated

## 🎯 Future Development Recommendations

### Immediate Improvements
1. **Add TypeScript** for better type safety and developer experience
2. **Implement Playwright tests** for end-to-end testing
3. **Refactor Rust code** into smaller, focused modules
4. **Add comprehensive error handling** and user feedback
5. **Improve code documentation** with inline comments

### Feature Enhancements
1. **Real-time collaboration** with WebSocket integration
2. **Advanced search and filtering** capabilities
3. **Mobile responsive design** for better accessibility
4. **Offline mode** with better sync capabilities
5. **Advanced reporting** and analytics

### Technical Upgrades
1. **Modernize frontend** with a framework (React/Vue/Svelte)
2. **Implement state management** for better data flow
3. **Add unit tests** for both frontend and backend
4. **Optimize bundle size** and loading performance
5. **Implement proper logging** and monitoring

## 📝 Development Notes

### Current Working Directory
- **Shell**: `D:\Python\taskhub\taskhub-app-main\taskhub`
- **Tauri Dev Server**: Running in background
- **Database**: SQLite file at project root

### Key Configuration Files
- `tauri.conf.json` - Tauri application configuration
- `Cargo.toml` - Rust dependencies and build configuration
- `package.json` - Node.js dependencies and scripts

### Build Commands
- `npm run tauri dev` - Development server
- `cargo build` - Rust compilation
- `cargo clean` - Clean build artifacts

---

**Last Updated**: [Current Date]
**Analysis Version**: 1.0
**Next Review**: After major modifications 