// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    println!("(rust) TaskHub App Up && Running");
    taskhub_lib::run()
}
