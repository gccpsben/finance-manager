use crate::entities::account;
use crate::extended_models::account::AccountId;
use crate::extractors::auth_user::AuthUser;
use crate::services::TransactionWithCallback;
use sea_orm::prelude::DateTime;
use sea_orm::{ActiveValue, ColumnTrait, DbErr, EntityTrait, QueryFilter};

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

pub async fn get_account<'a>(
    user: &AuthUser,
    account_id: &AccountId,
    db_txn: TransactionWithCallback<'a>,
) -> Result<(Option<account::Model>, TransactionWithCallback<'a>), DbErr> {
    let result = account::Entity::find()
        .filter(account::Column::OwnerId.eq(user.0))
        .filter(account::Column::Id.eq(account_id.0))
        .one(db_txn.get_db_txn())
        .await?;
    Ok((result, db_txn))
}

pub async fn get_accounts<'a>(
    user: &AuthUser,
    db_txn: TransactionWithCallback<'a>,
) -> Result<(Vec<account::Model>, TransactionWithCallback<'a>), DbErr> {
    let result = account::Entity::find()
        .filter(account::Column::OwnerId.eq(user.0))
        .all(db_txn.get_db_txn())
        .await?;
    Ok((result, db_txn))
}

// TODO: See if this can be optimized at DB level
pub async fn find_first_unknown_account<'a>(
    owner: &AuthUser,
    ids: &[AccountId],
    db_txn: TransactionWithCallback<'a>,
) -> Result<(Option<AccountId>, TransactionWithCallback<'a>), DbErr> {
    let mut db_txn = db_txn;
    for acc_id in ids {
        let (currency_rate_datum, transaction) = get_account(owner, acc_id, db_txn).await?;
        if currency_rate_datum.is_none() {
            return Ok((Some(*acc_id), transaction));
        }
        db_txn = transaction;
    }
    Ok((None, db_txn))
}
