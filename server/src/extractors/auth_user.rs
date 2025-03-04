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
pub struct AuthUser(pub uuid::Uuid);

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
            let token_header_utf8 = req
                .headers()
                .get("authorization")
                .ok_or(ErrorUnauthorized(unauthorized_msg))?
                .to_str()
                .map_err(|_| ErrorUnauthorized(unauthorized_msg))?;

            let token_header_parsed = String::from(token_header_utf8).clone();
            let uuid_header_parsed = uuid::Uuid::from_str(token_header_parsed.as_str())
                .map_err(|_| ErrorUnauthorized(unauthorized_msg))?;

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
                .await
                .map_err(|_db_err| ErrorInternalServerError("Error querying database."))?;

            match token_owner_query {
                None => Err(ErrorUnauthorized(unauthorized_msg)),
                Some(token_owner_query) => Ok(AuthUser(token_owner_query.id)),
            }
        })
    }
}
