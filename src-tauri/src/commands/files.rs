use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub mtime: Option<u64>,
    pub ext: String,
    pub is_video: bool,
}

const VIDEO_EXTENSIONS: &[&str] = &[
    "mp4", "mkv", "avi", "mov", "webm", "ts", "m2ts", "mts", "mpg", "mpeg", "wmv", "flv", "ogv",
    "m4v", "y4m", "3gp", "vob", "divx", "rmvb", "gif", "apng", "png", "jpg", "jpeg", "webp",
    "avif", "jxl", "bmp", "tiff", "exr",
];

pub fn is_video_extension(ext: &str) -> bool {
    VIDEO_EXTENSIONS.contains(&ext.to_lowercase().as_str())
}

#[tauri::command]
pub async fn list_media_files(dir: String, include_all: bool) -> Result<Vec<FileEntry>, String> {
    let path = PathBuf::from(&dir);
    if !path.is_dir() {
        return Err(format!("Not a directory: {}", dir));
    }

    let mut entries = Vec::new();
    let read_dir = std::fs::read_dir(&path).map_err(|e| e.to_string())?;

    for entry in read_dir.flatten() {
        let entry_path = entry.path();
        if entry_path.is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        let ext = entry_path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        let is_video = is_video_extension(&ext);
        if !include_all && !is_video {
            continue;
        }
        let metadata = entry.metadata().ok();
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        let mtime = metadata
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs());
        entries.push(FileEntry {
            name,
            path: entry_path.to_string_lossy().to_string(),
            size,
            mtime,
            ext,
            is_video,
        });
    }

    entries.sort_by_key(|a| a.name.to_lowercase());
    if entries.len() > 5000 {
        entries.truncate(5000);
    }
    Ok(entries)
}

#[derive(Debug, Serialize)]
pub struct PathInfo {
    pub is_dir: bool,
}

/// Describe a dropped/typed path so the frontend can decide between
/// "navigate to folder" and "select file in parent folder".
#[tauri::command]
pub async fn describe_path(path: String) -> Result<PathInfo, String> {
    let meta = std::fs::metadata(&path).map_err(|e| format!("Not accessible: {path}: {e}"))?;
    Ok(PathInfo {
        is_dir: meta.is_dir(),
    })
}
