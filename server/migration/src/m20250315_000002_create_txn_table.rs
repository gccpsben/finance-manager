use crate::m20220101_000002_create_user_table::User;
use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250315_000002_create_txn_table"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let mut main_table = Table::create();
        let mut table = main_table.table(Txn::Table);

        table = table.col(ColumnDef::new(Txn::Id).uuid().not_null());
        table = table.col(ColumnDef::new(Txn::OwnerId).uuid().not_null());
        table = table.primary_key(Index::create().col(Txn::Id).col(Txn::OwnerId));
        table = table.foreign_key(
            ForeignKey::create()
                .name("account")
                .take()
                .from(Txn::Table, Txn::OwnerId)
                .to(User::Table, User::Id),
        );

        table = table.col(ColumnDef::new(Txn::Date).date_time().not_null());
        table = table.col(ColumnDef::new(Txn::Title).string().not_null());
        table = table.col(ColumnDef::new(Txn::Description).string().not_null());

        manager.create_table(table.to_owned()).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Txn::Table).to_owned())
            .await
    }
}

#[derive(sea_orm::Iden)]
pub enum Txn {
    Table,
    Id,
    OwnerId,
    Date,
    Title,
    Description,
}
