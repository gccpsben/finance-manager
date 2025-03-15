use super::m20220101_000002_create_user_table::User;
use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250203_000001_create_token_table"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(AccessToken::Table)
                    .col(
                        ColumnDef::new(AccessToken::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(AccessToken::UserId).uuid().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("access_token_user")
                            .take()
                            .from(AccessToken::Table, AccessToken::UserId)
                            .to(User::Table, User::Id),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AccessToken::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
pub enum AccessToken {
    Table,
    Id,
    UserId,
}
