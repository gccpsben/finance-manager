use crate::services::currencies::CreateCurrencyErrors;
use crate::{
    extractors::auth_user::AuthUser, repositories::TransactionWithCallback,
    states::database_states::DatabaseStates,
};
use crate::{
    repositories::currencies::CreateCurrencyDomainEnum, services::currencies::create_currency,
};
use actix_web::error::ErrorBadRequest;
use actix_web::{get, http::header::ContentType, post, web, HttpResponse};
use sea_orm::TransactionTrait;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use ts_rs::TS;

pub mod post_currency {

    use super::*;

    #[derive(Serialize, Deserialize, Debug)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostCurrencyRequestBody {
        pub name: String,
        pub fallback_rate_amount: Option<String>,
        pub fallback_rate_currency_id: Option<String>,
        pub ticker: String,
    }

    #[derive(Serialize, Deserialize, Debug)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostCurrencyResponseBody {
        pub id: String,
    }

    #[post("/currencies")]
    async fn handler(
        user: AuthUser,
        info: web::Json<PostCurrencyRequestBody>,
        data: web::Data<DatabaseStates>,
    ) -> HttpResponse {
        // Convert request to create domain enum
        let domain_enum_to_be_saved = match (
            info.fallback_rate_amount.clone(),
            info.fallback_rate_currency_id.clone(),
        ) {
            (None, None) => CreateCurrencyDomainEnum::Base {
                name: info.name.clone(),
                owner: user,
                ticker: info.ticker.clone(),
            },
            (Some(ref fallback_rate_amount), Some(ref fallback_rate_currency_id)) => {
                match uuid::Uuid::from_str(fallback_rate_currency_id) {
                    Ok(parsed_uuid) => CreateCurrencyDomainEnum::Normal {
                        name: info.name.clone(),
                        owner: user,
                        ticker: info.ticker.clone(),
                        fallback_rate_amount: fallback_rate_amount.clone(),
                        fallback_rate_currency_id: parsed_uuid,
                    },
                    Err(_uuid_err) => {
                        return HttpResponse::BadRequest()
                            .body("Invalid UUID is given in fallbackRateCurrencyId.")
                    }
                }
            }
            (_, _) => {
                return HttpResponse::BadRequest().body(
                    "If fallbackRateAmount is given, fallbackRateCurrencyId mus also be given.",
                )
            }
        };

        let db_txn = match TransactionWithCallback::from_db_conn(&data.db, vec![]).await {
            Err(_db_err) => {
                return HttpResponse::InternalServerError()
                    .body("Unable to start database transaction.")
            }
            Ok(db_txn) => db_txn,
        };

        let create_currency_result = create_currency(
            domain_enum_to_be_saved,
            db_txn,
            &mut data
                .currency_cache
                .lock()
                .expect("Failed acquiring currency cache lock."),
        )
        .await;

        match create_currency_result {
            Ok((id, db_txn)) => {
                db_txn.commit().await;
                HttpResponse::Ok().content_type(ContentType::json()).body(
                    serde_json::to_string(&PostCurrencyResponseBody { id: id.to_string() })
                        .expect("?"),
                )
            }
            Err(CreateCurrencyErrors::RepeatedBaseCurrency(uuid)) => ErrorBadRequest(format!(
                "Another base currency (id: {}) is already registered.",
                uuid
            ))
            .into(),
            Err(CreateCurrencyErrors::ValidationErr) => {
                ErrorBadRequest("The given currency failed validation.").into()
            }
            Err(CreateCurrencyErrors::ReferencedCurrencyNotExist(uuid)) => {
                ErrorBadRequest(format!(
                    "The currency referenced in the currency object ({}) cannot be found.",
                    uuid
                ))
                .into()
            }
            Err(CreateCurrencyErrors::DbErr(db_err)) => HttpResponse::InternalServerError()
                .content_type(ContentType::json())
                .body(format!("Failed creating currency row: {:?}", db_err)),
        }
    }
}

pub mod get_currency {

    use super::*;
    use crate::repositories::currencies::{get_currencies, get_currency_by_id, CurrencyDomainEnum};

    #[derive(Serialize, Deserialize)]
    pub struct GetCurrencyQuery {
        pub id: Option<String>,
    }

    #[derive(Serialize, Deserialize)]
    pub struct GetCurrencyResponseItem {
        pub id: String,
        pub name: String,
        pub fallback_rate_amount: Option<String>,
        pub fallback_rate_currency_id: Option<String>,
        pub ticker: String,
        pub is_base: bool,
        pub owner: String,
        // pub rate_to_base:
    }

    #[derive(Serialize, Deserialize)]
    pub struct GetCurrencyResponse {
        pub items: Vec<GetCurrencyResponseItem>,
    }

    #[get("/currencies")]
    async fn handler(
        user: AuthUser,
        query: web::Query<GetCurrencyQuery>,
        data: web::Data<DatabaseStates>,
    ) -> HttpResponse {
        let db_txn_raw = match data.db.begin().await {
            Ok(db_txn_raw) => db_txn_raw,
            Err(_db_err) => {
                return HttpResponse::InternalServerError().body("Error querying database.")
            }
        };
        let db_txn = TransactionWithCallback::new(db_txn_raw, vec![]);
        let mut cache = data
            .currency_cache
            .lock()
            .expect("Failed acquiring currency cache lock.");

        let parsed_uuid = match &query.id {
            Some(unparsed_uuid) => match uuid::Uuid::from_str(unparsed_uuid.as_str()) {
                Ok(parsed_uuid) => Some(parsed_uuid),
                Err(_parse_err) => return HttpResponse::BadRequest().body("Invalid uuid given."),
            },
            None => None,
        };

        let currencies_found: Vec<CurrencyDomainEnum> = match parsed_uuid {
            // Get all currencies if no params are given
            None => match get_currencies(&user, db_txn).await {
                Err(_db_err) => {
                    return HttpResponse::InternalServerError().body("Error querying database.")
                }
                Ok((currencies, _db_txn)) => currencies,
            },
            Some(parsed_uuid) => {
                match get_currency_by_id(&user, parsed_uuid, db_txn, Some(&mut cache)).await {
                    Err(_db_err) => {
                        return HttpResponse::InternalServerError().body("Error querying database.")
                    }
                    Ok((None, _db_txn)) => vec![],
                    Ok((Some(item), _db_txn)) => vec![item],
                }
            }
        };

        HttpResponse::Ok().content_type(ContentType::json()).body(
            serde_json::to_string(&GetCurrencyResponse {
                items: currencies_found
                    .iter()
                    .map(|currency_model| match currency_model {
                        CurrencyDomainEnum::Base {
                            id,
                            name,
                            owner,
                            ticker,
                        } => GetCurrencyResponseItem {
                            fallback_rate_amount: None,
                            fallback_rate_currency_id: None,
                            id: id.to_string(),
                            name: name.to_string(),
                            owner: owner.to_string(),
                            ticker: ticker.to_string(),
                            is_base: false,
                        },
                        CurrencyDomainEnum::Normal {
                            id,
                            name,
                            owner,
                            ticker,
                            fallback_rate_amount,
                            fallback_rate_currency_id,
                        } => GetCurrencyResponseItem {
                            fallback_rate_amount: Some(fallback_rate_amount.to_string()),
                            fallback_rate_currency_id: Some(fallback_rate_currency_id.to_string()),
                            id: id.to_string(),
                            name: name.to_string(),
                            owner: owner.to_string(),
                            ticker: ticker.to_string(),
                            is_base: false,
                        },
                    })
                    .collect(),
            })
            .expect("Unable to serialize response struct."),
        )
    }
}
