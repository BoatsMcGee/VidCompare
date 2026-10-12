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
    children: Arc<Mutex<HashMap<String, Arc<Mutex<std::process::Child>>>>>,
}

impl Default for LaunchState {
    fn default() -> Self {
        Self {
            children: Arc::new(Mutex::new(HashMap::new())),
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
    // OS-level backstop: the child dies with this process even on panic or
    // crash, where the RunEvent::Exit cleanup never runs.
    #[cfg(windows)]
    super::job::assign_to_job(pid);
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
        let children = state.children.clone();
        std::thread::spawn(move || {
            // Poll try_wait instead of holding the mutex across wait(): the
            // kill command needs the same lock to terminate the child.
            let code = loop {
                {
                    let mut c = child.lock().unwrap();
                    match c.try_wait() {
                        Ok(Some(status)) => break status.code(),
                        Ok(None) => {}
                        Err(_) => break None,
                    }
                }
                std::thread::sleep(std::time::Duration::from_millis(100));
            };
            // Drop the dead child from the registry so completed sessions
            // don't accumulate.
            if let Ok(mut map) = children.lock() {
                map.remove(&id);
            }
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
    kill_in(state.inner(), &id)
}

/// Kill a managed child by id. Shared by the `kill` command and internal
/// rollback paths (e.g. embed positioning failure).
pub fn kill_in(state: &LaunchState, id: &str) -> Result<(), String> {
    let mut children = state.children.lock().map_err(|e| e.to_string())?;
    if let Some(child) = children.remove(id) {
        let mut c = child.lock().map_err(|e| e.to_string())?;
        c.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Terminate every managed child process. Called on app exit so spawned
/// video-compare instances are never orphaned.
pub fn kill_all(state: &LaunchState) {
    let Ok(mut children) = state.children.lock() else {
        return;
    };
    for (_, child) in children.drain() {
        if let Ok(mut c) = child.lock() {
            let _ = c.kill();
        }
    }
}
