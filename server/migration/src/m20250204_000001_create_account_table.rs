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
        manager
            .create_table(
                Table::create()
                    .table(Account::Table)
                    .col(
                        ColumnDef::new(Account::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Account::Name).string().not_null())
                    .col(ColumnDef::new(Account::OwnerId).uuid().not_null())
                    .col(
                        ColumnDef::new(Account::CreationDate)
                            .date_time()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("account")
                            .take()
                            .from(Account::Table, Account::OwnerId)
                            .to(User::Table, User::Id),
                    )
                    .to_owned(),
            )
            .await
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
    Id,
    OwnerId,
    CreationDate,
    Name,
}
