/**
 * This file contains helpers that allow quick
 * construction of environment for testings in each domain.
 *
 * All of these helpers will assert each API call with default assertions.
 */

import { PostContainerAPIClass } from "./container/classes.ts";
import { createPostContainerFunc } from './container/helpers.ts';
import { createPostTransactionFunc } from './transaction/helpers.ts';
import { PostCurrencyRateDatumAPIClass } from "./currency/classes.ts";
import { createPostCurrencyFunc, createPostCurrencyRateDatumFunc } from './currency/helpers.ts';
import { PostCurrencyAPIClass } from "./currency/classes.ts";
import { PostTxnAPIClass } from "./transaction/classes.ts";
import { randomUUID } from 'node:crypto';

export type SetupTxnsConCurrRatesArgs =
{
    token: string,
    containers: { name: string, _id: string }[],
    currencies:
    (
        { isBase: true, name: string, ticker: string, _id: string } |
        { isBase: false, name: string, ticker: string, fallbackRateCurrId: string, fallbackRateAmount: string, _id: string }
    )[],
    rates:
    {
        date: number,
        refCurrencyId: string,
        refAmountCurrId: string,
        refAmount: string,
    }[],
    transactions:
    {
        date: number,
        fragments:
        {
            from?: { amount: string, containerId: string, currencyId: string } | undefined,
            to?: { amount: string, containerId: string, currencyId: string } | undefined
        }[],

        /** defaults to false. */
        excludedFromExpensesIncomes?: boolean | undefined,

        /** defaults to a random UUID. */
        title?: string | undefined
    }[]
};
/**
 * A shortcut function to setup containers, transactions, currencies and rates.
 * All "_id" of all of the entities provided are to cross-reference other entities in the parameters.
 */
export const setupTxnsConCurrRates = async (
    { token, containers, currencies, rates, transactions } :
    SetupTxnsConCurrRatesArgs
) =>
{
    // Post containers
    const containersMap: { [_id: string]: { name: string, containerId: string } } = {};
    for (const container of containers)
    {
        const postBody = { name: container.name } as PostContainerAPIClass.RequestDTO;
        const containerRes = await createPostContainerFunc()
        ({ token: token, asserts: 'default', body: ['EXPECTED', postBody] });
        containersMap[container._id] = { name: container.name, containerId: containerRes.parsedBody?.id! };
    }

    // Post currencies
    const currenciesMap: { [_id: string]: { currencyId: string } } = {};
    for (const currency of currencies)
    {
        const postBody = (() =>
        {
            if (currency.isBase) return { name: currency.name, ticker: currency.ticker };
            return {
                fallbackRateAmount: currency.fallbackRateAmount,
                fallbackRateCurrencyId: currenciesMap[currency.fallbackRateCurrId].currencyId,
                name: currency.name,
                ticker: currency.ticker
            }
        })() as PostCurrencyAPIClass.RequestDTO;

        const currencyRes = await createPostCurrencyFunc()
        ({ token: token, asserts: 'default', body: ["EXPECTED", postBody] });

        currenciesMap[currency._id] = { currencyId: currencyRes.parsedBody!.id };
    }

    // Post currency rates
    for (const rate of rates)
    {
        const postBody =
        {
            amount: rate.refAmount,
            date: rate.date,
            refAmountCurrencyId: currenciesMap[rate.refAmountCurrId].currencyId,
            refCurrencyId: currenciesMap[rate.refCurrencyId].currencyId
        } as PostCurrencyRateDatumAPIClass.RequestDTO['datums'][0];

        await createPostCurrencyRateDatumFunc()
        ({ token: token, asserts: 'default', body: ["EXPECTED", { datums: [postBody] }] });
    }

    // Post transactions
    for (const txn of transactions)
    {
        const postBody =
        {
            excludedFromIncomesExpenses: txn.excludedFromExpensesIncomes ?? false,
            fileIds: [],
            fragments: (() =>
            {
                const fragments: PostTxnAPIClass.RequestDTOClass['transactions'][0]['fragments'] = [];
                for (const fragment of txn.fragments)
                {
                    fragments.push(
                    {
                        fromAmount: fragment.from?.amount ?? null,
                        fromContainer: fragment.from === undefined ? null : containersMap[fragment.from.containerId].containerId,
                        fromCurrency: fragment.from === undefined ? null : currenciesMap[fragment.from.currencyId].currencyId,
                        toAmount: fragment.to?.amount ?? null,
                        toContainer: fragment.to === undefined ? null : containersMap[fragment.to.containerId].containerId,
                        toCurrency: fragment.to === undefined ? null : currenciesMap[fragment.to.currencyId].currencyId,
                    });
                }
                return fragments;
            })(),
            tagIds: [],
            title: txn.title ?? randomUUID(),
            creationDate: txn.date,
            description: randomUUID()
        } as PostTxnAPIClass.RequestDTOClass['transactions'][0];

        await createPostTransactionFunc()
        ({ token: token, asserts: 'default', body: ["EXPECTED", { transactions: [postBody] }] });
    }

    return {
        containersMap,
        currenciesMap
    }
}