use crate::caches::currency_cache::CurrencyCache;
use crate::extended_models::currency::{Currency, CurrencyId};
use crate::extractors::auth_user::AuthUser;
use crate::services::TransactionWithCallback;
use crate::{entities::currency, extended_models::currency::CreateCurrencyAction};
use rust_decimal::Decimal;
use sea_orm::sqlx::sqlite::SqliteTransactionManager;
use sea_orm::{ColumnTrait, DbErr, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};

#[derive(Debug)]
pub enum CalculateCurrencyRateErrors {
    DbErr(DbErr),
    CurrencyNotFound(CurrencyId),
}

// /// Calculate the exchange rate of the given currency at a given date.
// pub async fn calculate_currency_rate<'a>(
//     owner: &AuthUser,
//     currency_id: CurrencyId,
//     db_txn: TransactionWithCallback<'a>,
//     date: i32,
//     cache: &mut CurrencyCache,
// ) -> Result<(Decimal, TransactionWithCallback<'a>), CalculateCurrencyRateErrors> {
//     let (curr, db_txn) = get_currency_by_id(owner, &currency_id, db_txn, cache)
//         .await
//         .map_err(CalculateCurrencyRateErrors::DbErr)?;

//     match curr {
//         Some(Currency::Base { id, .. }) => {
//             return Ok((
//                 Decimal::from_str_exact("1").expect("Cannot convert \"1\" to exact decimal."),
//                 db_txn,
//             ));
//         }
//         Some(Currency::Normal { id, name, owner, ticker, fallback_rate_amount, fallback_rate_currency_id }) => {
            
//         }
//         None => return Err(CalculateCurrencyRateErrors::CurrencyNotFound(currency_id)),
//     }
// }

pub async fn get_currencies<'a>(
    owner: &AuthUser,
    db_txn: TransactionWithCallback<'a>,
) -> Result<(Vec<Currency>, TransactionWithCallback<'a>), DbErr> {
    let db_result = currency::Entity::find()
        .filter(currency::Column::OwnerId.eq(owner.0))
        .all(db_txn.get_db_txn())
        .await?;
    Ok((
        db_result
            .iter()
            .map(|item| {
                let output: Currency = item.clone().into();
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
) -> Result<(Option<Currency>, TransactionWithCallback<'a>), DbErr> {
    let db_result = currency::Entity::find()
        .filter(currency::Column::OwnerId.eq(owner.0))
        .one(db_txn.get_db_txn())
        .await?;

    match db_result {
        None => Ok((None, db_txn)),
        Some(model) => {
            let cache_entry: Currency = model.into();
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
    ids: &[CurrencyId],
    db_txn: TransactionWithCallback<'a>,
    cache: &mut CurrencyCache,
) -> Result<(Option<CurrencyId>, TransactionWithCallback<'a>), DbErr> {
    let mut db_txn = db_txn;
    let cache_mut = cache;
    for current_id in ids {
        let (currency_rate_datum, transaction) =
            get_currency_by_id(owner, current_id, db_txn, cache_mut).await?;
        if currency_rate_datum.is_none() {
            return Ok((Some(*current_id), transaction));
        }
        db_txn = transaction;
    }
    Ok((None, db_txn))
}

pub async fn get_currency_by_id<'a>(
    owner: &AuthUser,
    currency_id: &CurrencyId,
    db_txn: TransactionWithCallback<'a>,
    cache: &mut CurrencyCache,
) -> Result<(Option<Currency>, TransactionWithCallback<'a>), DbErr> {
    let db_result = currency::Entity::find()
        .filter(currency::Column::OwnerId.eq(owner.0))
        .filter(currency::Column::Id.eq(currency_id.0))
        .one(db_txn.get_db_txn())
        .await?;

    Ok((
        db_result.map(|model| {
            let cache_entry: Currency = model.into();
            cache.register_item(cache_entry.clone());
            cache_entry
        }),
        db_txn,
    ))
}

pub enum CreateCurrencyErrors {
    DbErr(DbErr),
    ValidationErr,
    ReferencedCurrencyNotExist(CurrencyId),
    RepeatedBaseCurrency(CurrencyId),
}

pub async fn create_currency<'a>(
    currency: CreateCurrencyAction,
    db_txn: TransactionWithCallback<'a>,
    cache: &mut CurrencyCache,
) -> Result<(uuid::Uuid, TransactionWithCallback<'a>), CreateCurrencyErrors> {
    // Ensure fallback coexists
    {
        let fallbacks = match currency {
            CreateCurrencyAction::Base { .. } => (true, None, None),
            CreateCurrencyAction::Normal {
                ref fallback_rate_amount,
                ref fallback_rate_currency_id,
                ..
            } => (
                false,
                Some(fallback_rate_amount),
                Some(fallback_rate_currency_id),
            ),
        };

        match fallbacks {
            (true, None, None) => true,
            (false, Some(_), Some(_)) => true,
            (_, _, _) => return Err(CreateCurrencyErrors::ValidationErr),
        }
    };

    // Ensure another base currency doesnt exist
    let db_txn = match currency.is_base() {
        true => {
            fn extract_id(domain_curr: &Currency) -> CurrencyId {
                match domain_curr {
                    Currency::Base { id, .. } => CurrencyId(id.0),
                    Currency::Normal { id, .. } => CurrencyId(id.0),
                }
            }

            // See if base currency in cache or not.
            if let Some(existing_base_currency) = cache.query_base_currency(currency.get_owner()) {
                return Err(CreateCurrencyErrors::RepeatedBaseCurrency(extract_id(
                    existing_base_currency,
                )));
            }

            // If not, query the database to see if it's actually not.
            match get_base_currency(currency.get_owner(), db_txn, Some(cache))
                .await
                .map_err(CreateCurrencyErrors::DbErr)?
            {
                (Some(existing_currency), _) => {
                    return Err(CreateCurrencyErrors::RepeatedBaseCurrency(extract_id(
                        &existing_currency,
                    )))
                }
                (None, db_txn) => db_txn, // return moved txn if ok
            }
        }
        false => db_txn,
    };

    // Ensure referenced currency exists
    let db_txn = match currency {
        CreateCurrencyAction::Base { .. } => db_txn,
        CreateCurrencyAction::Normal {
            ref owner,
            ref fallback_rate_currency_id,
            ..
        } => match get_currency_by_id(owner, fallback_rate_currency_id, db_txn, cache)
            .await
            .map_err(CreateCurrencyErrors::DbErr)?
        {
            (Some(_domain_enum), db_txn) => db_txn,
            (None, _) => {
                return Err(CreateCurrencyErrors::ReferencedCurrencyNotExist(
                    *fallback_rate_currency_id,
                ))
            }
        },
    };

    let create_currency_active_record: currency::ActiveModel = currency.clone().into();
    let model = currency::Entity::insert(create_currency_active_record)
        .exec(db_txn.get_db_txn())
        .await
        .map_err(CreateCurrencyErrors::DbErr)?;

    cache.register_item(currency.into_domain(model.last_insert_id));
    Ok((model.last_insert_id, db_txn))
}
