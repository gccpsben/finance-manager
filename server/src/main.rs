mod caches;
mod date;
#[allow(unused)]
mod entities;
mod env;
mod extended_models;
mod extractors;
mod linear_interpolator;
mod logging;
mod maths;
mod routes;
mod services;
mod states;
mod tests;

use actix_web::{web, App, HttpServer};
use clap::{command, Parser, ValueHint};
use finance_manager_migration::{Migrator, MigratorTrait};
use routes::bootstrap::apply_endpoints;
use sea_orm::Database;
use states::database_states::DatabaseStates;
use std::error::Error;
use tracing::info;

const RESTFUL_DIGITS: u32 = 20;

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
        if let Some(port_given) = port {
            port_given
        } else {
            info!("No port given in env file, finding unused port starting from 1000.");
            let unused_port = port_check::free_local_ipv4_port_in_range(1000..65535);
            let unused_port = unused_port.expect("Unable to find an unused port.");
            info!("Unused port {} on ipv4 is found.", unused_port);
            unused_port
        }
    };

    let db = {
        info!("Connecting to database...");
        let connect_options = env.to_connection_options().clone();
        let db = Database::connect(connect_options).await?;
        info!("Connected to database...");
        db
    };

    Migrator::up(&db, None).await?;

    HttpServer::new(move || {
        let states = DatabaseStates::new(db.clone());
        let app_data = web::Data::new(states);
        apply_endpoints(App::new().app_data(app_data))
    })
    .bind(("127.0.0.1", port))?
    .run()
    .await?;

    Ok(())
}
