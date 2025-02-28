use crate::repositories::currency_rate_datum::CreateCurrencyRateDatumDomain;
use crate::{extractors::auth_user::AuthUser, states::database_states::DatabaseStates};
use actix_web::{post, web, HttpResponse};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub mod post_currency_rate_datum {

    use std::str::FromStr;

    use actix_web::error::{ErrorBadRequest, ErrorInternalServerError};
    use uuid::Uuid;

    use crate::{
        repositories::TransactionWithCallback,
        services::currency_rate_datum::{
            create_currency_rate_datum, CreateCurrencyRateDatumErrors,
        },
    };

    use super::*;

    #[derive(Serialize, Deserialize, Debug)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostCurrencyRateDatumRequestBody {
        pub ref_currency_id: String,
        pub ref_amount_currency_id: String,
        pub amount: String,
        pub date: i32,
    }

    #[derive(Serialize, Deserialize, Debug)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostCurrencyRateDatumResponseBody {
        pub id: String,
    }

    #[post("/currency_rate_datums")]
    async fn handler(
        user: AuthUser,
        info: web::Json<PostCurrencyRateDatumRequestBody>,
        data: web::Data<DatabaseStates>,
    ) -> HttpResponse {
        let uuids = match (
            Uuid::from_str(&info.ref_currency_id),
            Uuid::from_str(&info.ref_amount_currency_id),
        ) {
            (Ok(ref_curr_id), Ok(ref_amount_curr_id)) => (ref_curr_id, ref_amount_curr_id),
            (Ok(_), Err(_)) => {
                return ErrorBadRequest(format!(
                    "Invalid uuid given: {}.",
                    info.ref_amount_currency_id
                ))
                .error_response();
            }
            (Err(_), Ok(_)) => {
                return ErrorBadRequest(format!("Invalid uuid given: {}.", info.ref_currency_id))
                    .error_response();
            }
            (Err(_), Err(_)) => {
                return ErrorBadRequest(format!(
                    "Invalid uuid given: {}.",
                    info.ref_amount_currency_id
                ))
                .error_response();
            }
        };

        // Convert request to create domain enum
        let domain_to_be_saved = CreateCurrencyRateDatumDomain {
            amount: info.amount.clone(),
            date: info.date,
            owner: user.user_id,
            ref_currency_id: uuids.0,
            ref_amount_currency_id: uuids.1,
        };

        let db_txn = match TransactionWithCallback::from_db_conn(&data.db, vec![]).await {
            Err(_db_err) => {
                return HttpResponse::InternalServerError()
                    .body("Unable to start database transaction.")
            }
            Ok(db_txn) => db_txn,
        };

        let create_result = create_currency_rate_datum(
            domain_to_be_saved,
            db_txn,
            &mut data
                .currency_rate_datums_cache
                .lock()
                .expect("Failed acquiring currency cache lock."),
        )
        .await;

        match create_result {
            Ok((row_id, db_txn)) => {
                db_txn.commit().await;
                HttpResponse::Ok().json(PostCurrencyRateDatumResponseBody {
                    id: row_id.to_string(),
                })
            }
            Err(create_datum_result) => {
                match create_datum_result {
                    CreateCurrencyRateDatumErrors::DbErr(_db_err) => {
                        ErrorInternalServerError("Error querying database.").error_response()
                    }
                    CreateCurrencyRateDatumErrors::CyclicRefAmountCurrency(uuid) => {
                        let msg = format!("The datum target currency references itself (id: {}), creating a cycle.", uuid);
                        ErrorBadRequest(msg).error_response()
                    }
                }
            }
        }
    }
}
