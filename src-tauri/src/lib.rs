pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("خطا در اجرای برنامه جامع حسابداری فروشگاهی");
}
