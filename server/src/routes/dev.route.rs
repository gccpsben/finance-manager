#![allow(warnings, unused)]
#[cfg(debug_assertions)]
#[cfg_attr(test, mutants::skip)]
pub mod dev_test {

    use crate::extended_models::currency::CurrencyId;
    use crate::extractors::auth_user::AuthUser;
    use crate::services::currencies::{
        calculate_currency_rate, create_currency, get_currency_by_id,
    };
    use crate::services::currency_rate_datum::get_datum_left_right;
    use crate::services::TransactionWithCallback;
    use crate::{entities::currency, DatabaseStates};
    use actix_web::cookie::time::macros::date;
    use actix_web::{get, web, HttpResponse};
    use argon2::Argon2;
    use argon2::PasswordHasher;
    use chrono::TimeZone;
    use sea_orm::{ActiveValue, DatabaseTransaction, EntityTrait};
    use sea_orm::{ColumnTrait, QueryFilter, TransactionTrait};
    use std::{ops::Deref, str::FromStr, sync::Mutex};
    use uuid::Uuid;

    #[get("/dev-test")]
    async fn handler(data: web::Data<DatabaseStates>) -> HttpResponse {
        let db_txn = match TransactionWithCallback::from_db_conn(&data.db, vec![]).await {
            Err(_db_err) => {
                return HttpResponse::InternalServerError()
                    .body("Unable to start database transaction.")
            }
            Ok(db_txn) => db_txn,
        };

        // let db_txn = sea_orm::TransactionTrait::begin(&data.db).await.unwrap();

        {
            let mut cache = data.currency_cache.lock().await;
        }

        let user = AuthUser(Uuid::from_str("345d32bd-73cb-4ae1-9319-e4a6f8295406").unwrap());

        // let db_result = currency::Entity::find()
        //     .filter(sea_orm::ColumnTrait::eq(&currency::Column::OwnerId, user.0))
        //     .filter(currency::Column::Id.eq(Uuid::from_str("0ecf6aec-11e5-44a3-bb5d-f1623defa3a7").unwrap()))
        //     .one(&db_txn)
        //     .await.unwrap();

        // db_txn.commit().await;

        // Ok((
        //     db_result.map(|model| {
        //         let cache_entry: Currency = model.into();
        //         cache.register_item(cache_entry.clone());
        //         cache_entry
        //     }),
        //     db_txn,
        // ));

        let db_txn = {
            let (_, db_txn) = get_currency_by_id(
                &user,
                &CurrencyId(Uuid::from_str("887900f0-a8f0-43d7-8c8c-258cd2111055").unwrap()),
                db_txn,
                data.currency_cache.clone(),
            )
            .await
            .unwrap();

            let time = chrono::Utc::now().timestamp_micros().to_string();

            let (_, db_txn) = create_currency(
                crate::extended_models::currency::CreateCurrencyAction::Normal {
                    name: time.clone(),
                    owner: user,
                    ticker: time,
                    fallback_rate_amount: "1".to_string(),
                    fallback_rate_currency_id: CurrencyId(
                        Uuid::from_str("887900f0-a8f0-43d7-8c8c-258cd2111055").unwrap(),
                    ),
                },
                db_txn,
                data.currency_cache.clone(),
            )
            .await
            .unwrap();
            db_txn
        };

        // db_txn.commit().await;
        HttpResponse::Ok().body("123")
    }
}
