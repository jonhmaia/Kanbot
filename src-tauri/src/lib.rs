use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use tauri::{Emitter, Manager, WindowEvent};

static QUITTING: AtomicBool = AtomicBool::new(false);
static ISLAND_VISIBLE: AtomicBool = AtomicBool::new(true);
static ISLAND_EXPANDED: AtomicBool = AtomicBool::new(false);
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
        "chatdock" => "chatdock",
        _ => "top",
    }
}

fn island_size(edge: &str, expanded: bool) -> (f64, f64) {
    match (normalize_edge(edge), expanded) {
        (_, true) => (312.0, 360.0),
        ("chatdock", false) => (56.0, 56.0),
        ("left", false) | ("right", false) => (44.0, 168.0),
        ("top", false) if cfg!(target_os = "macos") => (236.0, 38.0),
        _ => (264.0, 44.0),
    }
}

fn px(scale: f64, logical: f64) -> i32 {
    (logical * scale).round() as i32
}

fn island_monitor(window: &tauri::WebviewWindow) -> Option<tauri::Monitor> {
    window
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| window.primary_monitor().ok().flatten())
}

fn place_island(window: &tauri::WebviewWindow, edge: &str, width: f64, height: f64) {
    let Some(monitor) = island_monitor(window) else {
        return;
    };
    let screen = monitor.size();
    let origin = monitor.position();
    let scale = monitor.scale_factor();
    let w = px(scale, width);
    let h = px(scale, height);
    let pad = px(scale, 10.0);
    let top_pad = if cfg!(target_os = "macos") { 0 } else { pad };
    let (x, y) = match normalize_edge(edge) {
        "left" => (
            origin.x + pad,
            origin.y + (screen.height as i32 - h) / 2,
        ),
        "right" => (
            origin.x + screen.width as i32 - w - pad,
            origin.y + (screen.height as i32 - h) / 2,
        ),
        "chatdock" => (
            origin.x + screen.width as i32 - w - pad,
            origin.y + screen.height as i32 - h - pad,
        ),
        _ => (
            origin.x + (screen.width as i32 - w) / 2,
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
    let changed = current_edge() != dock;
    set_edge(&dock);
    ISLAND_EXPANDED.store(expanded, Ordering::SeqCst);
    let (width, height) = island_size(&dock, expanded);
    island
        .set_size(tauri::LogicalSize::new(width, height))
        .map_err(|e| e.to_string())?;
    place_island(island, &dock, width, height);
    if changed {
        let _ = island.emit("island-edge", dock.clone());
    }
    Ok(dock)
}

fn infer_edge(window: &tauri::WebviewWindow) -> String {
    let Some(monitor) = island_monitor(window) else {
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
    let width = f64::from(screen.width).max(1.0);
    let height = f64::from(screen.height).max(1.0);
    let cx = (pos.x - origin.x) as f64 + f64::from(size.width) / 2.0;
    let cy = (pos.y - origin.y) as f64 + f64::from(size.height) / 2.0;
    let x_ratio = cx / width;
    let y_ratio = cy / height;
    if x_ratio > 0.78 && y_ratio > 0.78 {
        return "chatdock".into();
    }
    let left = cx;
    let right = width - cx;
    let top = cy;
    if left < right && left < top && x_ratio < 0.22 {
        "left".into()
    } else if right < left && right < top && x_ratio > 0.78 {
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
fn hide_island(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(island) = app.get_webview_window("island") {
        island.hide().map_err(|e| e.to_string())?;
    }
    ISLAND_VISIBLE.store(false, Ordering::SeqCst);
    if let Some(main) = app.get_webview_window("main") {
        if !main.is_visible().unwrap_or(true) {
            show_window(&app, "main")?;
        }
    }
    Ok(())
}

#[tauri::command]
fn show_island(app: tauri::AppHandle) -> Result<(), String> {
    let Some(island) = app.get_webview_window("island") else {
        return Ok(());
    };
    let visible = island.is_visible().unwrap_or(false);
    if !visible {
        apply_island_layout(&island, false, &current_edge())?;
    }
    island.show().map_err(|e| e.to_string())?;
    ISLAND_VISIBLE.store(true, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
fn position_island(app: tauri::AppHandle) {
    if let Some(island) = app.get_webview_window("island") {
        let (width, height) = island_size(&current_edge(), ISLAND_EXPANDED.load(Ordering::SeqCst));
        place_island(&island, &current_edge(), width, height);
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
                let edge = current_edge();
                set_edge(&edge);
                let _ = apply_island_layout(&island, false, &edge);
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
                        if ISLAND_VISIBLE.load(Ordering::SeqCst) {
                            api.prevent_close();
                            let _ = window.hide();
                        } else {
                            QUITTING.store(true, Ordering::SeqCst);
                            api.prevent_close();
                            window.app_handle().exit(0);
                        }
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
                            let _ = apply_island_layout(
                                &island,
                                ISLAND_EXPANDED.load(Ordering::SeqCst),
                                &current_edge(),
                            );
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
            hide_island,
            show_island,
            position_island,
            resize_island,
            start_drag_island,
            snap_island,
            open_chat
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Kanbot");
}
