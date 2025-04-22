use crate::caches::cache::AuthPartitionCache;
use crate::caches::currency_cache::CurrencyCache;
use crate::caches::currency_rate_datum::CurrencyRateDatumCache;
use crate::caches::txn::TxnCache;
use crate::caches::txn_tag::TxnTagsCache;
use sea_orm::DatabaseConnection;
use std::num::NonZero;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct DatabaseStates {
    pub db: DatabaseConnection,
    pub currency_cache: Arc<Mutex<CurrencyCache>>,
    pub currency_rate_datums_cache: Arc<Mutex<CurrencyRateDatumCache>>,
    pub txn_tags_cache: Arc<Mutex<TxnTagsCache>>,
    pub txns_cache: Arc<Mutex<TxnCache>>,
}

impl DatabaseStates {
    pub fn new(connection: DatabaseConnection) -> Self {
        DatabaseStates::with_capacity(connection, 128.try_into().unwrap())
    }
    pub fn with_capacity(connection: DatabaseConnection, size: NonZero<usize>) -> Self {
        let txn_tags_cache_inner = AuthPartitionCache::<_, _>::new(size, size);
        let txn_cache_inner = AuthPartitionCache::<_, _>::new(size, size);

        Self {
            db: connection,
            currency_cache: Arc::from(Mutex::from(CurrencyCache::new(size.get()))),
            currency_rate_datums_cache: Arc::from(Mutex::from(CurrencyRateDatumCache::new(
                size.get(),
            ))),
            txn_tags_cache: Arc::from(Mutex::from(TxnTagsCache(txn_tags_cache_inner))),
            txns_cache: Arc::from(Mutex::from(TxnCache(txn_cache_inner))),
        }
    }
}
