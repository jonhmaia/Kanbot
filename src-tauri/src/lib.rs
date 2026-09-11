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

/// Transparent inset around the opaque pill. WebView2 on Windows clips the
/// first pixels of a layered HWND; without this chrome the left curve dies.
const ISLAND_CHROME: f64 = 12.0;

fn island_inner_size(edge: &str, expanded: bool) -> (f64, f64) {
    match (normalize_edge(edge), expanded) {
        (_, true) => (360.0, 560.0),
        ("chatdock", false) => (56.0, 56.0),
        ("left", false) | ("right", false) => (76.0, 248.0),
        ("top", false) if cfg!(target_os = "macos") => (280.0, 38.0),
        _ => (280.0, 40.0),
    }
}

fn island_size(edge: &str, expanded: bool) -> (f64, f64) {
    let (width, height) = island_inner_size(edge, expanded);
    let chrome = ISLAND_CHROME;
    match normalize_edge(edge) {
        "left" | "right" => (width + chrome, height + chrome * 2.0),
        "chatdock" => (width + chrome * 2.0, height + chrome * 2.0),
        _ => (width + chrome * 2.0, height + chrome),
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
    let corner = px(scale, 10.0);
    let (x, y) = match normalize_edge(edge) {
        "left" => (origin.x, origin.y + (screen.height as i32 - h) / 2),
        "right" => (
            origin.x + screen.width as i32 - w,
            origin.y + (screen.height as i32 - h) / 2,
        ),
        "chatdock" => (
            origin.x + screen.width as i32 - w - corner,
            origin.y + screen.height as i32 - h - corner,
        ),
        _ => (origin.x + (screen.width as i32 - w) / 2, origin.y),
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
    if expanded {
        let _ = island.set_focus();
    }
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

#[tauri::command]
fn capture_screen(app: tauri::AppHandle) -> Result<String, String> {
    let point = app.get_webview_window("island").and_then(|island| {
        island_monitor(&island).map(|monitor| {
            let origin = monitor.position();
            let size = monitor.size();
            (
                origin.x + size.width as i32 / 2,
                origin.y + size.height as i32 / 2,
            )
        })
    });

    let monitor = if let Some((x, y)) = point {
        xcap::Monitor::from_point(x, y).map_err(|e| e.to_string())?
    } else {
        xcap::Monitor::all()
            .map_err(|e| e.to_string())?
            .into_iter()
            .find(|item| item.is_primary().unwrap_or(false))
            .ok_or_else(|| "Nenhum monitor encontrado".to_string())?
    };

    let rgba = monitor.capture_image().map_err(|e| {
        format!(
            "Nao consegui capturar a tela. No macOS, permita gravacao de tela para o Kanbot. ({e})"
        )
    })?;

    let mut img = image::DynamicImage::ImageRgba8(rgba);
    let (width, height) = image::GenericImageView::dimensions(&img);
    let max = 1280u32;
    if width.max(height) > max {
        let scale = max as f32 / width.max(height) as f32;
        img = img.resize(
            ((width as f32) * scale).round().max(1.0) as u32,
            ((height as f32) * scale).round().max(1.0) as u32,
            image::imageops::FilterType::Triangle,
        );
    }

    let rgb = img.to_rgb8();
    let mut out = Vec::new();
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, 55);
    encoder
        .encode(
            rgb.as_raw(),
            rgb.width(),
            rgb.height(),
            image::ExtendedColorType::Rgb8,
        )
        .map_err(|e| e.to_string())?;

    Ok(format!(
        "data:image/jpeg;base64,{}",
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, out)
    ))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if let Some(island) = app.get_webview_window("island") {
                let _ = island.eval(
                    "document.documentElement.classList.add('island');window.__KANBOT_ISLAND__=1;",
                );
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
            open_chat,
            capture_screen
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Kanbot");
}
