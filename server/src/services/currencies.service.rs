use std::sync::Arc;

use crate::caches::currency_cache::CurrencyCache;
use crate::entities::currency_rate_datum::Model;
use crate::extended_models::currency::{Currency, CurrencyId};
use crate::extractors::auth_user::AuthUser;
use crate::linear_interpolator::{force_time_delta_to_mills_decimal, try_linear_interpolate};
use crate::maths::ForgivingDecimal;
use crate::routes::bootstrap::EndpointsErrors;
use crate::services::TransactionWithCallback;
use crate::{entities::currency, extended_models::currency::CreateCurrencyAction};
use rust_decimal::prelude::FromPrimitive;
use rust_decimal::Decimal;
use sea_orm::{ColumnTrait, DbErr, EntityTrait, QueryFilter};
use tokio::sync::Mutex;

use super::currency_rate_datum::get_datum_left_right;

#[derive(Debug)]
pub enum CalculateCurrencyRateErrors {
    DbErr(DbErr),
    CurrencyNotFound(CurrencyId),
    InvalidDecimalValue(String),
    OverflowOrUnderflow,
}

impl From<CalculateCurrencyRateErrors> for EndpointsErrors {
    fn from(value: CalculateCurrencyRateErrors) -> Self {
        match value {
            CalculateCurrencyRateErrors::DbErr(db_err) => EndpointsErrors::DbErr(db_err),
            CalculateCurrencyRateErrors::CurrencyNotFound(currency_id) => {
                EndpointsErrors::CurrencyNotFound(currency_id)
            }
            CalculateCurrencyRateErrors::InvalidDecimalValue(value) => {
                EndpointsErrors::InvalidDecimalValue(value)
            }
            CalculateCurrencyRateErrors::OverflowOrUnderflow => {
                EndpointsErrors::OverflowOrUnderflow
            }
        }
    }
}

/// A shorthand method to get 2 datums rates, given the left and right datums, in the same database transaction.
async fn get_left_right_datum_rate<'a>(
    owner: &AuthUser,
    left_datum: &Model,
    right_datum: &Model,
    db_txn: TransactionWithCallback<'a>,
    cache: Arc<Mutex<CurrencyCache>>,
) -> Result<(Decimal, Decimal, TransactionWithCallback<'a>), CalculateCurrencyRateErrors> {
    let (left_rate, db_txn) = calculate_currency_rate(
        owner,
        CurrencyId(left_datum.ref_amount_currency_id),
        db_txn,
        left_datum.date.and_utc(),
        cache.clone(),
    )
    .await?;
    let (right_rate, db_txn) = calculate_currency_rate(
        owner,
        CurrencyId(right_datum.ref_amount_currency_id),
        db_txn,
        right_datum.date.and_utc(),
        cache.clone(),
    )
    .await?;
    Ok((
        left_rate.forgiving_decimal_mul_str(&left_datum.amount)?,
        right_rate.forgiving_decimal_mul_str(&right_datum.amount)?,
        db_txn,
    ))
}

/// Calculate the exchange rate of the given currency at a given date.
pub async fn calculate_currency_rate<'a>(
    owner: &AuthUser,
    currency_id: CurrencyId,
    db_txn: TransactionWithCallback<'a>,
    date: chrono::DateTime<chrono::Utc>,
    cache: Arc<Mutex<CurrencyCache>>,
) -> Result<(Decimal, TransactionWithCallback<'a>), CalculateCurrencyRateErrors> {
    let (curr, db_txn) = get_currency_by_id(owner, &currency_id, db_txn, cache.clone())
        .await
        .map_err(CalculateCurrencyRateErrors::DbErr)?;

    match curr {
        Some(Currency::Base { .. }) => Ok((Decimal::ONE, db_txn)),
        Some(Currency::Normal {
            fallback_rate_amount,
            fallback_rate_currency_id,
            ..
        }) => {
            let (left_d, right_d, db_txn) = get_datum_left_right(owner, date, currency_id, db_txn)
                .await
                .map_err(CalculateCurrencyRateErrors::DbErr)?;

            match (left_d, right_d) {
                // If left and right datums are found, get their rates, and interpolate.
                (Some(left_d), Some(right_d)) => {
                    let left_delta = date.signed_duration_since(left_d.date.and_utc());
                    let full_range = right_d.date.signed_duration_since(left_d.date);
                    let (left_rate, right_rate, db_txn) = Box::pin(get_left_right_datum_rate(
                        owner,
                        &left_d,
                        &right_d,
                        db_txn,
                        cache.clone(),
                    ))
                    .await?;
                    let interpolate_result = try_linear_interpolate(
                        Some((Decimal::ZERO, left_rate)),
                        Some((force_time_delta_to_mills_decimal(&full_range), right_rate)),
                        Decimal::from_i64(left_delta.num_milliseconds())
                            .expect("Unable to convert left_delta to Decimal."),
                    );

                    match interpolate_result {
                        // If interpolation returns None, use fallback rate.
                        None => {
                            let (fallback_rate, db_txn) = Box::pin(calculate_currency_rate(
                                owner,
                                fallback_rate_currency_id,
                                db_txn,
                                date,
                                cache.clone(),
                            ))
                            .await?;
                            Ok((fallback_rate, db_txn))
                        }
                        Some(interpolate_result) => Ok((interpolate_result, db_txn)),
                    }
                }
                // If only the left datum is found, return the left datum's rate.
                (Some(left_d), None) => {
                    let (left_d_rate, db_txn) = Box::pin(calculate_currency_rate(
                        owner,
                        CurrencyId(left_d.ref_amount_currency_id),
                        db_txn,
                        date,
                        cache,
                    ))
                    .await?;
                    Ok((
                        left_d_rate.forgiving_decimal_mul_str(&left_d.amount)?,
                        db_txn,
                    ))
                }
                // If only the right datum is found / not found at all, return the currency fallback rate
                (None, _) => {
                    let (fallback_rate, db_txn) = Box::pin(calculate_currency_rate(
                        owner,
                        fallback_rate_currency_id,
                        db_txn,
                        date,
                        cache,
                    ))
                    .await?;

                    Ok((
                        fallback_rate.forgiving_decimal_mul_str(&fallback_rate_amount)?,
                        db_txn,
                    ))
                }
            }
        }
        None => Err(CalculateCurrencyRateErrors::CurrencyNotFound(currency_id)),
    }
}

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
    cache: Arc<Mutex<CurrencyCache>>,
) -> Result<(Option<Currency>, TransactionWithCallback<'a>), DbErr> {
    let db_result = currency::Entity::find()
        .filter(currency::Column::OwnerId.eq(owner.0))
        .one(db_txn.get_db_txn())
        .await?;

    match db_result {
        None => Ok((None, db_txn)),
        Some(model) => {
            let cache_entry: Currency = model.into();
            {
                cache.lock().await.register_item(cache_entry.clone());
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
    cache: Arc<Mutex<CurrencyCache>>,
) -> Result<(Option<CurrencyId>, TransactionWithCallback<'a>), DbErr> {
    let mut db_txn = db_txn;
    for current_id in ids {
        let (currency_rate_datum, transaction) =
            get_currency_by_id(owner, current_id, db_txn, cache.clone()).await?;
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
    cache: Arc<Mutex<CurrencyCache>>,
) -> Result<(Option<Currency>, TransactionWithCallback<'a>), DbErr> {
    let db_result = currency::Entity::find()
        .filter(currency::Column::OwnerId.eq(owner.0))
        .filter(currency::Column::Id.eq(currency_id.0))
        .one(db_txn.get_db_txn())
        .await?;

    if let Some(ref model) = db_result {
        {
            cache.lock().await.register_item(model.clone().into());
        }
    }

    Ok((db_result.map(|f| f.into()), db_txn))
}

#[derive(Debug)]
pub enum CreateCurrencyErrors {
    DbErr(DbErr),
    ReferencedCurrencyNotExist(CurrencyId),
    RepeatedBaseCurrency,
}

impl From<CreateCurrencyErrors> for EndpointsErrors {
    fn from(value: CreateCurrencyErrors) -> Self {
        match value {
            CreateCurrencyErrors::DbErr(db_err) => Self::DbErr(db_err),
            CreateCurrencyErrors::RepeatedBaseCurrency => Self::RepeatedBaseCurrency,
            CreateCurrencyErrors::ReferencedCurrencyNotExist(cid) => Self::CurrencyNotFound(cid),
        }
    }
}

pub async fn create_currency(
    currency: CreateCurrencyAction,
    db_txn: TransactionWithCallback<'_>,
    cache: Arc<Mutex<CurrencyCache>>,
) -> Result<(uuid::Uuid, TransactionWithCallback<'_>), CreateCurrencyErrors> {
    // Ensure another base currency doesnt exist
    let db_txn = match currency.is_base() {
        true => {
            // See if base currency in cache or not.
            {
                if let Some(_existing_base_currency) =
                    cache.lock().await.query_base_currency(currency.get_owner())
                {
                    return Err(CreateCurrencyErrors::RepeatedBaseCurrency);
                }
            }

            // If not, query the database to see if it's actually not.
            match get_base_currency(currency.get_owner(), db_txn, cache.clone())
                .await
                .map_err(CreateCurrencyErrors::DbErr)?
            {
                (Some(_existing_currency), _) => {
                    return Err(CreateCurrencyErrors::RepeatedBaseCurrency)
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
        } => match get_currency_by_id(owner, fallback_rate_currency_id, db_txn, cache.clone())
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

    cache
        .clone()
        .lock()
        .await
        .register_item(currency.into_domain(model.last_insert_id));
    Ok((model.last_insert_id, db_txn))
}
