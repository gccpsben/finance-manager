use super::currencies::{find_first_unknown_currencies, get_currency_by_id};
use crate::entities::currency_rate_datum;
use crate::extended_models::currency::CurrencyId;
use crate::routes::bootstrap::EndpointsErrors;
use crate::routes::currency_rate_datums::CreateCurrencyRateDatumAction;
use crate::services::TransactionWithCallback;
use crate::{
    caches::{currency_cache::CurrencyCache, currency_rate_datum::CurrencyRateDatumCache},
    extractors::auth_user::AuthUser,
};
use sea_orm::prelude::Expr;
use sea_orm::sqlx::types::chrono::{self, Utc};
use sea_orm::{ColumnTrait, DbErr, EntityTrait, QueryFilter, QueryOrder, Value};
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Debug)]
pub enum CreateCurrencyRateDatumErrors {
    DbErr(DbErr),
    CyclicRefAmountCurrency(Uuid),
    CurrencyNotFound(CurrencyId),
}

impl From<CreateCurrencyRateDatumErrors> for EndpointsErrors {
    fn from(value: CreateCurrencyRateDatumErrors) -> Self {
        match value {
            CreateCurrencyRateDatumErrors::CurrencyNotFound(uuid) => {
                EndpointsErrors::CurrencyNotFound(uuid)
            }
            CreateCurrencyRateDatumErrors::CyclicRefAmountCurrency(uuid) => {
                EndpointsErrors::CyclicRefAmountCurrency(uuid)
            }
            CreateCurrencyRateDatumErrors::DbErr(db_err) => EndpointsErrors::DbErr(db_err),
        }
    }
}

pub fn find_neighbors_left_biased<T: Ord + Clone, R>(
    target: &T,
    pair_1: Option<(T, R)>,
    pair_2: Option<(T, R)>,
) -> (Option<R>, Option<R>) {
    match (pair_1, pair_2) {
        (Some(first), Some(second)) => {
            // Simple swap if not sorted
            let (first, second) = match first.0 > second.0 {
                true => (second, first),
                false => (first, second),
            };

            match (target >= &first.0, target <= &second.0) {
                (true, true) => (Some(first.1), Some(second.1)), // A T B
                (true, false) => (Some(second.1), None),         // A B T
                (false, true) => (None, None),                   // T A B
                (false, false) => panic!("impossible case encountered."), // T A B T
            }
        }
        (Some(first), None) => {
            match target >= &first.0 {
                true => (Some(first.1), None), // A T
                false => (None, None),         // T A
            }
        }
        (None, Some(second)) => {
            match target >= &second.0 {
                true => (Some(second.1), None), // B T
                false => (None, None),          // T B
            }
        }
        (None, None) => (None, None),
    }
}

// TODO: Don't call db every time
/// Get the nearest 2 datums of a currency given a date.
/// If the given date is exactly the same as one of the 2 nearest datums, the returned pair of datums will be the same.
pub async fn get_datum_left_right<'a>(
    owner: &AuthUser,
    date: chrono::DateTime<Utc>,
    currency_id: CurrencyId,
    db_txn: TransactionWithCallback<'a>,
) -> Result<
    (
        Option<currency_rate_datum::Model>,
        Option<currency_rate_datum::Model>,
        TransactionWithCallback<'a>,
    ),
    DbErr,
> {
    // TODO: See if this can be done via builder instead of raw SQL
    let results_iter = currency_rate_datum::Entity::find()
        .filter(
            currency_rate_datum::Column::OwnerId
                .eq(owner.0)
                .and(currency_rate_datum::Column::RefCurrencyId.eq(currency_id.0)),
        )
        .order_by(
            Expr::cust_with_values(
                r#"abs(extract (epoch from ($1::timestamp - "date")))"#,
                vec![Value::ChronoDateTimeUtc(Some(Box::new(date)))],
            ),
            sea_orm::Order::Asc,
        )
        .all(db_txn.get_db_txn())
        .await?;

    let first_item = results_iter.first().cloned();
    let second_item = results_iter.get(1).cloned();
    let date = &date.naive_utc();

    // TODO: Dont use clone
    let nearest = find_neighbors_left_biased(
        date,
        match first_item {
            Some(model) => Some((model.date, model.clone())),
            None => None,
        },
        match second_item {
            Some(model) => Some((model.date, model.clone())),
            None => None,
        },
    );

    // TODO: can inline bool
    let is_left_same = match nearest.0.is_some() {
        true => nearest.0.as_ref().unwrap().date == *date,
        false => false,
    };
    let is_right_same = match nearest.1.is_some() {
        true => nearest.1.as_ref().unwrap().date == *date,
        false => false,
    };

    if is_left_same {
        let left_side = nearest.0;
        let left_side_copy = left_side.clone();
        Ok((left_side, left_side_copy, db_txn))
    } else if is_right_same {
        let right_side = nearest.1;
        let right_side_copy = right_side.clone();
        Ok((right_side, right_side_copy, db_txn))
    } else {
        Ok((nearest.0, nearest.1, db_txn))
    }
}

pub async fn create_currency_rate_datum<'a>(
    owner: &AuthUser,
    datum: CreateCurrencyRateDatumAction,
    db_txn: TransactionWithCallback<'a>,
    rates_cache: Arc<Mutex<CurrencyRateDatumCache>>,
    currency_cache: Arc<Mutex<CurrencyCache>>,
) -> Result<(uuid::Uuid, TransactionWithCallback<'a>), CreateCurrencyRateDatumErrors> {
    // Check if all currencies referenced exist
    let db_txn = {
        let currencies_to_check = [datum.ref_currency_id, datum.ref_amount_currency_id];
        let potential_unknown_uuid = find_first_unknown_currencies(
            owner,
            &currencies_to_check,
            db_txn,
            currency_cache.clone(),
        )
        .await
        .map_err(CreateCurrencyRateDatumErrors::DbErr)?;

        match potential_unknown_uuid {
            (None, db_txn) => db_txn,
            (Some(uuid_not_found), _db_txn) => {
                return Err(CreateCurrencyRateDatumErrors::CurrencyNotFound(CurrencyId(
                    uuid_not_found.0,
                )))
            }
        }
    };

    let db_txn = {
        let (currency, db_txn) = get_currency_by_id(
            owner,
            &datum.ref_amount_currency_id,
            db_txn,
            currency_cache.clone(),
        )
        .await
        .map_err(CreateCurrencyRateDatumErrors::DbErr)?;

        if currency.is_none() {
            return Err(CreateCurrencyRateDatumErrors::CurrencyNotFound(CurrencyId(
                datum.ref_amount_currency_id.0,
            )));
        }

        db_txn
    };

    if datum.ref_amount_currency_id == datum.ref_currency_id {
        return Err(CreateCurrencyRateDatumErrors::CyclicRefAmountCurrency(
            datum.ref_currency_id.0,
        ));
    }

    let create_datum_active_record: currency_rate_datum::ActiveModel = datum.clone().into();
    let model = currency_rate_datum::Entity::insert(create_datum_active_record)
        .exec(db_txn.get_db_txn())
        .await
        .map_err(CreateCurrencyRateDatumErrors::DbErr)?;

    {
        rates_cache
            .lock()
            .await
            .register_item(datum.into_domain(model.last_insert_id.0));
    }
    Ok((model.last_insert_id.0, db_txn))
}
