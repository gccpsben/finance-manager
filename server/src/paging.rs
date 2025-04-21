use serde::Deserialize;
use serde::Serialize;
use ts_rs::TS;

pub struct PagedContent<T: Clone> {
    pub page_size: u64,
    pub page_index: u64,
    pub items: Vec<T>,
    pub total_items: u64,
}

impl<T: Clone> PagedContent<T> {
    pub fn new(items: &[T], total_items: u64, page_index: u64, page_size: u64) -> Self {
        Self {
            items: Vec::from(items),
            total_items,
            page_size,
            page_index,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
#[derive(TS)]
#[ts(export)]
pub struct GenericPagingQuery {
    pub page_index: Option<u64>,
    pub page_size: Option<u64>,
}
