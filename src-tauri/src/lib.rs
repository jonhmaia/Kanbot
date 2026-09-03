use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use tauri::{Emitter, Manager, WindowEvent};

static QUITTING: AtomicBool = AtomicBool::new(false);
static ISLAND_EDGE: Mutex<String> = Mutex::new(String::new());

fn set_edge(edge: &str) {
    if let Ok(mut guard) = ISLAND_EDGE.lock() {
        *guard = normalize_edge(edge).to_string();
    }
}

fn current_edge() -> String {
    ISLAND_EDGE
        .lock()
        .ok()
        .map(|guard| guard.clone())
        .filter(|edge| !edge.is_empty())
        .unwrap_or_else(|| "top".into())
}

fn normalize_edge(edge: &str) -> &'static str {
    match edge {
        "left" => "left",
        "right" => "right",
        _ => "top",
    }
}

fn island_size(edge: &str, expanded: bool) -> (f64, f64) {
    match (normalize_edge(edge), expanded) {
        ("top", false) if cfg!(target_os = "macos") => (200.0, 34.0),
        ("top", false) => (280.0, 52.0),
        ("top", true) => (520.0, 340.0),
        (_, false) => (52.0, 240.0),
        (_, true) => (380.0, 360.0),
    }
}

fn place_island(window: &tauri::WebviewWindow, edge: &str) {
    let Ok(Some(monitor)) = window.primary_monitor() else {
        return;
    };
    let screen = monitor.size();
    let origin = monitor.position();
    let Ok(size) = window.outer_size() else {
        return;
    };
    let pad = (8.0 * monitor.scale_factor()).round() as i32;
    let top_pad = if cfg!(target_os = "macos") { 0 } else { pad };
    let (x, y) = match normalize_edge(edge) {
        "left" => (
            origin.x + pad,
            origin.y + (screen.height as i32 - size.height as i32) / 2,
        ),
        "right" => (
            origin.x + screen.width as i32 - size.width as i32 - pad,
            origin.y + (screen.height as i32 - size.height as i32) / 2,
        ),
        _ => (
            origin.x + (screen.width as i32 - size.width as i32) / 2,
            origin.y + top_pad,
        ),
    };
    let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
}

fn apply_island_layout(
    island: &tauri::WebviewWindow,
    expanded: bool,
    edge: &str,
) -> Result<String, String> {
    let dock = normalize_edge(edge).to_string();
    set_edge(&dock);
    let (width, height) = island_size(&dock, expanded);
    island
        .set_size(tauri::LogicalSize::new(width, height))
        .map_err(|e| e.to_string())?;
    place_island(island, &dock);
    let _ = island.emit("island-edge", dock.clone());
    Ok(dock)
}

fn infer_edge(window: &tauri::WebviewWindow) -> String {
    let Ok(Some(monitor)) = window.primary_monitor() else {
        return current_edge();
    };
    let Ok(pos) = window.outer_position() else {
        return current_edge();
    };
    let Ok(size) = window.outer_size() else {
        return current_edge();
    };
    let screen = monitor.size();
    let origin = monitor.position();
    let cx = (pos.x - origin.x) as f64 + f64::from(size.width) / 2.0;
    let ratio = cx / f64::from(screen.width);
    if ratio < 0.28 {
        "left".into()
    } else if ratio > 0.72 {
        "right".into()
    } else {
        "top".into()
    }
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
        place_island(&island, &current_edge());
    }
}

#[tauri::command]
fn resize_island(app: tauri::AppHandle, expanded: bool, edge: Option<String>) -> Result<String, String> {
    let Some(island) = app.get_webview_window("island") else {
        return Ok(current_edge());
    };
    let dock = edge.unwrap_or_else(current_edge);
    apply_island_layout(&island, expanded, &dock)
}

#[tauri::command]
fn start_drag_island(app: tauri::AppHandle) -> Result<(), String> {
    let Some(island) = app.get_webview_window("island") else {
        return Ok(());
    };
    island.start_dragging().map_err(|e| e.to_string())
}

#[tauri::command]
fn snap_island(app: tauri::AppHandle, expanded: bool) -> Result<String, String> {
    let Some(island) = app.get_webview_window("island") else {
        return Ok(current_edge());
    };
    let edge = infer_edge(&island);
    apply_island_layout(&island, expanded, &edge)
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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if let Some(island) = app.get_webview_window("island") {
                set_edge("top");
                place_island(&island, "top");
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
                            place_island(&island, &current_edge());
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
            start_drag_island,
            snap_island,
            open_chat
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Kanbot");
}
