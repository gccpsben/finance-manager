#[path = "./container.test.rs"]
pub mod container_tests;
#[path = "./currency.test.rs"]
pub mod currency_tests;
#[path = "./user.test.rs"]
pub mod user_tests;

#[path = "./currency_rate_datum.test.rs"]
pub mod currency_rate_datum;

#[cfg(test)]
pub mod commons {

    use std::str::from_utf8;
    use std::sync::Arc;
    use std::sync::Mutex;

    use crate::caches::currency_cache::CurrencyCache;
    use crate::caches::currency_rate_datum::CurrencyRateDatumCache;
    use crate::entities::access_token;
    use crate::entities::container;
    use crate::entities::currency;
    use crate::entities::currency_rate_datum;
    use crate::entities::user;
    use crate::routes::bootstrap::apply_endpoints;
    use crate::states::database_states::DatabaseStates;
    use actix_http::StatusCode;
    use actix_test::ClientRequest;
    use actix_test::ClientResponse;
    use actix_test::TestServer;
    use actix_web::body::to_bytes;
    use actix_web::dev::ServiceResponse;
    use actix_web::test::TestRequest;
    use actix_web::{test, web, App};
    use futures::prelude::*;
    use sea_orm::sea_query::IndexCreateStatement;
    use sea_orm::Database;
    use sea_orm::DatabaseConnection;
    use sea_orm::EntityTrait;
    use sea_orm::Schema;
    use sea_orm::{sea_query::TableCreateStatement, ConnectionTrait};
    use serde::de;
    use serde::Serialize;
    use serde_json::Value;

    pub enum TestBody<T> {
        Bytes(Box<[u8]>),
        Expected(T),
    }

    #[derive(Clone, Debug)]
    pub struct AssertTestResponse<ExpectedType> {
        pub expected: Option<ExpectedType>,
        pub json: Option<std::collections::HashMap<String, serde_json::Value>>,
        pub str: Option<String>,
        pub status: StatusCode,
    }

    pub fn attach_token_to_req(req: ClientRequest, token: Option<&str>) -> ClientRequest {
        match token {
            None => req,
            Some(token) => req.insert_header(("authorization", token)),
        }
    }

    pub async fn send_req_with_body<T: Serialize>(
        req: actix_test::ClientRequest,
        body: TestBody<T>,
    ) -> ClientResponse {
        match body {
            TestBody::Bytes(seral) => req.send_body(seral.into_vec()),
            TestBody::Expected(expected_body) => req.send_json(&expected_body),
        }
        .await
        .unwrap()
    }

    pub async fn parse_response_body<ExpectedType: de::DeserializeOwned>(
        res: &mut ClientResponse,
    ) -> AssertTestResponse<ExpectedType> {
        let status_code = res.status();
        let body_json_str = response_body_to_str(res).await;
        let parsed_body_expected: Option<ExpectedType> = match body_json_str {
            Some(_) => match body_json_str {
                Some(ref body_json_str) => {
                    match serde_json::from_str::<ExpectedType>(body_json_str) {
                        Ok(expected) => Some(expected),
                        Err(_) => None,
                    }
                }
                None => None,
            },
            None => None,
        };
        let body_json: Option<std::collections::HashMap<String, serde_json::Value>> =
            match body_json_str {
                Some(ref body_str) => serde_json::from_str(body_str).unwrap_or_default(),
                None => None,
            };
        AssertTestResponse {
            status: status_code,
            expected: parsed_body_expected,
            json: body_json,
            str: Some(String::from("")),
        }
    }

    pub async fn response_body_to_str(res: &mut ClientResponse) -> Option<String> {
        let res_body = res.body().await;
        match res_body {
            Err(_) => None,
            Ok(body_bytes) => match from_utf8(&body_bytes) {
                Err(_) => None,
                Ok(str) => Some(str.to_string()),
            },
        }
    }

    pub async fn setup_connection() -> TestServer {
        let db = Database::connect("sqlite::memory:")
            .await
            .expect("failed initializing data");

        let builder = db.get_database_backend();
        let schema = sea_orm::Schema::new(builder);
        init_table_of_entity(&schema, user::Entity, &db).await;
        init_table_of_entity(&schema, access_token::Entity, &db).await;
        init_table_of_entity(&schema, container::Entity, &db).await;
        init_table_of_entity(&schema, currency::Entity, &db).await;
        init_table_of_entity(&schema, currency_rate_datum::Entity, &db).await;

        let states = DatabaseStates {
            db,
            currency_cache: Arc::from(Mutex::from(CurrencyCache::new(128))),
            currency_rate_datums_cache: Arc::from(Mutex::from(CurrencyRateDatumCache::new(128))),
            txn_tags_cache: Arc::from(Mutex::from(TxnTagsCache::new(128))),
        };

        actix_test::start(move || {
            apply_endpoints(App::new().app_data(web::Data::new(states.clone())))
        })
    }

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
                            panic!("Failed creating test indexes for entity: {:?}", entity)
                        });
                }
            })
            .await;

        println!("Creating table for entity {}", entity.module_name());
        let stmt: TableCreateStatement = schema.create_table_from_entity(entity);
        db.execute(db.get_database_backend().build(&stmt))
            .await
            .unwrap_or_else(|_| panic!("Failed creating test table for entity: {:?}", entity));
    }
}
