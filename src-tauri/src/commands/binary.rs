use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BinaryInfo {
    pub path: String,
    pub source: String, // "bundled" | "custom"
    pub version: String,
}

/// Warm the sidecar so the user's first Compare is not slow.
///
/// Runs the binary in a mode that exits immediately (`--version`). The
/// process still resolves its full import table on start, so the OS loader
/// maps the ~278 MB of FFmpeg/SDL2 libraries and the first-run antimalware
/// scan of those files completes — off the critical path of the first
/// Compare. Measured cold read of the payload is only ~0.5 s, so this is
/// about the loader and first-touch scan, not raw I/O; an earlier version
/// that merely read the files was dropped as ineffective.
///
/// Best-effort and time-bounded: a failure or slow run just means the first
/// Compare stays as slow as before.
#[tauri::command]
pub async fn warm_sidecar(binary: String) -> Result<(), String> {
    let path = PathBuf::from(&binary);
    if !path.is_file() {
        return Err(format!("Binary not found: {}", path.display()));
    }

    tauri::async_runtime::spawn_blocking(move || {
        let started = std::time::Instant::now();
        let binary = path.to_string_lossy().to_string();
        let mut child = match super::process::spawn_hidden(&binary, &["--version".to_string()]) {
            Ok(c) => c,
            Err(e) => {
                log::debug!("warm_sidecar: could not start {}: {e}", path.display());
                return;
            }
        };

        // Bounded wait so a hung binary cannot pin a worker thread.
        let deadline = started + std::time::Duration::from_secs(60);
        loop {
            match child.try_wait() {
                Ok(Some(_)) => break,
                Ok(None) if std::time::Instant::now() >= deadline => {
                    let _ = child.kill();
                    let _ = child.wait();
                    log::warn!("warm_sidecar: timed out after 60s; killed");
                    return;
                }
                Ok(None) => std::thread::sleep(std::time::Duration::from_millis(20)),
                Err(e) => {
                    log::debug!("warm_sidecar: wait failed: {e}");
                    return;
                }
            }
        }
        log::info!(
            "warm_sidecar: loader warm-up finished in {:.2}s",
            started.elapsed().as_secs_f32()
        );
    })
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn resolve_binary(custom_path: Option<String>) -> Result<BinaryInfo, String> {
    let is_custom = custom_path.is_some();
    let path = if let Some(p) = custom_path {
        if p.is_empty() {
            return Err("Custom path is empty".to_string());
        }
        PathBuf::from(p)
    } else {
        // Try to find bundled sidecar next to the executable
        let exe_dir = std::env::current_exe()
            .map_err(|e| e.to_string())?
            .parent()
            .map(|p| p.to_path_buf())
            .ok_or("Cannot determine exe directory")?;
        let sidecar = exe_dir.join("video-compare.exe");
        if sidecar.exists() {
            sidecar
        } else {
            // Fallback: try PATH
            which::which("video-compare").map_err(|_| "video-compare not found".to_string())?
        }
    };

    if !path.exists() {
        return Err(format!("Binary not found: {}", path.display()));
    }

    let version = get_version(&path)?;
    let source = if is_custom { "custom" } else { "bundled" };

    Ok(BinaryInfo {
        path: path.to_string_lossy().to_string(),
        source: source.to_string(),
        version,
    })
}

fn get_version(path: &Path) -> Result<String, String> {
    let binary = path.to_string_lossy().to_string();
    let output = super::process::output_hidden(&binary, &["--version".to_string()])
        .map_err(|e| format!("Failed to run --version: {}", e))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = format!("{}{}", stdout, stderr);
    // Extract version from output like "video-compare version 2024-01-01"
    for line in combined.lines() {
        if line.contains("version") || line.contains("video-compare") {
            return Ok(line.trim().to_string());
        }
    }
    Ok(combined.trim().to_string())
}

#[tauri::command]
pub async fn run_info_command(kind: String, term: String) -> Result<String, String> {
    let flag = match kind.as_str() {
        "filters" => "--find-filters",
        "demuxers" => "--find-demuxers",
        "decoders" => "--find-decoders",
        "hwaccels" => "--find-hwaccels",
        "protocols" => "--find-protocols",
        _ => return Err(format!("Unknown kind: {}", kind)),
    };

    let binary = which::which("video-compare")
        .map_err(|_| "video-compare not found in PATH".to_string())?
        .to_string_lossy()
        .to_string();

    let output = super::process::output_hidden(&binary, &[flag.to_string(), term])
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    Ok(format!("{}{}", stdout, stderr))
}
