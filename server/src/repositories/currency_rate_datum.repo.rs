use crate::{
    caches::currency_rate_datum::CurrencyRateDatumCache, entities::currency_rate_datum,
    repositories::TransactionWithCallback,
};
use sea_orm::{ActiveValue, DbErr, EntityTrait};
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct CurrencyRateDatumDomain {
    pub id: Uuid,
    pub amount: String,
    pub ref_currency_id: Uuid,
    pub ref_amount_currency_id: Uuid,
    pub owner: Uuid,
    pub date: i32,
}

#[derive(Clone, Debug)]
pub struct CreateCurrencyRateDatumDomain {
    pub amount: String,
    pub ref_currency_id: Uuid,
    pub ref_amount_currency_id: Uuid,
    pub owner: Uuid,
    pub date: i32,
}

impl CreateCurrencyRateDatumDomain {
    pub fn to_domain(&self, db_id: uuid::Uuid) -> CurrencyRateDatumDomain {
        CurrencyRateDatumDomain {
            id: db_id,
            amount: self.amount.to_string(),
            owner: self.owner,
            ref_amount_currency_id: self.ref_amount_currency_id,
            ref_currency_id: self.ref_currency_id,
            date: self.date,
        }
    }
}

impl From<CreateCurrencyRateDatumDomain> for currency_rate_datum::ActiveModel {
    fn from(value: CreateCurrencyRateDatumDomain) -> Self {
        Self {
            id: ActiveValue::Set(uuid::Uuid::new_v4()),
            owner_id: ActiveValue::Set(value.owner),
            amount: ActiveValue::Set(value.amount),
            ref_currency_id: ActiveValue::Set(value.ref_currency_id),
            ref_amount_currency_id: ActiveValue::Set(value.ref_amount_currency_id),
            date: ActiveValue::Set(value.date),
        }
    }
}

pub async fn create_currency_rate_datum<'a>(
    datum: CreateCurrencyRateDatumDomain,
    db_txn: TransactionWithCallback<'a>,
    cache: &mut CurrencyRateDatumCache,
) -> Result<(uuid::Uuid, TransactionWithCallback<'a>), DbErr> {
    let create_datum_active_record: currency_rate_datum::ActiveModel = datum.clone().into();
    let insert_result = currency_rate_datum::Entity::insert(create_datum_active_record)
        .exec(db_txn.get_db_txn())
        .await;

    match insert_result {
        Ok(model) => {
            cache.register_item(datum.to_domain(model.last_insert_id));
            Ok((model.last_insert_id, db_txn))
        }
        Err(db_err) => Err(db_err),
    }
}
