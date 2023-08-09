<template>
    <div id="topDiv">
        
        <div id="mainCell">
            <cell title="Transactions">
                <!-- <div style="background:red;">
                    <custom-table style="height:100%;" :columns="columns" :rows="dataWrappedTxns">
                        <template #headercell="headercell">
                            <strong>{{ headercell.currentColumn.label }}</strong>
                        </template>
                        <template #cell="cell">
                            <strong>{{ cell.cellValueReadonly }}</strong>
                        </template>
                    </custom-table>
                </div> -->
                {{ currentViewItems }}
            </cell>
        </div>

        <!-- <custom-table style="height:100%;" :columns="columns" :rows="dataWrappedTxns">
            <template #headercell="headercell">
                <strong>{{ headercell.currentColumn.label }}</strong>
            </template>
            <template #cell="cell">
                <strong>{{ cell.cellValueReadonly }}</strong>
            </template>
        </custom-table> -->
    </div>
</template>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap');

#topDiv
{
    padding:50px; box-sizing: border-box;
    overflow-x:hidden; .fullSize;
    font-family: 'Schibsted Grotesk', sans-serif;

    #mainCell { .fullSize; .bg(@backgroundDark); }
    
    #mainGrid
    {
        display:grid;
        padding:50px; box-sizing: border-box; gap:15px;
        .fullSize; grid-template-columns: 1fr 1fr 1fr 1fr;
        grid-template-rows:100px 250px 1fr 1fr;
        height:2000px;

        grid-template-areas: 
        'expensesPanel incomesPanel totalValuePanel netChangePanel' 
        '30dExpensesList 30dIncomesList ContainersList TotalValueGraph';

        .listItemTitle { color:gray; font-size:14px; overflow:hidden; white-space: nowrap; text-overflow: ellipsis; }
    }
}
</style>

<!-- Import types def. in setup script -->
<script lang="ts" setup>
import customTable from '@/components/custom-table.vue';
</script>

<script lang="ts">
import { useMainStore } from "@/stores/store";
import * as arrayHelper from "snippets/arrayHelper";

export default 
{
    data()
    {
        let store = useMainStore();
        
        let data = 
        {
            store: store,
            columns:
            [
                {
                    label: "Title",
                    field: "title",
                    width:"1fr",
                }
            ],
            itemsInPage: 5,
            page: 0,
            transactions: [] as any[],
        };
        return data;
    },
    watch:
    {
        "store.dashboardSummary.totalTransactionsCount": function() { this.prefill() }
    },
    methods:
    {
        prefill()
        {
            let prefill = (count:number, value:any) => { let a = new Array(count); for (let i=0; i<count; ++i) a[i] = value; return a; };
            this.transactions = prefill(this.store.dashboardSummary?.totalTransactionsCount ?? 0, null)
        }
    },
    computed:
    {
        currentViewItems()
        {
            let bins = arrayHelper.partition<any>(this.transactions, this.itemsInPage);
            let currentBin = bins[this.page];
            if (currentBin == undefined) return [];
            let lowerIndexToFetch = this.page * this.itemsInPage;
            let upperIndexToFetch = (this.page + 1) * this.itemsInPage - 1;
            upperIndexToFetch = Math.min(upperIndexToFetch, this.store.dashboardSummary?.totalTransactionsCount ?? 0);
            if (arrayHelper.count(currentBin, x => x == null) > 0) console.log(`Should fetch ${lowerIndexToFetch} to ${upperIndexToFetch}`);
            return currentBin;
        },

        async dataWrappedTxns()
        {

            // var output = [];
            // if (this.store.allTransactions.length < 10) return [];
            // for (var i = 0; i < 10; i++)
            // {
            //     output.push(
            //     {
            //         "data": this.store.allTransactions[i] 
            //     });
            // }
            // return output;
        }
    },
    mounted()
    {
        this.store.updateAll();
        this.prefill();
    }
}
</script>

