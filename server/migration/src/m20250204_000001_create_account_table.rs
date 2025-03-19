use super::m20220101_000002_create_user_table::User;
use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250204_000001_create_account_table"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let mut main_table = Table::create();
        let mut table = main_table.table(Account::Table);

        table = table.col(ColumnDef::new(Account::Id).uuid().not_null());
        table = table.col(ColumnDef::new(Account::OwnerId).uuid().not_null());
        table = table.primary_key(Index::create().col(Account::Id).col(Account::OwnerId));
        table = table.foreign_key(
            ForeignKey::create()
                .name("account")
                .take()
                .from(Account::Table, Account::OwnerId)
                .to(User::Table, User::Id),
        );

        table = table.col(ColumnDef::new(Account::CreationDate).date_time().not_null());
        table = table.col(ColumnDef::new(Account::Name).string().not_null());

        manager.create_table(table.to_owned()).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Account::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
pub enum Account {
    Table,
    OwnerId,
    Id,
    CreationDate,
    Name,
}
