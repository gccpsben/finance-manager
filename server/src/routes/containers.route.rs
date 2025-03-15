use crate::services::containers::{get_container, get_containers};
use crate::{
    extractors::auth_user::AuthUser, services::containers::create_container, DatabaseStates,
};
use actix_web::get;
use actix_web::{post, web};
use serde::Deserialize;
use serde::Serialize;
use ts_rs::TS;

pub mod get_container {

    use crate::routes::bootstrap::{parse_uuid, EndpointsErrors};

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
    ) -> Result<web::Json<GetContainerResponse>, EndpointsErrors> {
        let parsed_uuid: Option<uuid::Uuid> = match &query.id {
            Some(unparsed_uuid) => Some(parse_uuid(unparsed_uuid.as_str())?),
            None => None,
        };

        let containers_found = match parsed_uuid {
            Some(parsed_uuid) => match get_container(&user, parsed_uuid, &data.db).await? {
                Some(container_found) => vec![container_found],
                None => vec![],
            },
            None => get_containers(&user, &data.db).await?,
        };

        Ok(web::Json(GetContainerResponse {
            items: containers_found
                .iter()
                .map(|container_model| GetContainerResponseItem {
                    container_id: container_model.id.to_string(),
                    container_name: container_model.name.to_string(),
                    creation_date: container_model.creation_date.and_utc().timestamp(),
                })
                .collect(),
        }))
    }
}

pub mod post_container {
    use super::*;
    use crate::{routes::bootstrap::EndpointsErrors, services::TransactionWithCallback};
    use sea_orm::{prelude::DateTime, sqlx::types::chrono::Utc, TransactionTrait};

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
    ) -> Result<web::Json<PostContainerResponseBody>, EndpointsErrors> {
        let (id, db_txn) = create_container(
            &user,
            info.container_name.as_str(),
            DateTime::new(Utc::now().date_naive(), Utc::now().time()),
            TransactionWithCallback::new(data.db.begin().await?, vec![]),
        )
        .await?;

        db_txn.commit().await;
        Ok(web::Json(PostContainerResponseBody {
            container_id: id.to_string(),
        }))
    }
}
