use crate::extended_models::currency::CurrencyId;
use crate::extractors::auth_user::AuthUser;
use crate::routes::currency_rate_datums::CurrencyRateDatum;
use crate::services::TransactionWithCallback;
use std::collections::HashMap;
use uuid::Uuid;

// TODO: We might be able to use concurrency map for this. For now just use Mutex on the whole thing first.
// TODO: Or we might be able to use VecDeque for this.

pub struct CurrencyRateDatumCache {
    items: HashMap<Uuid, Vec<CurrencyRateDatum>>,
}

impl CurrencyRateDatumCache {
    pub fn new(size: usize) -> CurrencyRateDatumCache {
        CurrencyRateDatumCache {
            items: HashMap::with_capacity(size),
        }
    }

    pub fn register_item(&mut self, entry: CurrencyRateDatum) {
        match self.items.get_mut(&entry.owner.0) {
            None => {
                self.items.insert(entry.owner.0, vec![entry]);
            }
            Some(existing_vec) => existing_vec.push(entry),
        }
    }
}
