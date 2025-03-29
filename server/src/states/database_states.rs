use crate::caches::txn_tag::TxnTagsCache;
use crate::caches::{currency_cache::CurrencyCache, currency_rate_datum::CurrencyRateDatumCache};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct DatabaseStates {
    pub db: DatabaseConnection,
    pub currency_cache: Arc<Mutex<CurrencyCache>>,
    pub currency_rate_datums_cache: Arc<Mutex<CurrencyRateDatumCache>>,
    pub txn_tags_cache: Arc<Mutex<TxnTagsCache>>,
}

impl DatabaseStates {
    pub fn new(connection: DatabaseConnection) -> Self {
        Self {
            db: connection,
            currency_cache: Arc::from(Mutex::from(CurrencyCache::new(128))),
            currency_rate_datums_cache: Arc::from(Mutex::from(CurrencyRateDatumCache::new(128))),
            txn_tags_cache: Arc::from(Mutex::from(TxnTagsCache::new(128))),
        }
    }
}
