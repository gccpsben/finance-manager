#[path = "./users.route.rs"]
pub mod users;

pub mod bootstrap;

#[path = "./accounts.route.rs"]
pub mod accounts;

#[cfg(debug_assertions)]
#[path = "./dev.route.rs"]
pub mod dev;

#[path = "./currencies.route.rs"]
pub mod currencies;

#[path = "./currency_rate_datums.route.rs"]
pub mod currency_rate_datums;

#[path = "./txn_tags.route.rs"]
pub mod txn_tags;

#[path = "./txns.route.rs"]
pub mod txns;

#[macro_export]
macro_rules! derive_alias {
    ($($name:ident => #[derive($($derive:ident),*)] $(,)?)*) => {
        $(
            macro_rules! $name {
                ($i:item) => {
                    #[derive($($derive),*)]
                    $i
                }
            }
        )*
    }
}

#[macro_export]
macro_rules! inner_export_derive_alias {
    (
        $import_name:ident,
        $alias_name: ident,
        #[derive($($content:ident $(,)?)*)]
    ) => {
        #[macro_export]
        macro_rules! $import_name {
            () => {
                use $crate::derive_alias;
                derive_alias! {
                    $alias_name => #[derive($($content),*)]
                }
            };
        }
    }
}

#[macro_export]
macro_rules! export_derive_alias {
    (
        $import_name:ident,
        $alias_name: ident,
        #[derive($($content:ident $(,)?)*)]
    ) => {
        mod $import_name {
            pub use $crate::inner_export_derive_alias;
            inner_export_derive_alias!(
                $import_name,
                $alias_name,
                #[derive($($content),*)]
            );
            pub use $import_name;
        }
    }
}
