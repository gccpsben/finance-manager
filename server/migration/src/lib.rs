pub use finance_manager_migration::Migrator;
pub use sea_orm::prelude::*;
pub use sea_orm_migration::{MigrationStatus, MigrationTrait, MigratorTrait};
mod m20220101_000002_create_user_table;
mod m20250203_000001_create_token_table;
mod m20250204_000001_create_account_table;
mod m20250204_000002_create_currency_table;
mod m20250208_000001_currency_rate_datum;
mod m20250301_000001_create_txn_tag_table;
mod m20250315_000001_create_fragment_table;
mod m20250315_000002_create_txn_table;

pub mod finance_manager_migration {
    pub struct Migrator;
}

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000002_create_user_table::Migration),
            Box::new(m20250203_000001_create_token_table::Migration),
            Box::new(m20250204_000001_create_account_table::Migration),
            Box::new(m20250204_000002_create_currency_table::Migration),
            Box::new(m20250208_000001_currency_rate_datum::Migration),
            Box::new(m20250301_000001_create_txn_tag_table::Migration),
            Box::new(m20250315_000002_create_txn_table::Migration),
            Box::new(m20250315_000001_create_fragment_table::Migration),
        ]
    }
}
