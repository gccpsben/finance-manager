<template>
    <div id="topDiv">
        
        <div id="mainCell">
            <!-- <cell title="Transactions">
                <div class="fullSize" style="display:grid; grid-template-rows: repeat(20,1fr);">
                    <div class="row tight" v-for="item in currentViewItems">
                        <div class="tight yCenter" style="font-size:14px;">{{ item.title }}</div>
                        <div class="tight yCenter" style="font-size:14px;">{{ store.getDateAge(item.date) }} ago</div>
                        <div class="tight yCenter" style="font-size:14px;">{{ item.changeInValue.toFixed(1) }}</div>
                    </div>
                </div>
            </cell> -->
            <grid-shortcut id="panel" style="padding:15px; box-sizing:border-box; height:100%; gap:15px;" columns="minmax(0,1fr)" rows="auto minmax(0,1fr)">
                <grid-shortcut rows="1fr" columns="1fr auto">
                    <h2 class="panelTitle">Transactions</h2>
                    <div class="pageSelector">
                        <h2 class="numbersPanelTitle variantTab" style="font-size:14px; display:inline; padding-right:15px;">
                            {{ `Showing ${lowerIndexToFetch+1} - ${upperIndexToFetch+1} of ${transactions?.length ?? 0}` }}
                        </h2>
                        <fa-icon @click="previousPage()" :class="{'disabled': !isPreviousArrowAllowed}" id="previousArrow" icon="fa-solid fa-chevron-left"></fa-icon>
                        <!-- <h2 id="currentPage" class="numbersPanelTitle variantTab">{{ page + 1 }}</h2> -->
                        <input size="1" v-int-only v-model.lazy="pageReadable">
                        <fa-icon @click="nextPage()" :class="{'disabled': !isNextArrowAllowed}" id="nextArrow" icon="fa-solid fa-chevron-right"></fa-icon>
                    </div>
                </grid-shortcut>
                <div class="rel">
                    <div class="fullSize abs" :class="{'darkened': isLoading}"
                    style="display:grid; grid-template-rows: repeat(20,1fr);">
                        <div class="row tight" style="font-size:14px;" v-for="item in currentViewItems">
                            <div class="tight yCenter">{{ item?.title }}</div>
                            <div class="tight yCenter">{{ store.getDateAge(item?.date) }} ago</div>
                            <div class="tight yCenter">{{ getTxnTypeName(item?.typeID) }}</div>
                            <div class="tight yCenter">{{ item?.changeInValue.toFixed(1) }}</div>
                            <!-- <div class="tight yCenter">
                                <div v-if="item?.to" class="debug fullSize"></div>
                            </div> -->
                            <div class="tight yCenter">
                                <div :class="{'botChip': item?.isFromBot}">{{ item?.isFromBot ? 'Bot' : '' }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </grid-shortcut>
        </div>

        <!-- <div v-for="item in currentViewItems">
            {{item}}
        </div> -->

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

#panel
{
    .fullSize; .bg(@backgroundDark);
    box-sizing:border-box;
    .panelTitle { text-align:start; color:gray; font-size:14px; .tight; display:inline; }
    .pageSelector  { color:gray !important; transform: translateY(-3px); }
    #nextArrow, #previousArrow { margin:0px; display:inline; font-size:14px; cursor: pointer; }
    #currentPage { .horiMargin(15px); .vertMargin(5px); font-size:16px; min-width:15px; display:inline-block; text-align: center; }
    .disabled { pointer-events: none; opacity:0.2; }
}

.darkened
{
    opacity: 0.4;
}

#topDiv
{
    padding:50px; box-sizing: border-box;
    overflow-x:hidden; .fullSize;
    font-family: 'Schibsted Grotesk', sans-serif;

    .botChip
    {
        color: #a38ffd;
        background:#282055;
        width: fit-content; height: fit-content;
        padding:5px; cursor:pointer;
        border-radius: 5px;
    }

    input 
    {
        color:white;
        background:transparent; 
        border:1px solid #252525;
        width:30px;
        padding:0px; .horiMargin(5px);
        text-align: center;
    }

    .row
    {
        background:#050505; color:gray;
        box-sizing: border-box; border-bottom:1px solid #151515;
        display:grid; grid-template-columns: 250px 100px 150px 150px 150px 1fr 1fr;
        grid-template-rows: 1fr; .horiPadding(15px); cursor:pointer;

        &:hover 
        {
            background: @focusDark;
            color: @focus;
        }

        .rowContent
        {
            display:grid; box-sizing: border-box;
            grid-template-columns: 1fr 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            
        }
    }

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
import type { transactions } from '@prisma/client';
import * as arrayHelper from "snippets/arrayHelper";
import vIntOnly from "snippets/vite-vue-ts/directives/vIntegerOnly";

export default 
{
    directives: {'int-only': vIntOnly},
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
                    width:"1fr"
                }
            ],
            itemsInPage: 20,
            page: 0,
            transactions: [] as any[],
            isLoading: false,
            currentViewItems: [] as any[]
        };
        return data;
    },
    watch:
    {
        // page:
        // {
        //     immediate: true,
        //     handler: async function () 
        //     {
        //         let bins = arrayHelper.partition<any>(this.transactions, this.itemsInPage);
        //         let currentBin = bins[this.page ?? 0];
        //         if (arrayHelper.count(currentBin, x => x == null) > 0) await this.fetchViewItems(); 
        //         await this.updateViewItems(); 
        //     }
        // },
        // transactions:
        // {
        //     immediate: true,
        //     handler: async function () { await this.updateViewItems(); }
        // },
        "store.dashboardSummary.totalTransactionsCount": function() { this.prefill() },
    },
    methods:
    {
        prefill()
        {
            let prefill = (count:number, value:any) => { let a = new Array(count); for (let i=0; i<count; ++i) a[i] = value; return a; };
            this.transactions = prefill(this.store.dashboardSummary?.totalTransactionsCount ?? 0, null)
        },
        // async update(start:number, end:number)
        // {
        //     this.isLoading = true;
        //     let allTxns:any[] = (await (this.store.authGet(`/api/finance/transactions?start=${start}&end=${end}`))!)!.data;
        //     for (let i = 0; i < allTxns.length; i++) this.transactions[start + i] = allTxns[i];
        //     this.isLoading = false;
        // },
        getTxnType(txn: transactions)
        {
            if (txn.from && txn.to) return "Transfer";
            else if (txn.from && !txn.to) return "Expense";
            else return "Income";
        },
        previousPage() { this.page--; },
        nextPage() { this.page++; },
        getTxnTypeName(typePubID:string)
        {
            return this.store?.txnTypes?.find(x => x.pubID == typePubID)?.name ?? "<undefined>";
        },
        // async fetchViewItems()
        // {
        //     await this.update(this.lowerIndexToFetch, this.upperIndexToFetch);   
        // },
        // async updateViewItems()
        // {
        //     let bins = arrayHelper.partition<any>(this.transactions, this.itemsInPage);
        //     let currentBin = bins[this.page];
        //     console.log("updating");
        //     if (currentBin == undefined) return;
        //     // if (arrayHelper.count(currentBin, x => x == null) > 0) await this.update(this.lowerIndexToFetch, this.upperIndexToFetch);
        //     this.currentViewItems = currentBin;
        // }
    },
    computed:
    {
        lowerIndexToFetch() { return this.page * this.itemsInPage },
        upperIndexToFetch() { return (this.page + 1) * this.itemsInPage - 1 },
        isPreviousArrowAllowed() { return this.page != 0 },
        isNextArrowAllowed() { return this.page * this.itemsInPage != this.transactions.length; },
        pageReadable:
        {
            get() { return this.page + 1; },
            set(value:any) { this.page = value - 1; }
        },
        // currentViewItems() 
        // {
        //     // if (this.isLoading) return;
        //     let bins = arrayHelper.partition<any>(this.transactions, this.itemsInPage);
        //     let currentBin = bins[this.page];
        //     if (currentBin == undefined) return;
        //     // this.upperIndexToFetch = Math.min(this.upperIndexToFetch, this.store.dashboardSummary?.totalTransactionsCount ?? 0);
        //     // if (arrayHelper.count(currentBin, x => x == null) > 0) this.update(this.lowerIndexToFetch, this.upperIndexToFetch);
        //     return currentBin;
        // }
    },
    mounted()
    {
        this.store.updateAll();
        this.prefill();
        
        // setTimeout(() => 
        // {
        //     if (this.store.dashboardSummary.totalTransactionsCount >= 50) this.update(0,50);
        // }, 1000);
    }
}
</script>

