use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub theme: String,
    pub custom_binary_path: Option<String>,
    #[serde(default)]
    pub custom_profile_path: Option<String>,
    pub active_profile: Option<String>,
    pub recent_folders: Vec<String>,
    pub log_level: String,
    pub portable: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            custom_binary_path: None,
            custom_profile_path: None,
            active_profile: None,
            recent_folders: Vec::new(),
            log_level: "info".to_string(),
            portable: false,
        }
    }
}

fn settings_path() -> Result<PathBuf, String> {
    let dir = if is_portable() {
        let exe_dir = std::env::current_exe()
            .map_err(|e| e.to_string())?
            .parent()
            .map(|p| p.to_path_buf())
            .ok_or("Cannot determine exe directory")?;
        exe_dir.join("Data")
    } else {
        dirs::config_dir()
            .ok_or("Cannot determine config directory")?
            .join("vidcompare")
    };
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
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
pub fn load_settings() -> Result<Settings, String> {
    let path = settings_path()?;
    if !path.exists() {
        return Ok(Settings::default());
    }
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_settings(settings: Settings) -> Result<(), String> {
    let path = settings_path()?;
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    // Atomic write: tmp + rename
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, &content).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn app_info() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "version": env!("CARGO_PKG_VERSION"),
        "portable": is_portable(),
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    }))
}
