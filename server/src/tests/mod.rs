#[path = "./account.test.rs"]
pub mod account_tests;
#[path = "./currency.test.rs"]
pub mod currency_tests;
#[path = "./user.test.rs"]
pub mod user_tests;

#[path = "./currency_rate_datum.test.rs"]
pub mod currency_rate_datum;

#[path = "./txn_tag.test.rs"]
pub mod txn_tag;

#[path = "./linear_interpolator.test.rs"]
pub mod linear_interpolator;

#[path = "./neighbors.test.rs"]
pub mod neighbors;

#[path = "./txn.test.rs"]
pub mod txn;

#[path = "./cache_base.test.rs"]
pub mod cache_base;

#[cfg(test)]
pub mod commons;
