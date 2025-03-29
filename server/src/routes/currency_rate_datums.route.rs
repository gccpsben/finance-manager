use crate::entities::currency_rate_datum;
use crate::extended_models::currency::CurrencyId;
use crate::services::{currency_rate_datum::create_currency_rate_datum, TransactionWithCallback};
use crate::{extractors::auth_user::AuthUser, states::database_states::DatabaseStates};
use actix_web::{post, web};
use sea_orm::prelude::DateTime;
use sea_orm::ActiveValue;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use ts_rs::TS;
use uuid::Uuid;

pub mod post_currency_rate_datum {

    use crate::{date::js_iso_to_iso8601, routes::bootstrap::EndpointsErrors};

    use super::*;

    #[derive(Serialize, Deserialize, Debug)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostCurrencyRateDatumRequest {
        pub ref_currency_id: String,
        pub ref_amount_currency_id: String,
        pub amount: String,
        pub date_utc: String,
    }

    #[derive(Serialize, Deserialize, Debug)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostCurrencyRateDatumResponse {
        pub id: String,
    }

    #[post("/currency_rate_datums")]
    async fn handler(
        user: AuthUser,
        info: web::Json<PostCurrencyRateDatumRequest>,
        data: web::Data<DatabaseStates>,
    ) -> Result<web::Json<PostCurrencyRateDatumResponse>, EndpointsErrors> {
        let uuids = {
            let exit_bad_uuid =
                |given_str: &str| Err(EndpointsErrors::InvalidUUID(given_str.to_string()));
            match (
                Uuid::from_str(&info.ref_currency_id),
                Uuid::from_str(&info.ref_amount_currency_id),
            ) {
                (Ok(ref_curr_id), Ok(ref_amount_curr_id)) => (ref_curr_id, ref_amount_curr_id),
                (Err(_), _) => {
                    return exit_bad_uuid(&info.ref_currency_id);
                }
                (_, Err(_)) => {
                    return exit_bad_uuid(&info.ref_amount_currency_id);
                }
            }
        };

        let date = js_iso_to_iso8601(info.date_utc.as_str())?;

        // Convert request to create domain enum
        let domain_to_be_saved = CreateCurrencyRateDatumAction {
            amount: info.amount.clone(),
            date: date.naive_utc(),
            owner: user.clone(),
            ref_currency_id: CurrencyId(uuids.0),
            ref_amount_currency_id: CurrencyId(uuids.1),
        };

        let (row_id, db_txn) = create_currency_rate_datum(
            &user,
            domain_to_be_saved,
            TransactionWithCallback::from_db_conn(&data.db, vec![]).await?,
            data.currency_rate_datums_cache.clone(),
            data.currency_cache.clone(),
        )
        .await?;

        db_txn.commit().await;
        Ok(web::Json(PostCurrencyRateDatumResponse {
            id: row_id.to_string(),
        }))
    }
}

#[allow(unused)]
#[derive(Clone, Debug)]
pub struct CurrencyRateDatum {
    pub id: Uuid,
    pub amount: String,
    pub ref_currency_id: CurrencyId,
    pub ref_amount_currency_id: CurrencyId,
    pub owner: AuthUser,
    pub date: DateTime,
}

#[derive(Clone, Debug)]
pub struct CreateCurrencyRateDatumAction {
    pub amount: String,
    pub ref_currency_id: CurrencyId,
    pub ref_amount_currency_id: CurrencyId,
    pub owner: AuthUser,
    pub date: DateTime,
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
