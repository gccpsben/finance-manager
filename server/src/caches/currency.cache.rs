use crate::{extended_models::currency::Currency, extractors::auth_user::AuthUser};

// TODO: We might be able to use concurrency map for this. For now just use Mutex on the whole thing first.
// TODO: Or we might be able to use VecDeque for this.

#[derive(Clone)]
pub struct CurrencyCache {
    items: Vec<Currency>,
}

impl CurrencyCache {
    pub fn new(size: usize) -> CurrencyCache {
        CurrencyCache {
            items: Vec::with_capacity(size),
        }
    }
    pub fn register_item(&mut self, entry: Currency) {
        self.items.push(entry);
    }
    pub fn query_base_currency(&self, owner: &AuthUser) -> Option<&Currency> {
        self.items.iter().find(|item| {
            let cache_item_is_base = match item {
                Currency::Base { .. } => true,
                Currency::Normal { .. } => false,
            };
            let cache_item_owner_id = match item {
                Currency::Base { owner, .. } => owner.0,
                Currency::Normal { owner, .. } => owner.0,
            }
            .to_string();

            cache_item_is_base && cache_item_owner_id == owner.0.to_string()
        })
    }
    pub fn query_item_by_currency_id(
        &self,
        owner: &AuthUser,
        currency_id: uuid::Uuid,
    ) -> Option<&Currency> {
        self.items.iter().find(|item| {
            let cache_item_currency_id = match item {
                Currency::Base { id, .. } => id,
                Currency::Normal { id, .. } => id,
            };

            let cache_item_owner_id = match item {
                Currency::Base { owner, .. } => owner.0,
                Currency::Normal { owner, .. } => owner.0,
            }
            .to_string();

            cache_item_currency_id.0 == currency_id && owner.0.to_string() == cache_item_owner_id
        })
    }
}
