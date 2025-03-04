use crate::services::containers::{get_container, get_containers};
use crate::{
    extractors::auth_user::AuthUser, services::containers::create_container, DatabaseStates,
};
use actix_web::get;
use actix_web::http::header::ContentType;
use actix_web::{post, web, HttpResponse};
use serde::Deserialize;
use serde::Serialize;
use std::str::FromStr;
use ts_rs::TS;
use uuid::Error;

pub mod get_container {

    use super::*;

    #[derive(TS)]
    #[ts(export)]
    #[derive(Serialize, Deserialize)]
    pub struct GetContainerQuery {
        pub id: Option<String>,
    }

    #[derive(Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct GetContainerResponseItem {
        pub container_id: String,
        pub container_name: String,
        pub creation_date: i64,
    }

    #[derive(Serialize, Deserialize)]
    pub struct GetContainerResponse {
        pub items: Vec<GetContainerResponseItem>,
    }

    #[get("/containers")]
    async fn handler(
        user: AuthUser,
        query: web::Query<GetContainerQuery>,
        data: web::Data<DatabaseStates>,
    ) -> HttpResponse {
        let parsed_uuid: Result<Option<uuid::Uuid>, Error> = match &query.id {
            Some(unparsed_uuid) => match uuid::Uuid::from_str(unparsed_uuid.as_str()) {
                Ok(parsed_uuid) => Ok(Some(parsed_uuid)),
                Err(parse_err) => Err(parse_err),
            },
            None => Ok(None),
        };

        let containers_found = match parsed_uuid {
            Ok(Some(parsed_uuid_requested)) => {
                match get_container(&user, parsed_uuid_requested, &data.db).await {
                    Ok(Some(container_found)) => vec![container_found],
                    Ok(None) => vec![],
                    Err(_) => {
                        return HttpResponse::InternalServerError().body("Error querying database.")
                    }
                }
            }
            Ok(None) => match get_containers(&user, &data.db).await {
                Ok(containers) => containers,
                Err(_) => {
                    return HttpResponse::InternalServerError().body("Error querying database.")
                }
            },
            Err(_) => return HttpResponse::BadRequest().body("Invalid uuid given."),
        };

        HttpResponse::Ok().content_type(ContentType::json()).body(
            serde_json::to_string(&GetContainerResponse {
                items: containers_found
                    .iter()
                    .map(|container_model| GetContainerResponseItem {
                        container_id: container_model.id.to_string(),
                        container_name: container_model.name.to_string(),
                        creation_date: container_model.creation_date.and_utc().timestamp(),
                    })
                    .collect(),
            })
            .expect("Unable to serialize response struct."),
        )
    }
}

pub mod post_container {
    use sea_orm::{prelude::DateTime, sqlx::types::chrono::Utc, TransactionTrait};

    use crate::services::TransactionWithCallback;

    use super::*;

    #[derive(Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostContainerRequestBody {
        pub container_name: String,
    }

    #[derive(Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostContainerResponseBody {
        pub container_id: String,
    }

    #[post("/containers")]
    async fn handler(
        user: AuthUser,
        info: web::Json<PostContainerRequestBody>,
        data: web::Data<DatabaseStates>,
    ) -> HttpResponse {
        let db_txn_raw = match data.db.begin().await {
            Ok(db_txn_raw) => db_txn_raw,
            Err(_db_err) => {
                return HttpResponse::InternalServerError().body("Error querying database.")
            }
        };

        let db_txn = TransactionWithCallback::new(db_txn_raw, vec![]);
        let create_container_result = create_container(
            &user,
            info.container_name.as_str(),
            DateTime::new(Utc::now().date_naive(), Utc::now().time()),
            db_txn,
        )
        .await;

        match create_container_result {
            Err(err) => HttpResponse::InternalServerError()
                .content_type(ContentType::json())
                .body(format!("Error querying database: {:?}", err)),
            Ok((id, db_txn)) => {
                db_txn.commit().await;
                HttpResponse::Ok().content_type(ContentType::json()).body(
                    serde_json::to_string(&PostContainerResponseBody {
                        container_id: id.to_string(),
                    })
                    .expect("?"),
                )
            }
        }
    }
}
