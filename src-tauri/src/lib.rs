use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{image::Image, Manager, State};

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    WindowEvent,
};

#[tauri::command]
fn set_close_to_tray(enabled: bool, close_to_tray: State<'_, AtomicBool>) {
    close_to_tray.store(enabled, Ordering::Relaxed);
}

#[derive(Serialize, Deserialize, Default)]
struct ServiceCredentials {
    token: Option<String>,
    username: Option<String>,
    password: Option<String>,
}

impl ServiceCredentials {
    fn is_empty(&self) -> bool {
        self.token.is_none() && self.username.is_none() && self.password.is_none()
    }
}

fn credential_entry(service_id: &str) -> Result<keyring::Entry, String> {
    if service_id.is_empty()
        || service_id.len() > 128
        || !service_id.chars().all(|character| {
            character.is_ascii_alphanumeric() || character == '-' || character == '_'
        })
    {
        return Err("Invalid service identifier".into());
    }

    keyring::Entry::new("dev.selfhub.app", service_id)
        .map_err(|_| "Could not access the system credential store".to_string())
}

#[tauri::command]
fn get_service_credentials(service_id: String) -> Result<Option<ServiceCredentials>, String> {
    let entry = credential_entry(&service_id)?;
    match entry.get_password() {
        Ok(value) => serde_json::from_str(&value)
            .map(Some)
            .map_err(|_| "Stored service credentials are invalid".to_string()),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => Err("Could not read from the system credential store".into()),
    }
}

#[tauri::command]
fn set_service_credentials(
    service_id: String,
    credentials: ServiceCredentials,
) -> Result<(), String> {
    let entry = credential_entry(&service_id)?;
    if credentials.is_empty() {
        return match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(_) => Err("Could not remove credentials from the system store".into()),
        };
    }

    let value = serde_json::to_string(&credentials)
        .map_err(|_| "Could not encode service credentials".to_string())?;
    entry
        .set_password(&value)
        .map_err(|_| "Could not save to the system credential store".to_string())
}

#[tauri::command]
fn delete_service_credentials(service_id: String) -> Result<(), String> {
    let entry = credential_entry(&service_id)?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("Could not remove credentials from the system store".into()),
    }
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(error) = window.show().and_then(|()| window.set_focus()) {
            eprintln!("Não foi possível mostrar a janela do SelfHub: {error}");
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        // Requisições HTTP saem pelo Rust, então não há bloqueio de CORS
        .plugin(tauri_plugin_http::init())
        // Guarda serviços e preferências em um arquivo JSON local
        .plugin(tauri_plugin_store::Builder::new().build())
        // Abre endereços no navegador padrão
        .plugin(tauri_plugin_opener::init())
        // Detecta o idioma configurado no sistema
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init());

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(
            tauri_plugin_autostart::Builder::new()
                .args(["--hidden"])
                .build(),
        );
    }

    builder
        .manage(AtomicBool::new(true))
        .invoke_handler(tauri::generate_handler![
            set_close_to_tray,
            get_service_credentials,
            set_service_credentials,
            delete_service_credentials,
        ])
        .setup(|app| {
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                let open =
                    MenuItem::with_id(app, "open", "Open Floria SelfHub", true, None::<&str>)?;
                let quit =
                    MenuItem::with_id(app, "quit", "Quit Floria SelfHub", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&open, &quit])?;
                let icon = Image::from_bytes(include_bytes!("../icons/floria-selfhub/64x64.png"))?;

                TrayIconBuilder::new()
                    .icon(icon)
                    .menu(&menu)
                    .on_menu_event(|app, event| match event.id().as_ref() {
                        "open" => show_main_window(app),
                        "quit" => app.exit(0),
                        _ => {}
                    })
                    .build(app)?;

                if let Some(window) = app.get_webview_window("main") {
                    let hidden = std::env::args().any(|argument| argument == "--hidden");
                    let window_icon =
                        Image::from_bytes(include_bytes!("../icons/floria-selfhub/icon.png"))?;
                    window.set_icon(window_icon)?;
                    window.set_skip_taskbar(false)?;

                    if hidden {
                        window.hide()?;
                    } else {
                        window.show()?;
                        window.set_focus()?;
                    }

                    let close_window = window.clone();
                    let app_handle = app.handle().clone();
                    window.on_window_event(move |event| {
                        if let WindowEvent::CloseRequested { api, .. } = event {
                            if app_handle.state::<AtomicBool>().load(Ordering::Relaxed) {
                                api.prevent_close();
                                if let Err(error) = close_window.hide() {
                                    eprintln!(
                                        "Não foi possível ocultar a janela do SelfHub: {error}"
                                    );
                                }
                            }
                        }
                    });
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o SelfHub");
}
