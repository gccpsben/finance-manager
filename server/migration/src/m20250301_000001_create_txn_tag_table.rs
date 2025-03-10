use super::m20220101_000002_create_user_table::User;
use sea_orm_migration::prelude::*;

pub struct Migration;

const OWNER_TAG_NAME_UNIQUE_INDEX_NAME: &str = "owner-txn_tag-name";

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250301_000001_create_txn_tag_table"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let mut main_table = Table::create();
        let mut table = main_table.table(TxnTag::Table);

        {
            table = table.col(ColumnDef::new(TxnTag::Id).uuid().not_null().primary_key());
        }

        {
            table = table
                .col(ColumnDef::new(TxnTag::Name).string().not_null())
                .index(
                    Index::create()
                        .name(OWNER_TAG_NAME_UNIQUE_INDEX_NAME)
                        .table(TxnTag::Table)
                        .col(TxnTag::Name)
                        .col(TxnTag::OwnerId)
                        .unique(),
                );
        }

        {
            table = table.col(ColumnDef::new(TxnTag::OwnerId).uuid().not_null());

            table = table.foreign_key(
                ForeignKey::create()
                    .name("owner")
                    .take()
                    .from(TxnTag::Table, TxnTag::OwnerId)
                    .to(User::Table, User::Id),
            );
        }

        manager.create_table(table.to_owned()).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name(OWNER_TAG_NAME_UNIQUE_INDEX_NAME)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(Table::drop().table(TxnTag::Table).to_owned())
            .await
    }
}

#[derive(sea_orm::Iden)]
pub enum TxnTag {
    Table,
    Id,
    OwnerId,
    Name,
}
