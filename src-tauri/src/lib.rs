#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Requisições HTTP saem pelo Rust, então não há bloqueio de CORS
        .plugin(tauri_plugin_http::init())
        // Guarda serviços e preferências em um arquivo JSON local
        .plugin(tauri_plugin_store::Builder::new().build())
        // Abre endereços no navegador padrão
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o SelfHub");
}
