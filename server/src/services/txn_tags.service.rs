use std::sync::Arc;

use crate::caches::txn_tag::TxnTagsCache;
use crate::entities;
use crate::extended_models::txn_tag::TxnTagId;
use crate::services::TransactionWithCallback;
use crate::{entities::txn_tag, extractors::auth_user::AuthUser};
use sea_orm::ActiveValue;
use sea_orm::ColumnTrait;
use sea_orm::DbErr;
use sea_orm::EntityTrait;
use sea_orm::QueryFilter;
use sea_orm::Value;
use tokio::sync::Mutex;
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
pub async fn get_txn_tag_by_id(
    user: &AuthUser,
    id: uuid::Uuid,
    db_txn: TransactionWithCallback,
    txn_tags_cache: Arc<Mutex<TxnTagsCache>>,
) -> Result<(Option<txn_tag::Model>, TransactionWithCallback), DbErr> {
    let query_result = txn_tags_cache.lock().await.query_txn_tag(user);
    let cache_result = query_result
        .iter()
        .find(|cached_tag| cached_tag.owner_id == user.0 && id == cached_tag.id)
        .cloned();

    match cache_result {
        None => Ok((
            txn_tag::Entity::find()
                .filter(txn_tag::Column::OwnerId.eq(user.0))
                .filter(txn_tag::Column::Id.eq(id))
                .one(db_txn.get_db_txn())
                .await?,
            db_txn,
        )),
        Some(tag) => Ok((Some(tag), db_txn)),
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

// TODO: See if this can be optimized at DB level
pub async fn find_first_unknown_tag(
    owner: &AuthUser,
    ids: &[TxnTagId],
    db_txn: TransactionWithCallback,
    cache: Arc<Mutex<TxnTagsCache>>,
) -> Result<(Option<TxnTagId>, TransactionWithCallback), DbErr> {
    let mut db_txn = db_txn;
    for tag_id in ids {
        let (tag, transaction) = get_txn_tag_by_id(owner, tag_id.0, db_txn, cache.clone()).await?;
        if tag.is_none() {
            return Ok((Some(*tag_id), transaction));
        }
        db_txn = transaction;
    }
    Ok((None, db_txn))
}

pub async fn replace_txn_tags_of_txn(
    user: &AuthUser,
    txn_id: &Uuid,
    tag_ids: &[TxnTagId],
    db_txn: TransactionWithCallback,
) -> Result<TransactionWithCallback, DbErr> {
    type MappingActiveModel = entities::txn_txn_tag_mapping::ActiveModel;
    type MappingEntity = entities::txn_txn_tag_mapping::Entity;
    type MappingCols = entities::txn_txn_tag_mapping::Column;

    // Delete all previous tags of the given txn
    {
        let owner_filter = MappingCols::OwnerId.eq(Value::Uuid(Some(Box::new(user.0))));
        let target_txn_filter = MappingCols::TxnId.eq(Value::Uuid(Some(Box::new(*txn_id))));
        let _delete_result = MappingEntity::delete_many()
            .filter(owner_filter)
            .filter(target_txn_filter)
            .exec(db_txn.get_db_txn())
            .await?;
    }

    // Write new tags
    if !tag_ids.is_empty() {
        let _insert_result = MappingEntity::insert_many(
            tag_ids
                .iter()
                .map(|tag_id| MappingActiveModel {
                    owner_id: ActiveValue::Set(user.0),
                    tag_id: ActiveValue::Set(tag_id.0),
                    txn_id: ActiveValue::Set(*txn_id),
                })
                .collect::<Vec<_>>(),
        )
        .exec(db_txn.get_db_txn())
        .await?;
    }

    Ok(db_txn)
}
