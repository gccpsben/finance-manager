use crate::extractors::auth_user::AuthUser;
use crate::import_req_res_derive::import_req_res_derive;
use crate::services::TransactionWithCallback;
use crate::services::txn_tags::create_txn_tag;
use crate::states::database_states::DatabaseStates;
use actix_web::HttpResponse;
use actix_web::http::header::ContentType;
use actix_web::web;
use serde::Deserialize;
use serde::Serialize;
use ts_rs::TS;
import_req_res_derive!();

pub mod create_tag {
    use super::*;

    use_req_res_derive! {
        #[serde(rename_all = "camelCase", deny_unknown_fields)]
        #[derive(TS)]
        #[ts(export)]
        pub struct PostTxnTagRequestBody {
            pub name: String,
        }
    }

    use_req_res_derive! {
        #[serde(rename_all = "camelCase")]
        #[derive(TS)]
        #[ts(export)]
        pub struct PostTxnTagResponseBody {
            pub id: String,
        }
    }

    pub async fn handler(
        user: AuthUser,
        info: web::Json<PostTxnTagRequestBody>,
        data: web::Data<DatabaseStates>,
    ) -> HttpResponse {
        let db_txn = match TransactionWithCallback::from_db_conn(&data.db, vec![]).await {
            Err(_db_err) => {
                return HttpResponse::InternalServerError()
                    .body("Unable to start database transaction.");
            }
            Ok(db_txn) => db_txn,
        };

        match create_txn_tag(&user, &info.name, db_txn, data.txn_tags_cache.clone()).await {
            Err(db_err) => HttpResponse::InternalServerError()
                .content_type(ContentType::json())
                .body(format!("Error querying database: {db_err}")),
            Ok((new_id, db_txn)) => {
                let response = PostTxnTagResponseBody { id: new_id.into() };
                db_txn.commit().await;
                HttpResponse::Ok().content_type(ContentType::json()).body(
                    serde_json::to_string(&response)
                        .expect("Unable to serde json to string in posting txn tags."),
                )
            }
        }
    }
}

pub mod get_tags {
    use super::*;
    use crate::{routes::bootstrap::EndpointsErrors, services::txn_tags::get_txn_tags};

    use_req_res_derive! {
        #[serde(rename_all = "camelCase")]
        #[derive(TS)]
        #[ts(export)]
        pub struct GetTxnTagsResponseBodyItem {
            pub name: String,
            pub id: String,
        }
    }

    use_req_res_derive! {
        #[serde(rename_all = "camelCase")]
        #[derive(TS)]
        #[ts(export)]
        pub struct GetTxnTagsResponseBody {
            pub tags: Vec<GetTxnTagsResponseBodyItem>,
        }
    }

    pub async fn handler(
        user: AuthUser,
        data: web::Data<DatabaseStates>,
    ) -> Result<web::Json<GetTxnTagsResponseBody>, EndpointsErrors> {
        let db_txn = TransactionWithCallback::from_db_conn(&data.db, vec![]).await?;
        let txn_tags = get_txn_tags(&user, db_txn, data.txn_tags_cache.clone()).await?;
        Ok(web::Json(GetTxnTagsResponseBody {
            tags: txn_tags
                .0
                .iter()
                .map(|tag| GetTxnTagsResponseBodyItem {
                    name: tag.name.clone(),
                    id: tag.id.to_string(),
                })
                .collect::<Vec<_>>(),
        }))
    }
}
