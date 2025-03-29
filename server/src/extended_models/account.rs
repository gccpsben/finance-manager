use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

#[derive(Serialize, Deserialize, TS, Clone, Debug, PartialEq, Copy)]
pub struct AccountId(pub Uuid);
