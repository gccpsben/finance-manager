use finance_manager_migration::finance_manager_migration::Migrator;
use sea_orm_migration::cli;

#[async_std::main]
async fn main() {
    cli::run_cli(Migrator).await;
}
