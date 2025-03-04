use crate::{entities::txn_tag::Model as TxnTag, extractors::auth_user::AuthUser};
use sea_orm::*;

#[derive(Clone)]
pub struct TxnTagsCache {
    items: Vec<TxnTag>,
}

impl TxnTagsCache {
    pub fn new(size: usize) -> TxnTagsCache {
        TxnTagsCache {
            items: Vec::with_capacity(size),
        }
    }
    pub fn register_item(&mut self, entry: TxnTag) {
        self.items.push(entry);
    }
    // TODO: currently do simple iter loop first, change this in the future
    pub fn query_txn_tag(&self, owner: &AuthUser) -> Vec<TxnTag> {
        self.items
            .iter()
            .filter(|item| item.owner_id == owner.0)
            .cloned()
            .collect::<Vec<_>>()
    }
}
