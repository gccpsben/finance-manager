#![allow(clippy::await_holding_lock)]
#![allow(unused)]

mod caches;
mod entities;
mod env;
mod extended_models;
mod extractors;
mod logging;
mod migration;
mod routes;
mod services;
mod states;
mod tests;

use std::{
    error::Error,
    sync::{Arc, Mutex},
};

use actix_web::{web, App, HttpServer};
use caches::{
    currency_cache::CurrencyCache, currency_rate_datum::CurrencyRateDatumCache,
    txn_tag::TxnTagsCache,
};
use clap::{command, Parser, ValueHint};
use routes::bootstrap::apply_endpoints;
use sea_orm::{Database, DatabaseConnection};
use sea_orm_migration::MigratorTrait;
use states::database_states::DatabaseStates;
use tracing::info;

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    /// Relative or absolute path to your config JSON file.
    /// Defaults to './env.json'
    #[arg(short('e'), long("env-file"), value_name = "PATH", value_hint=ValueHint::FilePath)]
    env_path: Option<String>,

    /// Exit the program when database is not migrated to the latest schema.
    #[arg(long("exit-on-not-fully-migrated"), value_name = "BOOL")]
    exit_on_not_fully_migrated: Option<bool>,
}

#[cfg_attr(test, mutants::skip)]
pub async fn are_all_migrations_applied(db: &DatabaseConnection) -> bool {
    !migration::Migrator::get_migration_with_status(db)
        .await
        .iter()
        .any(|m| {
            m.iter()
                .any(|m2| matches!(m2.status(), sea_orm_migration::MigrationStatus::Pending))
        })
}

#[cfg_attr(test, mutants::skip)]
#[actix_web::main]
pub async fn main() -> Result<(), Box<dyn Error>> {
    let cli = Args::parse();

    let env = {
        let env_file_path = cli.env_path.as_deref().unwrap_or("./env.json");
        let json_str = env::read_json_as_str(env_file_path)?;
        env::parse_env(json_str.as_str())?
    };

    env.init_logger().expect("Unable to init logger.");

    let port = {
        let port = match env.server {
            None => None,
            Some(ref server_section) => server_section.port,
        };
        match port {
            Some(port_given) => port_given,
            None => {
                info!("No port given in env file, finding unused port starting from 1000.");
                let unused_port = port_check::free_local_ipv4_port_in_range(1000..65535);
                let unused_port = unused_port.expect("Unable to find an unused port.");
                info!("Unused port {} on ipv4 is found.", unused_port);
                unused_port
            }
        }
    };

    let db = {
        info!("Connecting to database...");
        let connect_options = env.to_connection_options().to_owned();
        let db = Database::connect(connect_options).await?;
        info!("Connected to database...");
        db
    };

    // Migrate if needed
    {
        match are_all_migrations_applied(&db).await {
            true => {
                info!("No migrations needed, skipping migrations.");
            }
            false => {
                info!("Performing migrations...");
                migration::Migrator::up(&db, None).await?;
                info!("Migrations applied.");
            }
        }
    }

    let states = DatabaseStates {
        db,
        currency_cache: Arc::from(Mutex::from(CurrencyCache::new(128))),
        currency_rate_datums_cache: Arc::from(Mutex::from(CurrencyRateDatumCache::new(128))),
        txn_tags_cache: Arc::from(Mutex::from(TxnTagsCache::new(128))),
    };

    HttpServer::new(move || apply_endpoints(App::new().app_data(web::Data::new(states.clone()))))
        .bind(("127.0.0.1", port))?
        .run()
        .await?;

    Ok(())
}
