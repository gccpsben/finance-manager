use crate::m20250301_000001_create_txn_tag_table::TxnTag;
use crate::m20250315_000002_create_txn_table::Txn;
use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250409_000001_txn_txn_tags_mapping"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create a table for Many to Many relationship (each txn has multiple tags)
        let mut mn_table = Table::create();
        let mut table = mn_table.table(TxnTxnTagMapping::Table);

        table = table.col(ColumnDef::new(TxnTxnTagMapping::OwnerId).uuid().not_null());
        table = table.col(ColumnDef::new(TxnTxnTagMapping::TagId).uuid().not_null());
        table = table.col(ColumnDef::new(TxnTxnTagMapping::TxnId).uuid().not_null());
        table = table.primary_key(
            Index::create()
                .col(TxnTxnTagMapping::OwnerId)
                .col(TxnTxnTagMapping::TagId)
                .col(TxnTxnTagMapping::TxnId),
        );
        table = table.foreign_key(
            ForeignKey::create()
                .name("txn")
                .take()
                .from(
                    TxnTxnTagMapping::Table,
                    (TxnTxnTagMapping::OwnerId, TxnTxnTagMapping::TxnId),
                )
                .to(Txn::Table, (Txn::OwnerId, Txn::Id)),
        );
        table = table.foreign_key(
            ForeignKey::create()
                .name("tag")
                .take()
                .from(
                    TxnTxnTagMapping::Table,
                    (TxnTxnTagMapping::OwnerId, TxnTxnTagMapping::TagId),
                )
                .to(TxnTag::Table, (TxnTag::OwnerId, TxnTag::Id)),
        );
        manager.create_table(table.to_owned()).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(TxnTxnTagMapping::Table).to_owned())
            .await
    }
}

#[derive(sea_orm::Iden)]
pub enum TxnTxnTagMapping {
    Table,
    OwnerId,
    TxnId,
    TagId,
}
