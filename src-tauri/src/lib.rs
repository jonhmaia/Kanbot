use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{Manager, WindowEvent};

static QUITTING: AtomicBool = AtomicBool::new(false);

fn show_window(app: &tauri::AppHandle, label: &str) -> Result<(), String> {
    let Some(window) = app.get_webview_window(label) else {
        return Ok(());
    };
    window.show().map_err(|e| e.to_string())?;
    let _ = window.unminimize();
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn show_main(app: tauri::AppHandle) -> Result<(), String> {
    show_window(&app, "main")
}

#[tauri::command]
fn hide_main(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    QUITTING.store(true, Ordering::SeqCst);
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .on_window_event(|window, event| {
            if QUITTING.load(Ordering::SeqCst) {
                return;
            }
            if window.label() != "main" {
                return;
            }
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    QUITTING.store(true, Ordering::SeqCst);
                    api.prevent_close();
                    window.app_handle().exit(0);
                }
                WindowEvent::Resized(_) => {
                    if window.is_minimized().unwrap_or(false) {
                        let _ = window.hide();
                        let _ = window.unminimize();
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![show_main, hide_main, quit_app])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Kanbot");
}
