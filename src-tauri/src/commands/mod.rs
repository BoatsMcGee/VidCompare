pub mod binary;
pub mod embed;
#[cfg(windows)]
pub mod embed_window;
#[cfg(not(windows))]
#[path = "embed_window_stub.rs"]
pub mod embed_window;
pub mod files;
#[cfg(windows)]
pub mod job;
pub mod launch;
pub mod profiles;
pub mod settings;
