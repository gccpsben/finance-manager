use super::m20220101_000002_create_user_table::User;
use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250204_000001_create_container_table" // Make sure this matches with the file name
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    // Define how to apply this migration: Create the Bakery table.
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Container::Table)
                    .col(
                        ColumnDef::new(Container::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Container::Name).string().not_null())
                    .col(ColumnDef::new(Container::OwnerId).uuid().not_null())
                    .col(
                        ColumnDef::new(Container::CreationDate)
                            .date_time()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("container")
                            .take()
                            .from(Container::Table, Container::OwnerId)
                            .to(User::Table, User::Id),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Container::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
pub enum Container {
    Table,
    Id,
    OwnerId,
    CreationDate,
    Name,
}
