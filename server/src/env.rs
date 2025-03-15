use sea_orm::ConnectOptions;
use serde::{Deserialize, Serialize};
use std::{fs, time::Duration};

#[derive(Debug, Serialize, Deserialize)]
pub enum AppMode {
    Production,
    Development,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServerSSLSection {
    #[serde(rename = "pemPath")]
    pub pem_path: String,
    #[serde(rename = "keyPath")]
    pub key_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnvServerSection {
    pub port: Option<u16>,
    #[serde(rename = "distFolderPath")]
    pub dist_folder_path: String,
    pub ssl: Option<ServerSSLSection>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum EnvDb {
    SQLite {
        path: String,
    },
    SQLiteMemory,
    Postgres {
        hostname: String,
        password: String,
        username: String,
        database: String,
    },
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum EnvLogMode {
    Console,
    File { path: String },
    Both { path: String },
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnvLoggingSection {
    #[serde(rename = "logMode")]
    pub log_mode: EnvLogMode,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnvStorageSection {
    pub db: EnvDb,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppEnv {
    #[serde(rename = "envMode")]
    pub env_mode: AppMode,
    pub server: Option<EnvServerSection>,
    pub storage: EnvStorageSection,
    pub logging: EnvLoggingSection,
}

impl AppEnv {
    pub fn to_connection_options(&self) -> ConnectOptions {
        match &self.storage.db {
            EnvDb::Postgres {
                hostname,
                password,
                username,
                database,
            } => ConnectOptions::new(format!(
                "postgres://{username}:{password}@{hostname}/{database}"
            ))
            .max_connections(50)
            .min_connections(10)
            .max_lifetime(Duration::from_secs_f64(120.0))
            .acquire_timeout(Duration::from_secs(60))
            .connect_timeout(Duration::from_secs(60))
            .clone(),
            EnvDb::SQLite { path } => ConnectOptions::new(format!("sqlite://{path}")),
            EnvDb::SQLiteMemory => ConnectOptions::new("sqlite::memory:"),
        }
    }
}

#[cfg_attr(test, mutants::skip)]
pub fn read_json_as_str(path: &str) -> Result<String, Box<dyn std::error::Error>> {
    fs::read_to_string(path).map_err(|e| Box::new(e) as Box<dyn std::error::Error>)
}

pub fn parse_env(json_str: &str) -> Result<AppEnv, serde_json::Error> {
    let config: AppEnv = serde_json::from_str(json_str)?;
    Ok(config)
}
