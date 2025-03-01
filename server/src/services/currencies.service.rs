use crate::caches::currency_cache::CurrencyCache;
use crate::repositories::currencies::{
    get_base_currency, get_currency_by_id, CreateCurrencyDomainEnum,
};
use crate::repositories::{self, TransactionWithCallback};
use sea_orm::DbErr;
use uuid::Uuid;

pub enum CreateCurrencyErrors {
    DbErr(DbErr),
    ValidationErr,
    ReferencedCurrencyNotExist(Uuid),
    RepeatedBaseCurrency(Uuid),
}

pub async fn create_currency<'a>(
    currency: CreateCurrencyDomainEnum,
    db_txn: TransactionWithCallback<'a>,
    cache: &mut CurrencyCache,
) -> Result<(uuid::Uuid, TransactionWithCallback<'a>), CreateCurrencyErrors> {
    // Ensure fallback coexists
    {
        let fallbacks = match currency {
            CreateCurrencyDomainEnum::Base { .. } => (true, None, None),
            CreateCurrencyDomainEnum::Normal {
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
            fn extract_id(domain_curr: &repositories::currencies::CurrencyDomainEnum) -> Uuid {
                match domain_curr {
                    repositories::currencies::CurrencyDomainEnum::Base { id, .. } => *id,
                    repositories::currencies::CurrencyDomainEnum::Normal { id, .. } => *id,
                }
            }

            // See if base currency in cache or not.
            if let Some(existing_base_currency) = cache.query_base_currency(currency.get_owner()) {
                return Err(CreateCurrencyErrors::RepeatedBaseCurrency(extract_id(
                    existing_base_currency,
                )));
            }

            // If not, query the database to see if it's actually not.
            match get_base_currency(currency.get_owner(), db_txn, Some(cache)).await {
                Ok((Some(existing_currency), _)) => {
                    return Err(CreateCurrencyErrors::RepeatedBaseCurrency(extract_id(
                        &existing_currency,
                    )))
                }
                Ok((None, db_txn)) => db_txn, // return moved txn if ok
                Err(db_err) => return Err(CreateCurrencyErrors::DbErr(db_err)),
            }
        }
        false => db_txn,
    };

    // Ensure referenced currency exists
    let db_txn = match currency {
        CreateCurrencyDomainEnum::Base { .. } => db_txn,
        CreateCurrencyDomainEnum::Normal {
            ref owner,
            ref fallback_rate_currency_id,
            ..
        } => match get_currency_by_id(owner, *fallback_rate_currency_id, db_txn, cache).await {
            Ok((Some(_domain_enum), db_txn)) => db_txn,
            Ok((None, _)) => {
                return Err(CreateCurrencyErrors::ReferencedCurrencyNotExist(
                    *fallback_rate_currency_id,
                ))
            }
            Err(db_err) => return Err(CreateCurrencyErrors::DbErr(db_err)),
        },
    };

    match repositories::currencies::create_currency(currency, db_txn, cache).await {
        Ok(result) => Ok(result),
        Err(err) => Err(CreateCurrencyErrors::DbErr(err)),
    }
}
