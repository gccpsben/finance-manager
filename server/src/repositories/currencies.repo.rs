use super::TransactionWithCallback;
use crate::{
    caches::currency_cache::CurrencyCache,
    entities::currency::{self, Model},
    extractors::auth_user::AuthUser,
};
use sea_orm::{ActiveValue, ColumnTrait, DbErr, EntityTrait, QueryFilter};
use uuid::Uuid;

/** This enum represent a currency that already exists in database (saved) */
#[derive(Clone, Debug)]
pub enum CurrencyDomainEnum {
    Base {
        id: Uuid,
        name: String,
        owner: Uuid,
        ticker: String,
    },
    Normal {
        id: Uuid,
        name: String,
        owner: Uuid,
        ticker: String,
        fallback_rate_amount: String,
        fallback_rate_currency_id: Uuid,
    },
}

/** This enum represent the action to save a currency to a database, therefore the ID is not available in the enum. */
#[derive(Clone, Debug)]
pub enum CreateCurrencyDomainEnum {
    Base {
        name: String,
        owner: AuthUser,
        ticker: String,
    },
    Normal {
        name: String,
        owner: AuthUser,
        ticker: String,
        fallback_rate_amount: String,
        fallback_rate_currency_id: Uuid,
    },
}

impl From<CreateCurrencyDomainEnum> for currency::ActiveModel {
    fn from(value: CreateCurrencyDomainEnum) -> Self {
        match value {
            CreateCurrencyDomainEnum::Base {
                name,
                owner,
                ticker,
            } => currency::ActiveModel {
                id: ActiveValue::Set(uuid::Uuid::new_v4()),
                name: ActiveValue::Set(name.to_string()),
                owner_id: ActiveValue::Set(owner.user_id),
                ticker: ActiveValue::Set(ticker.to_string()),
                fallback_rate_amount: ActiveValue::Set(None),
                fallback_rate_currency_id: ActiveValue::Set(None),
                is_base: ActiveValue::Set(true),
            },
            CreateCurrencyDomainEnum::Normal {
                name,
                owner,
                ticker,
                fallback_rate_amount,
                fallback_rate_currency_id,
            } => currency::ActiveModel {
                id: ActiveValue::Set(uuid::Uuid::new_v4()),
                name: ActiveValue::Set(name.to_string()),
                owner_id: ActiveValue::Set(owner.user_id),
                ticker: ActiveValue::Set(ticker.to_string()),
                fallback_rate_amount: ActiveValue::Set(Some(fallback_rate_amount)),
                fallback_rate_currency_id: ActiveValue::Set(Some(fallback_rate_currency_id)),
                is_base: ActiveValue::Set(false),
            },
        }
    }
}

impl CreateCurrencyDomainEnum {
    pub fn is_base(&self) -> bool {
        match self {
            CreateCurrencyDomainEnum::Base { .. } => true,
            CreateCurrencyDomainEnum::Normal { .. } => false,
        }
    }
    pub fn get_owner(&self) -> &AuthUser {
        match self {
            CreateCurrencyDomainEnum::Base { owner, .. } => owner,
            CreateCurrencyDomainEnum::Normal { owner, .. } => owner,
        }
    }
    pub fn to_domain(&self, db_id: uuid::Uuid) -> CurrencyDomainEnum {
        match self {
            CreateCurrencyDomainEnum::Base {
                name,
                owner,
                ticker,
            } => CurrencyDomainEnum::Base {
                id: db_id,
                name: name.to_string(),
                owner: owner.user_id,
                ticker: ticker.to_string(),
            },
            CreateCurrencyDomainEnum::Normal {
                name,
                owner,
                ticker,
                fallback_rate_amount,
                fallback_rate_currency_id,
            } => CurrencyDomainEnum::Normal {
                id: db_id,
                name: name.to_string(),
                owner: owner.user_id,
                ticker: ticker.to_string(),
                fallback_rate_amount: fallback_rate_amount.to_string(),
                fallback_rate_currency_id: *fallback_rate_currency_id,
            },
        }
    }
}

impl From<Model> for CurrencyDomainEnum {
    fn from(value: Model) -> Self {
        match value.is_base {
            true => CurrencyDomainEnum::Base {
                id: value.id,
                name: value.name.to_string(),
                owner: value.owner_id,
                ticker: value.ticker.to_string(),
            },
            false => CurrencyDomainEnum::Normal {
                id: value.id,
                name: value.name.to_string(),
                owner: value.owner_id,
                ticker: value.ticker.to_string(),
                fallback_rate_amount: value
                    .fallback_rate_amount
                    .clone()
                    .expect("Currency Domain Enum failure 1"),
                fallback_rate_currency_id: value
                    .fallback_rate_currency_id
                    .expect("Currency Domain Enum failure 2"),
            },
        }
    }
}

pub async fn create_currency<'a>(
    currency: CreateCurrencyDomainEnum,
    db_txn: TransactionWithCallback<'a>,
    cache: &mut CurrencyCache,
) -> Result<(uuid::Uuid, TransactionWithCallback<'a>), DbErr> {
    let create_currency_active_record: currency::ActiveModel = currency.clone().into();
    let insert_result = currency::Entity::insert(create_currency_active_record)
        .exec(db_txn.get_db_txn())
        .await;
    match insert_result {
        Ok(model) => {
            cache.register_item(currency.to_domain(model.last_insert_id));
            Ok((model.last_insert_id, db_txn))
        }
        Err(db_err) => Err(db_err),
    }
}

pub async fn get_currencies<'a>(
    owner: &AuthUser,
    db_txn: TransactionWithCallback<'a>,
) -> Result<(Vec<CurrencyDomainEnum>, TransactionWithCallback<'a>), DbErr> {
    let db_result = currency::Entity::find()
        .filter(currency::Column::OwnerId.eq(owner.user_id))
        .all(db_txn.get_db_txn())
        .await?;

    Ok((
        db_result
            .iter()
            .map(|item| {
                let output: CurrencyDomainEnum = item.clone().into();
                output
            })
            .collect::<Vec<_>>(),
        db_txn,
    ))
}

pub async fn get_base_currency<'a>(
    owner: &AuthUser,
    db_txn: TransactionWithCallback<'a>,
    cache: Option<&mut CurrencyCache>,
) -> Result<(Option<CurrencyDomainEnum>, TransactionWithCallback<'a>), DbErr> {
    let db_result = currency::Entity::find()
        .filter(currency::Column::OwnerId.eq(owner.user_id))
        .one(db_txn.get_db_txn())
        .await?;

    match db_result {
        None => Ok((None, db_txn)),
        Some(model) => {
            let cache_entry: CurrencyDomainEnum = model.into();
            if let Some(cache) = cache {
                cache.register_item(cache_entry.clone());
            }
            Ok((Some(cache_entry), db_txn))
        }
    }
}

// TODO: See if this can be parl.
pub async fn find_first_unknown_currencies<'a>(
    owner: &AuthUser,
    ids: &[uuid::Uuid],
    db_txn: TransactionWithCallback<'a>,
    cache: &mut CurrencyCache,
) -> Result<(Option<uuid::Uuid>, TransactionWithCallback<'a>), DbErr> {
    // TODO: fix this in iter
    let mut db_txn = db_txn;
    let cache_mut = cache;
    for i in 0..ids.len() {
        let current_id = *ids.get(i).expect("Unable to get item");
        let currency_result = get_currency_by_id(owner, current_id, db_txn, cache_mut).await;
        match currency_result {
            Ok((currency_rate_datum, transaction)) => {
                if currency_rate_datum.is_none() {
                    return Ok((Some(current_id), transaction));
                }
                db_txn = transaction
            }
            Err(db_err) => return Err(db_err),
        };
    }
    Ok((None, db_txn))
}

pub async fn get_currency_by_id<'a>(
    owner: &AuthUser,
    currency_id: uuid::Uuid,
    db_txn: TransactionWithCallback<'a>,
    cache: &mut CurrencyCache,
) -> Result<(Option<CurrencyDomainEnum>, TransactionWithCallback<'a>), DbErr> {
    let db_result = currency::Entity::find()
        .filter(currency::Column::OwnerId.eq(owner.user_id))
        .filter(currency::Column::Id.eq(currency_id))
        .one(db_txn.get_db_txn())
        .await?;

    match db_result {
        None => Ok((None, db_txn)),
        Some(model) => {
            let cache_entry: CurrencyDomainEnum = model.into();
            cache.register_item(cache_entry.clone());
            Ok((Some(cache_entry), db_txn))
        }
    }
}
