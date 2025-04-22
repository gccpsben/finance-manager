use lru::LruCache;
use std::hash::Hash;
use std::num::NonZero;

use crate::extractors::auth_user::AuthUser;

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum PartialCacheState {
    Full,
    Partial,
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum IntegratedQueryResult<T> {
    TruePositive(T),
    TrueNegative,
    UnsureNegative,
}

/// An LRU cache with a state to track partial states.
pub struct PartialCache<K: Hash + Eq + Clone, V> {
    pairs: LruCache<K, V>,
    state: PartialCacheState,
}

impl<K: Hash + Eq + Clone, V> PartialCache<K, V> {
    pub fn clear(&mut self) {
        self.pairs.clear();
    }
    #[allow(unused)]
    pub fn len(&self) -> usize {
        self.pairs.len()
    }
    pub fn replace_full(&mut self, items: Box<[(K, V)]>) {
        self.clear();
        self.state = PartialCacheState::Full;
        for pair in items {
            let (key, value) = pair;
            self.register(&key, value);
        }
    }
    pub fn register(&mut self, key: &K, value: V) {
        let old_len = self.pairs.len();
        let put_result = self.pairs.put(key.clone(), value);
        let expect_more_entries = put_result.is_none();
        let new_len = self.pairs.len();
        if matches!(self.state, PartialCacheState::Full)
            && new_len == old_len
            && expect_more_entries
        {
            self.state = PartialCacheState::Partial;
        }
    }
    #[cfg(test)]
    pub fn query(&mut self, key: &K) -> Option<&V> {
        self.pairs.get(key)
    }
    pub fn query_mut(&mut self, key: &K) -> Option<&mut V> {
        self.pairs.get_mut(key)
    }
    pub fn new(capacity: NonZero<usize>) -> Self {
        Self {
            pairs: LruCache::new(capacity),
            state: PartialCacheState::Partial,
        }
    }
    pub fn get_state(&self) -> &PartialCacheState {
        &self.state
    }
    #[cfg(test)]
    pub fn remove(&mut self, key: &K) {
        self.pairs.pop(key);
    }
    #[cfg(test)]
    pub fn contains(&mut self, key: &K) -> bool {
        self.pairs.contains(key)
    }
    pub fn get_all_items(&mut self) -> Vec<(K, &V)> {
        self.pairs
            .iter()
            .map(|pair| (pair.0.clone(), pair.1))
            .collect::<Vec<_>>()
    }
}

/// A wrapper for `PartialCache`, but partitioned into different users.
pub struct AuthPartitionCache<K: Hash + Eq + Clone, V: Clone> {
    pub partitions: PartialCache<AuthUser, PartialCache<K, V>>,
    entry_capacity: NonZero<usize>,
}

impl<K: Hash + Eq + Clone, V: Clone> AuthPartitionCache<K, V> {
    pub fn new(entries_per_user_cap: NonZero<usize>, users_cap: NonZero<usize>) -> Self {
        Self {
            partitions: PartialCache::<_, _>::new(users_cap),
            entry_capacity: entries_per_user_cap,
        }
    }
    pub fn register(&mut self, user: &AuthUser, key: &K, value: V) {
        let mut user_in_cache = self.partitions.query_mut(user);
        if let Some(ref mut user) = user_in_cache {
            user.register(key, value);
        } else {
            let mut new_cache = PartialCache::new(self.entry_capacity);
            new_cache.register(key, value);
            self.partitions.register(user, new_cache);
        }
    }
    pub fn replace_full(&mut self, user: &AuthUser, items: Box<[(K, V)]>) {
        let mut user_in_cache = self.partitions.query_mut(user);
        if let Some(ref mut user) = user_in_cache {
            user.replace_full(items);
        } else {
            let mut new_cache = PartialCache::new(self.entry_capacity);
            new_cache.replace_full(items);
            self.partitions.register(user, new_cache);
        }
    }
    #[cfg(test)]
    pub fn get_user_entry(&mut self, user: &AuthUser) -> Option<&PartialCache<K, V>> {
        self.partitions.query(user)
    }

    pub fn get_user_entry_mut(&mut self, user: &AuthUser) -> Option<&mut PartialCache<K, V>> {
        self.partitions.query_mut(user)
    }

    /// Try to fetch cache given a ``user`` and ``key``,
    /// return the state of the user's sub-cache and value.
    /// Will return `None` if the user is not registered in the cache.
    pub fn get_user_entry_item_mut(
        &mut self,
        user: &AuthUser,
        key: &K,
    ) -> IntegratedQueryResult<V> {
        let mut sub_cache = self.partitions.query_mut(user);

        match sub_cache {
            Some(ref mut sub_cache) => {
                let sub_cache_state = sub_cache.get_state().clone();
                let query_result = sub_cache.query_mut(key).cloned();

                match (sub_cache_state, query_result) {
                    (PartialCacheState::Full, None) => IntegratedQueryResult::TrueNegative,
                    (PartialCacheState::Partial, None) => IntegratedQueryResult::UnsureNegative,
                    (_, Some(val)) => IntegratedQueryResult::TruePositive(val),
                }
            }
            None => IntegratedQueryResult::UnsureNegative,
        }
    }
    pub fn get_all_items(&mut self, user: &AuthUser) -> Option<Vec<(K, V)>> {
        self.partitions.query_mut(user).map(|user_tags| {
            user_tags
                .pairs
                .iter()
                .map(|pair| (pair.0.clone(), pair.1.clone()))
                .collect::<Vec<_>>()
        })
    }
    pub fn get_user_entry_state(&mut self, user: &AuthUser) -> Option<PartialCacheState> {
        let sub_cache = self.partitions.query_mut(user);
        sub_cache.map(|sub_cache| sub_cache.get_state()).cloned()
    }
}
