use crate::entities::currency_rate_datum;
use crate::routes::currency_rate_datums::CreateCurrencyRateDatumAction;
use crate::services::TransactionWithCallback;
use crate::{
    caches::{currency_cache::CurrencyCache, currency_rate_datum::CurrencyRateDatumCache},
    extractors::auth_user::AuthUser,
};
use sea_orm::{DbErr, EntityTrait};
use uuid::Uuid;

use super::currencies::{find_first_unknown_currencies, get_currency_by_id};

pub enum CreateCurrencyRateDatumErrors {
    DbErr(DbErr),
    CyclicRefAmountCurrency(Uuid),
    CurrencyNotFound(Uuid),
}

pub async fn create_currency_rate_datum<'a>(
    owner: &AuthUser,
    datum: CreateCurrencyRateDatumAction,
    db_txn: TransactionWithCallback<'a>,
    rates_cache: &mut CurrencyRateDatumCache,
    currency_cache: &mut CurrencyCache,
) -> Result<(uuid::Uuid, TransactionWithCallback<'a>), CreateCurrencyRateDatumErrors> {
    // Check if all currencies referenced exist
    let db_txn = {
        let currencies_to_check = [datum.ref_currency_id, datum.ref_amount_currency_id];
        let potential_unknown_uuid =
            find_first_unknown_currencies(owner, &currencies_to_check, db_txn, currency_cache)
                .await
                .map_err(CreateCurrencyRateDatumErrors::DbErr)?;

        match potential_unknown_uuid {
            (None, db_txn) => db_txn,
            (Some(uuid_not_found), _db_txn) => {
                return Err(CreateCurrencyRateDatumErrors::CurrencyNotFound(
                    uuid_not_found.0,
                ))
            }
        }
    };

    let db_txn = {
        let (currency, db_txn) =
            get_currency_by_id(owner, &datum.ref_amount_currency_id, db_txn, currency_cache)
                .await
                .map_err(CreateCurrencyRateDatumErrors::DbErr)?;

        if currency.is_none() {
            return Err(CreateCurrencyRateDatumErrors::CurrencyNotFound(
                datum.ref_amount_currency_id.0,
            ));
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

    rates_cache.register_item(datum.into_domain(model.last_insert_id));
    Ok((model.last_insert_id, db_txn))
}
