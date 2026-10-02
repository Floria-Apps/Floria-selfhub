// Evita abrir uma janela de console extra no Windows em release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Linux: o WebKitGTK pode derrubar a janela no Wayland com
    // "Error 71 (Protocol error) dispatching to Wayland display" (comum com NVIDIA).
    // Desligar o renderer DMABUF resolve na maioria dos casos.
    // Para testar sem isso: WEBKIT_DISABLE_DMABUF_RENDERER=0 npm run tauri dev
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    selfhub_lib::run()
}
