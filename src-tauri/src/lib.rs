use tauri::Manager;

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    WindowEvent,
};

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
        .setup(|app| {
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                let open = MenuItem::with_id(app, "open", "Open SelfHub", true, None::<&str>)?;
                let quit = MenuItem::with_id(app, "quit", "Quit SelfHub", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&open, &quit])?;
                let icon = app
                    .default_window_icon()
                    .ok_or("Default window icon is required for the system tray")?
                    .clone();

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
                    if std::env::args().any(|argument| argument == "--hidden") {
                        window.hide()?;
                    }
                    let close_window = window.clone();
                    window.on_window_event(move |event| {
                        if let WindowEvent::CloseRequested { api, .. } = event {
                            api.prevent_close();
                            if let Err(error) = close_window.hide() {
                                eprintln!("Não foi possível ocultar a janela do SelfHub: {error}");
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
