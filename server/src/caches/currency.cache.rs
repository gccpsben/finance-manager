use crate::{extractors::auth_user::AuthUser, repositories::currencies::CurrencyDomainEnum};

// TODO: We might be able to use concurrency map for this. For now just use Mutex on the whole thing first.
// TODO: Or we might be able to use VecDeque for this.

#[derive(Clone)]
pub struct CurrencyCache {
    items: Vec<CurrencyDomainEnum>,
}

impl CurrencyCache {
    pub fn new(size: usize) -> CurrencyCache {
        CurrencyCache {
            items: Vec::with_capacity(size),
        }
    }
    pub fn register_item(&mut self, entry: CurrencyDomainEnum) {
        self.items.push(entry);
    }
    pub fn query_base_currency(&self, owner: &AuthUser) -> Option<&CurrencyDomainEnum> {
        self.items.iter().find(|item| {
            let cache_item_is_base = match item {
                CurrencyDomainEnum::Base { .. } => true,
                CurrencyDomainEnum::Normal { .. } => false,
            };
            let cache_item_owner_id = match item {
                CurrencyDomainEnum::Base { owner, .. } => owner,
                CurrencyDomainEnum::Normal { owner, .. } => owner,
            }
            .to_string();

            cache_item_is_base && cache_item_owner_id == owner.user_id.to_string()
        })
    }
    pub fn query_item_by_currency_id(
        &self,
        owner: &AuthUser,
        currency_id: uuid::Uuid,
    ) -> Option<&CurrencyDomainEnum> {
        self.items.iter().find(|item| {
            let cache_item_currency_id = match item {
                CurrencyDomainEnum::Base { id, .. } => id,
                CurrencyDomainEnum::Normal { id, .. } => id,
            };

            let cache_item_owner_id = match item {
                CurrencyDomainEnum::Base { owner, .. } => owner,
                CurrencyDomainEnum::Normal { owner, .. } => owner,
            }
            .to_string();

            *cache_item_currency_id == currency_id
                && owner.user_id.to_string() == cache_item_owner_id
        })
    }
}
