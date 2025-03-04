use crate::services::users::{generate_token_unverified, verify_creds};
use crate::DatabaseStates;
use crate::{
    extractors::auth_user::AuthUser,
    services::{txn_tags::create_txn_tag, TransactionWithCallback},
};
use ::serde::{Deserialize, Serialize};
use actix_web::error::{ErrorInternalServerError, ErrorUnauthorized};
use actix_web::get;
use actix_web::post;
use actix_web::{http::header::ContentType, web, HttpResponse};
use ts_rs::TS;
use uuid::serde;

pub mod create_tag {
    use super::*;

    #[derive(Serialize, Deserialize, Clone, Debug)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostTxnTagRequestBody {
        pub name: String,
    }

    #[derive(Serialize, Deserialize, Clone, Debug)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostTxnTagResponseBody {
        pub id: String,
    }

    #[post("/txnTags")]
    async fn handler(
        user: AuthUser,
        info: web::Json<PostTxnTagRequestBody>,
        data: web::Data<DatabaseStates>,
    ) -> HttpResponse {
        let db_txn = match TransactionWithCallback::from_db_conn(&data.db, vec![]).await {
            Err(_db_err) => {
                return HttpResponse::InternalServerError()
                    .body("Unable to start database transaction.")
            }
            Ok(db_txn) => db_txn,
        };

        let tags_cache = &mut data
            .txn_tags_cache
            .lock()
            .expect("Failed acquiring currency cache lock.");

        match create_txn_tag(&user, &info.name, db_txn, tags_cache).await {
            Err(db_err) => HttpResponse::InternalServerError()
                .content_type(ContentType::json())
                .body(format!("Error querying database: {}", db_err)),
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
    use crate::services::txn_tags::get_txn_tags;

    use super::*;

    #[derive(Serialize, Deserialize, Clone, Debug)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct GetTxnTagsResponseBodyItem {
        pub name: String,
        pub id: String,
    }

    #[derive(Serialize, Deserialize, Clone, Debug)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct GetTxnTagsResponseBody {
        pub tags: Vec<GetTxnTagsResponseBodyItem>,
    }

    #[get("/txnTags")]
    async fn handler(user: AuthUser, data: web::Data<DatabaseStates>) -> HttpResponse {
        let db_txn = match TransactionWithCallback::from_db_conn(&data.db, vec![]).await {
            Err(_db_err) => {
                return HttpResponse::InternalServerError()
                    .body("Unable to start database transaction.")
            }
            Ok(db_txn) => db_txn,
        };

        match get_txn_tags(&user, db_txn).await {
            Ok(txn_tags) => {
                let response = GetTxnTagsResponseBody {
                    tags: txn_tags
                        .iter()
                        .map(|tag| GetTxnTagsResponseBodyItem {
                            name: tag.name.clone(),
                            id: tag.id.to_string(),
                        })
                        .collect::<Vec<_>>(),
                };
                HttpResponse::Ok().content_type(ContentType::json()).body(
                    serde_json::to_string(&response)
                        .expect("Unable to serde json to string in posting txn tags."),
                )
            }
            Err(db_err) => HttpResponse::InternalServerError()
                .content_type(ContentType::json())
                .body(format!("Error querying database: {}", db_err)),
        }
    }
}
