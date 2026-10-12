use serde::Serialize;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, Clone, Serialize)]
pub struct LaunchHandle {
    pub id: String,
    pub started_at: u64,
    /// OS process id of the spawned child (used for window capture).
    pub pid: u32,
}

#[derive(Debug, Clone, Serialize)]
struct LaunchEvent {
    id: String,
    line: String,
}

#[derive(Debug, Clone, Serialize)]
struct ExitEvent {
    id: String,
    code: Option<i32>,
}

pub struct LaunchState {
    children: Mutex<HashMap<String, Arc<Mutex<std::process::Child>>>>,
}

impl Default for LaunchState {
    fn default() -> Self {
        Self {
            children: Mutex::new(HashMap::new()),
        }
    }
}

/// Spawn `binary args` with piped stdout/stderr, register it for kill
/// support, and wire up stdout/stderr/exit event forwarding. Shared by the
/// plain launch command and the window-embed flow.
pub fn spawn_managed(
    app: &AppHandle,
    state: &State<'_, LaunchState>,
    binary: &str,
    args: &[String],
) -> Result<(LaunchHandle, Arc<Mutex<std::process::Child>>), String> {
    let id = uuid::Uuid::new_v4().to_string();
    let started_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let mut child = std::process::Command::new(binary)
        .args(args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to launch: {}", e))?;

    let pid = child.id();
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let child = Arc::new(Mutex::new(child));

    {
        let mut children = state.children.lock().map_err(|e| e.to_string())?;
        children.insert(id.clone(), child.clone());
    }

    if let Some(stdout) = stdout {
        let app = app.clone();
        let id = id.clone();
        std::thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            let reader = BufReader::new(stdout);
            for line in reader.lines().map_while(Result::ok) {
                let _ = app.emit(
                    "launch://stdout",
                    LaunchEvent {
                        id: id.clone(),
                        line,
                    },
                );
            }
        });
    }

    if let Some(stderr) = stderr {
        let app = app.clone();
        let id = id.clone();
        std::thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            let reader = BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
                let _ = app.emit(
                    "launch://stderr",
                    LaunchEvent {
                        id: id.clone(),
                        line,
                    },
                );
            }
        });
    }

    {
        let app = app.clone();
        let id = id.clone();
        let child = child.clone();
        std::thread::spawn(move || {
            let code = {
                let mut c = child.lock().unwrap();
                c.wait().ok().and_then(|s| s.code())
            };
            let _ = app.emit("launch://exit", ExitEvent { id, code });
        });
    }

    Ok((
        LaunchHandle {
            id,
            started_at,
            pid,
        },
        child,
    ))
}

#[tauri::command]
pub fn launch(
    app: AppHandle,
    state: State<'_, LaunchState>,
    binary: String,
    args: Vec<String>,
) -> Result<LaunchHandle, String> {
    let (handle, _child) = spawn_managed(&app, &state, &binary, &args)?;
    Ok(handle)
}

#[tauri::command]
pub fn kill(state: State<'_, LaunchState>, id: String) -> Result<(), String> {
    let mut children = state.children.lock().map_err(|e| e.to_string())?;
    if let Some(child) = children.remove(&id) {
        let mut c = child.lock().map_err(|e| e.to_string())?;
        c.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}
