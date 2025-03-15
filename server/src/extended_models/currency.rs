use crate::{
    entities::currency::{self, Model},
    extractors::auth_user::AuthUser,
};
use sea_orm::ActiveValue;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

#[derive(Serialize, Deserialize, TS, Clone, Debug, PartialEq, Copy)]
pub struct CurrencyId(pub Uuid);

/** This enum represent a currency that already exists in database (saved) */
#[derive(Clone, Debug)]
pub enum Currency {
    Base {
        id: CurrencyId,
        name: String,
        owner: AuthUser,
        ticker: String,
    },
    Normal {
        id: CurrencyId,
        name: String,
        owner: AuthUser,
        ticker: String,
        fallback_rate_amount: String,
        fallback_rate_currency_id: CurrencyId,
    },
}

/** This enum represent the action to save a currency to a database, therefore the ID is not available in the enum. */
#[derive(Clone, Debug)]
pub enum CreateCurrencyAction {
    Base {
        name: String,
        owner: AuthUser,
        ticker: String,
    },
    Normal {
        name: String,
        owner: AuthUser,
        ticker: String,
        fallback_rate_amount: String,
        fallback_rate_currency_id: CurrencyId,
    },
}

impl From<CreateCurrencyAction> for currency::ActiveModel {
    fn from(value: CreateCurrencyAction) -> Self {
        match value {
            CreateCurrencyAction::Base {
                name,
                owner,
                ticker,
            } => currency::ActiveModel {
                id: ActiveValue::Set(uuid::Uuid::new_v4()),
                name: ActiveValue::Set(name.to_string()),
                owner_id: ActiveValue::Set(owner.0),
                ticker: ActiveValue::Set(ticker.to_string()),
                fallback_rate_amount: ActiveValue::Set(None),
                fallback_rate_currency_id: ActiveValue::Set(None),
                is_base: ActiveValue::Set(true),
            },
            CreateCurrencyAction::Normal {
                name,
                owner,
                ticker,
                fallback_rate_amount,
                fallback_rate_currency_id,
            } => currency::ActiveModel {
                id: ActiveValue::Set(uuid::Uuid::new_v4()),
                name: ActiveValue::Set(name.to_string()),
                owner_id: ActiveValue::Set(owner.0),
                ticker: ActiveValue::Set(ticker.to_string()),
                fallback_rate_amount: ActiveValue::Set(Some(fallback_rate_amount)),
                fallback_rate_currency_id: ActiveValue::Set(Some(fallback_rate_currency_id.0)),
                is_base: ActiveValue::Set(false),
            },
        }
    }
}

impl CreateCurrencyAction {
    pub fn is_base(&self) -> bool {
        match self {
            CreateCurrencyAction::Base { .. } => true,
            CreateCurrencyAction::Normal { .. } => false,
        }
    }
    pub fn get_owner(&self) -> &AuthUser {
        match self {
            CreateCurrencyAction::Normal { owner, .. }
            | CreateCurrencyAction::Base { owner, .. } => owner,
        }
    }
    pub fn into_domain(self, db_id: uuid::Uuid) -> Currency {
        match self {
            CreateCurrencyAction::Base {
                name,
                owner,
                ticker,
            } => Currency::Base {
                id: CurrencyId(db_id),
                name,
                owner,
                ticker,
            },
            CreateCurrencyAction::Normal {
                name,
                owner,
                ticker,
                fallback_rate_amount,
                fallback_rate_currency_id,
            } => Currency::Normal {
                id: CurrencyId(db_id),
                name,
                owner,
                ticker,
                fallback_rate_amount,
                fallback_rate_currency_id,
            },
        }
    }
}

impl From<Model> for Currency {
    fn from(value: Model) -> Self {
        match value.is_base {
            true => Currency::Base {
                id: CurrencyId(value.id),
                name: value.name.to_string(),
                owner: AuthUser(value.owner_id),
                ticker: value.ticker.to_string(),
            },
            false => Currency::Normal {
                id: CurrencyId(value.id),
                name: value.name.to_string(),
                owner: AuthUser(value.owner_id),
                ticker: value.ticker.to_string(),
                fallback_rate_amount: value
                    .fallback_rate_amount
                    .clone()
                    .expect("Currency Domain Enum failure 1"),
                fallback_rate_currency_id: CurrencyId(
                    value
                        .fallback_rate_currency_id
                        .expect("Currency Domain Enum failure 2"),
                ),
            },
        }
    }
}
