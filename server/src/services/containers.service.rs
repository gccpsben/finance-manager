use crate::repositories::TransactionWithCallback;
use crate::{extractors::auth_user::AuthUser, repositories};
use sea_orm::prelude::DateTime;
use sea_orm::DbErr;

pub async fn create_container<'a>(
    auth_user: AuthUser,
    name: &str,
    date_time: DateTime,
    db: TransactionWithCallback<'a>,
) -> Result<(uuid::Uuid, TransactionWithCallback<'a>), DbErr> {
    match repositories::containers::create_container(auth_user.user_id, name, date_time, db).await {
        Err(db_err) => Err(db_err),
        Ok((inserted_id, db_txn)) => Ok((inserted_id, db_txn)),
    }
}
