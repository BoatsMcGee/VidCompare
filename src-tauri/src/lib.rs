#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        // Must register before tauri-plugin-wdio, which initializes its own
        // logger on registration and would otherwise claim the global logger.
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(if cfg!(debug_assertions) {
                    log::LevelFilter::Info
                } else {
                    log::LevelFilter::Warn
                })
                .build(),
        )
        .plugin(tauri_plugin_wdio::init())
        .manage(commands::launch::LaunchState::default())
        .manage(commands::embed::EmbedState::default())
        .invoke_handler(tauri::generate_handler![
            commands::files::list_media_files,
            commands::binary::resolve_binary,
            commands::binary::run_info_command,
            commands::launch::launch,
            commands::launch::kill,
            commands::embed::embed_launch,
            commands::embed::embed_set_rect,
            commands::embed::embed_release,
            commands::embed::embed_available,
            commands::settings::load_settings,
            commands::settings::save_settings,
            commands::settings::app_info,
            commands::profiles::list_profiles,
            commands::profiles::install_profile,
            commands::profiles::set_active_profile,
            commands::profiles::fetch_profiles_index,
            commands::files::describe_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}

mod commands;
