use crate::{extractors::auth_user::AuthUser, states::database_states::DatabaseStates};
use actix_web::{get, post, web};
use sea_orm::TransactionTrait;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub mod post_currency {

    use crate::{
        extended_models::currency::{CreateCurrencyAction, CurrencyId},
        routes::bootstrap::{parse_uuid, EndpointsErrors},
        services::{currencies::create_currency, TransactionWithCallback},
    };

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
    ) -> Result<web::Json<PostCurrencyResponseBody>, EndpointsErrors> {
        // Convert request to create domain enum
        let domain_enum_to_be_saved = match (
            info.fallback_rate_amount.clone(),
            info.fallback_rate_currency_id.clone(),
        ) {
            (None, None) => CreateCurrencyAction::Base {
                name: info.name.clone(),
                owner: user,
                ticker: info.ticker.clone(),
            },
            (Some(ref fallback_rate_amount), Some(ref fallback_rate_currency_id)) => {
                CreateCurrencyAction::Normal {
                    name: info.name.clone(),
                    owner: user,
                    ticker: info.ticker.clone(),
                    fallback_rate_amount: fallback_rate_amount.clone(),
                    fallback_rate_currency_id: CurrencyId(parse_uuid(fallback_rate_currency_id)?),
                }
            }
            (_, _) => {
                return Err(EndpointsErrors::MissingArgPair {
                    left_prop_name: "fallbackRateAmount".to_string(),
                    right_prop_name: "fallbackRateCurrencyId".to_string(),
                })
            }
        };

        let db_txn = TransactionWithCallback::from_db_conn(&data.db, vec![]).await?;
        let (id, db_txn) =
            create_currency(domain_enum_to_be_saved, db_txn, data.currency_cache.clone()).await?;

        db_txn.commit().await;
        Ok(web::Json(PostCurrencyResponseBody { id: id.to_string() }))
    }
}

pub mod get_currency {

    use futures::TryFutureExt;
    use rust_decimal::Decimal;

    use crate::{
        date::utc_str_to_iso8601,
        extended_models::currency::{Currency, CurrencyId},
        routes::bootstrap::{parse_uuid, EndpointsErrors},
        services::{
            currencies::{calculate_currency_rate, get_currencies, get_currency_by_id},
            TransactionWithCallback,
        },
        RESTFUL_DIGITS,
    };

    use super::*;

    #[derive(Serialize, Deserialize)]
    pub struct GetCurrencyQuery {
        pub id: Option<String>,
        pub date: Option<String>,
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
        pub rate_to_base: String,
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
    ) -> Result<web::Json<GetCurrencyResponse>, EndpointsErrors> {
        let db_txn_raw = data
            .db
            .begin()
            .await
            .map_err(Into::<EndpointsErrors>::into)?;
        let db_txn = TransactionWithCallback::new(db_txn_raw, vec![]);

        let parsed_uuid = &query.id.clone().map(|id| parse_uuid(&id)).transpose()?;

        // Get all currencies if no params are given
        let (currencies_found, db_txn) = match parsed_uuid {
            None => get_currencies(&user, db_txn).await,
            Some(parsed_uuid) => {
                get_currency_by_id(
                    &user,
                    &CurrencyId(*parsed_uuid),
                    db_txn,
                    data.currency_cache.clone(),
                )
                .map_ok(|(item, db_txn)| (item.map(|item| vec![item]).unwrap_or_default(), db_txn))
                .await
            }
        }
        .map_err(Into::<EndpointsErrors>::into)?;

        // The DateTime to calculate rate against.
        let rate_to_base_time: chrono::DateTime<chrono::Utc> = match &query.date {
            Some(date_str) => {
                utc_str_to_iso8601(date_str).map_err(Into::<EndpointsErrors>::into)?
            }
            None => chrono::Utc::now(),
        };

        let currencies_len = currencies_found.len();

        let mut db_txn = db_txn;
        let mut output: Vec<GetCurrencyResponseItem> = Vec::with_capacity(currencies_len);
        for currency_model in currencies_found.iter() {
            db_txn = match currency_model {
                Currency::Base {
                    id,
                    name,
                    owner,
                    ticker,
                } => {
                    output.push(GetCurrencyResponseItem {
                        fallback_rate_amount: None,
                        fallback_rate_currency_id: None,
                        id: id.0.to_string(),
                        name: name.to_string(),
                        owner: owner.0.to_string(),
                        ticker: ticker.to_string(),
                        is_base: true,
                        rate_to_base: Decimal::ONE.to_string(),
                    });
                    db_txn
                }
                Currency::Normal {
                    id,
                    name,
                    owner,
                    ticker,
                    fallback_rate_amount,
                    fallback_rate_currency_id,
                } => {
                    let (rate, db_txn) = calculate_currency_rate(
                        owner,
                        *id,
                        db_txn,
                        rate_to_base_time,
                        data.currency_cache.clone(),
                    )
                    .await
                    .map_err(Into::<EndpointsErrors>::into)?;

                    output.push(GetCurrencyResponseItem {
                        fallback_rate_amount: Some(fallback_rate_amount.to_string()),
                        fallback_rate_currency_id: Some(fallback_rate_currency_id.0.to_string()),
                        id: id.0.to_string(),
                        name: name.to_string(),
                        owner: owner.0.to_string(),
                        ticker: ticker.to_string(),
                        is_base: false,
                        rate_to_base: rate.round_dp(RESTFUL_DIGITS).normalize().to_string(),
                    });

                    db_txn
                }
            }
        }

        Ok(web::Json(GetCurrencyResponse { items: output }))
    }
}
