use sea_orm::{DatabaseConnection, DatabaseTransaction, DbErr, TransactionTrait};

#[path = "./users.repo.rs"]
pub mod users;

#[path = "./containers.repo.rs"]
pub mod containers;

#[path = "./currencies.repo.rs"]
pub mod currencies;

#[path = "./currency_rate_datum.repo.rs"]
pub mod currency_rate_datum;

/**
A wrapped version of the ``DatabaseTransaction`` from seaorm.
This struct follows the RAII pattern. This transaction will default to rollback when out of scope.
It is recommended when being used as parameters of a function, the function consumes this transaction.
The transaction should be returned to the caller upon success, and be consumed when failed.
*/
pub struct TransactionWithCallback<'a> {
    db_txn: DatabaseTransaction,
    callbacks: Vec<Box<dyn FnMut() + 'a>>,
}

impl<'a> TransactionWithCallback<'a> {
    pub fn new(
        db_txn: DatabaseTransaction,
        callbacks: Vec<Box<dyn FnMut() + 'a>>,
    ) -> TransactionWithCallback<'a> {
        TransactionWithCallback { callbacks, db_txn }
    }
    pub async fn from_db_conn(
        db_conn: &DatabaseConnection,
        callbacks: Vec<Box<dyn FnMut() + 'a>>,
    ) -> Result<TransactionWithCallback<'a>, DbErr> {
        let db_txn_raw = db_conn.begin().await?;
        Ok(Self::new(db_txn_raw, callbacks))
    }
    pub fn get_db_txn(&self) -> &DatabaseTransaction {
        &self.db_txn
    }
    pub fn add_callback(&mut self, callback: Box<dyn FnMut() + 'a>) {
        self.callbacks.push(callback);
    }
    pub async fn rollback(self) {
        self.db_txn
            .rollback()
            .await
            .expect("Error while rolling back database transaction.");
    }
    pub async fn commit(mut self) {
        self.db_txn
            .commit()
            .await
            .expect("Database transaction commit failure.");
        for f in self.callbacks.iter_mut() {
            f();
        }
    }
}
