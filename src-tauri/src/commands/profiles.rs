use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileMeta {
    pub id: String,
    pub path: String,
    pub upstream_version: String,
    pub min_app_version: String,
    pub source: String, // "bundled" | "downloaded" | "custom"
}

fn profiles_dir() -> Result<PathBuf, String> {
    let dir = if is_portable() {
        let exe_dir = std::env::current_exe()
            .map_err(|e| e.to_string())?
            .parent()
            .map(|p| p.to_path_buf())
            .ok_or("Cannot determine exe directory")?;
        exe_dir.join("Data").join("profiles")
    } else {
        dirs::config_dir()
            .ok_or("Cannot determine config directory")?
            .join("vidcompare")
            .join("profiles")
    };
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn is_portable() -> bool {
    if let Ok(exe) = std::env::current_exe()
        && let Some(dir) = exe.parent()
    {
        return dir.join("portable.flag").exists();
    }
    false
}

#[tauri::command]
pub fn list_profiles() -> Result<Vec<ProfileMeta>, String> {
    let dir = profiles_dir()?;
    let mut profiles = Vec::new();

    // Bundled profile
    let bundled = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("profiles")
        .join("video-compare-latest.json");
    if bundled.exists()
        && let Ok(meta) = read_profile_meta(&bundled, "bundled")
    {
        profiles.push(meta);
    }

    // Installed profiles
    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "json").unwrap_or(false)
                && let Ok(meta) = read_profile_meta(&path, "downloaded")
            {
                profiles.push(meta);
            }
        }
    }

    Ok(profiles)
}

fn read_profile_meta(path: &PathBuf, source: &str) -> Result<ProfileMeta, String> {
    let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    let json: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    let upstream = json
        .get("upstream")
        .and_then(|u| u.get("version"))
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();
    let min_app = json
        .get("minAppVersion")
        .and_then(|v| v.as_str())
        .unwrap_or("0.0.0")
        .to_string();
    let id = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    Ok(ProfileMeta {
        id,
        path: path.to_string_lossy().to_string(),
        upstream_version: upstream,
        min_app_version: min_app,
        source: source.to_string(),
    })
}

#[tauri::command]
pub fn install_profile(path_or_url: String) -> Result<ProfileMeta, String> {
    let dir = profiles_dir()?;
    let source_path = PathBuf::from(&path_or_url);
    if !source_path.exists() {
        return Err(format!("File not found: {}", path_or_url));
    }
    let file_name = source_path
        .file_name()
        .ok_or("Invalid file name")?
        .to_string_lossy()
        .to_string();
    let dest = dir.join(&file_name);
    std::fs::copy(&source_path, &dest).map_err(|e| e.to_string())?;
    read_profile_meta(&dest, "downloaded")
}

#[tauri::command]
pub fn set_active_profile(id: String) -> Result<(), String> {
    // Persisted in settings; this command is a no-op placeholder for now.
    // The frontend stores the active profile id in settings.
    let _ = id;
    Ok(())
}

#[tauri::command]
pub fn fetch_profiles_index() -> Result<serde_json::Value, String> {
    // Opt-in network call; returns empty index for now.
    Ok(serde_json::json!({ "profiles": [] }))
}
