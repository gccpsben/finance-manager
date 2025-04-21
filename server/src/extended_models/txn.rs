use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

#[derive(Serialize, Deserialize, TS, Clone, Debug, PartialEq, Copy, Hash, Eq)]
pub struct TxnId(pub Uuid);
