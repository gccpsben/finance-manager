use crate::entities::currency_rate_datum;
use crate::extended_models::currency::CurrencyId;
use crate::{extractors::auth_user::AuthUser, states::database_states::DatabaseStates};
use actix_web::{post, web, HttpResponse};
use sea_orm::ActiveValue;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

pub mod post_currency_rate_datum {

    use std::str::FromStr;

    use actix_web::error::{ErrorBadRequest, ErrorInternalServerError};
    use uuid::Uuid;

    use crate::services::{
        currency_rate_datum::{create_currency_rate_datum, CreateCurrencyRateDatumErrors},
        TransactionWithCallback,
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
        let exit_bad_uuid = |given_str: &str| {
            ErrorBadRequest(format!("Invalid uuid given: {}.", given_str)).error_response()
        };

        let uuids = match (
            Uuid::from_str(&info.ref_currency_id),
            Uuid::from_str(&info.ref_amount_currency_id),
        ) {
            (Ok(ref_curr_id), Ok(ref_amount_curr_id)) => (ref_curr_id, ref_amount_curr_id),
            (Ok(_), Err(_)) => {
                return exit_bad_uuid(&info.ref_amount_currency_id);
            }
            (Err(_), Ok(_)) => {
                return exit_bad_uuid(&info.ref_amount_currency_id);
            }
            (Err(_), Err(_)) => {
                return exit_bad_uuid(&info.ref_amount_currency_id);
            }
        };

        // Convert request to create domain enum
        let domain_to_be_saved = CreateCurrencyRateDatumAction {
            amount: info.amount.clone(),
            date: info.date,
            owner: user.clone(),
            ref_currency_id: CurrencyId(uuids.0),
            ref_amount_currency_id: CurrencyId(uuids.1),
        };

        let db_txn = match TransactionWithCallback::from_db_conn(&data.db, vec![]).await {
            Err(_db_err) => {
                return HttpResponse::InternalServerError()
                    .body("Unable to start database transaction.")
            }
            Ok(db_txn) => db_txn,
        };

        let create_result = create_currency_rate_datum(
            &user,
            domain_to_be_saved,
            db_txn,
            &mut data
                .currency_rate_datums_cache
                .lock()
                .expect("Failed acquiring currency cache lock."),
            &mut data
                .currency_cache
                .lock()
                .expect("Failed acquiring currency cache lock."), // TODO: add cache here
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
                        println!("_db_err: {:?}", _db_err);
                        ErrorInternalServerError("Error querying database.").error_response()
                    }
                    CreateCurrencyRateDatumErrors::CyclicRefAmountCurrency(uuid) => {
                        let msg = format!("The datum target currency references itself (id: {}), creating a cycle.", uuid);
                        ErrorBadRequest(msg).error_response()
                    }
                    CreateCurrencyRateDatumErrors::CurrencyNotFound(uuid) => {
                        let msg = format!("Cannot find currency with id={}.", uuid);
                        ErrorBadRequest(msg).error_response()
                    }
                }
            }
        }
    }
}

#[derive(Clone, Debug)]
pub struct CurrencyRateDatum {
    pub id: Uuid,
    pub amount: String,
    pub ref_currency_id: CurrencyId,
    pub ref_amount_currency_id: CurrencyId,
    pub owner: AuthUser,
    pub date: i32,
}

#[derive(Clone, Debug)]
pub struct CreateCurrencyRateDatumAction {
    pub amount: String,
    pub ref_currency_id: CurrencyId,
    pub ref_amount_currency_id: CurrencyId,
    pub owner: AuthUser,
    pub date: i32,
}

impl CreateCurrencyRateDatumAction {
    pub fn into_domain(self, db_id: uuid::Uuid) -> CurrencyRateDatum {
        CurrencyRateDatum {
            id: db_id,
            amount: self.amount.to_string(),
            owner: self.owner,
            ref_amount_currency_id: self.ref_amount_currency_id,
            ref_currency_id: self.ref_currency_id,
            date: self.date,
        }
    }
}

impl From<CreateCurrencyRateDatumAction> for currency_rate_datum::ActiveModel {
    fn from(value: CreateCurrencyRateDatumAction) -> Self {
        Self {
            id: ActiveValue::Set(uuid::Uuid::new_v4()),
            owner_id: ActiveValue::Set(value.owner.0),
            amount: ActiveValue::Set(value.amount),
            ref_currency_id: ActiveValue::Set(value.ref_currency_id.0),
            ref_amount_currency_id: ActiveValue::Set(value.ref_amount_currency_id.0),
            date: ActiveValue::Set(value.date),
        }
    }
}
