use crate::caches::currency_cache::CurrencyCache;
use crate::caches::txn_tag::TxnTagsCache;
use crate::entities::fragment;
use crate::entities::txn;
use crate::entities::txn_txn_tag_mapping;
use crate::extended_models::account::AccountId;
use crate::extended_models::currency::CurrencyId;
use crate::extended_models::txn_tag::TxnTagId;
use crate::extractors::auth_user::AuthUser;
use crate::paging::PagedContent;
use crate::routes::bootstrap::EndpointsErrors;
use crate::services::TransactionWithCallback;
use chrono::NaiveDateTime;
use itertools::izip;
use rust_decimal::Decimal;
use sea_orm::ActiveModelBehavior;
use sea_orm::ActiveModelTrait;
use sea_orm::ActiveValue;
use sea_orm::ColumnTrait;
use sea_orm::DbErr;
use sea_orm::EntityTrait;
use sea_orm::LoaderTrait;
use sea_orm::ModelTrait;
use sea_orm::PaginatorTrait;
use sea_orm::QueryFilter;
use sea_orm::QueryOrder;
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

use super::accounts::find_first_unknown_account;
use super::currencies::find_first_unknown_currencies;
use super::txn_tags::find_first_unknown_tag;
use super::txn_tags::replace_txn_tags_of_txn;
use super::unpack_db_txn;
use super::PaginationReq;

#[derive(Debug)]
pub enum CreateTxnErrors {
    DbErr(DbErr),
    CurrencyNotFound(CurrencyId),
    AccountNotFound(AccountId),
    TxnTagNotFound(TxnTagId),
}

impl From<CreateTxnErrors> for EndpointsErrors {
    fn from(value: CreateTxnErrors) -> Self {
        match value {
            CreateTxnErrors::CurrencyNotFound(uuid) => EndpointsErrors::CurrencyNotFound(uuid),
            CreateTxnErrors::DbErr(db_err) => EndpointsErrors::DbErr(db_err),
            CreateTxnErrors::AccountNotFound(uuid) => EndpointsErrors::AccountNotFound(uuid),
            CreateTxnErrors::TxnTagNotFound(uuid) => EndpointsErrors::TxnTagNotFound(uuid),
        }
    }
}

#[derive(Clone, Debug)]
pub struct CreateTxnAction {
    pub date: NaiveDateTime,
    pub title: String,
    pub description: String,
}

#[derive(Clone, Debug)]
pub struct CreateTxnActionFragmentSide {
    pub account: Uuid,
    pub amount: Decimal,
    pub currency: Uuid,
}

#[derive(Clone, Debug)]
pub struct CreateTxnActionFragment {
    pub from: Option<CreateTxnActionFragmentSide>,
    pub to: Option<CreateTxnActionFragmentSide>,
}

pub fn fragments_to_account_ids(fragments: &[CreateTxnActionFragment]) -> Vec<AccountId> {
    let mut acc_ids = HashSet::<Uuid>::new();
    fragments.iter().for_each(|frag| {
        if let Some(from) = &frag.from {
            acc_ids.insert(from.account);
        }
        if let Some(to) = &frag.to {
            acc_ids.insert(to.account);
        }
    });
    acc_ids.iter().map(|id| AccountId(*id)).collect::<Vec<_>>()
}

pub fn fragments_to_curr_ids(fragments: &[CreateTxnActionFragment]) -> Vec<CurrencyId> {
    let mut curr_ids = HashSet::<Uuid>::new();
    fragments.iter().for_each(|frag| {
        if let Some(from) = &frag.from {
            curr_ids.insert(from.currency);
        }
        if let Some(to) = &frag.to {
            curr_ids.insert(to.currency);
        }
    });
    curr_ids
        .iter()
        .map(|id| CurrencyId(*id))
        .collect::<Vec<_>>()
}

/// Get paginated transactions of a given user.
/// Notice that the txns will be sorted in descending order of timestamp, before being paginated.
pub async fn get_txns(
    owner: &AuthUser,
    pagination: PaginationReq,
    db_txn: TransactionWithCallback,
) -> Result<
    (
        PagedContent<(
            txn::Model,
            Vec<fragment::Model>,
            Vec<txn_txn_tag_mapping::Model>,
        )>,
        TransactionWithCallback,
    ),
    DbErr,
> {
    let query = txn::Entity::find().filter(txn::Column::OwnerId.eq(owner.0));
    let query = query.order_by_desc(txn::Column::Date);

    let (txn_models, total_items, page_index, page_size) = match pagination {
        PaginationReq::All => {
            let items = query.all(db_txn.get_db_txn()).await?;
            let len = items.len() as u64;
            (items, len, 0, len)
        }
        PaginationReq::Paged {
            page_size,
            page_index,
        } => {
            let paginator = query.paginate(db_txn.get_db_txn(), page_size.into());
            let num_pages_items = paginator.num_items_and_pages().await?;
            let page_index_to_fetch =
                std::cmp::min(num_pages_items.number_of_pages - 1, page_index.into());
            let page_content = paginator.fetch_page(page_index_to_fetch).await?;
            (
                page_content,
                num_pages_items.number_of_items,
                page_index_to_fetch,
                u64::from(page_size),
            )
        }
    };

    let fragment_models = txn_models
        .load_many(fragment::Entity, db_txn.get_db_txn())
        .await?;
    let tag_models = txn_models
        .load_many(txn_txn_tag_mapping::Entity, db_txn.get_db_txn())
        .await?;
    let zipped = izip!(txn_models, fragment_models, tag_models).collect::<Vec<_>>();
    Ok((
        PagedContent::new(&zipped, total_items, page_index, page_size),
        db_txn,
    ))
}

#[allow(unused)]
/// Get a transaction of a given user given ID.
pub async fn get_txn_by_id(
    owner: &AuthUser,
    id: uuid::Uuid,
    db_txn: TransactionWithCallback,
) -> Result<
    (
        Option<(
            txn::Model,
            Vec<fragment::Model>,
            Vec<txn_txn_tag_mapping::Model>,
        )>,
        TransactionWithCallback,
    ),
    DbErr,
> {
    let model = txn::Entity::find_by_id((owner.0, id))
        .one(db_txn.get_db_txn())
        .await?;

    match model {
        None => Ok((None, db_txn)),
        Some(txn_model) => {
            let fragments = txn_model
                .find_related(fragment::Entity)
                .all(db_txn.get_db_txn())
                .await?;

            let txn_tags = txn_model
                .find_related(txn_txn_tag_mapping::Entity)
                .all(db_txn.get_db_txn())
                .await?;

            Ok((Some((txn_model, fragments, txn_tags)), db_txn))
        }
    }
}

pub async fn create_txn(
    txn: CreateTxnAction,
    fragments: &[CreateTxnActionFragment],
    tags: &[TxnTagId],
    db_txn: TransactionWithCallback,
    owner: &AuthUser,
    currency_cache: Arc<Mutex<CurrencyCache>>,
    txn_tags_cache: Arc<Mutex<TxnTagsCache>>,
) -> Result<(Uuid, TransactionWithCallback), CreateTxnErrors> {
    // Ensure accounts exist
    let db_txn = unpack_db_txn(
        find_first_unknown_account(owner, &fragments_to_account_ids(fragments), db_txn)
            .await
            .map_err(CreateTxnErrors::DbErr)?,
    )
    .map_err(CreateTxnErrors::AccountNotFound)?;

    // Ensure currencies exist
    let db_txn = unpack_db_txn(
        find_first_unknown_currencies(
            owner,
            &fragments_to_curr_ids(fragments),
            db_txn,
            currency_cache.clone(),
        )
        .await
        .map_err(CreateTxnErrors::DbErr)?,
    )
    .map_err(CreateTxnErrors::CurrencyNotFound)?;

    // Ensure txn tags exist
    let db_txn = unpack_db_txn(
        find_first_unknown_tag(owner, tags, db_txn, txn_tags_cache.clone())
            .await
            .map_err(CreateTxnErrors::DbErr)?,
    )
    .map_err(CreateTxnErrors::TxnTagNotFound)?;

    let generated_txn_uuid = uuid::Uuid::new_v4();
    let active_model = {
        let mut model = txn::ActiveModel::new();
        model.id = ActiveValue::Set(generated_txn_uuid);
        model.date = ActiveValue::Set(txn.date);
        model.description = ActiveValue::Set(txn.description);
        model.owner_id = ActiveValue::Set(owner.0);
        model.title = ActiveValue::Set(txn.title);
        model
    };

    active_model
        .insert(db_txn.get_db_txn())
        .await
        .map_err(CreateTxnErrors::DbErr)?;

    let fragment_models = {
        let mut models: Vec<fragment::ActiveModel> = vec![];
        for frag in fragments {
            models.push(fragment::ActiveModel {
                from_account: ActiveValue::Set(frag.from.clone().map(|x| x.account)),
                from_amount: ActiveValue::Set(frag.from.clone().map(|x| x.amount.to_string())),
                from_currency_id: ActiveValue::Set(frag.from.clone().map(|x| x.currency)),
                id: ActiveValue::Set(uuid::Uuid::new_v4()),
                owner_id: ActiveValue::Set(owner.0),
                to_account: ActiveValue::Set(frag.to.clone().map(|x| x.account)),
                to_amount: ActiveValue::Set(frag.to.clone().map(|x| x.amount.to_string())),
                to_currency_id: ActiveValue::Set(frag.to.clone().map(|x| x.currency)),
                parent_txn: ActiveValue::Set(generated_txn_uuid),
            });
        }
        models
    };

    for fragment_to_save in fragment_models {
        fragment_to_save
            .insert(db_txn.get_db_txn())
            .await
            .map_err(CreateTxnErrors::DbErr)?;
    }

    // Populate txn tags
    let db_txn = replace_txn_tags_of_txn(owner, &generated_txn_uuid, tags, db_txn)
        .await
        .map_err(CreateTxnErrors::DbErr)?;

    Ok((generated_txn_uuid, db_txn))
}
