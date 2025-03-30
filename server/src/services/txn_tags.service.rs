use crate::caches::txn_tag::TxnTagsCache;
use crate::services::TransactionWithCallback;
use crate::{entities::txn_tag, extractors::auth_user::AuthUser};
use sea_orm::{ActiveValue, ColumnTrait, DbErr, EntityTrait, QueryFilter};
use uuid::Uuid;

pub async fn create_txn_tag(
    owner: &AuthUser,
    name: &str,
    db_txn: TransactionWithCallback,
    txn_tags_cache: &mut TxnTagsCache,
) -> Result<(Uuid, TransactionWithCallback), DbErr> {
    let new_tag = txn_tag::ActiveModel {
        id: ActiveValue::Set(uuid::Uuid::new_v4()),
        name: ActiveValue::Set(name.to_string()),
        owner_id: ActiveValue::Set(owner.0),
    };
    let model = txn_tag::Entity::insert(new_tag)
        .exec(db_txn.get_db_txn())
        .await?;
    txn_tags_cache.register_item(txn_tag::Model {
        id: model.last_insert_id.0,
        name: name.to_string(),
        owner_id: owner.0,
    });
    Ok((model.last_insert_id.0, db_txn))
}

#[allow(unused)]
pub async fn get_txn(
    user: &AuthUser,
    id: uuid::Uuid,
    db_txn: TransactionWithCallback,
    txn_tags_cache: &mut TxnTagsCache,
) -> Result<Option<txn_tag::Model>, DbErr> {
    let query_result = txn_tags_cache.query_txn_tag(user);
    let cache_result = query_result
        .iter()
        .find(|cached_tag| cached_tag.owner_id == user.0 && id == cached_tag.id)
        .cloned();

    match cache_result {
        None => {
            txn_tag::Entity::find()
                .filter(txn_tag::Column::OwnerId.eq(user.0))
                .filter(txn_tag::Column::Id.eq(id))
                .one(db_txn.get_db_txn())
                .await
        }
        Some(tag) => Ok(Some(tag)),
    }
}

pub async fn get_txn_tags(
    user: &AuthUser,
    db_txn: TransactionWithCallback,
) -> Result<Vec<txn_tag::Model>, DbErr> {
    txn_tag::Entity::find()
        .filter(txn_tag::Column::OwnerId.eq(user.0))
        .all(db_txn.get_db_txn())
        .await
}
