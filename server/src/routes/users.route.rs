use crate::services::users::{generate_token_unverified, verify_creds};
use crate::DatabaseStates;
use actix_web::post;
use actix_web::web;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub mod login {

    use crate::routes::bootstrap::EndpointsErrors;

    use super::*;

    #[derive(Serialize, Deserialize, Clone, Debug)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct LoginRequestBody {
        pub username: String,
        pub password: String,
    }

    #[derive(Serialize, Deserialize, Clone, Debug)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct LoginResponseBody {
        pub token: String,
        pub owner: String,
    }

    #[post("/login")]
    async fn handler(
        info: web::Json<LoginRequestBody>,
        data: web::Data<DatabaseStates>,
    ) -> Result<web::Json<LoginResponseBody>, EndpointsErrors> {
        let db_connection = &data.db;
        let given_username = &info.username;
        let given_password = &info.password;

        let model = verify_creds(
            given_username.as_str(),
            given_password.as_str(),
            db_connection,
        )
        .await?;

        let token = generate_token_unverified(model.id, db_connection).await?;
        Ok(web::Json(LoginResponseBody {
            token: token.last_insert_id.to_string(),
            owner: model.id.to_string(),
        }))
    }
}

pub mod register {
    use super::*;
    use crate::{routes::bootstrap::EndpointsErrors, services::users::register_user};

    #[derive(Serialize, Deserialize, Clone)]
    pub struct PostUserResponseBody {
        pub id: String,
    }

    #[derive(Serialize, Deserialize, Clone)]
    pub struct PostUserRequestBody {
        pub username: String,
        pub password: String,
    }

    #[post("/users")]
    async fn handler(
        info: web::Json<PostUserRequestBody>,
        data: web::Data<DatabaseStates>,
    ) -> Result<web::Json<PostUserResponseBody>, EndpointsErrors> {
        let username = &info.username;
        let password = &info.password;

        let user = register_user(username, password, &data.db).await?;
        Ok(web::Json(PostUserResponseBody { id: user.into() }))
    }
}
