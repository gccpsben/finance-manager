#[cfg(test)]
mod cache_base_tests {
    use crate::caches::cache::PartialCache;
    use crate::caches::cache::PartialCacheState;
    use std::num::NonZero;

    #[actix_web::test]
    pub async fn test_cache_base_partial() {
        let mut cache_with_no_item =
            PartialCache::<i32, i32>::new(NonZero::<usize>::new(2).unwrap());
        assert_eq!(cache_with_no_item.len(), 0);
        assert!(cache_with_no_item.query(&1).is_none());

        let mut cache_with_one_item =
            PartialCache::<i32, i32>::new(NonZero::<usize>::new(2).unwrap());
        cache_with_one_item.register(&1, 2);
        assert_eq!(cache_with_one_item.len(), 1);
        assert!(matches!(cache_with_one_item.query(&1), Some(2)));

        let mut cache_with_two_item =
            PartialCache::<i32, i32>::new(NonZero::<usize>::new(2).unwrap());
        cache_with_two_item.register(&1, 2);
        cache_with_two_item.register(&2, 3);
        assert_eq!(cache_with_two_item.len(), 2);
        assert!(matches!(cache_with_two_item.query(&1), Some(2)));
        assert!(matches!(cache_with_two_item.query(&2), Some(3)));
        assert!(cache_with_two_item.query(&3).is_none());

        let mut cache_with_overflow =
            PartialCache::<i32, i32>::new(NonZero::<usize>::new(2).unwrap());
        cache_with_overflow.register(&1, 2);
        cache_with_overflow.register(&2, 3);
        cache_with_overflow.register(&3, 4);
        assert_eq!(cache_with_overflow.len(), 2);
        assert!(cache_with_overflow.query(&1).is_none());
        assert!(matches!(cache_with_overflow.query(&2), Some(3)));
        assert!(matches!(cache_with_overflow.query(&3), Some(4)));
    }

    #[actix_web::test]
    pub async fn test_cache_base_full() {
        let mut cache_with_one_item =
            PartialCache::<i32, i32>::new(NonZero::<usize>::new(2).unwrap());
        cache_with_one_item.replace_full(Box::from([(1, 2)]));
        assert_eq!(cache_with_one_item.len(), 1);
        assert!(matches!(cache_with_one_item.query(&1), Some(2)));
        assert!(matches!(
            cache_with_one_item.get_state(),
            PartialCacheState::Full
        ));

        let mut cache_with_two_item =
            PartialCache::<i32, i32>::new(NonZero::<usize>::new(2).unwrap());
        cache_with_two_item.replace_full(Box::from([(1, 2), (2, 3)]));
        assert_eq!(cache_with_two_item.len(), 2);
        assert!(matches!(cache_with_two_item.query(&1), Some(2)));
        assert!(matches!(cache_with_two_item.query(&2), Some(3)));
        assert!(cache_with_two_item.query(&3).is_none());
        assert!(matches!(
            cache_with_two_item.get_state(),
            PartialCacheState::Full
        ));

        let mut cache_with_overflow =
            PartialCache::<i32, i32>::new(NonZero::<usize>::new(2).unwrap());
        cache_with_overflow.replace_full(Box::from([(1, 2), (2, 3), (3, 4)]));
        assert_eq!(cache_with_overflow.len(), 2);
        assert!(cache_with_overflow.query(&1).is_none());
        assert!(matches!(cache_with_overflow.query(&2), Some(3)));
        assert!(matches!(cache_with_overflow.query(&3), Some(4)));
        assert!(matches!(
            cache_with_overflow.get_state(),
            PartialCacheState::Partial
        ));
    }

    #[actix_web::test]
    pub async fn test_cache_base_remove() {
        let mut cache = PartialCache::<i32, i32>::new(NonZero::<usize>::new(2).unwrap());
        cache.replace_full(Box::from([(1, 2), (2, 3), (3, 4)]));
        assert_eq!(cache.len(), 2);
        assert!(cache.query(&1).is_none());
        assert!(matches!(cache.query(&3), Some(4)));
        assert!(matches!(cache.query(&2), Some(3)));
        cache.remove(1);
        cache.remove(2);
        assert!(cache.query(&1).is_none());
        assert!(cache.query(&2).is_none());
        assert!(matches!(cache.query(&3), Some(4)));
    }

    #[actix_web::test]
    pub async fn test_cache_base_contains() {
        let mut cache = PartialCache::<i32, i32>::new(NonZero::<usize>::new(2).unwrap());
        cache.replace_full(Box::from([(1, 2), (2, 3), (3, 4)]));
        assert!(!cache.contains(1));
        assert!(cache.contains(2));
        assert!(cache.contains(3));
    }

    #[actix_web::test]
    pub async fn test_cache_base_clear() {
        let mut cache = PartialCache::<i32, i32>::new(NonZero::<usize>::new(2).unwrap());
        cache.replace_full(Box::from([(1, 2), (2, 3), (3, 4)]));
        assert_eq!(cache.len(), 2);
        cache.clear();
        assert_eq!(cache.len(), 0);
    }
}

#[cfg(test)]
mod auth_partitioned_cache_tests {
    use uuid::Uuid;

    use crate::caches::cache::AuthPartitionCache;
    use crate::caches::cache::PartialCacheState;
    use crate::extractors::auth_user::AuthUser;
    use std::num::NonZero;
    use std::str::FromStr;

    fn uuid_user(counter: u32) -> AuthUser {
        AuthUser(make_fake_uuid(counter))
    }

    fn non_z_size(value: usize) -> NonZero<usize> {
        NonZero::<usize>::new(value).unwrap()
    }

    pub fn make_fake_uuid(counter: u32) -> Uuid {
        Uuid::from_str(&format!("00000000-0000-4000-8000-{:0>12}", counter)).unwrap_or_else(|_| {
            panic!(
                "Cannot make fake UUIDv4 for test from counter = {}",
                counter
            )
        })
    }

    #[actix_web::test]
    pub async fn test_empty_partial() {
        let empty_cache = AuthPartitionCache::<i32, i32>::new(non_z_size(2), non_z_size(2));
        assert_eq!(empty_cache.partitions.len(), 0);
    }

    #[actix_web::test]
    pub async fn test_1_user_1_item_partial() {
        let mut cache_1_user_1_item =
            AuthPartitionCache::<i32, i32>::new(non_z_size(2), non_z_size(2));
        cache_1_user_1_item.register(&uuid_user(1), &1, 3);
        assert_eq!(cache_1_user_1_item.partitions.len(), 1);
        let first_item = cache_1_user_1_item
            .get_user_entry_mut(&uuid_user(1))
            .expect("should be Some(...)");
        assert_eq!(first_item.len(), 1, "first user's cache should have 1 item");
        assert_eq!(first_item.query(&1), Some(3).as_ref());
        assert_eq!(first_item.query(&2), None.as_ref());
        assert!(matches!(first_item.get_state(), PartialCacheState::Partial));
        let _ = first_item;
        assert!(cache_1_user_1_item.get_user_entry(&uuid_user(2)).is_none());
    }

    #[actix_web::test]
    pub async fn test_1_user_many_item_partial() {
        let mut cache_1_user_many_items =
            AuthPartitionCache::<i32, i32>::new(non_z_size(2), non_z_size(2));
        cache_1_user_many_items.register(&uuid_user(1), &1, 3);
        cache_1_user_many_items.register(&uuid_user(1), &2, 6);
        cache_1_user_many_items.register(&uuid_user(1), &3, 9);
        assert_eq!(cache_1_user_many_items.partitions.len(), 1);
        let first_item = cache_1_user_many_items
            .get_user_entry_mut(&uuid_user(1))
            .expect("should be Some(...)");
        assert_eq!(
            first_item.len(),
            2,
            "first user's cache should have 2 items (evicted)"
        );
        assert_eq!(first_item.query(&1), None.as_ref());
        assert_eq!(first_item.query(&2), Some(6).as_ref());
        assert_eq!(first_item.query(&3), Some(9).as_ref());
        assert_eq!(first_item.query(&4), None.as_ref());
        assert!(matches!(first_item.get_state(), PartialCacheState::Partial));
        let _ = first_item;
        assert!(cache_1_user_many_items
            .get_user_entry(&uuid_user(2))
            .is_none());
    }

    #[actix_web::test]
    pub async fn test_many_users_many_items_partial() {
        let mut cache_many_users_many_items =
            AuthPartitionCache::<i32, i32>::new(non_z_size(2), non_z_size(2));
        cache_many_users_many_items.register(&uuid_user(1), &1, 3);
        cache_many_users_many_items.register(&uuid_user(1), &2, 6);
        cache_many_users_many_items.register(&uuid_user(1), &3, 9);
        cache_many_users_many_items.register(&uuid_user(2), &51, 23);
        cache_many_users_many_items.register(&uuid_user(2), &55, 582);
        cache_many_users_many_items.register(&uuid_user(2), &90, 6830);
        cache_many_users_many_items.register(&uuid_user(4), &511, 123);
        cache_many_users_many_items.register(&uuid_user(4), &551, 1582);
        cache_many_users_many_items.register(&uuid_user(4), &901, 16830);
        assert_eq!(
            cache_many_users_many_items.partitions.len(),
            2,
            "cache should contain only 2 users (evicted)"
        );
        {
            let first_item = cache_many_users_many_items.get_user_entry_mut(&uuid_user(1));
            assert!(
                first_item.is_none(),
                "cache should contain only 1 user (evicted)"
            );
        }
        {
            let second_item = cache_many_users_many_items
                .get_user_entry_mut(&uuid_user(2))
                .expect("should be Some(...)");
            assert_eq!(
                second_item.len(),
                2,
                "second user's cache should have 2 items (evicted)"
            );
            assert_eq!(second_item.query(&51), None.as_ref());
            assert_eq!(second_item.query(&55), Some(582).as_ref());
            assert_eq!(second_item.query(&90), Some(6830).as_ref());
            assert_eq!(second_item.query(&4), None.as_ref());
            assert!(matches!(
                second_item.get_state(),
                PartialCacheState::Partial
            ));
        }
        {
            let third_item = cache_many_users_many_items
                .get_user_entry_mut(&uuid_user(4))
                .expect("should be Some(...)");
            assert_eq!(
                third_item.len(),
                2,
                "third user's cache should have 2 items (evicted)"
            );
            assert_eq!(third_item.query(&511), None.as_ref());
            assert_eq!(third_item.query(&551), Some(1582).as_ref());
            assert_eq!(third_item.query(&901), Some(16830).as_ref());
            assert_eq!(third_item.query(&4), None.as_ref());
            assert!(matches!(third_item.get_state(), PartialCacheState::Partial));
        }
        assert!(cache_many_users_many_items
            .get_user_entry(&uuid_user(3))
            .is_none());
        assert!(cache_many_users_many_items
            .get_user_entry(&uuid_user(5))
            .is_none());
    }

    #[actix_web::test]
    pub async fn test_many_users_full_states() {
        let mut cache_many_users_many_items =
            AuthPartitionCache::<i32, i32>::new(non_z_size(2), non_z_size(2));
        assert!(cache_many_users_many_items
            .get_user_entry(&uuid_user(1))
            .is_none());

        {
            cache_many_users_many_items.replace_full(&uuid_user(1), Box::from([(1, 2), (2, 3)]));
            let first_user_cache = cache_many_users_many_items
                .get_user_entry_mut(&uuid_user(1))
                .unwrap();
            assert!(matches!(
                first_user_cache.get_state(),
                PartialCacheState::Full
            ));
            first_user_cache.register(&3, 4);
            assert!(matches!(
                first_user_cache.get_state(),
                PartialCacheState::Partial
            ));
        }

        {
            // Try replacing again, old items should be cleared.
            cache_many_users_many_items
                .replace_full(&uuid_user(1), Box::from([(11, 21), (21, 31)]));
            let first_user_cache = cache_many_users_many_items
                .get_user_entry_mut(&uuid_user(1))
                .unwrap();
            assert!(matches!(
                first_user_cache.get_state(),
                PartialCacheState::Full
            ));
            assert_eq!(first_user_cache.len(), 2);
        }
    }
}
