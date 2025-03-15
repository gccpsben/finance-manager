use super::m20220101_000002_create_user_table::User;
use crate::m20250204_000002_create_currency_table::Currency;
use sea_orm_migration::prelude::*;

pub struct Migration;

const OWNER_CURR_DATE_UNIQUE_INDEX_NAME: &str = "owner-ref_currency-date";

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250208_000001_currency_rate_datum"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let mut main_table = Table::create();
        let mut table = main_table.table(CurrencyRateDatum::Table);

        {
            table = table.col(
                ColumnDef::new(CurrencyRateDatum::Id)
                    .uuid()
                    .not_null()
                    .primary_key(),
            );
        }

        {
            table = table.col(
                ColumnDef::new(CurrencyRateDatum::Amount)
                    .string()
                    .not_null(),
            );
        }

        {
            table = table.col(
                ColumnDef::new(CurrencyRateDatum::RefCurrencyId)
                    .uuid()
                    .not_null(),
            );
            table = table.foreign_key(
                ForeignKey::create()
                    .name("refCurrencyId")
                    .take()
                    .from(CurrencyRateDatum::Table, CurrencyRateDatum::RefCurrencyId)
                    .to(Currency::Table, Currency::Id),
            );
        }

        {
            table = table.col(
                ColumnDef::new(CurrencyRateDatum::RefAmountCurrencyId)
                    .uuid()
                    .not_null(),
            );
            table = table.foreign_key(
                ForeignKey::create()
                    .name("refAmountCurrencyId")
                    .take()
                    .from(
                        CurrencyRateDatum::Table,
                        CurrencyRateDatum::RefAmountCurrencyId,
                    )
                    .to(Currency::Table, Currency::Id),
            );
        }

        {
            table = table.col(ColumnDef::new(CurrencyRateDatum::OwnerId).uuid().not_null());

            table = table.foreign_key(
                ForeignKey::create()
                    .name("owner")
                    .take()
                    .from(CurrencyRateDatum::Table, CurrencyRateDatum::OwnerId)
                    .to(User::Table, User::Id),
            );
        }

        {
            table = table
                .col(
                    ColumnDef::new(CurrencyRateDatum::Date)
                        .date_time()
                        .not_null(),
                )
                .index(
                    Index::create()
                        .name(OWNER_CURR_DATE_UNIQUE_INDEX_NAME)
                        .table(CurrencyRateDatum::Table)
                        .col(CurrencyRateDatum::RefCurrencyId)
                        .col(CurrencyRateDatum::Date)
                        .col(CurrencyRateDatum::OwnerId)
                        .unique(),
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
                    .name(OWNER_CURR_DATE_UNIQUE_INDEX_NAME)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(Table::drop().table(CurrencyRateDatum::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
pub enum CurrencyRateDatum {
    Table,
    Id,
    Amount,
    RefCurrencyId,
    RefAmountCurrencyId,
    OwnerId,
    Date,
}
