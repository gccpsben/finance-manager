use crate::caches::txn_tag::TxnTagsCache;
use crate::{
    caches::{currency_cache::CurrencyCache, currency_rate_datum::CurrencyRateDatumCache},
    entities::prelude::TxnTag,
};
use sea_orm::DatabaseConnection;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct DatabaseStates {
    pub db: DatabaseConnection,
    pub currency_cache: Arc<Mutex<CurrencyCache>>,
    pub currency_rate_datums_cache: Arc<Mutex<CurrencyRateDatumCache>>,
    pub txn_tags_cache: Arc<Mutex<TxnTagsCache>>,
}
