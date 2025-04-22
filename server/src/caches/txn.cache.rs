use super::cache::AuthPartitionCache;
use crate::entities::txn::Model;
use crate::extended_models::txn::TxnId;

pub struct TxnCache(pub AuthPartitionCache<TxnId, Model>);
