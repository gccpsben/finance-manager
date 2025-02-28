use sea_orm_migration::prelude::*;
use super::m20220101_000002_create_user_table::User;

pub struct Migration;

const OWNER_NAME_UNIQUE_INDEX_NAME: &str = "owner-name-unique";
const OWNER_TICKER_UNIQUE_INDEX_NAME: &str = "owner-ticker-unique";

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250204_000002_create_currency_table"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {

        // Create table
        manager
            .create_table(
                Table::create()
                    .table(Currency::Table)
                    .col(
                        ColumnDef::new(Currency::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                    )
                    .col(
                        ColumnDef::new(Currency::Name)
                            .string()
                            .not_null()
                    )
                    .col(
                        ColumnDef::new(Currency::OwnerId)
                        .uuid()
                        .not_null()
                    )
                    .foreign_key(
                        ForeignKey::create()
                        .name("currency")
                        .take()
                        .from(Currency::Table, Currency::OwnerId)
                        .to(User::Table, User::Id)
                    )
                    .col(
                        ColumnDef::new(Currency::Ticker)
                        .string()
                        .not_null()
                    )
                    .col(
                        ColumnDef::new(Currency::IsBase)
                        .boolean()
                        .not_null()
                    )
                    .col(
                        ColumnDef::new(Currency::FallbackRateAmount)
                        .string()
                    )
                    .col(
                        ColumnDef::new(Currency::FallbackRateCurrencyId)
                        .uuid()
                    )
                    .foreign_key(
                        ForeignKey::create()
                        .name("currency_self_relation")
                        .take()
                        .from(Currency::Table, Currency::FallbackRateCurrencyId)
                        .to(Currency::Table, Currency::Id)
                    )
                    .check(
                        SimpleExpr::Custom("CASE WHEN fallback_rate_amount IS NOT NULL THEN NOT is_base ELSE is_base END".to_string())
                    )
                    .check(
                        SimpleExpr::Custom("CASE WHEN NOT is_base THEN fallback_rate_amount IS NOT NULL ELSE fallback_rate_amount IS NULL END".to_string())
                    )
                    .check(
                        SimpleExpr::Custom("CASE WHEN NOT is_base THEN fallback_rate_currency_id IS NOT NULL ELSE fallback_rate_currency_id IS NULL END".to_string())
                    )
                    .to_owned(),
            )
            .await?;

        // Create unique constrain
        {
            manager.create_index(
                Index::create()
                .name(OWNER_NAME_UNIQUE_INDEX_NAME)
                .table(Currency::Table)
                .col(Currency::Name)
                .col(Currency::OwnerId)
                .unique().take()
            ).await?;

            manager.create_index(
                Index::create()
                .name(OWNER_TICKER_UNIQUE_INDEX_NAME)
                .table(Currency::Table)
                .col(Currency::Ticker)
                .col(Currency::OwnerId)
                .unique().take()
            ).await?;
        };

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_index(Index::drop().if_exists().name(OWNER_NAME_UNIQUE_INDEX_NAME).to_owned()).await?;
        manager.drop_index(Index::drop().if_exists().name(OWNER_TICKER_UNIQUE_INDEX_NAME).to_owned()).await?;
        manager
            .drop_table(Table::drop().table(Currency::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
pub enum Currency {
    Table,
    Id,
    OwnerId,
    Name,
    Ticker,
    IsBase,
    FallbackRateAmount,
    FallbackRateCurrencyId,
}
