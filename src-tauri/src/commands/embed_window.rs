//! Embed the real video-compare window inside the app (Windows).
//!
//! video-compare is spawned as a child process and its top-level window is
//! captured by PID, restyled borderless, and reparented as an **owned**
//! popup positioned over the HTML embed surface. The child keeps its own
//! process, renderer, and keyboard handling — this is a true embed of the
//! upstream tool, not a recreation: every video-compare feature and
//! shortcut keeps working, with input forwarded to the child window.
//!
//! Owned windows always sit above their owner's children (including
//! WebView2's compositor windows), so the captured window reliably covers
//! the placeholder and stays above the app while the page scrolls.
//! Coordinates are physical pixels relative to the client area; the
//! frontend measures CSS rects and scales by `devicePixelRatio`.
//!
//! Non-Windows targets use a stub: `embeddable()` is false and the frontend
//! falls back to the external-window flow (macOS forbids cross-process
//! reparenting; Wayland has no stable foreign-surface protocol — see
//! reports/research-embedding-final.md).

use windows::Win32::Foundation::{HWND, LPARAM, POINT, RECT};
use windows::Win32::Graphics::Gdi::{ClientToScreen, InvalidateRect};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GWL_EXSTYLE, GWL_HWNDPARENT, GWL_STYLE, GetClientRect, GetWindowLongPtrW,
    GetWindowTextLengthW, GetWindowThreadProcessId, IsWindowVisible, SW_HIDE, SW_SHOWNOACTIVATE,
    SWP_ASYNCWINDOWPOS, SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER,
    SetWindowLongPtrW, SetWindowPos, ShowWindow, WINDOW_EX_STYLE, WINDOW_STYLE, WS_CAPTION,
    WS_EX_TOOLWINDOW, WS_MAXIMIZEBOX, WS_MINIMIZEBOX, WS_SYSMENU, WS_THICKFRAME,
};
use windows::core::BOOL;

/// Physical-pixel rect relative to the window client area.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EmbedRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

/// Window embedding is supported on this platform.
pub fn embeddable() -> bool {
    true
}

/// How long to wait for the child to create its top-level window.
///
/// The first launch on a cold system must page in ~235 MB of FFmpeg DLLs
/// before video-compare opens its window; measured at ~5.6 s on a warm disk
/// and longer when an on-access scanner inspects each DLL. Subsequent
/// launches reuse the file cache and take ~0.3 s. The wait therefore has to
/// tolerate a slow first start instead of failing at a couple of seconds.
const WINDOW_WAIT_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(30);

/// Find the top-level window of a process by PID. Returns the first visible
/// window with a title (video-compare names its window), retrying until the
/// window appears or the process exits without creating one.
pub fn find_window_by_pid(pid: u32, timeout_ms: u32) -> Result<HWND, String> {
    let timeout = if timeout_ms == 0 {
        WINDOW_WAIT_TIMEOUT
    } else {
        std::time::Duration::from_millis(timeout_ms as u64)
    };
    let deadline = std::time::Instant::now() + timeout;
    let started = std::time::Instant::now();
    loop {
        let found: Option<HWND>;
        unsafe {
            let _ = EnumWindows(Some(enum_proc), LPARAM(pid as isize)).map_err(|e| e.to_string());
            found = take_found_window();
        }
        if let Some(hwnd) = found {
            log::info!(
                "embed: video-compare window found after {:.2}s (pid {pid})",
                started.elapsed().as_secs_f32()
            );
            return Ok(hwnd);
        }
        // Fail fast when the child died (bad arguments, missing codec, …):
        // waiting out the full timeout would hide the real cause.
        if let Some(code) = process_exit_code(pid) {
            return Err(format!(
                "video-compare exited (code {code}) before opening a window"
            ));
        }
        if std::time::Instant::now() >= deadline {
            log::warn!(
                "embed: no window for pid {pid} after {:.1}s",
                started.elapsed().as_secs_f32()
            );
            return Err(format!(
                "no window found for pid {pid} (waited {:.1}s)",
                started.elapsed().as_secs_f32()
            ));
        }
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
}

thread_local! {
    static FOUND_WINDOW: std::cell::RefCell<Option<HWND>> = const { std::cell::RefCell::new(None) };
}

unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let pid = lparam.0 as u32;
    let mut window_pid: u32 = 0;
    unsafe {
        GetWindowThreadProcessId(hwnd, Some(&mut window_pid));
        if window_pid != pid || !IsWindowVisible(hwnd).as_bool() {
            return BOOL(1); // continue
        }
        // Prefer windows with a title (video-compare names its window).
        if GetWindowTextLengthW(hwnd) > 0 {
            FOUND_WINDOW.with(|slot| *slot.borrow_mut() = Some(hwnd));
            return BOOL(0); // stop
        }
    }
    BOOL(1)
}

/// Returns `Some(exit_code)` if the process has exited, `None` if it is
/// still running (or could not be queried).
pub fn process_exit_code(pid: u32) -> Option<u32> {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{
        GetExitCodeProcess, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    const STILL_ACTIVE: u32 = 259;
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let mut code: u32 = 0;
        let ok = GetExitCodeProcess(handle, &mut code).is_ok();
        let _ = CloseHandle(handle);
        if !ok {
            return None;
        }
        if code == STILL_ACTIVE { None } else { Some(code) }
    }
}

fn take_found_window() -> Option<HWND> {
    FOUND_WINDOW.with(|slot| slot.borrow_mut().take())
}

/// Restyle the captured window: strip the caption/borders, make it a popup
/// owned by the app window (so it always floats above the WebView), and
/// hide it from the taskbar/alt-tab.
///
/// `GWL_HWNDPARENT` holds a pointer-sized HWND, so it must be read and
/// written with `GetWindowLongPtrW`/`SetWindowLongPtrW`. The 32-bit
/// `GetWindowLongW`/`SetWindowLongW` variants truncate the handle on
/// 64-bit Windows, which silently breaks ownership — the child then
/// behaves like an ordinary top-level window and can fall behind the app
/// whenever the app window is activated (e.g. by scrolling).
pub fn capture_window(owner: HWND, hwnd: HWND) -> Result<(), String> {
    unsafe {
        let old_style = GetWindowLongPtrW(hwnd, GWL_STYLE) as u32;
        let old_ex = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
        let style = WINDOW_STYLE(
            old_style
                & !(WS_CAPTION.0
                    | WS_THICKFRAME.0
                    | WS_MINIMIZEBOX.0
                    | WS_MAXIMIZEBOX.0
                    | WS_SYSMENU.0),
        );
        let ex = WINDOW_EX_STYLE(old_ex | WS_EX_TOOLWINDOW.0);
        SetWindowLongPtrW(hwnd, GWL_STYLE, style.0 as isize);
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex.0 as isize);

        // Reparent as an owned popup: SetWindowLongPtr with GWL_HWNDPARENT
        // is the documented way to change ownership at runtime.
        SetWindowLongPtrW(hwnd, GWL_HWNDPARENT, owner.0 as isize);

        SetWindowPos(
            hwnd,
            None,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED,
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Client-area aspect ratio (w/h) of the captured window, measured before
/// restyling. video-compare sizes its window to the videos, so this is the
/// content aspect the frontend should letterbox to. Falls back to the
/// window rect when the client area is not yet laid out.
pub fn window_aspect(hwnd: HWND) -> Option<f64> {
    unsafe {
        let mut client = RECT::default();
        if GetClientRect(hwnd, &mut client).is_ok() {
            let w = client.right - client.left;
            let h = client.bottom - client.top;
            if w > 0 && h > 0 {
                return Some(w as f64 / h as f64);
            }
        }
    }
    None
}

/// Position the captured window over the embed surface (client coords).
///
/// The surface rect is intersected with the owner's client area so the
/// captured window is **clipped to what is actually visible**: when the
/// page scrolls the surface partly off-screen, the child is resized and
/// moved to the visible slice instead of overflowing past the app window.
/// `SWP_ASYNCWINDOWPOS` keeps the child tracking the scroll without
/// waiting for the app's paint cycle.
pub fn position_window(
    owner: HWND,
    hwnd: HWND,
    rect: EmbedRect,
    visible: bool,
) -> Result<(), String> {
    unsafe {
        let mut client = RECT::default();
        GetClientRect(owner, &mut client).map_err(|e| e.to_string())?;

        // Intersect the surface with the owner's client area (client coords).
        let left = rect.x.max(client.left);
        let top = rect.y.max(client.top);
        let right = (rect.x + rect.width).min(client.right);
        let bottom = (rect.y + rect.height).min(client.bottom);
        let width = right - left;
        let height = bottom - top;

        // Fully scrolled out of view: hide rather than shrink to nothing.
        if !visible || width <= 0 || height <= 0 {
            let _ = ShowWindow(hwnd, SW_HIDE);
            return Ok(());
        }

        let mut screen = POINT { x: left, y: top };
        if !ClientToScreen(owner, &mut screen).as_bool() {
            return Err("ClientToScreen failed".into());
        }
        SetWindowPos(
            hwnd,
            None,
            screen.x,
            screen.y,
            width,
            height,
            SWP_NOACTIVATE | SWP_NOZORDER | SWP_ASYNCWINDOWPOS,
        )
        .map_err(|e| e.to_string())?;
        let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
        let _ = InvalidateRect(Some(hwnd), None, true);
    }
    Ok(())
}

/// Release the capture: restore styles and detach ownership so the window
/// can outlive the embed (used on app exit / unembed).
pub fn release_window(hwnd: HWND) {
    unsafe {
        SetWindowLongPtrW(hwnd, GWL_HWNDPARENT, 0);
        let _ = ShowWindow(hwnd, SW_HIDE);
    }
}
