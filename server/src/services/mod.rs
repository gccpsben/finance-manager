use sea_orm::{DatabaseConnection, DatabaseTransaction};

#[path = "users.service.rs"]
pub mod users;

#[path = "accounts.service.rs"]
pub mod accounts;

#[path = "currencies.service.rs"]
pub mod currencies;

#[path = "currency_rate_datum.service.rs"]
pub mod currency_rate_datum;

#[path = "txn_tags.service.rs"]
pub mod txn_tags;

#[path = "txns.service.rs"]
pub mod txns;

type AsyncCallbackBox =
    Box<dyn FnOnce() -> std::pin::Pin<Box<dyn std::future::Future<Output = ()>>>>;

/**
A wrapped version of the ``DatabaseTransaction`` from seaorm.
This struct follows the RAII pattern. This transaction will default to rollback when out of scope.
It is recommended when being used as parameters of a function, the function consumes this transaction.
The transaction should be returned to the caller upon success, and be consumed when failed.
*/
pub struct TransactionWithCallback {
    db_txn: DatabaseTransaction,
    callbacks: Vec<AsyncCallbackBox>,
}

impl TransactionWithCallback {
    pub fn new(
        db_txn: DatabaseTransaction,
        callbacks: Vec<AsyncCallbackBox>,
    ) -> TransactionWithCallback {
        TransactionWithCallback { db_txn, callbacks }
    }
    pub async fn from_db_conn(
        db_conn: &DatabaseConnection,
        callbacks: Vec<AsyncCallbackBox>,
    ) -> Result<TransactionWithCallback, sea_orm::DbErr> {
        let db_txn_raw = sea_orm::TransactionTrait::begin(db_conn).await?;
        Ok(Self::new(db_txn_raw, callbacks))
    }
    pub fn get_db_txn(&self) -> &DatabaseTransaction {
        &self.db_txn
    }
    #[allow(unused)]
    pub fn add_callback(&mut self, callback: impl std::future::Future<Output = ()> + 'static) {
        self.callbacks.push(Box::new(|| Box::pin(callback)));
    }
    #[allow(unused)]
    pub async fn rollback(self) {
        self.db_txn
            .rollback()
            .await
            .expect("Error while rolling back database transaction.");
    }
    pub async fn commit(self) {
        self.db_txn
            .commit()
            .await
            .expect("Database transaction commit failure.");
        for f in self.callbacks {
            f().await;
        }
    }
}
