use actix_web::{
    error::{ErrorInternalServerError, ErrorUnauthorized},
    web::Data,
    Error, FromRequest,
};
use futures::Future;
use sea_orm::{prelude::Expr, sea_query::IntoCondition, EntityTrait, JoinType, QuerySelect};
use serde::{Deserialize, Serialize};
use std::{pin::Pin, str::FromStr};

use crate::{
    entities::{access_token, user},
    DatabaseStates,
};

#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct AuthUser {
    pub username: String,
    pub user_id: uuid::Uuid,
}

impl FromRequest for AuthUser {
    type Error = Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self, Error>>>>;
    fn from_request(
        req: &actix_web::HttpRequest,
        _payload: &mut actix_web::dev::Payload,
    ) -> Self::Future {
        let db_connection = req
            .app_data::<Data<DatabaseStates>>()
            .expect("cannot get database connection.")
            .db
            .clone();
        let req = req.clone();
        let unauthorized_msg = "Authorization header not provided or user is not found.";
        Box::pin(async move {
            let token_header_utf8 = match req.headers().get("authorization") {
                None => return Err(ErrorUnauthorized(unauthorized_msg)),
                Some(token_header_unknown) => match token_header_unknown.to_str() {
                    Err(_) => return Err(ErrorUnauthorized(unauthorized_msg)),
                    Ok(token_header_utf8) => token_header_utf8,
                },
            };

            let token_header_parsed = String::from(token_header_utf8).clone();
            let uuid_header_parsed = match uuid::Uuid::from_str(token_header_parsed.as_str()) {
                Err(_) => return Err(ErrorUnauthorized(unauthorized_msg)),
                Ok(uuid) => uuid,
            };

            let token_owner_query = user::Entity::find()
                .join(
                    JoinType::InnerJoin,
                    user::Entity::belongs_to(access_token::Entity)
                        .from(user::Column::Id)
                        .to(access_token::Column::UserId)
                        .on_condition(move |_left, right| {
                            Expr::col((right, access_token::Column::Id))
                                .eq(uuid_header_parsed)
                                .into_condition()
                        })
                        .into(),
                )
                .one(&db_connection)
                .await;

            match token_owner_query {
                Err(_db_err) => Err(ErrorInternalServerError("Error querying database.")),
                Ok(None) => Err(ErrorUnauthorized(unauthorized_msg)),
                Ok(Some(token_owner)) => Ok(AuthUser {
                    user_id: token_owner.id,
                    username: token_owner.name,
                }),
            }
        })
    }
}
