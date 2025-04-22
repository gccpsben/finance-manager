use std::sync::Arc;

use crate::caches::cache::PartialCacheState;
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
use tokio::sync::{Mutex, MutexGuard};
use uuid::Uuid;

pub async fn create_txn_tag(
    owner: &AuthUser,
    name: &str,
    db_txn: TransactionWithCallback,
    txn_tags_cache: Arc<Mutex<TxnTagsCache>>,
) -> Result<(Uuid, TransactionWithCallback), DbErr> {
    let new_tag = txn_tag::ActiveModel {
        id: ActiveValue::Set(uuid::Uuid::new_v4()),
        name: ActiveValue::Set(name.to_string()),
        owner_id: ActiveValue::Set(owner.0),
    };
    let model = txn_tag::Entity::insert(new_tag)
        .exec(db_txn.get_db_txn())
        .await?;

    let mut db_txn = db_txn;

    let name_clone = name.to_string();
    let owner_clone = owner.clone();
    db_txn.add_callback(async move {
        let owner = owner_clone;
        let name = name_clone;
        txn_tags_cache.lock().await.0.register(
            &owner,
            &TxnTagId(model.last_insert_id.0),
            txn_tag::Model {
                id: model.last_insert_id.0,
                name,
                owner_id: owner.0,
            },
        );
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
    type QueryResult<T> = crate::caches::cache::IntegratedQueryResult<T>;
    let mut cache_lock = txn_tags_cache.lock().await;
    let query_result = cache_lock.0.get_user_entry_item_mut(user, &TxnTagId(id));
    Ok(match query_result {
        QueryResult::TruePositive(tag) => (Some(tag.clone()), db_txn),
        QueryResult::TrueNegative => (None, db_txn),
        QueryResult::UnsureNegative => (
            txn_tag::Entity::find()
                .filter(txn_tag::Column::OwnerId.eq(user.0))
                .filter(txn_tag::Column::Id.eq(id))
                .one(db_txn.get_db_txn())
                .await?,
            db_txn,
        ),
    })
}

/// Get all txn tags of given a user.
/// This will also update the given cache after fetching data from database.
pub async fn get_txn_tags(
    user: &AuthUser,
    db_txn: TransactionWithCallback,
    txn_tags_cache: Arc<Mutex<TxnTagsCache>>,
) -> Result<(Vec<txn_tag::Model>, TransactionWithCallback), DbErr> {
    let mut cache_lock = txn_tags_cache.lock().await;
    let txn_tag_cache_state = cache_lock
        .0
        .get_user_entry_mut(user)
        .map(|cache| cache.get_state().clone());
    drop(cache_lock);

    let extract_items_from_cache = |mut cache_lock: MutexGuard<TxnTagsCache>| {
        cache_lock
            .0
            .get_all_items(user)
            .expect("this should not be none if cache state returned FULL")
            .iter()
            .map(|pair| pair.1.clone())
            .collect::<Vec<_>>()
    };

    match txn_tag_cache_state {
        // If the requested user record is not in cache, or the cache is not fully loaded, fetch from db.
        None | Some(PartialCacheState::Partial) => {
            let txn_tags_from_db = txn_tag::Entity::find()
                .filter(txn_tag::Column::OwnerId.eq(user.0))
                .all(db_txn.get_db_txn())
                .await?;

            // Load the tags into cache.
            let all_tags = extract_items_from_cache(txn_tags_cache.lock().await)
                .iter()
                .map(|txn| (TxnTagId(txn.id), txn.clone()))
                .collect::<Vec<_>>();
            txn_tags_cache
                .lock()
                .await
                .0
                .replace_full(&AuthUser(user.0), Box::from(all_tags));

            Ok((txn_tags_from_db, db_txn))
        }
        // If the cache is fully loaded, return the cache
        _ => {
            let cache_lock = txn_tags_cache.lock().await;
            Ok((extract_items_from_cache(cache_lock), db_txn))
        }
    }
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
