use crate::date::iso8601_to_js_iso;
use crate::extractors::auth_user::AuthUser;
use crate::routes::bootstrap::EndpointsErrors;
use crate::services::txns::create_txn;
use crate::services::txns::get_txns;
use crate::services::txns::CreateTxnAction;
use crate::services::txns::CreateTxnActionFragment;
use crate::services::txns::CreateTxnActionFragmentSide;
use crate::services::TransactionWithCallback;
use crate::states::database_states::DatabaseStates;
use actix_web::get;
use actix_web::post;
use actix_web::web;
use rust_decimal::Decimal;
use sea_orm::TransactionTrait;
use serde::Deserialize;
use serde::Serialize;
use std::str::FromStr;
use ts_rs::TS;
use uuid::Uuid;

/// Get all transactions as a user.
pub mod get_txns {

    use super::*;

    #[derive(Serialize, Deserialize, Debug, Clone)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct GetTxnsResponseFragmentSide {
        pub account: Uuid,
        pub amount: String,
        pub currency: Uuid,
    }

    #[derive(Serialize, Deserialize, Debug, Clone)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct GetTxnsResponseFragment {
        pub from: Option<GetTxnsResponseFragmentSide>,
        pub to: Option<GetTxnsResponseFragmentSide>,
    }

    #[derive(Serialize, Deserialize, Debug, Clone)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct GetTxnsResponseItem {
        pub id: String,
        pub title: String,
        pub description: String,
        pub date: String,
        pub fragments: Vec<GetTxnsResponseFragment>,
    }

    #[derive(Serialize, Deserialize, Debug, Clone)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct GetTxnsResponse {
        pub items: Vec<GetTxnsResponseItem>,
    }

    #[get("/txns")]
    async fn handler(
        user: AuthUser,
        data: web::Data<DatabaseStates>,
    ) -> Result<web::Json<GetTxnsResponse>, EndpointsErrors> {
        let db_txn = TransactionWithCallback::new(data.db.begin().await?, vec![]);
        let (txns, db_txn) = get_txns(&user, db_txn).await?;

        db_txn.commit().await;
        Ok(web::Json(GetTxnsResponse {
            items: txns
                .iter()
                .map(|(txn, fragments)| GetTxnsResponseItem {
                    date: iso8601_to_js_iso(txn.date.and_utc()),
                    description: txn.description.to_string(),
                    id: txn.id.to_string(),
                    title: txn.title.to_string(),
                    fragments: fragments
                        .iter()
                        .map(|fragment| GetTxnsResponseFragment {
                            from: fragment.from_account.map(|_| GetTxnsResponseFragmentSide {
                                account: fragment.from_account.unwrap(),
                                currency: fragment.from_currency_id.unwrap(),
                                amount: fragment.from_amount.clone().unwrap().to_string(),
                            }),
                            to: fragment.to_account.map(|_| GetTxnsResponseFragmentSide {
                                account: fragment.to_account.unwrap(),
                                currency: fragment.to_currency_id.unwrap(),
                                amount: fragment.to_amount.clone().unwrap().to_string(),
                            }),
                        })
                        .collect::<Vec<_>>(),
                })
                .collect::<Vec<_>>(),
        }))
    }
}

pub mod post_txns {

    use crate::date::js_iso_to_iso8601;

    use super::*;

    #[derive(Serialize, Deserialize, Debug, Clone)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostTxnRequest {
        pub description: String,
        pub title: String,
        pub date_utc: String,
        pub fragments: Vec<PostTxnRequestFragment>,
    }

    #[derive(Serialize, Deserialize, Debug, Clone)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostTxnRequestFragmentSide {
        pub account: String,
        pub amount: String,
        pub currency: String,
    }

    #[derive(Serialize, Deserialize, Debug, Clone)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostTxnRequestFragment {
        pub from: Option<PostTxnRequestFragmentSide>,
        pub to: Option<PostTxnRequestFragmentSide>,
    }

    #[derive(Serialize, Deserialize, Debug)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostTxnResponse {
        pub id: String,
    }

    #[post("/txns")]
    async fn handler(
        user: AuthUser,
        info: web::Json<PostTxnRequest>,
        data: web::Data<DatabaseStates>,
    ) -> Result<web::Json<PostTxnResponse>, EndpointsErrors> {
        let db_txn = TransactionWithCallback::new(data.db.begin().await?, vec![]);
        let mut fragments: Vec<CreateTxnActionFragment> = Vec::with_capacity(info.fragments.len());
        let map_to_err = |_| EndpointsErrors::OverflowOrUnderflow;
        for frag in info.fragments.iter() {
            let map_side_checked = |side: Option<PostTxnRequestFragmentSide>| {
                side.map(|side| {
                    let account_uuid = Uuid::from_str(&side.account)
                        .map_err(|_| EndpointsErrors::InvalidUUID(side.account));
                    let currency_uuid = Uuid::from_str(&side.currency)
                        .map_err(|_| EndpointsErrors::InvalidUUID(side.currency));

                    match (account_uuid, currency_uuid) {
                        (Err(err), _) | (_, Err(err)) => Err(err),
                        (Ok(account_uuid), Ok(currency_uuid)) => {
                            let amount = Decimal::from_str_exact(&side.amount).map_err(map_to_err);
                            amount.map(|amount| CreateTxnActionFragmentSide {
                                amount,
                                account: account_uuid,
                                currency: currency_uuid,
                            })
                        }
                    }
                })
            };

            // TODO: see if we can remove clone here
            let from = map_side_checked(frag.from.clone()).transpose()?;
            let to = map_side_checked(frag.to.clone()).transpose()?;

            fragments.push(CreateTxnActionFragment { from, to });
        }

        let (id, db_txn) = create_txn(
            CreateTxnAction {
                date: js_iso_to_iso8601(&info.date_utc)?.naive_utc(),
                title: info.title.clone(),
                description: info.description.clone(),
            },
            &fragments,
            db_txn,
            &user,
            data.currency_cache.clone(),
        )
        .await?;

        db_txn.commit().await;

        Ok(web::Json(PostTxnResponse { id: id.to_string() }))
    }
}
