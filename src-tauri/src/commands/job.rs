//! Kill-on-close Job Object (Windows).
//!
//! `RunEvent::Exit` only fires on a clean shutdown; a panic or crash skips
//! it and would orphan spawned video-compare processes. Assigning every
//! child to a job with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` makes the OS
//! terminate them when this process dies for ANY reason — clean exit,
//! panic, or external kill. The job handle is kept alive in a static for
//! the process lifetime.

use windows::Win32::Foundation::{CloseHandle, HANDLE};
use windows::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JobObjectExtendedLimitInformation,
    SetInformationJobObject,
};
use windows::Win32::System::Threading::{OpenProcess, PROCESS_SET_QUOTA, PROCESS_TERMINATE};

fn job_handle() -> Option<HANDLE> {
    use std::sync::OnceLock;
    static JOB: OnceLock<Option<usize>> = OnceLock::new();
    JOB.get_or_init(|| unsafe {
        let job = CreateJobObjectW(None, None).ok()?;
        let mut info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        SetInformationJobObject(
            job,
            JobObjectExtendedLimitInformation,
            &info as *const _ as *const std::ffi::c_void,
            std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        )
        .ok()?;
        // Intentionally leaked: closing the handle would kill the children.
        Some(job.0 as usize)
    })
    .map(|raw| HANDLE(raw as *mut std::ffi::c_void))
}

/// Assign a child process (by PID) to the kill-on-close job. Best-effort:
/// failure only means the clean-exit path remains as the fallback.
pub fn assign_to_job(pid: u32) {
    let Some(job) = job_handle() else {
        return;
    };
    unsafe {
        let Ok(process) = OpenProcess(PROCESS_TERMINATE | PROCESS_SET_QUOTA, false, pid) else {
            return;
        };
        let _ = AssignProcessToJobObject(job, process);
        let _ = CloseHandle(process);
    }
}
