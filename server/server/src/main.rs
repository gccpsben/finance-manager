// main.rs

mod caches;
mod entities;
mod extractors;
mod repositories;
mod routes;
mod services;
mod states;
mod tests;

use std::sync::{Arc, Mutex};

use actix_web::{web, App, HttpServer};
use caches::{currency_cache::CurrencyCache, currency_rate_datum::CurrencyRateDatumCache};
use dotenv::dotenv;
use routes::bootstrap::apply_endpoints;
use sea_orm::Database;
use states::database_states::DatabaseStates;

#[cfg_attr(test, mutants::skip)]
#[actix_web::main]
pub async fn main() -> std::io::Result<()> {
    dotenv().ok();

    #[cfg(debug_assertions)]
    println!("WARN: In debug mode, and dev endpoints are activated.");

    let db_url =
        std::env::var("DATABASE_URL").expect("Expected DATABASE_URL to be defined in .env file.");
    println!("Using {} as database.", db_url);
    let db = Database::connect(db_url)
        .await
        .expect("failed initializing data");

    let states = DatabaseStates {
        db,
        currency_cache: Arc::from(Mutex::from(CurrencyCache::new(128))),
        currency_rate_datums_cache: Arc::from(Mutex::from(CurrencyRateDatumCache::new(128))),
    };
    HttpServer::new(move || apply_endpoints(App::new().app_data(web::Data::new(states.clone()))))
        .bind(("127.0.0.1", 8080))?
        .run()
        .await
}
