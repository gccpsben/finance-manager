use crate::services::users::{generate_token_unverified, verify_creds};
use crate::DatabaseStates;
use actix_web::error::{ErrorInternalServerError, ErrorUnauthorized};
use actix_web::post;
use actix_web::{http::header::ContentType, web, HttpResponse};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub mod login {

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
    ) -> HttpResponse {
        let db_connection = &data.db;
        let given_username = &info.username;
        let given_password = &info.password;

        let is_creds_valid = verify_creds(
            given_username.as_str(),
            given_password.as_str(),
            db_connection,
        )
        .await;

        match is_creds_valid {
            crate::services::users::VerifyCredsResult::Ok(model) => {
                let token_gen_result = generate_token_unverified(model.id, db_connection).await;
                match token_gen_result {
                    Err(err) => {
                        ErrorInternalServerError(format!("Error querying database: {}", err)).into()
                    }
                    Ok(token) => {
                        return HttpResponse::Ok().content_type(ContentType::json()).json(
                            LoginResponseBody {
                                token: token.last_insert_id.to_string(),
                                owner: model.id.to_string(),
                            },
                        )
                    }
                }
            }
            crate::services::users::VerifyCredsResult::DbErr => {
                ErrorInternalServerError("Error querying database.").into()
            }
            _ => ErrorUnauthorized("").into(),
        }
    }
}

pub mod register {
    use crate::services::users::{register_user, RegisterUserErrors};

    use super::*;

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
    ) -> HttpResponse {
        let username = &info.username;
        let password = &info.password;

        match register_user(username, password, &data.db).await {
            Ok(new_id) => {
                let response = PostUserResponseBody { id: new_id.into() };
                return HttpResponse::Ok()
                    .content_type(ContentType::json())
                    .body(serde_json::to_string(&response).expect("?"));
            }
            Err(RegisterUserErrors::EmptyUsername) => {
                return HttpResponse::BadRequest()
                    .content_type(ContentType::json())
                    .body("Empty username")
            }
            Err(RegisterUserErrors::EmptyPassword) => {
                return HttpResponse::BadRequest()
                    .content_type(ContentType::json())
                    .body("Empty password")
            }
            Err(RegisterUserErrors::DbErr(err)) => {
                println!("Error occurred: {:?}", err);
                return HttpResponse::InternalServerError()
                    .content_type(ContentType::json())
                    .body(format!("Error querying database: {}", err));
            }
            Err(RegisterUserErrors::HashError(err)) => {
                println!("Error occurred: {:?}", err);
                return HttpResponse::InternalServerError()
                    .content_type(ContentType::json())
                    .body(format!("Hash error: {}", err));
            }
        }
    }
}
