//! Shared process-spawn helpers.
//!
//! video-compare is a **console-subsystem** binary (PE subsystem 3) while
//! VidCompare is a GUI app (subsystem 2). When a GUI process spawns a
//! console child, Windows allocates a brand-new console window for it —
//! which flashes a terminal on screen and can steal focus, even when the
//! child's stdio is piped or discarded.
//!
//! `CREATE_NO_WINDOW` (0x08000000) tells the OS to create the process
//! without any console, which is what every spawn in this app wants: the
//! sidecar's stdout/stderr are captured through pipes, and its SDL window
//! is a normal GUI window that does not need a console.

use std::process::{Command, Stdio};

/// `CREATE_NO_WINDOW` — create the process without a console window.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Apply the no-console creation flag on Windows.
///
/// No-op on other platforms, where the concept does not exist.
pub fn hide_console(cmd: &mut Command) -> &mut Command {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(not(windows))]
    let _ = cmd;
    cmd
}

/// Spawn `binary args` with piped stdio and no console window.
///
/// Used by the launch and embed flows, where the child's output is streamed
/// to the log panel.
pub fn spawn_hidden(binary: &str, args: &[String]) -> std::io::Result<std::process::Child> {
    let mut cmd = Command::new(binary);
    cmd.args(args).stdout(Stdio::piped()).stderr(Stdio::piped());
    hide_console(&mut cmd);
    cmd.spawn()
}

/// Run `binary args` to completion with output captured and no console
/// window. Used for short informational invocations (`--version`,
/// `--find-*`).
pub fn output_hidden(binary: &str, args: &[String]) -> std::io::Result<std::process::Output> {
    let mut cmd = Command::new(binary);
    cmd.args(args);
    hide_console(&mut cmd);
    cmd.output()
}
