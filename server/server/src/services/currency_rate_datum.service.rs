use sea_orm::DbErr;
use uuid::Uuid;

use crate::{
    caches::currency_rate_datum::CurrencyRateDatumCache,
    repositories::{
        self, currency_rate_datum::CreateCurrencyRateDatumDomain, TransactionWithCallback,
    },
};

pub enum CreateCurrencyRateDatumErrors {
    DbErr(DbErr),
    CyclicRefAmountCurrency(Uuid),
}

pub async fn create_currency_rate_datum<'a>(
    datum: CreateCurrencyRateDatumDomain,
    db_txn: TransactionWithCallback<'a>,
    cache: &mut CurrencyRateDatumCache,
) -> Result<(uuid::Uuid, TransactionWithCallback<'a>), CreateCurrencyRateDatumErrors> {
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
