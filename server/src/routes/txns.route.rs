use crate::date::iso8601_to_js_iso;
use crate::entities::fragment;
use crate::extractors::auth_user::AuthUser;
use crate::maths::format_decimal_restful;
use crate::routes::bootstrap::EndpointsErrors;
use crate::services::TransactionWithCallback;
use crate::services::txns::CreateTxnAction;
use crate::services::txns::CreateTxnActionFragment;
use crate::services::txns::CreateTxnActionFragmentSide;
use crate::services::txns::create_txn;
use crate::services::txns::get_txns;
use crate::states::database_states::DatabaseStates;
use actix_web::web;
use rust_decimal::Decimal;
use sea_orm::TransactionTrait;
use serde::Deserialize;
use serde::Serialize;
use std::str::FromStr;
use ts_rs::TS;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
#[derive(TS)]
#[ts(export)]
pub struct GetTxnsResponseFragmentSide {
    pub account: Uuid,
    pub amount: String,
    pub currency: Uuid,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
#[derive(TS)]
#[ts(export)]
pub struct GetTxnsResponseFragment {
    pub from: Option<GetTxnsResponseFragmentSide>,
    pub to: Option<GetTxnsResponseFragmentSide>,
}

impl From<&fragment::Model> for GetTxnsResponseFragment {
    fn from(value: &fragment::Model) -> Self {
        Self {
            from: value.from_account.map(|_| GetTxnsResponseFragmentSide {
                account: value.from_account.unwrap(),
                currency: value.from_currency_id.unwrap(),
                amount: value.from_amount.clone().unwrap().to_string(),
            }),
            to: value.to_account.map(|_| GetTxnsResponseFragmentSide {
                account: value.to_account.unwrap(),
                currency: value.to_currency_id.unwrap(),
                amount: value.to_amount.clone().unwrap().to_string(),
            }),
        }
    }
}

/// Get all transactions of a user.
pub mod get_txns {

    use crate::services::txns::value_delta_of_fragments;

    use super::*;
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
        pub tags: Vec<String>,
        pub value_delta: String,
    }

    #[derive(Serialize, Deserialize, Debug, Clone)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct GetTxnsResponse {
        pub items: Vec<GetTxnsResponseItem>,
        pub page_index: u64,
        pub total_items: u64,
        pub page_size: u64,
    }

    pub async fn handler(
        user: AuthUser,
        data: web::Data<DatabaseStates>,
    ) -> Result<web::Json<GetTxnsResponse>, EndpointsErrors> {
        let db_txn = TransactionWithCallback::new(data.db.begin().await?, vec![]);
        let (paginated_txns, db_txn) = get_txns(
            &user,
            crate::services::PaginationReq::All,
            db_txn,
            data.txns_cache.clone(),
        )
        .await?;

        let (items, db_txn): (Vec<GetTxnsResponseItem>, TransactionWithCallback) = {
            let mut items: Vec<GetTxnsResponseItem> = vec![];
            let mut db_txn = db_txn;
            for (txn, fragments, txn_tags) in paginated_txns.items {
                // TODO: Value delta calculations can be optimized
                let (value_change, db_txn_inner) = value_delta_of_fragments(
                    &user,
                    &fragments,
                    db_txn,
                    txn.date.and_utc(),
                    data.currency_cache.clone(),
                )
                .await?;
                items.push(GetTxnsResponseItem {
                    date: iso8601_to_js_iso(txn.date.and_utc()),
                    description: txn.description.to_string(),
                    id: txn.id.to_string(),
                    title: txn.title.to_string(),
                    fragments: fragments
                        .iter()
                        .map(GetTxnsResponseFragment::from)
                        .collect::<Vec<_>>(),
                    tags: txn_tags
                        .iter()
                        .map(|tag| tag.tag_id.to_string())
                        .collect::<Vec<_>>(),
                    value_delta: format_decimal_restful(value_change),
                });
                db_txn = db_txn_inner;
            }
            (items, db_txn)
        };

        db_txn.commit().await;

        Ok(web::Json(GetTxnsResponse {
            items,
            page_index: paginated_txns.page_index,
            total_items: paginated_txns.total_items,
            page_size: paginated_txns.page_size,
        }))
    }
}

/// Get a single transaction of a user.
pub mod get_txn {
    use super::*;
    use crate::extended_models::txn::TxnId;
    use crate::services::txns::get_txn_by_id;
    use crate::services::txns::value_delta_of_fragments;

    #[derive(Serialize, Deserialize, Debug, Clone)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct GetTxnResponse {
        pub id: String,
        pub title: String,
        pub description: String,
        pub date: String,
        pub fragments: Vec<GetTxnsResponseFragment>,
        pub tags: Vec<String>,
        pub value_delta: String,
    }

    #[derive(TS)]
    #[ts(export)]
    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct GetTxnQuery {
        pub id: String,
    }

    pub async fn handler(
        user: AuthUser,
        data: web::Data<DatabaseStates>,
        query: web::Query<GetTxnQuery>,
    ) -> Result<web::Json<GetTxnResponse>, EndpointsErrors> {
        let db_txn = TransactionWithCallback::new(data.db.begin().await?, vec![]);

        let requested_uuid = TxnId(
            Uuid::parse_str(&query.id)
                .map_err(|_err| EndpointsErrors::InvalidUUID(query.id.clone()))?,
        );

        let (txn, db_txn) =
            get_txn_by_id(&user, requested_uuid.0, db_txn, data.txns_cache.clone()).await?;

        let txn = txn.ok_or(EndpointsErrors::TxnNotFound(TxnId(requested_uuid.0)))?;
        let (value_change, db_txn) = value_delta_of_fragments(
            &user,
            &txn.1,
            db_txn,
            txn.0.date.and_utc(),
            data.currency_cache.clone(),
        )
        .await?;

        db_txn.commit().await;
        Ok(web::Json(GetTxnResponse {
            id: txn.0.id.to_string(),
            title: txn.0.title.to_string(),
            description: txn.0.description.to_string(),
            date: iso8601_to_js_iso(txn.0.date.and_utc()),
            fragments: txn.1.iter().map(|frag| frag.into()).collect::<Vec<_>>(),
            tags: txn
                .2
                .iter()
                .map(|txn_tag_mapping| txn_tag_mapping.tag_id.to_string())
                .collect::<Vec<_>>(),
            value_delta: format_decimal_restful(value_change),
        }))
    }
}

pub mod post_txns {

    use super::*;
    use crate::date::js_iso_to_iso8601;
    use crate::extended_models::txn_tag::TxnTagId;
    use crate::services::parse_uuids;

    #[derive(Serialize, Deserialize, Debug, Clone)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostTxnRequest {
        pub description: String,
        pub title: String,
        pub date_utc: String,
        pub fragments: Vec<PostTxnRequestFragment>,
        pub tags: Vec<String>,
    }

    #[derive(Serialize, Deserialize, Debug, Clone)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostTxnRequestFragmentSide {
        pub account: String,
        pub amount: String,
        pub currency: String,
    }

    #[derive(Serialize, Deserialize, Debug, Clone)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
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

    pub async fn handler(
        user: AuthUser,
        info: web::Json<PostTxnRequest>,
        data: web::Data<DatabaseStates>,
    ) -> Result<web::Json<PostTxnResponse>, EndpointsErrors> {
        let db_txn = TransactionWithCallback::new(data.db.begin().await?, vec![]);
        let mut fragments: Vec<CreateTxnActionFragment> = Vec::with_capacity(info.fragments.len());
        let map_to_err = |_| EndpointsErrors::OverflowOrUnderflow;
        let handled_parse_uuid = |str: &str| {
            Uuid::from_str(str).map_err(|_| EndpointsErrors::InvalidUUID(str.to_string()))
        };
        let txn_tags_ids = parse_uuids(&info.tags).map_err(EndpointsErrors::InvalidUUID)?;

        for frag in &info.fragments {
            let map_side_checked = |side: Option<PostTxnRequestFragmentSide>| {
                side.map(|side| {
                    let account_uuid = handled_parse_uuid(&side.account);
                    let currency_uuid = handled_parse_uuid(&side.currency);
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
            &txn_tags_ids
                .iter()
                .map(|tag| TxnTagId(*tag))
                .collect::<Vec<_>>(),
            db_txn,
            &user,
            data.currency_cache.clone(),
            data.txn_tags_cache.clone(),
            data.txns_cache.clone(),
        )
        .await?;

        db_txn.commit().await;

        Ok(web::Json(PostTxnResponse { id: id.to_string() }))
    }
}
