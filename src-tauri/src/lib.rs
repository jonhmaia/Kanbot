use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{Emitter, Manager, WindowEvent};

const ISLAND_COLLAPSED: (f64, f64) = (220.0, 52.0);
const ISLAND_EXPANDED: (f64, f64) = (360.0, 308.0);

static QUITTING: AtomicBool = AtomicBool::new(false);

fn place_top_center(window: &tauri::WebviewWindow) {
    let Ok(Some(monitor)) = window.primary_monitor() else {
        return;
    };
    let screen = monitor.size();
    let origin = monitor.position();
    let Ok(size) = window.outer_size() else {
        return;
    };
    let x = origin.x + (screen.width as i32 - size.width as i32) / 2;
    let y = origin.y + (8.0 * monitor.scale_factor()).round() as i32;
    let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
}

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

#[tauri::command]
fn position_island(app: tauri::AppHandle) {
    if let Some(island) = app.get_webview_window("island") {
        place_top_center(&island);
    }
}

#[tauri::command]
fn resize_island(app: tauri::AppHandle, expanded: bool) -> Result<(), String> {
    let Some(island) = app.get_webview_window("island") else {
        return Ok(());
    };
    let (width, height) = if expanded {
        ISLAND_EXPANDED
    } else {
        ISLAND_COLLAPSED
    };
    island
        .set_size(tauri::LogicalSize::new(width, height))
        .map_err(|e| e.to_string())?;
    place_top_center(&island);
    Ok(())
}

#[tauri::command]
fn open_chat(app: tauri::AppHandle) -> Result<(), String> {
    show_window(&app, "main")?;
    if let Some(main) = app.get_webview_window("main") {
        main.emit("kanbot-open-chat", ())
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(island) = app.get_webview_window("island") {
                place_top_center(&island);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if QUITTING.load(Ordering::SeqCst) {
                return;
            }
            match window.label() {
                "main" => match event {
                    WindowEvent::CloseRequested { api, .. } => {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                    WindowEvent::Resized(_) => {
                        if window.is_minimized().unwrap_or(false) {
                            let _ = window.hide();
                            let _ = window.unminimize();
                        }
                    }
                    _ => {}
                },
                "island" => match event {
                    WindowEvent::CloseRequested { api, .. } => {
                        api.prevent_close();
                    }
                    WindowEvent::ScaleFactorChanged { .. } => {
                        if let Some(island) = window.app_handle().get_webview_window("island") {
                            place_top_center(&island);
                        }
                    }
                    _ => {}
                },
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            show_main,
            hide_main,
            quit_app,
            position_island,
            resize_island,
            open_chat
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Kanbot");
}
