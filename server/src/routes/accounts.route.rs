use crate::services::accounts::{get_account, get_accounts};
use crate::{extractors::auth_user::AuthUser, services::accounts::create_account, DatabaseStates};
use actix_web::get;
use actix_web::{post, web};
use serde::Deserialize;
use serde::Serialize;
use ts_rs::TS;

pub mod get_account {

    use sea_orm::TransactionTrait;

    use crate::{
        extended_models::account::AccountId,
        routes::bootstrap::{parse_uuid, EndpointsErrors},
        services::TransactionWithCallback,
    };

    use super::*;

    #[derive(TS)]
    #[ts(export)]
    #[derive(Serialize, Deserialize)]
    pub struct GetAccountQuery {
        pub id: Option<String>,
    }

    #[derive(Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct GetAccountResponseItem {
        pub account_id: String,
        pub account_name: String,
        pub creation_date: i64,
    }

    #[derive(Serialize, Deserialize)]
    pub struct GetAccountResponse {
        pub items: Vec<GetAccountResponseItem>,
    }

    #[get("/accounts")]
    async fn handler(
        user: AuthUser,
        query: web::Query<GetAccountQuery>,
        data: web::Data<DatabaseStates>,
    ) -> Result<web::Json<GetAccountResponse>, EndpointsErrors> {
        let requested_acc_id: Option<uuid::Uuid> = query
            .id
            .clone()
            .map(|unparsed_uuid| parse_uuid(unparsed_uuid.as_str()))
            .transpose()?;

        let db_txn = TransactionWithCallback::new(data.db.begin().await?, vec![]);
        let (accounts_found, db_txn) = match requested_acc_id {
            Some(parsed_uuid) => match get_account(&user, &AccountId(parsed_uuid), db_txn).await? {
                (Some(account_found), db_txn) => (vec![account_found], db_txn),
                (None, db_txn) => (vec![], db_txn),
            },
            None => get_accounts(&user, db_txn).await?,
        };

        db_txn.commit().await;

        Ok(web::Json(GetAccountResponse {
            items: accounts_found
                .iter()
                .map(|account_model| GetAccountResponseItem {
                    account_id: account_model.id.to_string(),
                    account_name: account_model.name.to_string(),
                    creation_date: account_model.creation_date.and_utc().timestamp(),
                })
                .collect(),
        }))
    }
}

pub mod post_account {
    use super::*;
    use crate::{routes::bootstrap::EndpointsErrors, services::TransactionWithCallback};
    use sea_orm::{prelude::DateTime, sqlx::types::chrono::Utc, TransactionTrait};

    #[derive(Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostAccountRequestBody {
        pub account_name: String,
    }

    #[derive(Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    #[derive(TS)]
    #[ts(export)]
    pub struct PostAccountResponseBody {
        pub id: String,
    }

    #[post("/accounts")]
    async fn handler(
        user: AuthUser,
        info: web::Json<PostAccountRequestBody>,
        data: web::Data<DatabaseStates>,
    ) -> Result<web::Json<PostAccountResponseBody>, EndpointsErrors> {
        let (id, db_txn) = create_account(
            &user,
            info.account_name.as_str(),
            DateTime::new(Utc::now().date_naive(), Utc::now().time()),
            TransactionWithCallback::new(data.db.begin().await?, vec![]),
        )
        .await?;

        db_txn.commit().await;
        Ok(web::Json(PostAccountResponseBody { id: id.to_string() }))
    }
}
