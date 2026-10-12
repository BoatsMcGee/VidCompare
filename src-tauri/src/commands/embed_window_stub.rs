//! Non-Windows stub for the window-embed module.
//!
//! Cross-process window embedding is Windows-first
//! (`reports/research-embedding-final.md`): macOS forbids reparenting
//! another process's window and Wayland has no stable foreign-surface
//! protocol, so both fall back to the external video-compare window.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EmbedRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

pub fn embeddable() -> bool {
    false
}
