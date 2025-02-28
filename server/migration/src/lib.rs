pub use sea_orm_migration::prelude::*;

mod m20220101_000002_create_user_table;
mod m20250203_000001_create_token_table;
mod m20250204_000001_create_container_table;
mod m20250204_000002_create_currency_table;
mod m20250208_000001_currency_rate_datum;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000002_create_user_table::Migration),
            Box::new(m20250203_000001_create_token_table::Migration),
            Box::new(m20250204_000001_create_container_table::Migration),
            Box::new(m20250204_000002_create_currency_table::Migration),
            Box::new(m20250208_000001_currency_rate_datum::Migration)
        ]
    }
}
