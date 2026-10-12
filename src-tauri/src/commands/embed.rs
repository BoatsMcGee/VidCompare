//! Tauri commands for embedding the real video-compare window.
//!
//! Flow: `embed_launch` spawns video-compare (via the shared launch
//! machinery, so stdout/stderr keep streaming to the log panel), waits for
//! its top-level window, captures it (borderless + owned by the app
//! window), and positions it over the HTML embed surface. The frontend
//! tracks the surface rect per animation frame via `embed_set_rect`; the
//! backend dedupes identical rects. `launch://exit` tells the frontend
//! when the child quits.

use super::launch::{self, LaunchState};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
#[cfg(windows)]
use tauri::Manager;

#[cfg(windows)]
use super::embed_window;

/// Bookkeeping for one embedded child window.
#[cfg_attr(not(windows), allow(dead_code))]
struct EmbedHandle {
    hwnd: isize,
    owner: isize,
    visible: bool,
    last_rect: Option<Rect>,
}

#[derive(Default)]
pub struct EmbedState {
    embeds: Mutex<HashMap<String, EmbedHandle>>,
}

impl Drop for EmbedState {
    fn drop(&mut self) {
        #[cfg(windows)]
        if let Ok(mut embeds) = self.embeds.lock() {
            for (_, handle) in embeds.drain() {
                embed_window::release_window(windows::Win32::Foundation::HWND(
                    handle.hwnd as *mut std::ffi::c_void,
                ));
            }
        }
    }
}

/// Physical-pixel rect relative to the window client area (frontend-measured).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Serialize)]
pub struct EmbedLaunchResult {
    pub id: String,
    pub started_at: u64,
    pub pid: u32,
    /// True when the child window was captured and is rendered in-app.
    pub embedded: bool,
    /// Present when `embedded` is false: why the fallback is used.
    pub reason: Option<String>,
}

/// Spawn video-compare and embed its window over the given surface rect.
#[tauri::command]
pub fn embed_launch(
    app: tauri::AppHandle,
    launch_state: tauri::State<'_, LaunchState>,
    embed_state: tauri::State<'_, EmbedState>,
    binary: String,
    args: Vec<String>,
    rect: Rect,
) -> Result<EmbedLaunchResult, String> {
    let (handle, _child) = launch::spawn_managed(&app, &launch_state, &binary, &args)?;

    #[cfg(windows)]
    {
        let window = app
            .get_webview_window("main")
            .ok_or("main window missing")?;
        let owner = window.hwnd().map_err(|e| e.to_string())?;
        match embed_window::find_window_by_pid(handle.pid, 5000).and_then(|hwnd| {
            let captured = embed_window::capture_window(owner, hwnd);
            captured.map(|()| hwnd)
        }) {
            Ok(hwnd) => {
                embed_window::position_window(owner, hwnd, to_embed_rect(rect), true)?;
                embed_state
                    .embeds
                    .lock()
                    .map_err(|e| e.to_string())?
                    .insert(
                        handle.id.clone(),
                        EmbedHandle {
                            hwnd: hwnd.0 as isize,
                            owner: owner.0 as isize,
                            visible: true,
                            last_rect: Some(rect),
                        },
                    );
                Ok(EmbedLaunchResult {
                    id: handle.id,
                    started_at: handle.started_at,
                    pid: handle.pid,
                    embedded: true,
                    reason: None,
                })
            }
            Err(e) => Ok(EmbedLaunchResult {
                id: handle.id,
                started_at: handle.started_at,
                pid: handle.pid,
                embedded: false,
                reason: Some(e),
            }),
        }
    }
    #[cfg(not(windows))]
    {
        let _ = (embed_state, rect);
        Ok(EmbedLaunchResult {
            id: handle.id,
            started_at: handle.started_at,
            pid: handle.pid,
            embedded: false,
            reason: Some("window embedding is Windows-only".into()),
        })
    }
}

/// Track the embed surface: move/show/hide the captured window.
#[tauri::command]
pub fn embed_set_rect(
    state: tauri::State<'_, EmbedState>,
    id: String,
    rect: Rect,
    visible: bool,
) -> Result<(), String> {
    #[cfg(windows)]
    {
        let mut embeds = state.embeds.lock().map_err(|e| e.to_string())?;
        let Some(handle) = embeds.get_mut(&id) else {
            return Ok(());
        };
        if handle.visible == visible && handle.last_rect == Some(rect) {
            return Ok(());
        }
        let owner = windows::Win32::Foundation::HWND(handle.owner as *mut std::ffi::c_void);
        let hwnd = windows::Win32::Foundation::HWND(handle.hwnd as *mut std::ffi::c_void);
        embed_window::position_window(owner, hwnd, to_embed_rect(rect), visible)?;
        handle.visible = visible;
        handle.last_rect = Some(rect);
    }
    #[cfg(not(windows))]
    let _ = (state, id, rect, visible);
    Ok(())
}

#[tauri::command]
pub fn embed_available() -> bool {
    #[cfg(windows)]
    {
        embed_window::embeddable()
    }
    #[cfg(not(windows))]
    {
        embed_window::embeddable()
    }
}

/// Release an embed: detach the window so it can outlive the app UI.
#[tauri::command]
pub fn embed_release(state: tauri::State<'_, EmbedState>, id: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        let mut embeds = state.embeds.lock().map_err(|e| e.to_string())?;
        if let Some(handle) = embeds.remove(&id) {
            embed_window::release_window(windows::Win32::Foundation::HWND(
                handle.hwnd as *mut std::ffi::c_void,
            ));
        }
    }
    #[cfg(not(windows))]
    let _ = (state, id);
    Ok(())
}

#[cfg(windows)]
fn to_embed_rect(rect: Rect) -> embed_window::EmbedRect {
    embed_window::EmbedRect {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
    }
}
