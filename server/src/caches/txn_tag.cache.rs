use super::cache::AuthPartitionCache;
use crate::entities::txn_tag::Model as TxnTag;
use crate::extended_models::txn_tag::TxnTagId;

pub struct TxnTagsCache(pub AuthPartitionCache<TxnTagId, TxnTag>);
