use std::collections::HashMap;

use uuid::Uuid;

use crate::repositories::currency_rate_datum::CurrencyRateDatumDomain;

// TODO: We might be able to use concurrency map for this. For now just use Mutex on the whole thing first.
// TODO: Or we might be able to use VecDeque for this.

pub struct CurrencyRateDatumCache {
    items: HashMap<Uuid, Vec<CurrencyRateDatumDomain>>,
}

impl CurrencyRateDatumCache {
    pub fn new(size: usize) -> CurrencyRateDatumCache {
        CurrencyRateDatumCache {
            items: HashMap::with_capacity(size),
        }
    }

    pub fn register_item(&mut self, entry: CurrencyRateDatumDomain) {
        match self.items.get_mut(&entry.owner) {
            None => {
                self.items.insert(entry.owner, vec![entry]);
            }
            Some(existing_vec) => existing_vec.push(entry),
        }
    }
}
