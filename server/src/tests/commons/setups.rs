use super::runtime::TestRuntime;
use crate::routes::bootstrap::apply_endpoints;
use crate::states::database_states::DatabaseStates;
use actix_web::web;
use actix_web::App;
use finance_manager_migration::Migrator;
use futures::prelude::*;
use sea_orm::sea_query::IndexCreateStatement;
use sea_orm::sea_query::TableCreateStatement;
use sea_orm::ConnectionTrait;
use sea_orm::Database;
use sea_orm::DatabaseConnection;
use sea_orm::EntityTrait;
use sea_orm::Schema;

/// Setup connection and application states for testing.
/// The application states will default to reasonable values for testing.
pub async fn setup_connection() -> TestRuntime {
    setup_connection_custom(DatabaseStates::new).await
}

/// Setup connection and application states for testing.
/// Custom application states can be provided.
pub async fn setup_connection_custom<T: FnOnce(DatabaseConnection) -> DatabaseStates>(
    states_builder: T,
) -> TestRuntime {
    let tests_threads: u32 = std::env::var("NEXTEST_TEST_GLOBAL_SLOT")
        .expect("Cannot find NEXTEST_TEST_GLOBAL_SLOT.")
        .parse()
        .expect("The number of NEXTEST_TEST_GLOBAL_SLOT should be a u32 number.");

    let test_db_url = format!("TEST_DB_URL_{tests_threads}");

    let db = Database::connect(std::env::var(test_db_url.clone()).unwrap_or_else(|_| {
            panic!(
                "Env var {test_db_url} is not defined. Cannot setup database for testing. Notice that the number of database url required is the same as the number of test threads."
            )
        }))
        .await
        .expect("failed initializing data");

    <Migrator as finance_manager_migration::MigratorTrait>::fresh(&db)
        .await
        .expect("Migrator fresh failure");
    let states = states_builder(db);
    let states_cloned = states.clone();
    let server = actix_test::start(move || {
        let app_data = web::Data::new(states_cloned.clone());
        let app = App::new().app_data(app_data);
        apply_endpoints(app)
    });
    TestRuntime::new(server, states.clone())
}

#[allow(unused)]
pub async fn init_table_of_entity<T>(schema: &Schema, entity: T, db: &DatabaseConnection)
where
    T: EntityTrait,
{
    let stmts: Vec<IndexCreateStatement> = schema.create_index_from_entity(entity);
    futures::stream::iter(0..stmts.len())
        .for_each(|index| {
            let value = stmts.clone();
            async move {
                let db_index = value.get(index).unwrap();
                println!("Creating index for entity {}", entity.module_name());
                db.execute(db.get_database_backend().build(db_index))
                    .await
                    .unwrap_or_else(|_| {
                        panic!("Failed creating test indexes for entity: {entity:?}")
                    });
            }
        })
        .await;

    println!("Creating table for entity {}", entity.module_name());
    let stmt: TableCreateStatement = schema.create_table_from_entity(entity);
    db.execute(db.get_database_backend().build(&stmt))
        .await
        .unwrap_or_else(|_| panic!("Failed creating test table for entity: {entity:?}"));
}
