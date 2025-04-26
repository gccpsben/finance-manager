use crate::entities::account;
use crate::extended_models::account::AccountId;
use crate::extractors::auth_user::AuthUser;
use crate::services::TransactionWithCallback;
use sea_orm::ActiveValue;
use sea_orm::ColumnTrait;
use sea_orm::DbErr;
use sea_orm::EntityTrait;
use sea_orm::QueryFilter;
use sea_orm::prelude::DateTime;

pub async fn create_account(
    auth_user: &AuthUser,
    name: &str,
    creation_date: DateTime,
    db_txn: TransactionWithCallback,
) -> Result<(uuid::Uuid, TransactionWithCallback), DbErr> {
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
    account_id: &AccountId,
    db_txn: TransactionWithCallback,
) -> Result<(Option<account::Model>, TransactionWithCallback), DbErr> {
    let result = account::Entity::find()
        .filter(account::Column::OwnerId.eq(user.0))
        .filter(account::Column::Id.eq(account_id.0))
        .one(db_txn.get_db_txn())
        .await?;
    Ok((result, db_txn))
}

// pub async fn get_accounts_paged(
//     user: &AuthUser,
//     db_txn: TransactionWithCallback,
//     page_index: u64,
//     page_size: u64,
// ) -> Result<(PagedContent<account::Model>, TransactionWithCallback), DbErr> {
//     let paginator = account::Entity::find()
//         .filter(account::Column::OwnerId.eq(user.0))
//         .paginate(db_txn.get_db_txn(), page_size);
//     let num_and_pages = paginator.num_items_and_pages().await?;
//     let page_items = paginator.fetch_page(page_index).await?;
//     Ok((
//         PagedContent::new(&page_items, page_size, num_and_pages.number_of_items),
//         db_txn,
//     ))
// }

pub async fn get_accounts(
    user: &AuthUser,
    db_txn: TransactionWithCallback,
) -> Result<(Vec<account::Model>, TransactionWithCallback), DbErr> {
    let result = account::Entity::find()
        .filter(account::Column::OwnerId.eq(user.0))
        .all(db_txn.get_db_txn())
        .await?;
    Ok((result, db_txn))
}

// TODO: See if this can be optimized at DB level
pub async fn find_first_unknown_account(
    owner: &AuthUser,
    ids: &[AccountId],
    db_txn: TransactionWithCallback,
) -> Result<(Option<AccountId>, TransactionWithCallback), DbErr> {
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
