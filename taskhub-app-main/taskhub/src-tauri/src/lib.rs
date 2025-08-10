//
// Copyright by RJ Autonomous L.L.C.
//
// lib.rs - Implement API Driver
//

//
// Ported methods
//
// Online mode:
//  1. sign_in
//  2. is_app_available -- Checks if we can get the server side of the app
//
// Offline mode:
//  1. open_database
//  2. close_database

// O365 API-related functions:

// 1. add_o365_user
// Function to update the externalUsername field for the current user via the rj
// Usage: Updates the user's external O365 username.

// 2. add_o365_company_info
// Function to update the company information via the API.
// Usage: Updates the company's application ID, tenant ID, and client secret for O365 integration.

// 3. add_o365_file_to_task
// Function to add an O365 file to a task.
// Steps:
//   - Gets the access token.
//   - Extracts the filename from the file path.
//   - Constructs the directory path in OneDrive.
//   - Creates the folder if it doesn't exist.
//   - Creates an upload session.
//   - Uploads the file in chunks.
//   - Associates the file with the task in the local database.

// 4. upload_file_o365
// Function to upload a file to O365 in chunks using an upload URL.
// Usage: Handles chunked file upload to OneDrive via the upload session URL.

// 5. create_graph_api_event
// Function to create a calendar event via the Microsoft Graph API.
// Usage: Schedules events in the user's O365 calendar.

// 6. create_folder
// Function to create a folder in OneDrive for a given path.
// Usage: Ensures the required directory structure exists in OneDrive.

// 7. fetch_o365_user_data
// Function to retrieve the externalUsername for the current user.
// Usage: Fetches the user's O365 username from the API.

// 8. fetch_company_data
// Function to retrieve company data required for authentication.
// Usage: Retrieves application ID, tenant ID, and client secret for O365 authentication.

// 9. get_access_token
// Function to obtain an access token using the client credentials flow.
// Usage: Authenticates with Microsoft Graph API to get an access token.

// 10. fetch_calendar_data
// Function to retrieve calendar events via the Microsoft Graph API.
// Usage: Fetches the user's calendar events from O365.

// Additional Helper Functions:

// - create_upload_session
// Function to create an upload session for a file.
// Usage: Initiates the file upload process to OneDrive.

// - add_file_to_task_helper
// Helper function to associate the uploaded file with the task via the API.
// Usage: Adds file metadata to the task in your application's backend.

// Note:
// - Ensure that you have implemented or have access to the following utility functions:
//   - get_app_url(): Retrieves the base URL for API requests.
//   - get_current_user_id(): Retrieves the current user's ID.
//   - get_current_company_id(): Retrieves the current company's ID.

use reqwest::blocking::Client;
use reqwest::Method;
use serde::{Deserialize, Serialize};
use regex::Regex;
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use std::error::Error;
use urlencoding::encode;
use std::fs;
use std::path::Path;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use base64; // for base64::decode
use dirs;   // for dirs::home_dir()

#[derive(Serialize, Deserialize)]
struct SignInResponse {
    id: Option<i32>,  // Assuming 'id' will hold the user ID if authentication is successful
    message: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct Vault {
    id: i32,
    name: String,
    createdBy: i32,
    createdDateTime: String,
    createdByName: String,
    #[serde(default)]
    numOfUsers:Option<i32>
}

#[derive(Debug, serde::Deserialize)]
struct CreatedVaultResponse {
    id: i32,
}

#[derive(Serialize, Deserialize, Debug)]
struct Folder {
    id: i32,
    name: String,
    createdBy: i32,
    parentId: i32,
    #[serde(default)]
    parentName: Option<String>,
    createdDateTime: String,
    createdByUser: String,
    vaultId: String,
}

#[derive(Debug, serde::Deserialize)]
struct CreateFolderRequest {
    id: i32,
    name: String,
    createdBy: i32,
    parentId: i32,
    parentName: Option<String>,
    createdDateTime: String,
    createdByUser: String,
    vaultId: String, // or i32 if your server expects a number
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct FileRecord {
    id: i32,
    name: String,
    path: String,
    folderId: Option<i32>,
    #[serde(default)]
    iso365File: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
struct WorkspaceRecord {
    id: i32,
    name: String,
    createdBy: i32,
    createdDateTime: String,
    #[serde(default)]
    lastModifyDateTime: Option<String>,
    createdByUser: String,
    #[serde(default)]
    folderId: Option<String>,
    #[serde(default)]
    createdFromTask: Option<bool>,
    #[serde(default)]
    createdFromTaskId: Option<i32>
}

#[derive(Serialize, Deserialize, Debug)]
struct ImageRecord {
    id: i32,
    name: String,
    pageId: i32,
    base64: String,
    #[serde(default)]
    orderIndex: Option<i32>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct NewTask {
    pub id: i32, // obavezno polje

    // String koji može biti null u JSON-u → Option<String>
    #[serde(default)]
    pub title: Option<String>,

    #[serde(default)]
    pub description: Option<String>,

    #[serde(default)]
    pub industry: Option<String>,

    #[serde(default)]
    pub dueDate: Option<String>,

    #[serde(default)]
    pub status: Option<String>,

    #[serde(default)]
    pub priority: Option<String>,

    // Integer koji može biti null → Option<i32>
    #[serde(default)]
    pub assignedTo: Option<i32>,

    #[serde(default)]
    pub assignedToName: Option<String>,

    #[serde(default)]
    pub createdBy: Option<i32>,

    #[serde(default)]
    pub createdByName: Option<String>,

    #[serde(default)]
    pub createdDateTime: Option<String>,

    #[serde(default)]
    pub lastModifyDateTime: Option<String>,

    #[serde(default)]
    pub parentId: Option<i32>,

    #[serde(default)]
    pub pageId: Option<i32>,

    #[serde(default)]
    pub pageName: Option<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct Card {
    pub id: i32, 

    #[serde(default)]
    pub name: Option<String>,

    #[serde(default)]
    pub description: Option<String>,

    #[serde(default)]
    pub category: Option<String>,

    #[serde(default)]
    pub dueDate: Option<String>,

    #[serde(default)]
    pub status: Option<String>,

    #[serde(default)]
    pub priority: Option<String>,

    #[serde(default)]
    pub assignedTo: Option<i32>,

    #[serde(default)]
    pub assignedToName: Option<String>,

    #[serde(default)]
    pub createdBy: Option<i32>,

    #[serde(default)]
    pub createdByName: Option<String>,

    #[serde(default)]
    pub createdDateTime: Option<String>,

    #[serde(default)]
    pub lastModifyDateTime: Option<String>,

    #[serde(default)]
    pub pageId: Option<i32>,

    #[serde(default)]
    pub workspaceId: Option<i32>,

    #[serde(default)]
    pub x: Option<f64>,

    #[serde(default)]
    pub y: Option<f64>

}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct Page {
    pub id: i32,
    pub name: String,
    pub workspaceId: i32,
    pub vaultId: i32,
    pub createdBy: i32,
    pub createdByUser: String,
    pub createdDateTime: String,
    pub lastModifyDateTime: String,

    #[serde(default)]
    pub orderIndex: Option<i32>
}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct WebUrlRecord {
    pub id: i32,
    pub name: String,
    pub url: String,
    pub createdBy: i32,
    pub folderId: i32,
    pub createdDateTime: String,
    pub createdByUser: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct TextBoxRecord {
    pub id: i32,

    #[serde(default)]
    pub text: Option<String>,

    #[serde(default)]
    pub pageId: Option<i32>,

    #[serde(default)]
    pub createdBy: Option<i32>,

    #[serde(default)]
    pub createdDateTime: Option<String>,

    #[serde(default)]
    pub createdByUser: Option<String>,

    #[serde(default)]
    pub lastModifyDateTime: Option<String>,
    #[serde(default)]
    pub orderIndex: Option<i32>
}

#[derive(Serialize, Deserialize, Debug)]
struct CalendarEvent {
    id: i32,
    title: String,
    location: String,
    createdBy: i32,
    createdDateTime: String,
    createdByUser: String,
    dateTimeFrom: String,
    dateTimeTo: String,
    userEmails: String,
    userEvents: Vec<UserEvent>,
    color: Option<String>,
    description: Option<String>,
    allDay: Option<bool>,
    frequency: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct UserEvent {
    userId: i32,
    eventId: i32,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct TaskRef {
    pub id: i32,
    pub taskId: i32,
    pub userId: i32,
    pub user: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct CardConnection {
    id: i32,
    fromCardId: i32,
    toCardId: i32
}

use std::sync::Mutex;
use lazy_static::lazy_static;

// Our global “currently logged-in user” ID
lazy_static! {
    static ref CURRENT_USER_ID: Mutex<Option<i32>> = Mutex::new(None);
}

// Function to get the current user's ID
#[tauri::command]
fn get_current_user_id() -> i32 {
    // Your implementation here
    let guard = CURRENT_USER_ID.lock().unwrap();
    guard.unwrap_or(-1).into()
}

// Helpers.
fn get_app_url() -> String {
    // "https://api.rjautonomous.com/".to_string()
    "http://127.0.0.1:5000/".to_string()
}

// Helper function to strip XML tags
fn strip_xml_tags(text: &str) -> String {
    let re = Regex::new(r"<[^>]*>").unwrap();
    re.replace_all(text, "").to_string()
}

// Helper function to get company ID
fn get_company_id(_base_url: &str, _company_name: &str) -> Result<i32, String> {
    // Placeholder for actual implementation
    // Replace this with the API or database lookup for company ID
    Ok(1) // Assuming 1 as the mock company ID
}

// Mock implementation for setting up company-related configurations
fn set_up_company_for_user(_username: String) {
    // Placeholder for implementation
    println!("Set up company configurations for user");
}

// Helper function to get user ID from the local database when offline
fn get_user_id_from_local_db(username: &str, current_company_id: i32) -> Result<i32, String> {
    // Open the local SQLite database
    let conn = open_database().map_err(|e| e.to_string())?;

    // Prepare the SQL query to retrieve the user ID
    let sql = "SELECT Id FROM users WHERE Username = ?1 AND CompanyId = ?2;";
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    // Execute the query and fetch the user ID
    let user_id_result = stmt.query_row(params![username, current_company_id], |row| {
        row.get(0)
    });

    match user_id_result {
        Ok(user_id) => Ok(user_id),
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            Err(format!("User '{}' not found in local database", username))
        },
        Err(err) => Err(format!("Failed to retrieve user ID: {}", err)),
    }
}

fn read_username_from_local_db(user_id: i32) -> Result<String, String> {
    // Open the local SQLite database
    let conn = open_database().map_err(|e| e.to_string())?;

    // Prepare the SQL query
    let sql = "SELECT Username FROM users WHERE Id = ?1;";
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    // Execute the query and fetch the username
    let result = stmt.query_row(params![user_id], |row| {
        let username: String = row.get(0)?;
        Ok(username)
    });

    match result {
        Ok(username) => Ok(username),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok("Unknown".to_string()),
        Err(err) => {
            eprintln!("Failed to retrieve username: {}", err);
            Ok("Unknown".to_string())
        }
    }
}

fn read_users_from_local_db(company_id: i32) -> Result<Vec<(i32, String)>, String> {
    let mut user_list = Vec::new();

    // Open the local SQLite database
    let conn = Connection::open("taskhub.db").map_err(|e| e.to_string())?;

    // Prepare the SQL query
    let sql = "SELECT Id, Username FROM users WHERE CompanyId = ?1;";
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    // Execute the query and collect the results
    let user_iter = stmt.query_map(params![company_id], |row| {
        let user_id: i32 = row.get(0)?;
        let username: Option<String> = row.get(1)?;
        let username = username.unwrap_or_else(|| "".to_string());
        Ok((user_id, username))
    }).map_err(|e| e.to_string())?;

    for user in user_iter {
        match user {
            Ok(u) => user_list.push(u),
            Err(err) => {
                eprintln!("Failed to parse user: {}", err);
                user_list.push((0, "Failed to fetch users from database.".to_string()));
            }
        }
    }

    Ok(user_list)
}

fn urlencode(input: &str) -> String {
    encode(input).to_owned()
}


#[tauri::command]
fn update_textbox_text(
    noteId: i32,
    newText: String,
    pageId: i32
) -> Result<bool, String> {
    // Build the JSON body
    let updateText = serde_json::json!({
        "id": noteId,
        "pageId": pageId,
        "createdBy" : get_current_user_id(),
        "text" : newText
    });

    // Send PUT /Event/
    let client = reqwest::blocking::Client::new();
    let url = format!("{}TextBox/{}", get_app_url(), noteId);
    let response = client
        .put(&url)
        .header("Content-Type", "application/json")
        .json(&updateText)
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to create event: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn rename_page(
    pageId: i32,
    newName: String
) -> Result<bool, String> {
    // Build the JSON body
    let updatePageName = serde_json::json!({
        "name": newName
    });

    // Send PUT /Event/
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Page/rename/{}", get_app_url(), pageId);
    let response = client
        .put(&url)
        .header("Content-Type", "application/json")
        .json(&updatePageName)
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to create event: HTTP {}", response.status()))
    }
}
#[tauri::command]
fn update_vault_user(
    userId: i32,
    vaultId: i32,
    permissionType: String
) -> Result<bool, String> {

    // If offline, you could store it locally. For simplicity, do only online:
    if !is_app_available() {
        return Err("App is offline. Not supported yet.".to_string());
    }

    // Build the JSON body
    let collaboration = serde_json::json!({
        "userId": userId,
        "vaultId": vaultId,
        "permissionType": permissionType
    });

    // Send POST /Event/
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Collaboration", get_app_url());
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&collaboration)
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to create event: HTTP {}", response.status()))
    }
}
#[derive(Serialize, Deserialize, Debug)]
struct VaultPermission {
    userId: i32,
    userFullName: String,
    permissionType: String,
}

#[tauri::command]
fn get_users_for_vault (vault_id: i32) -> Result<Vec<(i32, String)>, String> {
    //if is_app_available() {
        let client = reqwest::blocking::Client::new();
        let url = format!("{}Collaboration?vaultId={}", get_app_url(), vault_id);
        let response = client.get(&url)
            .header("Content-Type", "application/json")
            .send()
            .map_err(|e| e.to_string())?;

        if response.status().is_success() {
            let json_response: Vec<serde_json::Value> = response.json().map_err(|e| e.to_string())?;
            let mut user_list = Vec::new();
            for collaboration in json_response {
                let user_id = collaboration["userId"].as_i64().unwrap_or(-1) as i32;
                let user_name = collaboration["userFullName"].as_str().unwrap_or("Unknown").to_string();
                user_list.push((user_id, user_name));
            }
            Ok(user_list)
        } else {
            Err(format!("Failed to fetch users for vault: HTTP {}", response.status()))
        }
    //} else {
        // Offline mode: Read from local database
       // get_task_description_from_local_db(task_id)
    //}
}

#[tauri::command]
fn get_vault_permissions(vault_id: i32) -> Result<Vec<VaultPermission>, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Collaboration?vaultId={}", get_app_url(), vault_id);
    let response = client.get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let json_response: Vec<serde_json::Value> = response.json().map_err(|e| e.to_string())?;
        let mut permissions = Vec::new();
        for collaboration in json_response {
            let permission = VaultPermission {
                userId: collaboration["userId"].as_i64().unwrap_or(-1) as i32,
                userFullName: collaboration["userFullName"].as_str().unwrap_or("Unknown").to_string(),
                permissionType: collaboration["permissionType"].as_str().unwrap_or("read").to_string(),
            };
            permissions.push(permission);
        }
        Ok(permissions)
    } else {
        Err(format!("Failed to fetch vault permissions: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn remove_vault_permission(vault_id: i32, user_id: i32) -> Result<bool, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Collaboration?vaultId={}&userId={}", get_app_url(), vault_id, user_id);
    let response = client
        .delete(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to remove permission: HTTP {}", response.status()))
    }
}


#[tauri::command]
fn get_external_username() -> Result<String, String> {
    // fetch_o365_user_data is your existing fn
    fetch_o365_user_data(get_current_user_id())
        .map_err(|e| e.to_string())
}

// O365 API
#[tauri::command]
fn add_o365_user(o365_user: String) -> Result<bool, String> {
    let user_id = get_current_user_id();
    let url = format!("{}User/{}", get_app_url(), user_id);
    let client = reqwest::blocking::Client::new();

    // 1) Fetch existing user
    let mut user: serde_json::Value = client
        .get(&url)
        .send()
        .map_err(|e| e.to_string())?
        .json()
        .map_err(|e| e.to_string())?;

    // 2) Overwrite externalUsername
    user["externalUsername"] = serde_json::Value::String(o365_user);

    // 3) PUT back the full object
    let res = client
        .put(&url)
        .json(&user)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to update user: {}", res.status()))
    }
}

// TODO: This should not be transparent to users.
#[tauri::command]
fn add_o365_company_info(application_id: String, tenant_id: String, client_secret: String, current_company_id: i32) -> Result<bool, Box<dyn std::error::Error>> {
    let url = format!("{}Company/{}", get_app_url(), current_company_id);
    let client = reqwest::blocking::Client::new();

    let company_data = serde_json::json!({
        "name": "YourCompanyName", // Replace with actual company name if needed
        "applicationId": application_id,
        "tenantId": tenant_id,
        "clientSecret": client_secret,
    });

    let res = client
        .put(&url)
        .json(&company_data)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .send()?;

    if res.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to update company info: {}", res.status()).into())
    }
}

// TODO: to port 
fn create_graph_api_event(event_data: String) -> Result<bool, Box<dyn std::error::Error>> {
    let current_user_id = get_current_user_id();

    let access_token = get_access_token(current_user_id)?;
    let external_user_id = fetch_o365_user_data(current_user_id)?;
    let url = format!("https://graph.microsoft.com/v1.0/users/{}/calendar/events", urlencode(&external_user_id));

    let client = reqwest::blocking::Client::new();
    let res = client
        .post(&url)
        .bearer_auth(&access_token)
        .header("Content-Type", "application/json")
        .body(event_data)
        .send()?;

    if res.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to create event: {}", res.status()).into())
    }
}

// TODO: to port
fn create_upload_session(folder_path: &str, filename: &str, access_token: &str) -> Result<String, Box<dyn std::error::Error>> {
    let current_user_id = get_current_user_id();

    let file_path = format!("{}/{}", folder_path, filename);
    let external_user_id = fetch_o365_user_data(current_user_id)?;

    let url = format!(
        "https://graph.microsoft.com/v1.0/users/{}/drive/root:/{}/createUploadSession",
        urlencode(&external_user_id),
        urlencode(&file_path)
    );

    let client = reqwest::blocking::Client::new();
    let body = serde_json::json!({
        "item": {
            "@microsoft.graph.conflictBehavior": "replace",
            "name": filename
        }
    });

    let res = client
        .post(&url)
        .bearer_auth(access_token)
        .json(&body)
        .send()?;

    if res.status().is_success() {
        let json_response: serde_json::Value = res.json()?;
        if let Some(upload_url) = json_response["uploadUrl"].as_str() {
            Ok(upload_url.to_string())
        } else {
            Err("uploadUrl not found".into())
        }
    } else {
        Err(format!("Failed to create upload session: {}", res.status()).into())
    }
}

// TODO: to port
fn fetch_calendar_data() -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    let current_user_id = get_current_user_id();

    let access_token = get_access_token(current_user_id)?;
    let external_user_id = fetch_o365_user_data(current_user_id)?;
    let url = format!(
        "https://graph.microsoft.com/v1.0/users/{}/calendar/events?$select=subject,body,bodyPreview,organizer,attendees,start,end,location",
        urlencode(&external_user_id)
    );

    let client = reqwest::blocking::Client::new();
    let res = client
        .get(&url)
        .bearer_auth(&access_token)
        .header("Accept", "application/json")
        .send()?;

    if res.status().is_success() {
        let json_response = res.json()?;
        Ok(json_response)
    } else {
        Err(format!("Failed to fetch calendar data: {}", res.status()).into())
    }
}

// TODO: to port
fn upload_file_o365(upload_url: String, file_path: String) -> Result<(), Box<dyn std::error::Error>> {
    const CHUNK_SIZE: usize = 5 * 1024 * 1024; // 5 MB

    let mut file = File::open(&file_path)?;
    let file_size = fs::metadata(&file_path)?.len();
    let client = reqwest::blocking::Client::new();

    let mut start_byte = 0;

    while start_byte < file_size {
        let end_byte = std::cmp::min(start_byte + CHUNK_SIZE as u64 - 1, file_size - 1);
        let content_length = end_byte - start_byte + 1;

        let mut buffer = vec![0; content_length as usize];
        file.seek(SeekFrom::Start(start_byte))?;
        file.read_exact(&mut buffer)?;

        let content_range = format!("bytes {}-{}/{}", start_byte, end_byte, file_size);

        let res = client
            .put(&upload_url)
            .header("Content-Range", content_range)
            .body(buffer)
            .send()?;

        if res.status().is_success() {
            start_byte = end_byte + 1;
        } else {
            return Err(format!("Failed to upload chunk: {}", res.status()).into());
        }
    }

    Ok(())
}

fn add_file_to_task_helper(task_id: i64, file_path: &str, current_user_id: i32) -> Result<(), Box<dyn std::error::Error>> {
    let url = format!("{}File/", get_app_url());
    let client = reqwest::blocking::Client::new();

    let file_data = serde_json::json!({
        "id": 0,
        "name": file_path,
        "path": file_path,
        "taskId": task_id,
        "parentNoteId": 0,
        "createdBy": current_user_id,
    });

    let res = client
        .post(&url)
        .json(&file_data)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .send()?;

    if res.status().is_success() {
        Ok(())
    } else {
        Err(format!("Failed to add file to task: {}", res.status()).into())
    }
}

// TODO: to port
fn add_o365_file_to_task(task_id: i64, file_path: String, current_company_id: i32, current_user_id: i32) -> Result<(), Box<dyn std::error::Error>> {
    // Step 1: Get access token
    let access_token = get_access_token(current_company_id)?;

    // Step 2: Extract filename
    let path = std::path::Path::new(&file_path);
    let filename = path.file_name().ok_or("Invalid file path")?.to_str().ok_or("Invalid filename")?.to_string();

    // Step 3: Construct the new directory path
    let new_dir_path = format!("task-hub-app/{}/{}", current_company_id, task_id);

    // Step 4: Ensure the directory exists
    create_folder(new_dir_path.clone(), &access_token, current_user_id)?;

    // Step 5: Create the upload session
    let upload_url = create_upload_session(&new_dir_path, &filename, &access_token)?;

    // Step 6: Upload the file
    upload_file_o365(upload_url, file_path.clone())?;

    // Step 7: Add the file to the task in the local database
    add_file_to_task_helper(task_id, &format!("{}/{}", new_dir_path, filename), current_user_id)?;

    Ok(())
}

// TODO: to port
fn create_folder(folder_path: String, access_token: &str, current_user_id: i32) -> Result<bool, Box<dyn std::error::Error>> {
    let path = Path::new(&folder_path);
    let parent_path = path.parent().ok_or("Invalid folder path")?.to_str().unwrap();
    let folder_name = path.file_name().ok_or("Invalid folder name")?.to_str().unwrap();

    let external_user_id = fetch_o365_user_data(current_user_id)?;

    let url = format!(
        "https://graph.microsoft.com/v1.0/users/{}/drive/root:/{}/children",
        urlencode(&external_user_id),
        urlencode(parent_path)
    );

    let client = reqwest::blocking::Client::new();
    let body = serde_json::json!({
        "name": folder_name,
        "folder": serde_json::json!({}),
        "@microsoft.graph.conflictBehavior": "rename"
    });

    let res = client
        .post(&url)
        .bearer_auth(access_token)
        .json(&body)
        .send()?;

    if res.status().is_success() || res.status().as_u16() == 409 {
        // 409 Conflict indicates the folder already exists
        Ok(true)
    } else {
        Err(format!("Failed to create folder: {}", res.status()).into())
    }
}



#[tauri::command]
fn get_access_token(current_company_id: i32) -> Result<String, String> {
    let (app_id, tenant_id, client_secret) = fetch_company_data(current_company_id).map_err(|e| e.to_string())?;

    println!("(rust) ****** get_access_token: {} {} {}", app_id, tenant_id, client_secret);

    let url = format!("https://login.microsoftonline.com/{}/oauth2/v2.0/token", tenant_id);
    let params = [
        ("client_id", app_id.as_str()),
        ("scope", "https://graph.microsoft.com/.default"),
        ("client_secret", client_secret.as_str()),
        ("grant_type", "client_credentials"),
    ];

    let client = reqwest::blocking::Client::new();
    let res = client.post(&url).form(&params).send().map_err(|e| e.to_string())?;

    if res.status().is_success() {
        let json_response: serde_json::Value = res.json().map_err(|e| e.to_string())?;
        if let Some(access_token) = json_response["access_token"].as_str() {
            println!("(rust) ****** get_access_token access_token: {}", access_token.to_string());
            Ok(access_token.to_string())
        } else {
            Err("access_token not found".to_string())
        }
    } else {
        Err(format!("Failed to get access token: {}", res.status()))
    }
}

#[tauri::command]
fn fetch_company_data(current_company_id: i32) -> Result<(String, String, String), String> {
    let url = format!("{}Company/{}", get_app_url(), current_company_id);
    let client = reqwest::blocking::Client::new();

    let res = client.get(&url).send().map_err(|e| e.to_string())?;

    if res.status().is_success() {
        let json_response: serde_json::Value = res.json().map_err(|e| e.to_string())?;
        let app_id = json_response["applicationId"].as_str().ok_or("applicationId not found")?.to_string();
        let tenant_id = json_response["tenantId"].as_str().ok_or("tenantId not found")?.to_string();
        let client_secret = json_response["clientSecret"].as_str().ok_or("clientSecret not found")?.to_string();
        Ok((app_id, tenant_id, client_secret))
    } else {
        Err(format!("Failed to fetch company data: {}", res.status()))
    }
}

#[tauri::command]
fn fetch_o365_user_data(current_user_id: i32) -> Result<String, String> {
    let url = format!("{}User/{}", get_app_url(), current_user_id);
    let client = reqwest::blocking::Client::new();

    let res = client.get(&url).send().map_err(|e| e.to_string())?;

    if res.status().is_success() {
        let json_response: serde_json::Value = res.json().map_err(|e| e.to_string())?;
        if let Some(external_username) = json_response["externalUsername"].as_str() {
            Ok(external_username.to_string())
        } else {
            Err("externalUsername not found".to_string())
        }
    } else {
        Err(format!("Failed to fetch user data: {}", res.status()))
    }
}

fn create_o365_folder_recursive(folder_path: String, access_token: &str, current_user_id: i32) -> Result<bool, Box<dyn std::error::Error>> {
    let external_user_id = fetch_o365_user_data(current_user_id).map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;
    println!("(rust): create_o365_folder_recursive external_user_id {}", external_user_id);

    // Split the path and create folders recursively
    let path_parts: Vec<&str> = folder_path.split('/').filter(|s| !s.is_empty()).collect();
    let mut current_path = String::new();
    
    for (i, part) in path_parts.iter().enumerate() {
        // Determine parent path for API call
        let parent_path = if i == 0 {
            // First folder goes in root
            "".to_string()
        } else {
            // Subsequent folders go in the previous folder
            current_path.clone()
        };
        
        // Update current path
        if !current_path.is_empty() {
            current_path.push('/');
        }
        current_path.push_str(part);
        
        println!("(rust): create_o365_folder_recursive current_path {}", current_path);

        // Construct the API URL
        let url = if parent_path.is_empty() {
            format!(
                "https://graph.microsoft.com/v1.0/users/{}/drive/root/children",
                urlencode(&external_user_id)
            )
        } else {
            format!(
                "https://graph.microsoft.com/v1.0/users/{}/drive/root:/{}:/children",
                urlencode(&external_user_id),
                urlencode(&parent_path)
            )
        };

        println!("(rust): create_o365_folder_recursive URL {}", url);

        let client = reqwest::blocking::Client::new();
        // Check if the folder already exists first
        let check_url = if i == 0 {
            // For root level, check if taskhub folder exists
            format!(
                "https://graph.microsoft.com/v1.0/users/{}/drive/root/children?$filter=name eq '{}'",
                urlencode(&external_user_id),
                urlencode(part)
            )
        } else {
            // For subfolders, check in parent folder
            format!(
                "https://graph.microsoft.com/v1.0/users/{}/drive/root:/{}:/children?$filter=name eq '{}'",
                urlencode(&external_user_id),
                urlencode(&parent_path),
                urlencode(part)
            )
        };
        
        let check_res = client
            .get(&check_url)
            .bearer_auth(access_token)
            .send()?;
            
        if check_res.status().is_success() {
            let json_response: serde_json::Value = check_res.json()?;
            if let Some(items) = json_response["value"].as_array() {
                if !items.is_empty() {
                    println!("(rust): create_o365_folder_recursive folder {} already exists", part);
                    continue; // Skip creation, folder exists
                }
            }
        }
        
        let body = serde_json::json!({
            "name": part,
            "folder": {},
            "@microsoft.graph.conflictBehavior": "rename"
        });

        println!("(rust): create_o365_folder_recursive body {}", body.to_string());

        let res = client
            .post(&url)
            .bearer_auth(access_token)
            .json(&body)
            .send()?;

        let status_code = res.status();
        println!("(rust): create_o365_folder_recursive response status: {}", status_code);
        
        if !status_code.is_success() {
            let error_text = res.text().unwrap_or_else(|_| "Failed to read error response".to_string());
            println!("(rust): create_o365_folder_recursive error response: {}", error_text);
            
            // If it's not a conflict (folder already exists), check if folder exists by trying to get it
            if status_code.as_u16() != 409 {
                let check_url = format!(
                    "https://graph.microsoft.com/v1.0/users/{}/drive/root:/{}",
                    urlencode(&external_user_id),
                    urlencode(&current_path)
                );
                
                println!("(rust): create_o365_folder_recursive checking if folder exists: {}", check_url);
                
                let check_res = client
                    .get(&check_url)
                    .bearer_auth(access_token)
                    .send()?;
                    
                println!("(rust): create_o365_folder_recursive check response: {}", check_res.status());
                    
                if !check_res.status().is_success() {
                    return Err(format!("Failed to create or verify folder {}: {} - {}", current_path, status_code, error_text).into());
                } else {
                    println!("(rust): create_o365_folder_recursive folder {} already exists", current_path);
                }
            } else {
                println!("(rust): create_o365_folder_recursive folder {} already exists (409 conflict)", current_path);
            }
        } else {
            println!("(rust): create_o365_folder_recursive successfully created folder: {}", current_path);
        }
    }
    
    Ok(true)
}

fn create_o365_upload_session(folder_path: &str, filename: &str, access_token: &str, current_user_id: i32) -> Result<String, Box<dyn std::error::Error>> {
    let external_user_id = fetch_o365_user_data(current_user_id).map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;
    println!("(rust): create_o365_upload_session external_user_id {}", external_user_id);
    let file_path = format!("{}/{}", folder_path, filename);
    println!("(rust): create_o365_upload_session file_path {}", file_path);

    let url = format!(
        "https://graph.microsoft.com/v1.0/users/{}/drive/root:/{}:/createUploadSession",
        urlencode(&external_user_id),
        urlencode(&file_path)
    );
    println!("(rust): create_o365_upload_session URL: {}", url);

    let client = reqwest::blocking::Client::new();
    let body = serde_json::json!({
        "item": {
            "@microsoft.graph.conflictBehavior": "replace",
            "name": filename
        }
    });
    println!("(rust): create_o365_upload_session body: {}", body);

    println!("(rust): create_o365_upload_session sending request...");
    let res = client
        .post(&url)
        .bearer_auth(access_token)
        .json(&body)
        .send()?;

    let status = res.status();
    println!("(rust): create_o365_upload_session response status: {}", status);
    
    if status.is_success() {
        let json_response: serde_json::Value = res.json()?;
        println!("(rust): create_o365_upload_session response: {}", json_response);
        if let Some(upload_url) = json_response["uploadUrl"].as_str() {
            println!("(rust): create_o365_upload_session success, upload_url: {}", upload_url);
            Ok(upload_url.to_string())
        } else {
            Err("uploadUrl not found".into())
        }
    } else {
        let error_body = res.text().unwrap_or_else(|_| "Unable to read error body".to_string());
        println!("(rust): create_o365_upload_session error body: {}", error_body);
        Err(format!("Failed to create upload session: {} - {}", status, error_body).into())
    }
}

fn upload_file_to_o365(upload_url: String, file_path: String) -> Result<(), Box<dyn std::error::Error>> {
    const CHUNK_SIZE: usize = 5 * 1024 * 1024; // 5 MB

    let mut file = File::open(&file_path)?;
    let file_size = fs::metadata(&file_path)?.len();
    let client = reqwest::blocking::Client::new();

    let mut start_byte = 0;

    while start_byte < file_size {
        let end_byte = std::cmp::min(start_byte + CHUNK_SIZE as u64 - 1, file_size - 1);
        let content_length = end_byte - start_byte + 1;

        let mut buffer = vec![0; content_length as usize];
        file.seek(SeekFrom::Start(start_byte))?;
        file.read_exact(&mut buffer)?;

        let content_range = format!("bytes {}-{}/{}", start_byte, end_byte, file_size);

        let res = client
            .put(&upload_url)
            .header("Content-Range", content_range)
            .body(buffer)
            .send()?;

        if res.status().is_success() {
            start_byte = end_byte + 1;
        } else {
            return Err(format!("Failed to upload chunk: {}", res.status()).into());
        }
    }

    Ok(())
}

#[tauri::command]
fn test_o365_permissions() -> Result<String, String> {
    let current_user_id = get_current_user_id();
    let current_company_id = 1;
    
    // Step 1: Get access token
    let access_token = get_access_token(current_company_id)?;
    let external_user_id = fetch_o365_user_data(current_user_id)?;
    
    println!("(rust): test_o365_permissions - testing with user: {}", external_user_id);
    
    // Test 1: Try to access user's profile
    let profile_url = format!("https://graph.microsoft.com/v1.0/users/{}", urlencode(&external_user_id));
    let client = reqwest::blocking::Client::new();
    
    let profile_res = client
        .get(&profile_url)
        .bearer_auth(&access_token)
        .send()
        .map_err(|e| e.to_string())?;
    
    println!("(rust): test_o365_permissions - profile response: {}", profile_res.status());
    
    if !profile_res.status().is_success() {
        let error_text = profile_res.text().unwrap_or_else(|_| "Failed to read error response".to_string());
        println!("(rust): test_o365_permissions - profile error: {}", error_text);
    }
    
    // Test 2: Try to access user's drive
    let drive_url = format!("https://graph.microsoft.com/v1.0/users/{}/drive", urlencode(&external_user_id));
    let drive_res = client
        .get(&drive_url)
        .bearer_auth(&access_token)
        .send()
        .map_err(|e| e.to_string())?;
    
    println!("(rust): test_o365_permissions - drive response: {}", drive_res.status());
    
    if !drive_res.status().is_success() {
        let error_text = drive_res.text().unwrap_or_else(|_| "Failed to read error response".to_string());
        println!("(rust): test_o365_permissions - drive error: {}", error_text);
        return Err(format!("Drive access failed: {}", error_text));
    }
    
    // Test 3: Try to list root items
    let root_url = format!("https://graph.microsoft.com/v1.0/users/{}/drive/root/children", urlencode(&external_user_id));
    let root_res = client
        .get(&root_url)
        .bearer_auth(&access_token)
        .send()
        .map_err(|e| e.to_string())?;
    
    println!("(rust): test_o365_permissions - root children response: {}", root_res.status());
    
    if !root_res.status().is_success() {
        let error_text = root_res.text().unwrap_or_else(|_| "Failed to read error response".to_string());
        println!("(rust): test_o365_permissions - root children error: {}", error_text);
        return Err(format!("Root access failed: {}", error_text));
    }
    
    Ok("All tests passed successfully".to_string())
}

#[tauri::command]
fn upload_file_to_o365_folder(folder_id: i32, file_path: String) -> Result<String, String> {
    let current_user_id = get_current_user_id();
    let current_company_id = 1;

    // Step 1: Get access token
    let access_token = get_access_token(current_company_id)?;
    
    // Step 2: Extract filename
    let path = std::path::Path::new(&file_path);
    let filename = path.file_name().ok_or("Invalid file path")?.to_str().ok_or("Invalid filename")?.to_string();
    
    // Step 3: Construct the O365 folder path: taskhub/folder_id/filename
    let o365_folder_path = format!("taskhub/{}", folder_id);
    
    // Step 4: Create the folder structure if it doesn't exist
    create_o365_folder_recursive(o365_folder_path.clone(), &access_token, current_user_id).map_err(|e| e.to_string())?;
    
    // Step 5: Create upload session
    let upload_url = create_o365_upload_session(&o365_folder_path, &filename, &access_token, current_user_id).map_err(|e| e.to_string())?;
    
    // Step 6: Upload the file
    upload_file_to_o365(upload_url, file_path).map_err(|e| e.to_string())?;
    
    let url = format!("{}File/", get_app_url());
    let client = Client::new();

    let file_data = serde_json::json!({
        "id": 0,
        "name": filename,
        "path": o365_folder_path,  // still sending the same 'path' to server if needed
        "folderId": folder_id,
        "createdBy": current_user_id,
        "createdDateTime": "2025-02-24T16:43:50.779Z",
        "iso365File": true
    });

    println!("(rust) *** Creating O365 file: {:?}", file_data);

    // 4) Send the POST to your server
    let response = client
        .post(&url)
        .json(&file_data)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        // Return the OneDrive path
        Ok(format!("{}/{}", o365_folder_path, filename))
    } else {
        Err(format!("Failed to create file: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn open_o365_file(folder_id: i32, file_name: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;
    
    // Get current user and company info to construct proper SharePoint URL
    let current_user_id = get_current_user_id();
    let current_company_id = 1;
    
    // Get company data including tenant info
    let (_, tenant_id, _) = fetch_company_data(current_company_id)
        .map_err(|e| format!("Failed to fetch company data: {}", e))?;
    
    // Get the external user ID (O365 email/username)
    let external_user_id = fetch_o365_user_data(current_user_id)
        .map_err(|e| format!("Failed to fetch O365 user data: {}", e))?;
    
    // Extract the tenant name from the external user ID (email domain)
    // For dev1@rjautonom.onmicrosoft.com, we want "rjautonom"
    let tenant_name = if external_user_id.contains("@") {
        external_user_id
            .split('@')
            .nth(1)
            .and_then(|domain| domain.split('.').next())
            .unwrap_or("unknown")
    } else {
        "unknown"
    };
    
    println!("Extracted tenant name: {} from email: {}", tenant_name, external_user_id);
    
    // Extract username part from email (before @)
    let username_part = external_user_id.split('@').next().unwrap_or(&external_user_id);
    
    // Construct the O365 file path as it's stored in OneDrive
    let file_path = format!("taskhub/{}/{}", folder_id, file_name);
    
    // Construct OneDrive for Business URL based on the actual format
    // Format: https://{tenant}-my.sharepoint.com/my?source=waffle&id=/personal/{user_email_encoded}/Documents/{path}&parent=/personal/{user_email_encoded}/Documents/{parent_path}
    
    // Replace @ with %5F and . with %5F for SharePoint encoding
    let encoded_email = external_user_id
        .replace('@', "_")
        .replace('.', "_");
    
    // URL encode the file path components
    let parent_path = format!("taskhub/{}", folder_id);
    let full_file_path = format!("{}/{}", parent_path, file_name);
    
    // Build the URL with proper encoding
    let url = format!(
        "https://{}-my.sharepoint.com/my?source=waffle&id=%2Fpersonal%2F{}%2FDocuments%2F{}&parent=%2Fpersonal%2F{}%2FDocuments%2F{}",
        tenant_name,
        encoded_email,
        urlencoding::encode(&full_file_path).replace("/", "%2F"),
        encoded_email,
        urlencoding::encode(&parent_path).replace("/", "%2F")
    );
    
    println!("Opening O365 file at URL: {}", url);
    
    // Open the URL in the default browser
    app_handle.shell().open(url, None)
        .map_err(|e| format!("Failed to open URL: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn add_file_to_task(task_id: i64, file_path: String) -> Result<(), String> {
    let json_data = serde_json::json!({
        "id": 0,
        "name": file_path.clone(),
        "path": file_path,
        "taskId": task_id,
        "parentNoteId": 0,
        "createdBy": get_current_user_id()
    });

    if is_app_available() {
        let client = reqwest::blocking::Client::new();
        let url = format!("{}File/", get_app_url());
        let response = client.post(&url).json(&json_data).send().map_err(|e| e.to_string())?;
        if response.status().is_success() {
            Ok(())
        } else {
            Err(format!("Failed to add file online: HTTP {}", response.status()))
        }
    } else {
        // Offline mode: Save the file to the local database
        insert_or_update_file_in_local_db(json_data)?;
        Ok(())
    }
}

// Helper function to insert/update file in the local database
fn insert_or_update_file_in_local_db(json_data: serde_json::Value) -> Result<(), String> {
    let conn = open_database().map_err(|e| e.to_string())?;
    let sql = "
        INSERT INTO files (
            Id, Name, Path, TaskId, ParentNoteId, CreatedBy, CreatedDateTime, IsSynced
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, datetime('now'), 0
        )
        ON CONFLICT(Id) DO UPDATE SET
            Name = excluded.Name,
            Path = excluded.Path,
            TaskId = excluded.TaskId,
            ParentNoteId = excluded.ParentNoteId,
            CreatedBy = excluded.CreatedBy,
            CreatedDateTime = datetime('now'),
            IsSynced = 0;
    ";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    stmt.execute(params![
        json_data["id"].as_i64().unwrap_or(0),
        json_data["name"].as_str().unwrap_or(""),
        json_data["path"].as_str().unwrap_or(""),
        json_data["taskId"].as_i64().unwrap_or(0),
        json_data["parentNoteId"].as_i64().unwrap_or(0),
        json_data["createdBy"].as_i64().unwrap_or(0),
    ]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn add_task(
    project_id: i32,
    assigned_to_id: i32,
    title: String,
    description: String,
    due_date: String,
    priority: String,
    assigned_to_name: String,
) -> Result<(), String> {
    let json_data = serde_json::json!({
        "id": 0,
        "title": title,
        "description": description,
        "dueDate": due_date,
        "status": "New",
        "priority": priority,
        "assignedTo": assigned_to_id,
        "assignedToName": assigned_to_name,
        "createdBy": get_current_user_id(),
        "parentId": 0,
        "projectId": project_id
    });

    if is_app_available() {
        let client = reqwest::blocking::Client::new();
        let url = format!("{}Task/", get_app_url());
        let response = client.post(&url).json(&json_data).send().map_err(|e| e.to_string())?;
        if response.status().is_success() {
            Ok(())
        } else {
            Err(format!("Failed to add task online: HTTP {}", response.status()))
        }
    } else {
        // Offline mode: Save the task to the local database
        insert_or_update_task_in_local_db(json_data)?;
        Ok(())
    }
}

fn insert_or_update_task_in_local_db(json_data: serde_json::Value) -> Result<(), String> {
    let conn = open_database().map_err(|e| e.to_string())?;
    let sql = "
        INSERT INTO tasks (
            Id, Title, Description, DueDate, Status, Priority, AssignedTo, CreatedBy, CreatedDateTime, LastModifyDateTime, ParentId, ProjectId, IsSynced
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'), datetime('now'), ?9, ?10, 0
        )
        ON CONFLICT(Id) DO UPDATE SET
            Title = excluded.Title,
            Description = excluded.Description,
            DueDate = excluded.DueDate,
            Status = excluded.Status,
            Priority = excluded.Priority,
            AssignedTo = excluded.AssignedTo,
            CreatedBy = excluded.CreatedBy,
            CreatedDateTime = excluded.CreatedDateTime,
            LastModifyDateTime = datetime('now'),
            ParentId = excluded.ParentId,
            ProjectId = excluded.ProjectId,
            IsSynced = 0;
    ";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    stmt.execute(params![
        json_data["id"].as_i64().unwrap_or(0),
        json_data["title"].as_str().unwrap_or(""),
        json_data["description"].as_str().unwrap_or(""),
        json_data["dueDate"].as_str().unwrap_or(""),
        json_data["status"].as_str().unwrap_or("New"),
        json_data["priority"].as_str().unwrap_or(""),
        json_data["assignedTo"].as_i64().unwrap_or(0),
        json_data["createdBy"].as_i64().unwrap_or(0),
        json_data["parentId"].as_i64().unwrap_or(0),
        json_data["projectId"].as_i64().unwrap_or(0),
    ]).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]

fn delete_task_from_local_db(task_id: i32) -> Result<bool, String> {
    // Open the local SQLite database
    let conn = Connection::open("taskhub.db").map_err(|e| e.to_string())?;

    // First, delete any related records that might have foreign key constraints
    // This is a defensive approach - these tables might not exist or might not have data
    
    // Delete related files
    let _ = conn.execute("DELETE FROM files WHERE TaskId = ?1;", params![task_id]);
    
    // Delete related notes/textboxes
    let _ = conn.execute("DELETE FROM textboxes WHERE TaskId = ?1;", params![task_id]);
    
    // Delete any other task-related data
    let _ = conn.execute("DELETE FROM task_workspace WHERE TaskId = ?1;", params![task_id]);

    // Now delete the task itself
    let sql = "DELETE FROM tasks WHERE Id = ?1;";
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    // Execute the DELETE statement
    stmt.execute(params![task_id]).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn delete_task(task_id: i32) -> Result<bool, String> {
    // Check if the app is available (online)
    if !is_app_available() {
        // App is offline; delete task from local database
        return delete_task_from_local_db(task_id);
    }

    let client = Client::new();
    let url = format!("{}Task/{}", get_app_url(), task_id);

    // Send a DELETE request to the server
    let response = client
        .request(Method::DELETE, &url)
        .header("Content-Type", "application/json")
        .send().map_err(|e| e.to_string())?;

    if response.status().is_success() {
        // Successfully deleted on server; try to delete from local database
        // but don't fail if local deletion fails (e.g., due to foreign key constraints)
        match delete_task_from_local_db(task_id) {
            Ok(_) => Ok(true),
            Err(e) => {
                // Log the error but still return success since server deletion worked
                println!("Warning: Failed to delete task from local DB: {}", e);
                Ok(true)
            }
        }
    } else {
        Err(format!("Failed to delete task: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn get_username(user_id: i32, current_company_id: i32) -> Result<String, String> {
    // Check if the app is available (online)
    if !is_app_available() {
        // App is offline, read username from local SQLite database
        return read_username_from_local_db(user_id);
    }

    // Construct the URL
    let url = format!("{}User/?companyId={}", get_app_url(), current_company_id);

    // Initialize the HTTP client
    let client = Client::new();

    // Perform the GET request
    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send().map_err(|e| e.to_string())?;

    if response.status().is_success() {
        // Parse the JSON response
        let users: Vec<serde_json::Value> = response.json().map_err(|e| e.to_string())?;
        for user in users {
            if user["id"].as_i64() == Some(user_id as i64) {
                if let Some(username) = user["username"].as_str() {
                    return Ok(username.to_string());
                } else {
                    return Err("Username field missing in user data".to_string());
                }
            }
        }
        Err(format!("User with ID {} not found", user_id))
    } else {
        Err(format!("Failed to fetch users: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn get_all_users_for_company(companyId: i32) -> Result<Vec<(i32, String)>, String> {
    // Check if the app is available (online)
    if !is_app_available() {
        // App is offline, read users from SQLite database
        return read_users_from_local_db(companyId);
    }

    // Prepare the URL
    let url = format!("{}User/?companyId={}", get_app_url(), companyId);

    // Initialize the HTTP client
    let client = Client::new();

    // Perform the GET request
    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send().map_err(|e| e.to_string())?;

    if response.status().is_success() {
        // Parse JSON response and populate user_list
        let json_response: Vec<serde_json::Value> = response.json().map_err(|e| e.to_string())?;
        let mut user_list = Vec::new();
        for user in json_response {
            let user_id = user["id"].as_i64().unwrap_or(-1) as i32;
            let user_name = user["username"].as_str().unwrap_or("Unknown").to_string();
            user_list.push((user_id, user_name));
        }
        Ok(user_list)
    } else {
        Err(format!("Failed to fetch users: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn get_id_for_user(username: String, current_company_id: i32) -> Result<i32, String> {
    // Check if the app is available (online)
    if !is_app_available() {
        // Pass current_company_id to the local DB function
        return get_user_id_from_local_db(&username, current_company_id);
    }

    // Construct the URL
    let url = format!("{}User/?companyId={}", get_app_url(), current_company_id);

    // Initialize the HTTP client
    let client = reqwest::blocking::Client::new();

    // Perform the GET request
    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send().map_err(|e| e.to_string())?;

    if response.status().is_success() {
        // Parse the JSON response
        let users: Vec<serde_json::Value> = response.json().map_err(|e| e.to_string())?;
        for user in users {
            if user["username"].as_str() == Some(username.as_str()) {
                return Ok(user["id"].as_i64().unwrap_or(-1) as i32);
            }
        }
        Err(format!("User '{}' not found", username))
    } else {
        Err(format!("Failed to fetch users: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn create_user(
    base_url: String,
    username: String,
    password: String,
    firstname: String,
    lastname: String,
    company_id: i32,
) -> Result<bool, String> {
    let client = Client::new();
    let url = format!("{}User/", get_app_url());

    let user_data = serde_json::json!({
        "username": username,
        "password": password,
        "firstName": firstname,
        "lastName": lastname,
        "externalUsername": "",
        "role": 0,
        "companyId": company_id,
        "paymentPlan": 0,
    });

    println!("(rust) ****** USER CREATE: {}", url);

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&user_data)
        .send().map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!(
            "Failed to create user: HTTP {}",
            response.status()
        ))
    }
}

#[tauri::command]
fn authenticate_user(
    base_url: String,
    username: String,
    password: String,
) -> Result<i32, String> {
    let url = format!("{}/Account/", base_url);
    let user_id = get_user(&url, &username, &password)?;
    set_up_company_for_user(username.clone());
    Ok(user_id)
}

#[tauri::command]
fn get_user(url: &str, username: &str, password: &str) -> Result<i32, String> {
    let client = Client::new();
    let user_data = serde_json::json!({
        "username": username,
        "password": password,
    });

    let response = client
        .post(url)
        .header("Content-Type", "application/json")
        .json(&user_data)
        .send().map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().map_err(|e| e.to_string())?;
        Ok(json_response["id"].as_i64().unwrap_or(-1) as i32)
    } else {
        Err(format!("Failed to authenticate user: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn is_app_available() -> bool {
    let client = Client::new();
    let url = format!("{}Health/", get_app_url());

    let response = client.get(&url)
        .header("Content-Type", "application/json")
        .send();

    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                match resp.text() {
                    Ok(body) => {
                        let is_ok = body.trim() == "\"OK\"";
                        is_ok
                    },
                    Err(_) => false
                }
            } else {
                false
            }
        },
        Err(_) => false,
    }
}

#[tauri::command]
fn sign_in(username: String, password: String) -> Result<i32, String> {
    println!("(rust) sign_in");

    let client = Client::new();
    let url = get_app_url() + "Account/";

    let payload = serde_json::json!({
        "username": username,
        "password": password,
    });

    let response = client.post(&url)
        .header("Content-Type", "application/json")
        .json(&payload)
        .send().map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let sign_in_response: SignInResponse = response.json().map_err(|e| e.to_string())?;

        if let Some(user_id) = sign_in_response.id {
            *CURRENT_USER_ID.lock().unwrap() = Some(user_id);
            Ok(user_id)  // Return the user ID if successful
        } else {
            Err(format!("Sign-in failed: {}", sign_in_response.message.unwrap_or_else(|| "Unknown error".to_string())))
        }
    } else {
        Err(format!("Failed to sign in: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn get_user_profile() -> Result<serde_json::Value, String> {
    println!("(rust) get_user_profile");
    
    let user_id = get_current_user_id();
    if user_id == -1 {
        return Err("User not logged in".to_string());
    }
    
    let client = Client::new();
    let url = format!("{}User/{}", get_app_url(), user_id);
    
    let response = client.get(&url)
        .send()
        .map_err(|e| format!("Network error: {}", e))?;
    
    if response.status().is_success() {
        let user_data: serde_json::Value = response.json()
            .map_err(|e| format!("Failed to parse user data: {}", e))?;
        
        // Extract only the fields we need for the settings page
        let profile = json!({
            "username": user_data.get("username").unwrap_or(&json!("")),
            "email": user_data.get("email").unwrap_or(&json!("")),
            "id": user_id
        });
        
        Ok(profile)
    } else {
        Err(format!("Failed to fetch user profile: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn update_user_profile(username: String, email: String) -> Result<bool, String> {
    println!("(rust) update_user_profile");
    
    let user_id = get_current_user_id();
    if user_id == -1 {
        return Err("User not logged in".to_string());
    }
    
    let client = Client::new();
    let url = format!("{}User/{}", get_app_url(), user_id);
    
    // First, fetch the existing user data
    let mut user_data: serde_json::Value = client.get(&url)
        .send()
        .map_err(|e| format!("Failed to fetch user: {}", e))?
        .json()
        .map_err(|e| format!("Failed to parse user data: {}", e))?;
    
    // Update only the fields we want to change
    user_data["username"] = json!(username);
    user_data["email"] = json!(email);
    
    // Send the updated data back
    let response = client.put(&url)
        .json(&user_data)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| format!("Failed to update user: {}", e))?;
    
    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to update user profile: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn update_user_password(current_password: String, new_password: String) -> Result<bool, String> {
    println!("(rust) update_user_password");
    
    let user_id = get_current_user_id();
    if user_id == -1 {
        return Err("User not logged in".to_string());
    }
    
    // First, verify the current password is correct by trying to authenticate
    let username = {
        // Get the current username
        let client = Client::new();
        let url = format!("{}User/{}", get_app_url(), user_id);
        let response = client.get(&url)
            .send()
            .map_err(|e| format!("Failed to fetch user: {}", e))?;
            
        if !response.status().is_success() {
            return Err("Failed to fetch current user info".to_string());
        }
        
        let user_data: serde_json::Value = response.json()
            .map_err(|e| format!("Failed to parse user data: {}", e))?;
            
        user_data["username"].as_str().unwrap_or("").to_string()
    };
    
    if username.is_empty() {
        return Err("Failed to get current username".to_string());
    }
    
    // Verify current password by attempting authentication
    let auth_url = format!("{}Account/", get_app_url());
    let auth_client = Client::new();
    let auth_data = json!({
        "username": username,
        "password": current_password,
    });
    
    let auth_response = auth_client
        .post(&auth_url)
        .header("Content-Type", "application/json")
        .json(&auth_data)
        .send()
        .map_err(|e| format!("Failed to verify password: {}", e))?;
        
    if !auth_response.status().is_success() {
        return Err("Current password is incorrect".to_string());
    }
    
    // Now update the user with the new password
    let client = Client::new();
    let url = format!("{}User/{}", get_app_url(), user_id);
    
    // First, fetch the existing user data
    let mut user_data: serde_json::Value = client.get(&url)
        .send()
        .map_err(|e| format!("Failed to fetch user: {}", e))?
        .json()
        .map_err(|e| format!("Failed to parse user data: {}", e))?;
    
    // Update the password field
    user_data["password"] = json!(new_password);
    
    // Send the updated data back
    let response = client.put(&url)
        .json(&user_data)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| format!("Failed to update password: {}", e))?;
    
    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to update password: HTTP {}", response.status()))
    }
}

// Methods for local DB.
fn open_database() -> rusqlite::Result<Connection> {
    let db_path = "taskhub.db"; // Path to your SQLite database file
    let conn = Connection::open(db_path)?;
    println!("(rust) Successfully connected to the database.");
    Ok(conn)
}

fn close_database(conn: Connection) {
    drop(conn);  // This will close the connection
    println!("(rust) Database connection closed.");
}



// Mock function for local SQLite reading


#[tauri::command]
fn register_user(
    username: String,
    password: String,
    firstname: String,
    lastname: String,
    company_name: String,
) -> Result<bool, String> {
    // 1. Fetch the company ID (like getIDForCompany in C++)
    let company_id = get_company_id(&get_app_url(), &company_name)
        .map_err(|e| format!("Failed to get company ID: {}", e))?;

    if company_id == -1 {
        return Err("Invalid company ID".to_string());
    }

    // 2. Build the same URL used in C++: "User/?companyId=..."
    let url = format!("{}User/?companyId={}", get_app_url(), company_id);

    // 3. Create the user via a helper function
    create_user(url, username, password, firstname, lastname, company_id)
}

#[tauri::command]
fn create_vault(
    name: String,
    created_by: i32,
    created_by_name: String,
) -> Result<bool, String> {
    use reqwest::blocking::Client;
    let client = Client::new();

    // 1) Construct the URL for creating the vault
    let vault_url = format!("{}Vault/", get_app_url());

    // 2) Build the JSON body for vault creation
    let vault_data = serde_json::json!({
        "id": 0,
        "name": name,
        "createdBy": created_by,
        "createdDateTime": "2025-02-24T10:25:38.419Z",
        "createdByName": created_by_name
    });

    println!("(rust) ****** VAULT CREATE: {}", vault_url);

    // 3) Send the POST request to create the vault
    let vault_response = client
        .post(&vault_url)
        .header("Content-Type", "application/json")
        .json(&vault_data)
        .send()
        .map_err(|e| e.to_string())?;

    if !vault_response.status().is_success() {
        return Err(format!("Failed to create vault: HTTP {}", vault_response.status()));
    }

    // 4) Parse the newly created vault’s JSON to get its ID
    let created_vault: CreatedVaultResponse = vault_response
        .json()
        .map_err(|e| format!("Failed to parse created vault JSON: {}", e))?;

    println!("(rust) Vault created successfully, ID = {}", created_vault.id);

    // If we reach here, both vault and folder are created
    Ok(true)
}

#[tauri::command]
fn rename_vault(
    vault_id: i32,
    new_name: String,
) -> Result<bool, String> {
    use reqwest::blocking::Client;
    let client = Client::new();

    // 1) First, fetch the existing vault data
    let get_url = format!("{}Vault/{}", get_app_url(), vault_id);
    let get_response = client
        .get(&get_url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !get_response.status().is_success() {
        return Err(format!("Failed to fetch vault: HTTP {}", get_response.status()));
    }

    // 2) Parse the vault data
    let mut vault: serde_json::Value = get_response
        .json()
        .map_err(|e| format!("Failed to parse vault JSON: {}", e))?;

    // 3) Update the name in the JSON
    vault["name"] = serde_json::Value::String(new_name);

    // 4) Send PUT request to update the vault
    let put_url = format!("{}Vault/{}", get_app_url(), vault_id);
    let put_response = client
        .put(&put_url)
        .header("Content-Type", "application/json")
        .json(&vault)
        .send()
        .map_err(|e| e.to_string())?;

    if put_response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to rename vault: HTTP {}", put_response.status()))
    }
}

#[tauri::command]
fn fetch_vaults() -> Result<Vec<Vault>, String> {
    let url = format!("{}Vault/", get_app_url());

    let client = reqwest::blocking::Client::new();
    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        // Parse the JSON array of vaults
        let vaults: Vec<Vault> = response.json().map_err(|e| e.to_string())?;
        Ok(vaults)
    } else {
        Err(format!("Failed to fetch vaults: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn fetch_folders() -> Result<Vec<Folder>, String> {
    use reqwest::blocking::Client;

    let url = format!("{}Folder/", get_app_url());
    eprintln!("(rust) fetch_folders: requesting URL = {}", url);

    // 1) Send the GET request
    let client = Client::new();
    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| {
            eprintln!("(rust) fetch_folders: request error: {}", e);
            e.to_string()
        })?;

    // 2) Check HTTP status
    if !response.status().is_success() {
        eprintln!("(rust) fetch_folders: HTTP error code: {}", response.status());
        return Err(format!("Failed to fetch folders: HTTP {}", response.status()));
    }

    // 3) Read the raw response text
    let text = response.text().map_err(|e| {
        eprintln!("(rust) fetch_folders: error reading response text: {}", e);
        e.to_string()
    })?;

    // 4) Print the raw JSON so you can see exactly what the server returned
    eprintln!("(rust) fetch_folders raw JSON:\n{}", text);

    // 5) Parse the JSON into your Vec<Folder> struct
    let folders: Vec<Folder> = serde_json::from_str(&text).map_err(|e| {
        eprintln!("(rust) fetch_folders: JSON parse error: {}", e);
        e.to_string()
    })?;

    eprintln!("(rust) fetch_folders: successfully parsed {} folders", folders.len());
    Ok(folders)
}

#[tauri::command]
fn create_folder_for_vault(
    name: String,
    created_by: i32,
    created_by_user: String,
    parent_id: i32,
    vault_id: String,
) -> Result<bool, String> {
    use reqwest::blocking::Client;

    let url = format!("{}Folder/", get_app_url()); // e.g. "http://127.0.0.1:5000/Folder/"
    let client = Client::new();

    // Example: always "2025-02-24T12:00:00Z" or get the real current time
    let folder_data = serde_json::json!({
        "id": 0,
        "name": name,
        "createdBy": created_by,
        "parentId": parent_id,
        "parentName": null,
        "createdDateTime": "2025-02-24T12:00:00Z",
        "createdByUser": created_by_user,
        "vaultId": vault_id
    });

    println!("(rust) Creating subfolder: {:?}", folder_data);

    let response = client
        .post(&url)
        .json(&folder_data)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to create folder: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn create_file_for_folder(
    name: String,
    path: String,
    folder_id: i32,
    created_by: i32,
    created_by_user: String,
    file_contents_base64: String,  // <--- new
) -> Result<bool, String> {
    use reqwest::blocking::Client;
    use std::fs;
    use std::io::Write;

    // 0) Determine where to store the file locally
    //    We'll do ~/.taskhub/<path>/filename
    let home_dir = dirs::home_dir().ok_or("Failed to find home directory")?;
    let base_path = home_dir.join(".taskhub");

    // Because your `path` might have leading slashes, handle them carefully:
    // e.g. path = "/1234/" -> we only want "1234" subfolder
    let trimmed_path = path.trim_start_matches('/').trim_end_matches('/');
    let local_folder = base_path.join(trimmed_path);

    // Create the local folder structure if it doesn't exist
    fs::create_dir_all(&local_folder)
        .map_err(|e| format!("Failed to create local folder: {}", e))?;

    let local_file_path = local_folder.join(&name);

    // 1) Decode file contents from base64
    let decoded_bytes = match base64::decode(&file_contents_base64) {
        Ok(bytes) => bytes,
        Err(e) => return Err(format!("Base64 decode error: {}", e)),
    };

    // 2) Write the file to ~/.taskhub/<path>/<name>
    let mut f = fs::File::create(&local_file_path)
        .map_err(|e| format!("Failed to create local file: {}", e))?;
    f.write_all(&decoded_bytes)
        .map_err(|e| format!("Failed to write to local file: {}", e))?;

    // 3) Build JSON body for server
    let url = format!("{}File/", get_app_url());
    let client = Client::new();

    let file_data = serde_json::json!({
        "id": 0,
        "name": name,
        "path": path,  // still sending the same 'path' to server if needed
        "folderId": folder_id,
        "createdBy": created_by,
        "createdDateTime": "2025-02-24T16:43:50.779Z",
        "createdByUser": created_by_user
    });

    println!("(rust) Creating file: {:?}", file_data);

    // 4) Send the POST to your server
    let response = client
        .post(&url)
        .json(&file_data)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to create file: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn fetch_files() -> Result<Vec<FileRecord>, String> {
    // 1) Build the request URL
    let url = format!("{}File/", get_app_url());
    let client = reqwest::blocking::Client::new();

    // 2) Send GET request to http://127.0.0.1:5000/File/
    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    // 3) Check HTTP status
    if !response.status().is_success() {
        return Err(format!("Failed to fetch files: HTTP {}", response.status()));
    }

    // 4) Parse the JSON array into Vec<FileRecord>
    let files: Vec<FileRecord> = response
        .json()
        .map_err(|e| format!("Failed to parse files JSON: {}", e))?;

    Ok(files)
}
#[tauri::command]
fn create_workspace_for_task(
    name: String,
    task_id: i32,
    folder_Id: String
) -> Result<bool, String> {
    use reqwest::blocking::Client;

    // 1) Construct the URL for your Workspace API
    let url = format!("{}Workspace/", get_app_url()); 
    let client = Client::new();

    // 2) Build the JSON body
    // For example, pick a date/time or pass in real timestamps
    let workspace_data = serde_json::json!({
        "id": 0,
        "name": name,
        "createdBy": get_current_user_id(),
        "createdDateTime": "2025-02-24T16:43:11.843Z",
        "lastModifyDateTime": "2025-02-24T16:43:11.843Z",
        "createdFromTaskId": task_id,
        "folderId": folder_Id
    });

    println!("(rust) Creating workspace: {:?}", workspace_data);

    // 3) Send POST request
    let response = client
        .post(&url)
        .json(&workspace_data)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    // 4) Check success
    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to create workspace: HTTP {}", response.status()))
    }
}
#[tauri::command]
fn create_workspace_for_folder(
    name: String,
    created_by: i32,
    created_by_user: String,
    folder_id: i32,
) -> Result<bool, String> {
    use reqwest::blocking::Client;

    // 1) Construct the URL for your Workspace API
    let url = format!("{}Workspace/", get_app_url()); 
    let client = Client::new();

    // 2) Build the JSON body
    // For example, pick a date/time or pass in real timestamps
    let workspace_data = serde_json::json!({
        "id": 0,
        "name": name,
        "createdBy": created_by,
        "createdDateTime": "2025-02-24T16:43:11.843Z",
        "lastModifyDateTime": "2025-02-24T16:43:11.843Z",
        "createdByUser": created_by_user,
        "folderId": folder_id.to_string() // if your API expects a string
    });

    println!("(rust) Creating workspace: {:?}", workspace_data);

    // 3) Send POST request
    let response = client
        .post(&url)
        .json(&workspace_data)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    // 4) Check success
    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to create workspace: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn fetch_workspaces() -> Result<Vec<WorkspaceRecord>, String> {
    let url = format!("{}Workspace/", get_app_url());
    let client = reqwest::blocking::Client::new();

    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch workspaces: HTTP {}", response.status()));
    }

    let workspaces: Vec<WorkspaceRecord> = response
        .json()
        .map_err(|e| format!("Failed to parse workspaces JSON: {}", e))?;

    Ok(workspaces)
}

#[tauri::command]
fn fetch_workspace(workspaceId: i32) -> Result<WorkspaceRecord, String> {
    let url = format!("{}Workspace/{}", get_app_url(), workspaceId);
    let client = reqwest::blocking::Client::new();

    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch workspaces: HTTP {}", response.status()));
    }

    let workspaces: WorkspaceRecord = response
        .json()
        .map_err(|e| format!("Failed to parse workspaces JSON: {}", e))?;

    Ok(workspaces)
}
#[tauri::command]
fn fetch_workspaces_for_task(taskId: i32) -> Result<WorkspaceRecord, String> {
    let url = format!("{}Workspace/FromTask/{}", get_app_url(), taskId);
    let client = reqwest::blocking::Client::new();

    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch workspaces: HTTP {}", response.status()));
    }

    let workspaces: WorkspaceRecord = response
        .json()
        .map_err(|e| format!("Failed to parse workspaces JSON: {}", e))?;

    Ok(workspaces)
}

#[tauri::command]
fn fetch_workspaces_for_card(cardId: i32) -> Result<WorkspaceRecord, String> {
    let url = format!("{}Workspace/FromCard/{}", get_app_url(), cardId);
    let client = reqwest::blocking::Client::new();

    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch workspaces: HTTP {}", response.status()));
    }

    let workspaces: WorkspaceRecord = response
        .json()
        .map_err(|e| format!("Failed to parse workspaces JSON: {}", e))?;

    Ok(workspaces)
}
#[tauri::command]
fn fetch_pages_for_workspace(workspaceId: i32) -> Result<Vec<Page>, String> {
    let url = format!("{}Page/?workspaceId={}", get_app_url(), workspaceId);
    let client = reqwest::blocking::Client::new();

    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch workspaces: HTTP {}", response.status()));
    }

    let pages: Vec<Page> = response
        .json()
        .map_err(|e| format!("Failed to parse workspaces JSON: {}", e))?;

    Ok(pages)
}
// Internal function to create workspace for task
fn create_workspace_for_task_internal(
    task_name: &str,
    task_id: i32,
    page_id: i32
) -> Result<bool, String> {

    
    // First, get the page to find the workspace ID
    let client = reqwest::blocking::Client::new();
    let page_url = format!("{}Page/{}", get_app_url(), page_id);
    
    let page_response = client
        .get(&page_url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;
        
    if !page_response.status().is_success() {
        return Err(format!("Failed to fetch page: HTTP {}", page_response.status()));
    }
    
    let page_data: serde_json::Value = page_response
        .json()
        .map_err(|e| format!("Failed to parse page JSON: {}", e))?;
    
    let workspace_id = page_data["workspaceId"].as_i64().unwrap_or(0) as i32;
    
    if workspace_id <= 0 {
        return Err("No valid workspace ID found for page".to_string());
    }
    
    // Now get the workspace to find the folder ID
    let workspace_url = format!("{}Workspace/{}", get_app_url(), workspace_id);
    
    let workspace_response = client
        .get(&workspace_url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;
        
    if !workspace_response.status().is_success() {
        return Err(format!("Failed to fetch workspace: HTTP {}", workspace_response.status()));
    }
    
    let workspace_data: serde_json::Value = workspace_response
        .json()
        .map_err(|e| format!("Failed to parse workspace JSON: {}", e))?;
    
    let folder_id = workspace_data["folderId"].as_str().unwrap_or("0").to_string();
    
    // Now create the workspace for the task
    let workspace_url_create = format!("{}Workspace/", get_app_url());
    
    let workspace_data_create = serde_json::json!({
        "id": 0,
        "name": task_name,
        "createdBy": get_current_user_id(),
        "createdDateTime": "2025-02-24T16:43:11.843Z",
        "lastModifyDateTime": "2025-02-24T16:43:11.843Z",
        "createdFromTaskId": task_id,
        "folderId": folder_id
    });
    
    println!("(rust) Creating workspace with data: {:?}", workspace_data_create);
    
    let create_response = client
        .post(&workspace_url_create)
        .json(&workspace_data_create)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;
    
    if create_response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to create workspace: HTTP {}", create_response.status()))
    }
}

#[tauri::command]
fn create_task_for_page(
    title: String,
    description: String,
    dueDate: String,
    status: String,
    priority: String,
    assignedTo: Option<i32>,
    pageId: i32,
    industry: String
) -> Result<serde_json::Value, String> {
    // 1) Construct your base URL
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Task/", get_app_url());
    // e.g. "http://127.0.0.1:5000/Task/"
    // 2) Build the JSON body
    //    Hardcode `id = 0` (new record), `parentId = null` or 0, or pass them in as needed.
    //    `createdDateTime` can be a real date/time or a placeholder.
    // Check if we have a valid user ID
    let user_id = get_current_user_id();
    if user_id <= 0 {
        return Err("No valid user ID found. Please ensure you are logged in.".to_string());
    }

    let task_data = serde_json::json!({
        "id": 0,
        "title": title,
        "description": description,
        "dueDate": dueDate,
        "status": status,
        "priority": priority,
        "assignedTo": match assignedTo {
            Some(id) => serde_json::json!(id),
            None => serde_json::Value::Null,
        },
        "createdBy": user_id,
        "createdDateTime": "2025-02-25T19:25:54.558Z", // Or an actual timestamp
        "parentId": null,
        "pageId": pageId,
        "industry": industry
    });


    println!("(rust) Creating task with data: {:?}", task_data);

    // 3) Send the POST request to create the task
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&task_data)
        .send()
        .map_err(|e| e.to_string())?;
    // 4) Check if successful
    if response.status().is_success() {
        let created_task: serde_json::Value = response
        .json()
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
        
        // Extract task ID from the created task
        let task_id = created_task["id"].as_i64().unwrap_or(0) as i32;
        
        if task_id > 0 {
            println!("(rust) Task created successfully with ID: {}", task_id);
            
            // Now create a workspace for this task
            match create_workspace_for_task_internal(&title, task_id, pageId) {
                Ok(_) => println!("(rust) Workspace created successfully for task: {}", title),
                Err(e) => println!("(rust) Failed to create workspace for task: {} - Error: {}", title, e),
            }
        }
    
        Ok(created_task) 
    } else {
        Err(format!("Failed to create task: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn update_task(
    task_id: i32,
    title: String,
    description: String,
    due_date: String,
    status: String,
    priority: String,
    assigned_to: Option<i32>,
    assigned_to_name: String,
    industry: String,
    created_by: i32,
    created_by_name: String,
    created_date_time: String,
    parent_id: Option<i32>,
    page_id: i32,
    page_name: String,
    last_modify_date_time: String
) -> Result<serde_json::Value, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Task/{}", get_app_url(), task_id);
    
    let task_data = serde_json::json!({
        "id": task_id,
        "title": title,
        "description": description,
        "dueDate": due_date,
        "status": status,
        "priority": priority,
        "assignedTo": match assigned_to {
            Some(id) => serde_json::json!(id),
            None => serde_json::Value::Null,
        },
        "assignedToName": assigned_to_name,
        "industry": industry,
        "createdBy": created_by,
        "createdByName": created_by_name,
        "createdDateTime": created_date_time,
        "parentId": match parent_id {
            Some(id) => serde_json::json!(id),
            None => serde_json::Value::Null,
        },
        "pageId": page_id,
        "pageName": page_name,
        "lastModifyDateTime": last_modify_date_time
    });

    println!("(rust) Updating task with data: {:?}", task_data);

    let response = client
        .put(&url)
        .header("Content-Type", "application/json")
        .json(&task_data)
        .send()
        .map_err(|e| e.to_string())?;
        
    if response.status().is_success() {
        let updated_task: serde_json::Value = response
            .json()
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;
        
        Ok(updated_task) 
    } else {
        Err(format!("Failed to update task: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn fetch_tasks_for_page(pageId: i32) -> Result<Vec<NewTask>, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Task/?pageId={}", get_app_url(), pageId);

    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch tasks: HTTP {}", response.status()));
    }

    let tasks: Vec<NewTask> = response
        .json()
        .map_err(|e| format!("Error parsing tasks JSON: {}", e))?;

    Ok(tasks)
}

#[tauri::command]
fn fetch_tasks_for_workspace(workspaceId: i32) -> Result<Vec<NewTask>, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Task/Workspace/{}", get_app_url(), workspaceId);

    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch tasks for workspace: HTTP {}", response.status()));
    }

    let tasks: Vec<NewTask> = response
        .json()
        .map_err(|e| format!("Error parsing tasks JSON: {}", e))?;

    Ok(tasks)
}

#[tauri::command]
fn create_url_for_folder(
    name: String,
    url_value: String,
    folderId: i32,
) -> Result<bool, String> {
    // 1) Construct the URL for the server's `Url` endpoint
    let client = reqwest::blocking::Client::new();
    let post_url = format!("{}Url/", get_app_url());

    // 2) Build the JSON body
    //    Hardcode `id = 0`, set a placeholder date/time, etc.
    let url_data = serde_json::json!({
        "id": 0,
        "name": name,
        "url": url_value,
        "createdBy": get_current_user_id(),
        "folderId": folderId,
        "createdDateTime": "2025-02-24T16:42:48.568Z"
    });
    println!("(rust) Creating web URL: {:?}", url_data);

    // 3) Send POST
    let response = client
        .post(&post_url)
        .json(&url_data)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    // 4) Check if success
    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to create URL: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn fetch_weburls() -> Result<Vec<WebUrlRecord>, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Url/", get_app_url());

    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch weburls: HTTP {}", response.status()));
    }

    let weburls: Vec<WebUrlRecord> = response
        .json()
        .map_err(|e| format!("Failed to parse weburls JSON: {}", e))?;

    Ok(weburls)
}
#[tauri::command]
fn fetch_weburls_for_folder(folderId :i32) -> Result<Vec<WebUrlRecord>, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Url/Folder/{}", get_app_url(), folderId);

    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch weburls: HTTP {}", response.status()));
    }

    let weburls: Vec<WebUrlRecord> = response
        .json()
        .map_err(|e| format!("Failed to parse weburls JSON: {}", e))?;

    Ok(weburls)
}
#[tauri::command]
fn fetch_textboxes() -> Result<Vec<TextBoxRecord>, String> {
    let url = format!("{}TextBox/", get_app_url()); // e.g. "http://127.0.0.1:5000/TextBox/"
    let client = reqwest::blocking::Client::new();

    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch text boxes: HTTP {}", response.status()));
    }

    let textboxes: Vec<TextBoxRecord> = response
        .json()
        .map_err(|e| format!("Failed to parse textboxes JSON: {}", e))?;

    Ok(textboxes)
}

#[tauri::command]
fn fetch_cards_for_page(pageId :i32) -> Result<Vec<Card>, String> {
    let url = format!("{}Card/?pageId={}", get_app_url(), pageId);
    let client = reqwest::blocking::Client::new();

    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch cards: HTTP {}", response.status()));
    }

    let cards: Vec<Card> = response
        .json()
        .map_err(|e| format!("Failed to parse cards JSON: {}", e))?;

    Ok(cards)
}
#[tauri::command]
fn create_card_for_page(
    name: String,
    description: String,
    dueDate: String,
    status: String,
    priority: String,
    assignedTo: Option<i32>,
    pageId: i32,
    category: String
) -> Result<serde_json::Value, String> {
    let url = format!("{}Card/", get_app_url()); // "http://127.0.0.1:5000/TextBox/"
    let client = reqwest::blocking::Client::new();

    // build JSON
    let data = serde_json::json!({
        "id": 0,
        "name": name,
        "pageId": pageId,
        "createdBy": get_current_user_id(),
        "createdDateTime": "2025-02-26T21:15:30.269Z",
        "lastModifyDateTime": "2025-02-26T21:15:30.269Z",
        "assignedTo":  match assignedTo {
            Some(id) => serde_json::json!(id),
            None => serde_json::Value::Null,
        },
        "description": description,
        "status": status,
        "priority": priority,
        "category": category,
        "dueDate": "2025-02-26T21:15:30.269Z"
    });

    println!("(rust) Creating card: {:?}", data);

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&data)
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let created_card: serde_json::Value = response
        .json()
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
        // Extract card ID and name for workspace creation
        let card_id = created_card["id"]
            .as_i64()
            .ok_or("No card ID in response")? as i32;
        
        // Create workspace for the card
        if let Err(workspace_error) = create_workspace_for_card_internal(&name, card_id, pageId) {
            println!("⚠️ Warning: Failed to create workspace for card: {}", workspace_error);
            // Don't fail the card creation if workspace creation fails
        }
    
        Ok(created_card) 
    } else {
        Err(format!("Failed to create card: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn update_card(
    card_id: i32,
    name: String,
    description: String,
    status: String,
    priority: String,
    category: String,
    due_date: String,
    assigned_to: Option<i32>,
    assigned_to_name: String
) -> Result<serde_json::Value, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Card/{}", get_app_url(), card_id);
    
    // First, fetch the existing card to preserve fields we don't update
    let get_response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;
    
    if !get_response.status().is_success() {
        return Err(format!("Failed to fetch card: HTTP {}", get_response.status()));
    }
    
    let mut existing_card: serde_json::Value = get_response
        .json()
        .map_err(|e| format!("Failed to parse card JSON: {}", e))?;
    
    // Update only the allowed fields
    existing_card["name"] = serde_json::json!(name);
    existing_card["description"] = serde_json::json!(description);
    existing_card["status"] = serde_json::json!(status);
    existing_card["priority"] = serde_json::json!(priority);
    existing_card["category"] = serde_json::json!(category);
    existing_card["dueDate"] = serde_json::json!(due_date);
    existing_card["assignedTo"] = match assigned_to {
        Some(id) => serde_json::json!(id),
        None => serde_json::Value::Null,
    };
    existing_card["assignedToName"] = serde_json::json!(assigned_to_name);
    // Update last modify date time with current timestamp
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    existing_card["lastModifyDateTime"] = serde_json::json!(format!("2025-02-26T21:15:30.269Z"));
    
    println!("(rust) Updating card with data: {:?}", existing_card);
    
    let response = client
        .put(&url)
        .header("Content-Type", "application/json")
        .json(&existing_card)
        .send()
        .map_err(|e| e.to_string())?;
        
    if response.status().is_success() {
        let updated_card: serde_json::Value = response
            .json()
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;
        
        Ok(updated_card)
    } else {
        Err(format!("Failed to update card: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn delete_card(card_id: i32) -> Result<bool, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Card/{}", get_app_url(), card_id);
    
    let response = client
        .request(Method::DELETE, &url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;
    
    let status = response.status();
    
    // Consider both 2xx and 404 as success (404 means already deleted)
    if status.is_success() || status == reqwest::StatusCode::NOT_FOUND {
        Ok(true)
    } else {
        Err(format!("Failed to delete card: HTTP {}", status))
    }
}
            
#[tauri::command]
fn fetch_textbox_for_page(pageId :i32) -> Result<Vec<TextBoxRecord>, String> {
    let url = format!("{}TextBox/?pageId={}", get_app_url(), pageId);
    let client = reqwest::blocking::Client::new();

    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch text boxes: HTTP {}", response.status()));
    }

    let textboxes: Vec<TextBoxRecord> = response
        .json()
        .map_err(|e| format!("Failed to parse textboxes JSON: {}", e))?;

    Ok(textboxes)
}


#[tauri::command]
fn fetch_card_connections_for_page(pageId :i32) -> Result<Vec<CardConnection>, String> {
    let url = format!("{}Card/connections?pageId={}", get_app_url(), pageId);
    let client = reqwest::blocking::Client::new();

    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch card Connections: HTTP {}", response.status()));
    }

    let cardConnections: Vec<CardConnection> = response
        .json()
        .map_err(|e| format!("Failed to parse card Connections JSON: {}", e))?;

    Ok(cardConnections)
}
#[tauri::command]
fn create_textbox_for_page(
    text: String,
    pageId: i32
) -> Result<serde_json::Value, String> {
    let url = format!("{}TextBox/", get_app_url()); // "http://127.0.0.1:5000/TextBox/"
    let client = reqwest::blocking::Client::new();

    // build JSON
    let data = serde_json::json!({
        "id": 0,
        "text": text,
        "pageId": pageId,
        "createdBy": get_current_user_id(),
        "createdDateTime": "2025-02-26T21:15:30.269Z",
        "lastModifyDateTime": "2025-02-26T21:15:30.269Z"
    });

    println!("(rust) Creating text box: {:?}", data);

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&data)
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let created_textbox: serde_json::Value = response
        .json()
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
        Ok(created_textbox) 
    } else {
        Err(format!("Failed to create text box: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn create_event(
    title: String,
    location: String,
    from: String,
    to: String,
    userEmails: String,
    description: String,
    allDay: bool,
    frequency: String,
    color: String,
    createdBy: i32
) -> Result<bool, String> {

    // If offline, you could store it locally. For simplicity, do only online:
    if !is_app_available() {
        return Err("App is offline. Not supported yet.".to_string());
    }

    // Build the JSON body
    let event_data = serde_json::json!({
        "id": 0,
        "title": title,
        "location": location,
        "createdBy": createdBy,
        "dateTimeFrom": from,
        "dateTimeTo": to,
        "userEmails": userEmails,
        "description": description,
        "allDay": allDay,
        "frequency": frequency,
        "color": color,
        // If you want to specify which user(s) is/are participating:
        "userEvents": [
            {
                "userId": createdBy,
                "eventId": 0
            }
        ]
    });

    // Send POST /Event/
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Event/", get_app_url());
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&event_data)
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to create event: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn get_all_events_for_current_user() -> Result<Vec<CalendarEvent>, String> {
    if !is_app_available() {
        return Ok(vec![]); // or read local DB if you have offline logic
    }

    // Example: GET /Event/ for your user
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Event/", get_app_url()); // adapt if you have user-specific endpoint
    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch events: HTTP {}", response.status()));
    }

    let events: Vec<CalendarEvent> = response.json().map_err(|e| e.to_string())?;
    Ok(events)
}

#[tauri::command]
fn get_upcoming_events_for_current_user() -> Result<Vec<CalendarEvent>, String> {
    if !is_app_available() {
        return Ok(vec![]); // or read local DB if you have offline logic
    }

    // GET /Event/Upcoming for upcoming events
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Event/Upcoming", get_app_url());
    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch upcoming events: HTTP {}", response.status()));
    }

    let events: Vec<CalendarEvent> = response.json().map_err(|e| e.to_string())?;
    Ok(events)
}

#[tauri::command]
fn delete_event(eventId: i32) -> Result<bool, String> {
    // If offline, you could store it locally. For simplicity, do only online:
    if !is_app_available() {
        return Err("App is offline. Not supported yet.".to_string());
    }

    // Send DELETE /Event/{eventId}
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Event/{}", get_app_url(), eventId);
    let response = client
        .request(Method::DELETE, &url)
        // .delete(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to delete event: HTTP {}", response.status()))
    }
}

fn get_task_by_id(task_id: i32) -> Result<NewTask, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Task/{}", get_app_url(), task_id);

    let resp = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("HTTP error when fetching Task {}: {}", task_id, resp.status()));
    }

    let text = resp.text().map_err(|e| e.to_string())?;
    println!("(rust) [DEBUG] Single task {} raw JSON:\n{}", task_id, text);

    let task: NewTask = serde_json::from_str(&text).map_err(|e| {
        format!("JSON parse error (TaskID={}): {}", task_id, e)
    })?;

    Ok(task)
}

/// Return pinned tasks for given user
#[tauri::command]
fn get_pinned_tasks_for_user(user_id: i32) -> Result<Vec<NewTask>, String> {
    if !is_app_available() {
        // Return empty or handle offline if needed
        return Ok(vec![]);
    }

    // 1) Fetch pinned references
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Task/Pinned?userId={}", get_app_url(), user_id);
    println!("(rust) [DEBUG] Fetching pinned tasks from: {}", url);

    let resp = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("Failed to fetch pinned references: HTTP {}", resp.status()));
    }

    // 2) Parse pinned references
    let pinned_refs: Vec<TaskRef> = resp.json().map_err(|e| e.to_string())?;

    // 3) For each pinned reference, fetch the actual Task
    let mut tasks = Vec::new();
    for pref in pinned_refs {
        match get_task_by_id(pref.taskId) {
            Ok(t) => tasks.push(t),
            Err(e) => {
                eprintln!("(rust) Warning: failed to fetch Task ID {}: {}", pref.taskId, e);
                // optionally continue or return an error
            }
        }
    }

    Ok(tasks)
}

/// Return favorite tasks for given user
#[tauri::command]
fn get_favorite_tasks_for_user(user_id: i32) -> Result<Vec<NewTask>, String> {
    if !is_app_available() {
        return Ok(vec![]);
    }

    // 1) Fetch the favorite references
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Task/Favourite?userId={}", get_app_url(), user_id);
    println!("(rust) [DEBUG] Fetching favorite tasks from: {}", url);

    let resp = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("Failed to fetch favorite references: HTTP {}", resp.status()));
    }

    let fav_refs: Vec<TaskRef> = resp.json().map_err(|e| e.to_string())?;

    // 2) For each reference, fetch the real Task
    let mut tasks = Vec::new();
    for fref in fav_refs {
        match get_task_by_id(fref.taskId) {
            Ok(t) => tasks.push(t),
            Err(e) => eprintln!("(rust) Warning: failed to fetch Task {}: {}", fref.taskId, e),
        }
    }

    Ok(tasks)
}


/// Return tasks assigned to user
#[tauri::command]
fn get_assigned_tasks_for_user(user_id: i32) -> Result<Vec<NewTask>, String> {
    if !is_app_available() {
        return Ok(vec![]);
    }

    let client = reqwest::blocking::Client::new();

    // TODO: Use `assignedTo`, not `createdBy`
    let url = format!("{}Task/?createdBy={}", get_app_url(), user_id);
    println!("(rust) [DEBUG] Requesting assigned tasks from: {}", url);

    let resp = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("Failed to fetch assigned tasks: HTTP {}", resp.status()));
    }

    // For debugging, read raw text
    let text = resp.text().map_err(|e| e.to_string())?;
    println!("(rust) [DEBUG] Assigned tasks raw JSON:\n{}", text);

    // Parse into Vec<NewTask>
    let tasks: Vec<NewTask> = serde_json::from_str(&text)
        .map_err(|e| format!("JSON parse error: {}", e))?;

    Ok(tasks)
}

/// Return tasks that have dueDate = today
#[tauri::command]
fn get_due_today_tasks_for_user(_user_id: i32) -> Result<Vec<NewTask>, String> {
    if !is_app_available() {
        return Ok(vec![]);
    }
    
    let url = format!("{}Task/today", get_app_url());
    
    let client = reqwest::blocking::Client::new();
    let response = client
        .get(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let tasks: Vec<NewTask> = response.json().map_err(|e| e.to_string())?;
        Ok(tasks)
    } else {
        Err(format!("Failed to fetch tasks for today: HTTP {}", response.status()))
    }
}

/// Mark a task as "favorite" for a given user
#[tauri::command]
fn favorite_task(task_id: i32) -> Result<bool, String> {
    // If offline logic is needed, handle that here.
    // Otherwise, just do the online call:
    if !is_app_available() {
        return Err("App is offline. Favorite not supported offline.".to_string());
    }

    let url = format!("{}Task/Favourite", get_app_url());
    let client = reqwest::blocking::Client::new();

    // JSON body for the request
    let body = serde_json::json!({
        "id": 0,
        "userId": get_current_user_id().to_string(),
        "taskId": task_id.to_string()
    });

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to favorite task: HTTP {}", response.status()))
    }
}

/// Mark a task as "pinned" for a given user
#[tauri::command]
fn pin_task(task_id: i32) -> Result<bool, String> {
    if !is_app_available() {
        return Err("App is offline. Pin not supported offline.".to_string());
    }

    let url = format!("{}Task/Pinned", get_app_url());
    let client = reqwest::blocking::Client::new();

    let body = serde_json::json!({
        "id": 0,
        "userId": get_current_user_id().to_string(),
        "taskId": task_id.to_string()
    });

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to pin task: HTTP {}", response.status()))
    }
}

/// Remove a task from favorites for a given user
#[tauri::command]
fn unfavorite_task(task_id: i32) -> Result<bool, String> {
    if !is_app_available() {
        return Err("App is offline. Unfavorite not supported offline.".to_string());
    }

    let client = reqwest::blocking::Client::new();
    
    // Try the first approach: DELETE with query parameters
    let url = format!("{}Task/Favourite?userId={}&taskId={}", get_app_url(), get_current_user_id(), task_id);
    println!("(rust) [DEBUG] Attempting to unfavorite task with URL: {}", url);

    let response = client
        .delete(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        println!("(rust) [DEBUG] Successfully unfavorited task {}", task_id);
        Ok(true)
    } else if response.status().as_u16() == 404 {
        // Try alternative approach: DELETE with JSON body like POST
        println!("(rust) [DEBUG] First approach failed with 404, trying alternative...");
        let url2 = format!("{}Task/Favourite", get_app_url());
        
        let body = serde_json::json!({
            "userId": get_current_user_id().to_string(),
            "taskId": task_id.to_string()
        });

        let response2 = client
            .delete(&url2)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .map_err(|e| e.to_string())?;

        if response2.status().is_success() {
            println!("(rust) [DEBUG] Successfully unfavorited task {} with alternative method", task_id);
            Ok(true)
        } else {
            Err(format!("Failed to unfavorite task (tried both methods): HTTP {} and HTTP {}", 
                response.status(), response2.status()))
        }
    } else {
        Err(format!("Failed to unfavorite task: HTTP {}", response.status()))
    }
}

/// Remove a task from pinned for a given user
#[tauri::command]
fn unpin_task(task_id: i32) -> Result<bool, String> {
    if !is_app_available() {
        return Err("App is offline. Unpin not supported offline.".to_string());
    }

    let client = reqwest::blocking::Client::new();
    
    // Try the first approach: DELETE with query parameters
    let url = format!("{}Task/Pinned?userId={}&taskId={}", get_app_url(), get_current_user_id(), task_id);
    println!("(rust) [DEBUG] Attempting to unpin task with URL: {}", url);

    let response = client
        .delete(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        println!("(rust) [DEBUG] Successfully unpinned task {}", task_id);
        Ok(true)
    } else if response.status().as_u16() == 404 {
        // Try alternative approach: DELETE with JSON body like POST
        println!("(rust) [DEBUG] First approach failed with 404, trying alternative...");
        let url2 = format!("{}Task/Pinned", get_app_url());
        
        let body = serde_json::json!({
            "userId": get_current_user_id().to_string(),
            "taskId": task_id.to_string()
        });

        let response2 = client
            .delete(&url2)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .map_err(|e| e.to_string())?;

        if response2.status().is_success() {
            println!("(rust) [DEBUG] Successfully unpinned task {} with alternative method", task_id);
            Ok(true)
        } else {
            Err(format!("Failed to unpin task (tried both methods): HTTP {} and HTTP {}", 
                response.status(), response2.status()))
        }
    } else {
        Err(format!("Failed to unpin task: HTTP {}", response.status()))
    }
}

/// Check if a task is favorited by the current user
#[tauri::command]
fn is_task_favorited(task_id: i32) -> Result<bool, String> {
    if !is_app_available() {
        return Err("App is offline. Status check not supported offline.".to_string());
    }

    // Get favorite tasks and check if this task is in the list
    match get_favorite_tasks_for_user(get_current_user_id()) {
        Ok(favorite_tasks) => {
            let is_favorited = favorite_tasks.iter().any(|task| task.id == task_id);
            Ok(is_favorited)
        }
        Err(e) => Err(format!("Failed to check favorite status: {}", e))
    }
}

/// Check if a task is pinned by the current user
#[tauri::command]
fn is_task_pinned(task_id: i32) -> Result<bool, String> {
    if !is_app_available() {
        return Err("App is offline. Status check not supported offline.".to_string());
    }

    // Get pinned tasks and check if this task is in the list
    match get_pinned_tasks_for_user(get_current_user_id()) {
        Ok(pinned_tasks) => {
            let is_pinned = pinned_tasks.iter().any(|task| task.id == task_id);
            Ok(is_pinned)
        }
        Err(e) => Err(format!("Failed to check pinned status: {}", e))
    }
}

#[tauri::command]
fn create_card_connection(fromCardId: i32, toCardId: i32) -> Result<bool, String> {
    if !is_app_available() {
        return Err("App is offline. Pin not supported offline.".to_string());
    }

    let url = format!("{}Card/connect", get_app_url());
    let client = reqwest::blocking::Client::new();

    let body = serde_json::json!({
        "fromCardId": fromCardId,
        "toCardId": toCardId
    });

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to pin task: HTTP {}", response.status()))
    }
}
#[tauri::command]
fn open_local_folder(file_id: u32, file_name: String) -> Result<(), String> {
    // 1) Get home dir. This expands to the real path, e.g. /Users/bob or C:\Users\Bob
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;

    // 2) Build our new path from scratch
    //    e.g. /Users/bob/.taskhub/1234/myfile.txt
    let full_path = home_dir
        .join(".taskhub")
        .join(file_id.to_string()) // subfolder for that file’s ID
        .join(&file_name);

    println!("**rust*** Opening folder: {}", full_path.display());

    // 3) Open with OS-specific command:
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&full_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&full_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&full_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use tokio::sync::oneshot;

#[tauri::command]
async fn open_single_file_picker(window: tauri::Window) -> Result<Option<String>, String> {
    println!("**rust*** open_single_file_picker");

    let (tx, rx) = oneshot::channel();

    window.dialog().file().pick_file(move |path| {
        let result = path.map(|p| p.to_string());
        let _ = tx.send(result);
    });

    rx.await.map_err(|_| "Failed to receive file selection".to_string())
}

#[tauri::command]
async fn read_file_as_base64(path: String) -> Result<String, String> {
    use std::fs;
    use base64::prelude::*;
    
    let contents = fs::read(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    Ok(BASE64_STANDARD.encode(&contents))
}

#[tauri::command]
fn delete_file(file_id: i32) -> Result<bool, String> {
    if !is_app_available() {
        // If you want offline logic, do it here:
        return delete_file_from_local_db(file_id);
    }

    let client = reqwest::blocking::Client::new();
    let url = format!("{}File/{}", get_app_url(), file_id);

    let response = client
        .delete(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        // Also remove from local DB if you store files offline
        delete_file_from_local_db(file_id)?;
        Ok(true)
    } else {
        Err(format!("Failed to delete file: HTTP {}", response.status()))
    }
}

fn delete_file_from_local_db(file_id: i32) -> Result<bool, String> {
    // Example. If no offline support needed, return Ok(true) or similar.
    // let conn = open_database().map_err(|e| e.to_string())?;
    // let sql = "DELETE FROM files WHERE Id = ?1;";
    // let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    // stmt.execute(rusqlite::params![file_id]).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn delete_url(url_id: i32) -> Result<bool, String> {
    if !is_app_available() {
        // offline logic if needed
        return delete_url_from_local_db(url_id);
    }

    let client = reqwest::blocking::Client::new();
    let url = format!("{}Url/{}", get_app_url(), url_id);

    let response = client
        .delete(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        // local DB removal
        delete_url_from_local_db(url_id)?;
        Ok(true)
    } else {
        Err(format!("Failed to delete URL: HTTP {}", response.status()))
    }
}

fn delete_url_from_local_db(url_id: i32) -> Result<bool, String> {
    // Implement if you store URLs offline
    Ok(true)
}

#[tauri::command]
fn delete_textbox(textboxId: i32) -> Result<bool, String> {
    if !is_app_available() {
        return delete_textbox_from_local_db(textboxId);
    }

    let client = reqwest::blocking::Client::new();
    let url = format!("{}TextBox/{}", get_app_url(), textboxId);

    let response = client
        .delete(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        delete_textbox_from_local_db(textboxId)?;
        Ok(true)
    } else if response.status() == 404 {
        // Note doesn't exist on server, try to delete from local DB anyway
        println!("Note {} not found on server, attempting local deletion", textboxId);
        delete_textbox_from_local_db(textboxId)?;
        Ok(true)
    } else {
        Err(format!("Failed to delete TextBox: HTTP {}", response.status()))
    }
}

fn delete_textbox_from_local_db(textboxId: i32) -> Result<bool, String> {
    let conn = Connection::open("taskhub.db").map_err(|e| e.to_string())?;
    
    // Try multiple possible table names for textboxes
    let possible_tables = ["textboxes", "TextBoxes", "text_boxes", "notes"];
    let mut deletion_successful = false;
    
    for table_name in &possible_tables {
        let sql = format!("DELETE FROM {} WHERE id = ?1", table_name);
        if let Ok(mut stmt) = conn.prepare(&sql) {
            if let Ok(rows_affected) = stmt.execute([textboxId]) {
                if rows_affected > 0 {
                    println!("Deleted textbox {} from table '{}' in local database", textboxId, table_name);
                    deletion_successful = true;
                    break;
                }
            }
        }
    }
    if deletion_successful {
        Ok(true)
    } else {
        // If no table worked, just return success anyway (for UI cleanup)
        println!("Could not find textbox {} in any table, but returning success for UI cleanup", textboxId);
    Ok(true)
    }
}

#[tauri::command]
fn delete_image(imageId: i32) -> Result<bool, String> {
    if !is_app_available() {
        return delete_image_from_local_db(imageId);
    }

    let client = reqwest::blocking::Client::new();
    let url = format!("{}Image/{}", get_app_url(), imageId);

    let response = client
        .delete(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        delete_image_from_local_db(imageId)?;
        Ok(true)
    } else if response.status() == 404 {
        // Image doesn't exist on server, try to delete from local DB anyway
        println!("Image {} not found on server, attempting local deletion", imageId);
        delete_image_from_local_db(imageId)?;
        Ok(true)
    } else {
        Err(format!("Failed to delete Image: HTTP {}", response.status()))
    }
}

fn delete_image_from_local_db(imageId: i32) -> Result<bool, String> {
    let conn = Connection::open("taskhub.db").map_err(|e| e.to_string())?;
    
    // Try multiple possible table names for images
    let possible_tables = ["images", "Images", "image_records", "ImageRecords"];
    let mut deletion_successful = false;
    
    for table_name in &possible_tables {
        let sql = format!("DELETE FROM {} WHERE id = ?1", table_name);
        if let Ok(mut stmt) = conn.prepare(&sql) {
            if let Ok(rows_affected) = stmt.execute([imageId]) {
                if rows_affected > 0 {
                    println!("Deleted image {} from table '{}' in local database", imageId, table_name);
                    deletion_successful = true;
                    break;
                }
            }
        }
    }
    
    if deletion_successful {
        Ok(true)
    } else {
        // If no table worked, just return success anyway (for UI cleanup)
        println!("Could not find image {} in any table, but returning success for UI cleanup", imageId);
        Ok(true)
    }
}

#[tauri::command]
fn delete_workspace(workspace_id: i32) -> Result<bool, String> {
    if !is_app_available() {
        return delete_workspace_from_local_db(workspace_id);
    }

    let client = reqwest::blocking::Client::new();
    let url = format!("{}Workspace/{}", get_app_url(), workspace_id);

    let response = client
        .delete(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        delete_workspace_from_local_db(workspace_id)?;
        Ok(true)
    } else {
        Err(format!("Failed to delete Workspace: HTTP {}", response.status()))
    }
}
#[tauri::command]
fn delete_page(pageId: i32) -> Result<bool, String> {

    let client = reqwest::blocking::Client::new();
    let url = format!("{}Page/{}", get_app_url(), pageId);

    let response = client
        .delete(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to delete Workspace: HTTP {}", response.status()))
    }
}

fn delete_workspace_from_local_db(workspace_id: i32) -> Result<bool, String> {
    // If offline logic is needed:
    Ok(true)
}

#[tauri::command]
fn delete_folder(folder_id: i32) -> Result<bool, String> {
    if !is_app_available() {
        return delete_folder_from_local_db(folder_id);
    }

    let client = reqwest::blocking::Client::new();
    let url = format!("{}Folder/{}", get_app_url(), folder_id);

    let response = client
        .delete(&url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        // Also remove from local DB if needed
        delete_folder_from_local_db(folder_id)?;
        Ok(true)
    } else {
        Err(format!("Failed to delete Folder: HTTP {}", response.status()))
    }
}

fn delete_folder_from_local_db(folder_id: i32) -> Result<bool, String> {
    // If you store Folders offline, implement here
    Ok(true)
}
#[tauri::command]
fn create_page_for_workspace(
    name: String,
    workspaceId: i32
) -> Result<Page, String> {
    let payload = serde_json::json!({
        "name": name,
        "workspaceId": workspaceId,
        "createdBy": get_current_user_id()
    });

    let response = reqwest::blocking::Client::new()
        .post(&format!("{}/Page/", get_app_url()))
        .json(&payload)
        .send()
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to create page: HTTP {}", response.status()));
    }

    response
        .json::<Page>()
        .map_err(|e| format!("Failed to parse page response: {}", e))
}

#[tauri::command]
fn set_current_user_plan(plan_name: String) -> Result<String, String> {
    let user_id = get_current_user_id();

    println!("(rust) set_current_user_plan called. User ID: {}, Plan: '{}'", user_id, plan_name);

    // 1) Build the request URL: e.g. "http://127.0.0.1:5000/User/12/pay"
    // let url = format!("https://api.rjautonomous.com/User/{}/pay", user_id);
    let url = format!("http://127.0.0.1:5000/User/{}/pay", user_id);

    // 2) Construct the JSON body we’ll send to Flask
    let payload = serde_json::json!({ "planName": plan_name });

    // 3) Use 'reqwest' to call your Flask API
    //    Make sure you have `reqwest = "0.11"` (or similar) in Cargo.toml, and 'serde_json' as well.
    let client = reqwest::blocking::Client::new();
    let response = client
        .post(&url)
        .json(&payload)
        .send()
        .map_err(|err| format!("Network error: {}", err))?;

    // 4) Check HTTP status
    if !response.status().is_success() {
        return Err(format!("Flask API returned non-200 status: {}", response.status()));
    }

    // 5) Parse JSON response from Flask, which should contain {"checkoutUrl": "..."}
    let json_response: serde_json::Value = response
        .json()
        .map_err(|err| format!("JSON parse error: {}", err))?;

    // 6) Extract the checkout URL from the JSON object
    let checkout_url = json_response["checkoutUrl"]
        .as_str()
        .ok_or("Did not find 'checkoutUrl' in JSON")?;

    // 7) Print it or do your logic. For example, return it back to Tauri/JS:
    println!("(rust) Received checkoutUrl: {}", checkout_url);

    // Return the URL so your JavaScript can open it in a browser, e.g. window.open(...)
    Ok(checkout_url.to_string())
}
#[tauri::command]
fn fetch_images_for_page(page_id: i32) -> Result<Vec<ImageRecord>, String> {
    // Check if live API is available, if not use local storage
    if !is_app_available() {
        return fetch_images_from_local_db(page_id);
    }

    let client = reqwest::blocking::Client::new();
    let url = format!("{}Image?pageId={}", get_app_url(), page_id);

    let response = match client.get(&url)
        .header("Content-Type", "application/json")
        .send() {
        Ok(resp) => resp,
        Err(e) => {
            return fetch_images_from_local_db(page_id);
        }
    };

    if response.status().is_success() {
        let images: Vec<ImageRecord> = response.json().map_err(|e| e.to_string())?;
        Ok(images)
    } else {
        fetch_images_from_local_db(page_id)
    }
}
#[tauri::command]
fn create_image_for_page(
    name: String,
    pageId: i32,
    fileContentsBase64: String,
) -> Result<ImageRecord, String> {
    // First, check API health with detailed logging
    let api_available = is_app_available();
    
    // Check if live API is available, if not use local storage
    if !api_available {
        return create_image_local_db(name, pageId, fileContentsBase64);
    }

    let client = reqwest::blocking::Client::new();
    let url = format!("{}Image/", get_app_url());

    let body = serde_json::json!({
        "name": name.clone(),
        "pageId": pageId,
        "createdBy": get_current_user_id(),
        "base64": fileContentsBase64.clone()
    });

    let response = match client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send() {
        Ok(resp) => {
            resp
        },
        Err(_e) => {
            return create_image_local_db(name, pageId, fileContentsBase64);
        }
    };

    if response.status().is_success() {
        match response.json::<ImageRecord>() {
            Ok(image) => {
        Ok(image)
            },
            Err(e) => {
                create_image_local_db(name, pageId, fileContentsBase64)
            }
        }
    } else {
        // Get response body for debugging
        let status = response.status(); // Store status before moving response
        match response.text() {
            Ok(body) => {
                println!("❌ Live API returned error {} with body: {}", status, body);
            },
            Err(_) => {
                println!("❌ Live API returned error {} (couldn't read response body)", status);
            }
        }
        println!("🔄 Falling back to local storage due to API error");
        create_image_local_db(name, pageId, fileContentsBase64)
    }
}

// Local database fallback function for image creation
fn create_image_local_db(
    name: String,
    page_id: i32,
    file_contents_base64: String,
) -> Result<ImageRecord, String> {
    use rusqlite::{params, Connection};
    use std::time::{SystemTime, UNIX_EPOCH};

    println!("💾 Creating image locally: '{}' for page {} (offline mode)", name, page_id);
    
    let conn = Connection::open("taskhub.db").map_err(|e| e.to_string())?;

    // Generate a unique ID for the local image (negative to avoid conflicts with server IDs)
    let current_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i32;
    let local_id = -(current_time % 1000000); // Negative ID for local images
    
    // Note: We don't store user info or timestamps in the ImageRecord struct
    // These are only used for local database storage if needed

    // Try multiple possible table names for images
    let possible_tables = ["images", "Images", "image_records", "ImageRecords"];
    let mut insertion_successful = false;
    
    for table_name in &possible_tables {
        let sql = format!(
            "INSERT INTO {} (id, name, base64data, pageid, orderindex, issynced) 
             VALUES (?1, ?2, ?3, ?4, ?5, 0)",
            table_name
        );
        
        if let Ok(mut stmt) = conn.prepare(&sql) {
            match stmt.execute(params![
                local_id,
                name,
                file_contents_base64,
                page_id,
                0 // Default order index
            ]) {
                Ok(_) => {
                    println!("Successfully inserted image into table '{}'", table_name);
                    insertion_successful = true;
                    break;
                }
                Err(e) => {
                    println!("Failed to insert into table '{}': {}", table_name, e);
                    continue;
                }
            }
        }
    }

    if !insertion_successful {
        // If all table insertions failed, create the images table and try again
        println!("All table insertions failed, creating images table");
        let create_table_sql = "
            CREATE TABLE IF NOT EXISTS images (
                id INTEGER PRIMARY KEY,
                name TEXT,
                base64data TEXT,
                pageid INTEGER,
                orderindex INTEGER DEFAULT 0,
                issynced INTEGER DEFAULT 0
            )";
        
        conn.execute(create_table_sql, []).map_err(|e| e.to_string())?;
        
        let insert_sql = "INSERT INTO images (id, name, base64data, pageid, orderindex, issynced) 
                         VALUES (?1, ?2, ?3, ?4, ?5, 0)";
        
        conn.execute(insert_sql, params![
            local_id,
            name,
            file_contents_base64,
            page_id,
            0
        ]).map_err(|e| e.to_string())?;
        
        println!("Successfully created images table and inserted image");
    }

    // Return the created image record
    let image_record = ImageRecord {
        id: local_id,
        name: name.clone(),
        base64: file_contents_base64,
        pageId: page_id,
        orderIndex: Some(0),
    };

    println!("Successfully created local image record with ID: {}", local_id);
    Ok(image_record)
}

// Local database fallback function for fetching images
fn fetch_images_from_local_db(page_id: i32) -> Result<Vec<ImageRecord>, String> {
    use rusqlite::{params, Connection};

    println!("Fetching images from local database for page {}", page_id);
    
    let conn = Connection::open("taskhub.db").map_err(|e| e.to_string())?;
    let mut images = Vec::new();

    // Try multiple possible table names for images
    let possible_tables = ["images", "Images", "image_records", "ImageRecords"];
    
    for table_name in &possible_tables {
        let sql = format!(
            "SELECT id, name, base64data, pageid, orderindex 
             FROM {} WHERE pageid = ?1 ORDER BY orderindex ASC, id ASC",
            table_name
        );
        
        if let Ok(mut stmt) = conn.prepare(&sql) {
            let image_iter = stmt.query_map(params![page_id], |row| {
                Ok(ImageRecord {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    base64: row.get(2)?,
                    pageId: row.get(3)?,
                    orderIndex: row.get(4).ok(),
                })
            });

            if let Ok(iter) = image_iter {
                for image_result in iter {
                    if let Ok(image) = image_result {
                        images.push(image);
                    }
                }
                
                if !images.is_empty() {
                    println!("Successfully fetched {} images from local table '{}'", images.len(), table_name);
                    break; // Found images in this table, no need to check others
                }
            }
        }
    }

    println!("Fetched {} images from local database for page {}", images.len(), page_id);
    Ok(images)
}
fn create_workspace_for_card_internal(
    card_name: &str,
    card_id: i32,
    page_id: i32
) -> Result<bool, String> {
    let client = reqwest::blocking::Client::new();
    
    // First, fetch the page to get workspace and folder information
    let page_url = format!("{}Page/{}", get_app_url(), page_id);
    let page_response = client
        .get(&page_url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !page_response.status().is_success() {
        return Err(format!("Failed to fetch page: HTTP {}", page_response.status()));
    }

    let page_data: serde_json::Value = page_response
        .json()
        .map_err(|e| format!("Failed to parse page JSON: {}", e))?;

    let workspace_id = page_data["workspaceId"]
        .as_i64()
        .ok_or("No workspaceId in page data")? as i32;

    // Fetch workspace to get folder information
    let workspace_url = format!("{}Workspace/{}", get_app_url(), workspace_id);
    let workspace_response = client
        .get(&workspace_url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if !workspace_response.status().is_success() {
        return Err(format!("Failed to fetch workspace: HTTP {}", workspace_response.status()));
    }

    let workspace_data: serde_json::Value = workspace_response
        .json()
        .map_err(|e| format!("Failed to parse workspace JSON: {}", e))?;

    let folder_id = workspace_data["folderId"]
        .as_str()
        .unwrap_or("0");

    // Now create the workspace
    let workspace_url_create = format!("{}Workspace/", get_app_url());
    let workspace_data_create = serde_json::json!({
        "id": 0,
        "name": card_name,
        "createdBy": get_current_user_id(),
        "createdDateTime": "2025-02-24T16:43:11.843Z",
        "lastModifyDateTime": "2025-02-24T16:43:11.843Z",
        "createdFromCardId": card_id,
        "folderId": folder_id
    });

    println!("(rust) Creating workspace for card: {:?}", workspace_data_create);

    let response = client
        .post(&workspace_url_create)
        .json(&workspace_data_create)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        println!("✅ Workspace created successfully for card: {}", card_name);
        Ok(true)
    } else {
        Err(format!("Failed to create workspace for card: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn create_workspace_for_card(
    name: String,
    card_id: i32,
    folder_Id: String
) -> Result<bool, String> {
    use reqwest::blocking::Client;

    // 1) Construct the URL for your Workspace API
    let url = format!("{}Workspace/", get_app_url()); 
    let client = Client::new();

    // 2) Build the JSON body
    // For example, pick a date/time or pass in real timestamps
    let workspace_data = serde_json::json!({
        "id": 0,
        "name": name,
        "createdBy": get_current_user_id(),
        "createdDateTime": "2025-02-24T16:43:11.843Z",
        "lastModifyDateTime": "2025-02-24T16:43:11.843Z",
        "createdFromCardId": card_id,
        "folderId": folder_Id
    });

    println!("(rust) Creating workspace: {:?}", workspace_data);

    // 3) Send POST request
    let response = client
        .post(&url)
        .json(&workspace_data)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;

    // 4) Check success
    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to create workspace: HTTP {}", response.status()))
    }
}
#[tauri::command]
fn update_card_position(card_id: i32, x: f64, y: f64) -> Result<bool, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Card/position", get_app_url());

    let body = serde_json::json!({
        "cardId": card_id,
        "x": x,
        "y": y
    });

    let response = client
        .put(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to create image: HTTP {}", response.status()))
    }
}
#[tauri::command]
fn update_note_order(note_id: i32, order_index: i32) -> Result<bool, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{}TextBox/order", get_app_url());

    let body = serde_json::json!({
        "noteId": note_id,
        "orderIndex": order_index
    });

    let response = client
        .put(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to create image: HTTP {}", response.status()))
    }
}
#[tauri::command]
fn update_image_order(image_id: i32, order_index: i32) -> Result<bool, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Image/order", get_app_url());

    let body = serde_json::json!({
        "imageId": image_id,
        "orderIndex": order_index
    });

    let response = client
        .put(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to create image: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn update_tasklist_order_for_page(page_id: i32, order_index: i32) -> Result<bool, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Page/order", get_app_url());

    let body = serde_json::json!({
        "pageId": page_id,
        "orderIndex": order_index
    });

    let response = client
        .put(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Failed to create image: HTTP {}", response.status()))
    }
}

#[tauri::command]
fn delete_vault(vaultId: i32) -> Result<bool, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{}Vault/{}", get_app_url(), vaultId);
    
    let response = client
        .request(Method::DELETE, &url)
        .header("Content-Type", "application/json")
        .send()
        .map_err(|e| e.to_string())?;
    
    let status = response.status();
    
    // Consider both 2xx and 404 as success (404 means already deleted)
    if status.is_success() || status == reqwest::StatusCode::NOT_FOUND {
        Ok(true)
    } else {
        Err(format!("Failed to delete vault: HTTP {}", status))
    }
}

#[tauri::command]
fn sign_out() -> Result<bool, String> {
    println!("(rust) sign_out");

    // Clear the current user ID
    *CURRENT_USER_ID.lock().unwrap() = None;

    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Try to open the database when the application starts
    match open_database() {
        Ok(conn) => {
            println!("(rust) Opened SQLite DB");
            // Ensure that the database is closed after opening
            close_database(conn);
        },
        Err(err) => {
            println!("(rust) ERROR Opening SQLite DB: {}", err);
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            sign_in,
            sign_out,
            is_app_available,
            add_task,
            add_file_to_task,
            delete_task,
            get_username,
            get_all_users_for_company,
            get_id_for_user,
            create_user,
            register_user,
            authenticate_user,
            create_vault,
            rename_vault,
            fetch_vaults,
            fetch_folders,
            create_folder_for_vault,
            create_file_for_folder,
            fetch_files,
            create_workspace_for_folder,
            create_workspace_for_task,
            fetch_workspaces,
            fetch_workspace,
            fetch_pages_for_workspace,
            fetch_tasks_for_page,
            fetch_tasks_for_workspace,
            create_task_for_page,
            update_task,
            fetch_workspaces_for_task,
            fetch_workspaces_for_card,
            rename_page,
            create_page_for_workspace,
            create_url_for_folder,
            fetch_weburls,
            fetch_weburls_for_folder,
            create_textbox_for_page,
            fetch_textboxes,
            fetch_textbox_for_page,
            create_event,
            delete_event,
            get_all_events_for_current_user,
            get_upcoming_events_for_current_user,
            open_local_folder,
            get_current_user_id,
            get_users_for_vault,
            get_vault_permissions,
            remove_vault_permission,
            update_vault_user,
            open_single_file_picker,
            read_file_as_base64,
            delete_file,
            delete_url,
            delete_textbox,
            delete_image,
            delete_workspace,
            delete_folder,
            delete_page,
            set_current_user_plan,
            update_textbox_text,
            fetch_cards_for_page,
            create_card_for_page,
            update_card,
            delete_card,
            fetch_card_connections_for_page,
            get_pinned_tasks_for_user,
            get_favorite_tasks_for_user,
            get_assigned_tasks_for_user,
            get_due_today_tasks_for_user,
            favorite_task,
            pin_task,
            unfavorite_task,
            unpin_task,
            is_task_favorited,
            is_task_pinned,
            create_card_connection,
            create_image_for_page,
            fetch_images_for_page,
            add_o365_user,
            get_external_username,
            get_user_profile,
            update_user_profile,
            update_user_password, 
            update_card_position,
            create_workspace_for_card,
            update_image_order,
            update_note_order,
            update_tasklist_order_for_page,
            upload_file_to_o365_folder,
            open_o365_file,
            get_access_token,
            fetch_company_data,
            fetch_o365_user_data,
            test_o365_permissions,
            delete_vault
            // Add other commands as needed
        ])
        .run(tauri::generate_context!())
        .expect("error while running taskhub application");
}