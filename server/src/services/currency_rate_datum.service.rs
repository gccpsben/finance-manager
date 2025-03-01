use sea_orm::DbErr;
use uuid::Uuid;

use crate::{
    caches::{currency_cache::CurrencyCache, currency_rate_datum::CurrencyRateDatumCache},
    extractors::auth_user::AuthUser,
    repositories::{
        self, currencies::find_first_unknown_currencies,
        currency_rate_datum::CreateCurrencyRateDatumDomain, TransactionWithCallback,
    },
};

pub enum CreateCurrencyRateDatumErrors {
    DbErr(DbErr),
    CyclicRefAmountCurrency(Uuid),
    CurrencyNotFound(Uuid),
}

pub async fn create_currency_rate_datum<'a>(
    owner: &AuthUser,
    datum: CreateCurrencyRateDatumDomain,
    db_txn: TransactionWithCallback<'a>,
    cache: &mut CurrencyRateDatumCache,
    currency_cache: &mut CurrencyCache,
) -> Result<(uuid::Uuid, TransactionWithCallback<'a>), CreateCurrencyRateDatumErrors> {
    // Check if all currencies referenced exist
    let db_txn = {
        let currencies_to_check = [datum.ref_currency_id, datum.ref_amount_currency_id];
        let unknown_uuid =
            find_first_unknown_currencies(owner, &currencies_to_check, db_txn, currency_cache)
                .await;

        match unknown_uuid {
            Err(db_err) => return Err(CreateCurrencyRateDatumErrors::DbErr(db_err)),
            Ok((None, db_txn)) => db_txn,
            Ok((Some(uuid_not_found), _db_txn)) => {
                return Err(CreateCurrencyRateDatumErrors::CurrencyNotFound(
                    uuid_not_found,
                ))
            }
        }
    };

    let db_txn = {
        let currency_result = repositories::currencies::get_currency_by_id(
            owner,
            datum.ref_amount_currency_id,
            db_txn,
            currency_cache,
        )
        .await;

        match currency_result {
            Err(db_err) => return Err(CreateCurrencyRateDatumErrors::DbErr(db_err)),
            Ok((currency, db_txn)) => match currency {
                None => {
                    return Err(CreateCurrencyRateDatumErrors::CurrencyNotFound(
                        datum.ref_amount_currency_id,
                    ))
                }
                Some(_currency_datum) => db_txn,
            },
        }
    };

    if datum.ref_amount_currency_id == datum.ref_currency_id {
        return Err(CreateCurrencyRateDatumErrors::CyclicRefAmountCurrency(
            datum.ref_currency_id,
        ));
    }

    match repositories::currency_rate_datum::create_currency_rate_datum(datum, db_txn, cache).await
    {
        Ok(result) => Ok(result),
        Err(err) => Err(CreateCurrencyRateDatumErrors::DbErr(err)),
    }
}
