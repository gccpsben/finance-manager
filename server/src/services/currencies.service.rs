use super::currency_rate_datum::get_datum_left_right;
use crate::caches::currency_cache::CurrencyCache;
use crate::entities::currency;
use crate::entities::currency_rate_datum::Model;
use crate::extended_models::currency::CreateCurrencyAction;
use crate::extended_models::currency::Currency;
use crate::extended_models::currency::CurrencyId;
use crate::extractors::auth_user::AuthUser;
use crate::linear_interpolator::force_time_delta_to_mills_decimal;
use crate::linear_interpolator::try_linear_interpolate;
use crate::maths::Decimal;
use crate::routes::bootstrap::EndpointsErrors;
use crate::services::TransactionWithCallback;
use rust_decimal::Decimal as RDecimal;
use rust_decimal::prelude::FromPrimitive;
use sea_orm::ColumnTrait;
use sea_orm::DbErr;
use sea_orm::EntityTrait;
use sea_orm::QueryFilter;
use std::str::FromStr;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug)]
pub enum CalculateCurrencyRateErrors {
    DbErr(DbErr),
    CurrencyNotFound(CurrencyId),
    InvalidDecimalValue(String),
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
        }
    }
}

/// A shorthand method to get 2 datums rates, given the left and right datums, in the same database transaction.
async fn get_left_right_datum_rate(
    owner: &AuthUser,
    left_datum: &Model,
    right_datum: &Model,
    db_txn: TransactionWithCallback,
    cache: Arc<Mutex<CurrencyCache>>,
) -> Result<(Decimal, Decimal, TransactionWithCallback), CalculateCurrencyRateErrors> {
    type CalErr = CalculateCurrencyRateErrors;
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

    let left_datum_decimal = Decimal::new(
        rust_decimal::Decimal::from_str(&left_datum.amount)
            .map_err(|_| CalErr::InvalidDecimalValue(left_datum.amount.clone()))?,
    );

    let right_datum_decimal = Decimal::new(
        rust_decimal::Decimal::from_str(&right_datum.amount)
            .map_err(|_| CalErr::InvalidDecimalValue(right_datum.amount.clone()))?,
    );

    Ok((
        left_rate.checked_mul(left_datum_decimal),
        right_rate.checked_mul(right_datum_decimal),
        db_txn,
    ))
}

/// Calculate the exchange rate of the given currency at a given date.
pub async fn calculate_currency_rate(
    owner: &AuthUser,
    currency_id: CurrencyId,
    db_txn: TransactionWithCallback,
    date: chrono::DateTime<chrono::Utc>,
    cache: Arc<Mutex<CurrencyCache>>,
) -> Result<(Decimal, TransactionWithCallback), CalculateCurrencyRateErrors> {
    let (curr, db_txn) = get_currency_by_id(owner, &currency_id, db_txn, cache.clone())
        .await
        .map_err(CalculateCurrencyRateErrors::DbErr)?;

    match curr {
        Some(Currency::Base { .. }) => Ok((Decimal::new(rust_decimal::Decimal::ONE), db_txn)),
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
                        Some((Decimal::new(rust_decimal::Decimal::ZERO), left_rate)),
                        Some((force_time_delta_to_mills_decimal(&full_range), right_rate)),
                        Decimal::new(
                            rust_decimal::Decimal::from_i64(left_delta.num_milliseconds())
                                .expect("Unable to convert left_delta to Decimal."),
                        ),
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
                    let left_amount =
                        Decimal::new(RDecimal::from_str_exact(&left_d.amount).map_err(|_| {
                            CalculateCurrencyRateErrors::InvalidDecimalValue(left_d.amount.clone())
                        })?);
                    let (left_d_rate, db_txn) = Box::pin(calculate_currency_rate(
                        owner,
                        CurrencyId(left_d.ref_amount_currency_id),
                        db_txn,
                        date,
                        cache,
                    ))
                    .await?;
                    Ok((left_d_rate * left_amount, db_txn))
                }
                // If only the right datum is found / not found at all, return the currency fallback rate
                (None, _) => {
                    let fallback_rate_amount = Decimal::new(
                        RDecimal::from_str_exact(&fallback_rate_amount).map_err(|_| {
                            CalculateCurrencyRateErrors::InvalidDecimalValue(
                                fallback_rate_amount.clone(),
                            )
                        })?,
                    );

                    let (fallback_rate, db_txn) = Box::pin(calculate_currency_rate(
                        owner,
                        fallback_rate_currency_id,
                        db_txn,
                        date,
                        cache,
                    ))
                    .await?;

                    Ok((fallback_rate * fallback_rate_amount, db_txn))
                }
            }
        }
        None => Err(CalculateCurrencyRateErrors::CurrencyNotFound(currency_id)),
    }
}

pub async fn get_currencies(
    owner: &AuthUser,
    db_txn: TransactionWithCallback,
) -> Result<(Vec<Currency>, TransactionWithCallback), DbErr> {
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

pub async fn get_base_currency(
    owner: &AuthUser,
    db_txn: TransactionWithCallback,
    cache: Arc<Mutex<CurrencyCache>>,
) -> Result<(Option<Currency>, TransactionWithCallback), DbErr> {
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

// TODO: See if this can be optimized at DB level
pub async fn find_first_unknown_currencies(
    owner: &AuthUser,
    ids: &[CurrencyId],
    db_txn: TransactionWithCallback,
    cache: Arc<Mutex<CurrencyCache>>,
) -> Result<(Option<CurrencyId>, TransactionWithCallback), DbErr> {
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

pub async fn get_currency_by_id(
    owner: &AuthUser,
    currency_id: &CurrencyId,
    db_txn: TransactionWithCallback,
    cache: Arc<Mutex<CurrencyCache>>,
) -> Result<(Option<Currency>, TransactionWithCallback), DbErr> {
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

    Ok((db_result.map(std::convert::Into::into), db_txn))
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
    db_txn: TransactionWithCallback,
    cache: Arc<Mutex<CurrencyCache>>,
) -> Result<(uuid::Uuid, TransactionWithCallback), CreateCurrencyErrors> {
    let db_txn = if currency.is_base() {
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
                return Err(CreateCurrencyErrors::RepeatedBaseCurrency);
            }
            (None, db_txn) => db_txn, // return moved txn if ok
        }
    } else {
        db_txn
    };

    // Ensure referenced currency exists
    let mut db_txn = match currency {
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
                ));
            }
        },
    };

    let create_currency_active_record: currency::ActiveModel = currency.clone().into();
    let model = currency::Entity::insert(create_currency_active_record)
        .exec(db_txn.get_db_txn())
        .await
        .map_err(CreateCurrencyErrors::DbErr)?;

    {
        db_txn.add_callback(async move {
            cache
                .lock()
                .await
                .register_item(currency.into_domain(model.last_insert_id.0));
        });
    }

    Ok((model.last_insert_id.0, db_txn))
}
