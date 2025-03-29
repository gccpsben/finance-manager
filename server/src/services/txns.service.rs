use crate::caches::currency_cache::CurrencyCache;
use crate::entities::{fragment, txn};
use crate::extended_models::account::AccountId;
use crate::extended_models::currency::CurrencyId;
use crate::extractors::auth_user::AuthUser;
use crate::routes::bootstrap::EndpointsErrors;
use crate::services::TransactionWithCallback;
use chrono::NaiveDateTime;
use rust_decimal::Decimal;
use sea_orm::{
    ActiveModelBehavior, ActiveModelTrait, ActiveValue, ColumnTrait, DbErr, EntityTrait,
    QueryFilter,
};
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

use super::accounts::find_first_unknown_account;
use super::currencies::find_first_unknown_currencies;

#[derive(Debug)]
pub enum CreateTxnErrors {
    DbErr(DbErr),
    CurrencyNotFound(CurrencyId),
    AccountNotFound(AccountId),
}

impl From<CreateTxnErrors> for EndpointsErrors {
    fn from(value: CreateTxnErrors) -> Self {
        match value {
            CreateTxnErrors::CurrencyNotFound(uuid) => EndpointsErrors::CurrencyNotFound(uuid),
            CreateTxnErrors::DbErr(db_err) => EndpointsErrors::DbErr(db_err),
            CreateTxnErrors::AccountNotFound(uuid) => EndpointsErrors::AccountNotFound(uuid),
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
    for frag in fragments {
        if let Some(from) = &frag.from {
            acc_ids.insert(from.account);
        }
        if let Some(to) = &frag.to {
            acc_ids.insert(to.account);
        }
    }
    acc_ids.iter().map(|id| AccountId(*id)).collect::<Vec<_>>()
}

pub fn fragments_to_curr_ids(fragments: &[CreateTxnActionFragment]) -> Vec<CurrencyId> {
    let mut curr_ids = HashSet::<Uuid>::new();
    for frag in fragments {
        if let Some(from) = &frag.from {
            curr_ids.insert(from.currency);
        }
        if let Some(to) = &frag.to {
            curr_ids.insert(to.currency);
        }
    }
    curr_ids
        .iter()
        .map(|id| CurrencyId(*id))
        .collect::<Vec<_>>()
}

/// Get all transactions of a given user.
pub async fn get_txns<'a>(
    owner: &AuthUser,
    db_txn: TransactionWithCallback<'a>,
) -> Result<
    (
        Vec<(txn::Model, Vec<fragment::Model>)>,
        TransactionWithCallback<'a>,
    ),
    DbErr,
> {
    let models = txn::Entity::find()
        .filter(txn::Column::OwnerId.eq(owner.0))
        .find_with_related(fragment::Entity)
        .all(db_txn.get_db_txn())
        .await?;

    Ok((models, db_txn))
}

#[allow(unused)]
/// Get a transaction of a given user given ID.
pub async fn get_txn_by_id<'a>(
    owner: &AuthUser,
    id: uuid::Uuid,
    db_txn: TransactionWithCallback<'a>,
) -> Result<(Option<txn::Model>, TransactionWithCallback<'a>), DbErr> {
    let model = txn::Entity::find()
        .filter(txn::Column::OwnerId.eq(owner.0))
        .filter(txn::Column::Id.eq(id))
        .one(db_txn.get_db_txn())
        .await?;

    Ok((model, db_txn))
}

pub async fn create_txn<'a>(
    txn: CreateTxnAction,
    fragments: &[CreateTxnActionFragment],
    db_txn: TransactionWithCallback<'a>,
    owner: &AuthUser,
    currency_cache: Arc<Mutex<CurrencyCache>>,
) -> Result<(Uuid, TransactionWithCallback<'a>), CreateTxnErrors> {
    // Ensure accounts exist
    let db_txn = {
        let (unknown_account, db_txn) =
            find_first_unknown_account(owner, &fragments_to_account_ids(fragments), db_txn)
                .await
                .map_err(CreateTxnErrors::DbErr)?;

        if let Some(unknown_acc) = unknown_account {
            return Err(CreateTxnErrors::AccountNotFound(unknown_acc));
        }

        db_txn
    };

    // Ensure currencies exist
    let db_txn = {
        let (unknown_currency, db_txn) = find_first_unknown_currencies(
            owner,
            &fragments_to_curr_ids(fragments),
            db_txn,
            currency_cache,
        )
        .await
        .map_err(CreateTxnErrors::DbErr)?;

        if let Some(unknown_curr) = unknown_currency {
            return Err(CreateTxnErrors::CurrencyNotFound(unknown_curr));
        }

        db_txn
    };

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

    let _inserted_txn = active_model
        .insert(db_txn.get_db_txn())
        .await
        .map_err(CreateTxnErrors::DbErr);

    let _inserted_txn = _inserted_txn?;

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

    Ok((generated_txn_uuid, db_txn))
}
