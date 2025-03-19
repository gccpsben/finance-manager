use crate::entities::account;
use crate::extractors::auth_user::AuthUser;
use crate::services::TransactionWithCallback;
use sea_orm::prelude::DateTime;
use sea_orm::{ActiveValue, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter};

pub async fn create_account<'a>(
    auth_user: &AuthUser,
    name: &str,
    creation_date: DateTime,
    db_txn: TransactionWithCallback<'a>,
) -> Result<(uuid::Uuid, TransactionWithCallback<'a>), DbErr> {
    let new_account = account::ActiveModel {
        id: ActiveValue::Set(uuid::Uuid::new_v4()),
        name: ActiveValue::Set(name.to_string()),
        owner_id: ActiveValue::Set(auth_user.0),
        creation_date: ActiveValue::Set(creation_date),
    };
    let model = account::Entity::insert(new_account)
        .exec(db_txn.get_db_txn())
        .await?;
    Ok((model.last_insert_id.0, db_txn))
}

pub async fn get_account(
    user: &AuthUser,
    account_id: uuid::Uuid,
    db: &DatabaseConnection,
) -> Result<Option<account::Model>, DbErr> {
    account::Entity::find()
        .filter(account::Column::OwnerId.eq(user.0))
        .filter(account::Column::Id.eq(account_id))
        .one(db)
        .await
}

pub async fn get_accounts(
    user: &AuthUser,
    db: &DatabaseConnection,
) -> Result<Vec<account::Model>, DbErr> {
    account::Entity::find()
        .filter(account::Column::OwnerId.eq(user.0))
        .all(db)
        .await
}
