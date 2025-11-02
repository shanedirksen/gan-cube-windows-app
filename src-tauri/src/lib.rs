use btleplug::api::{Central, Manager as _, ScanFilter, Peripheral as _};
use btleplug::platform::Manager;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::time::sleep;

#[derive(Debug, Serialize, Deserialize)]
struct ScannedDevice {
    name: Option<String>,
    address: String,
    signal_strength: Option<i16>,
}

#[tauri::command]
async fn scan_for_cubes() -> Result<Vec<ScannedDevice>, String> {
    // Get the Bluetooth adapter
    let manager = Manager::new().await.map_err(|e| e.to_string())?;
    let adapters = manager.adapters().await.map_err(|e| e.to_string())?;
    let adapter = adapters.into_iter().next().ok_or("No Bluetooth adapters found")?;

    // Start scanning
    adapter
        .start_scan(ScanFilter::default())
        .await
        .map_err(|e| e.to_string())?;

    // Scan for 5 seconds
    sleep(Duration::from_secs(5)).await;

    // Stop scanning
    adapter.stop_scan().await.map_err(|e| e.to_string())?;

    // Get all discovered peripherals
    let peripherals = adapter.peripherals().await.map_err(|e| e.to_string())?;

    let mut devices = Vec::new();
    for peripheral in peripherals {
        let properties = peripheral.properties().await.map_err(|e| e.to_string())?;
        
        if let Some(props) = properties {
            // Filter for GAN cubes - they typically have "GAN" or "MG" in the name
            if let Some(ref name) = props.local_name {
                if name.contains("GAN") || name.contains("MG") || name.contains("AiCube") {
                    devices.push(ScannedDevice {
                        name: props.local_name,
                        address: props.address.to_string(),
                        signal_strength: props.rssi,
                    });
                }
            }
        }
    }

    Ok(devices)
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, scan_for_cubes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
