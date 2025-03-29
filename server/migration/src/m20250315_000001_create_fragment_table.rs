use crate::{
    m20250204_000001_create_account_table::Account,
    m20250204_000002_create_currency_table::Currency, m20250315_000002_create_txn_table::Txn,
};

use super::m20220101_000002_create_user_table::User;
use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250315_000001_create_fragment_table"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let mut main_table = Table::create();
        let mut table = main_table.table(Fragment::Table);

        table = table.col(ColumnDef::new(Fragment::Id).uuid().not_null());
        table = table.col(ColumnDef::new(Fragment::OwnerId).uuid().not_null());
        table = table.primary_key(Index::create().col(Fragment::Id).col(Fragment::OwnerId));
        table = table.foreign_key(
            ForeignKey::create()
                .name("account")
                .take()
                .from(Fragment::Table, Fragment::OwnerId)
                .to(User::Table, User::Id),
        );

        // From Side
        {
            table = table
                .col(ColumnDef::new(Fragment::FromAccount).uuid())
                .foreign_key(
                    ForeignKey::create()
                        .name("from_account")
                        .take()
                        .from(Fragment::Table, (Fragment::FromAccount, Fragment::OwnerId))
                        .to(Account::Table, (Account::Id, Account::OwnerId)),
                );

            table = table.col(ColumnDef::new(Fragment::FromAmount).string());

            table = table
                .col(ColumnDef::new(Fragment::FromCurrencyId).uuid())
                .foreign_key(
                    ForeignKey::create()
                        .name("from_currency_id")
                        .take()
                        .from(
                            Fragment::Table,
                            (Fragment::FromCurrencyId, Fragment::OwnerId),
                        )
                        .to(Currency::Table, (Currency::Id, Currency::OwnerId)),
                );
        }

        // To Side
        {
            table = table
                .col(ColumnDef::new(Fragment::ToAccount).uuid())
                .foreign_key(
                    ForeignKey::create()
                        .name("to_account")
                        .take()
                        .from(Fragment::Table, (Fragment::ToAccount, Fragment::OwnerId))
                        .to(Account::Table, (Account::Id, Account::OwnerId)),
                );

            table = table.col(ColumnDef::new(Fragment::ToAmount).string());

            table = table
                .col(ColumnDef::new(Fragment::ToCurrencyId).uuid())
                .foreign_key(
                    ForeignKey::create()
                        .name("to_currency_id")
                        .take()
                        .from(Fragment::Table, (Fragment::ToCurrencyId, Fragment::OwnerId))
                        .to(Currency::Table, (Currency::Id, Account::OwnerId)),
                );
        }

        table = table
            .col(ColumnDef::new(Fragment::ParentTxn).uuid().not_null())
            .foreign_key(
                ForeignKey::create()
                    .name("parent_txn")
                    .take()
                    .from(Fragment::Table, (Fragment::ParentTxn, Fragment::OwnerId))
                    .to(Txn::Table, (Fragment::Id, Fragment::OwnerId)),
            );

        // TODO: add index ensuring at least either FROM / TO exists

        manager.create_table(table.to_owned()).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Fragment::Table).to_owned())
            .await
    }
}

#[derive(sea_orm::Iden)]
pub enum Fragment {
    Table,
    Id,
    OwnerId,
    FromAmount,
    FromCurrencyId,
    FromAccount,
    ToAmount,
    ToCurrencyId,
    ToAccount,
    ParentTxn,
}
