use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BinaryInfo {
    pub path: String,
    pub source: String, // "bundled" | "custom"
    pub version: String,
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

fn get_version(path: &PathBuf) -> Result<String, String> {
    let output = Command::new(path)
        .arg("--version")
        .output()
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

    let binary =
        which::which("video-compare").map_err(|_| "video-compare not found in PATH".to_string())?;

    let output = Command::new(binary)
        .arg(flag)
        .arg(&term)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    Ok(format!("{}{}", stdout, stderr))
}
