<template>
    <div id="topDiv">

        <view-title :title="'Transactions'"></view-title>
        
        <network-pagination id="mainCell" style="height:calc(100svh - 190px);" :updator="updator" :total-items="store?.dashboardSummary?.totalTransactionsCount ?? 0"
        ref="pagination" v-slot="props" :itemsInPage="20" :initialItems="100" v-model:currentPage="currentPage">

            <grid-shortcut id="panel" style="padding:15px; box-sizing:border-box; gap:15px;" columns="minmax(0,1fr)" rows="auto minmax(0,1fr)">
                <grid-shortcut rows="1fr" columns="1fr auto">
                    <h2 class="panelTitle">All Transactions</h2>
                    <div class="pageSelector">
                        <h2 class="numbersPanelTitle variantTab" style="font-size:14px; display:inline; padding-right:15px;">
                            {{ `Showing ${props.bounds.lower + 1} - ${props.bounds.upper + 1} of ${props.totalItems}` }}
                        </h2>
                        <fa-icon @click="props.previous()" id="previousArrow" icon="fa-solid fa-chevron-left"></fa-icon>
                        <input type="number" size="1" v-int-only v-model.lazy="pageReadable"> 
                        <fa-icon @click="props.next()" id="nextArrow" icon="fa-solid fa-chevron-right"></fa-icon>
                    </div>
                </grid-shortcut> 
                <div class="rel">
                    <div class="fullSize abs" :class="{'darkened': props.isLoading}"
                    style="display:grid; grid-template-rows: repeat(20,1fr);">
                        <div class="row tight" style="font-size:14px;" v-for="item in props.pageItems">
                            <div v-area="'txnName'" class="tight yCenter ellipsisContainer">
                                <div>{{ item?.title }}</div>
                            </div>
                            <div v-area="'txnAge'" class="tight yCenter ellipsisContainer">
                                <div>{{ store.getDateAge(item?.date) }} ago</div>
                            </div>
                            <div v-area="'txnType'" class="tight yCenter ellipsisContainer">
                                <div>{{ getTxnTypeName(item?.typeID) }}</div>
                            </div>
                            <div v-area="'txnValueChange'" class="tight yCenter consoleFont ellipsisContainer" 
                            :class="{'disabled': item?.changeInValue == 0}">
                                <div>{{ formatChangeInValue(item?.changeInValue) }}</div>
                            </div>
                            <div v-area="'txnFrom'" class="tight yCenter xRight ellipsisContainer">
                                <div v-if="item?.from">{{ getContainerName(item?.from.containerID) }}</div>
                            </div>
                            <div v-area="'arrowIcon'" class="center">
                                <fa-icon icon="fa-solid fa-arrow-right"></fa-icon>
                            </div>
                            <div v-area="'txnTo'" class="tight yCenter xLeft ellipsisContainer">
                                <div v-if="item?.to">{{ getContainerName(item?.to.containerID) }}</div>
                            </div>
                            <div v-area="'chips'" class="tight yCenter">
                                <div :class="{'botChip': item?.isFromBot}">{{ item?.isFromBot ? 'Bot' : '' }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </grid-shortcut>

        </network-pagination>

    </div>
</template>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';

.debug2 { background:blue; border:1px solid black; }

#panel
{
    .fullSize; box-sizing:border-box;
    .panelTitle { text-align:start; color:gray; font-size:14px; .tight; display:inline; }
    .pageSelector  { color:gray !important; transform: translateY(-3px); }
    #nextArrow, #previousArrow { margin:0px; display:inline; font-size:14px; cursor: pointer; }
    #currentPage { .horiMargin(15px); .vertMargin(5px); font-size:16px; min-width:15px; display:inline-block; text-align: center; }
    .disabled { pointer-events: none; opacity:0.2; }
}

.ellipsisContainer
{
    overflow:hidden; display:flex;
    & > div { overflow:hidden; height:fit-content; white-space: nowrap; text-overflow:ellipsis; }
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
    background-image: url('../assets/gradient.png');

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
        display:grid; 

        gap: 15px;
        grid-template-columns:  150fr   100px  150fr   50fr          150fr   50px      150fr 100fr;
        grid-template-areas:   'txnName txnAge txnType txnValueChange txnFrom arrowIcon txnTo chips';
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

        .txnName
        {
            overflow:hidden !important;
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

@media only screen and (max-width: 1400px) 
{
    .row
    {
        grid-template-columns:  150fr   100px  150fr   50fr           50fr 0px 0px 0px !important; 
        grid-template-areas:   'txnName txnAge txnType txnValueChange chips txnFrom arrowIcon txnTo' !important;
        grid-template-rows: 1fr; .horiPadding(15px); cursor:pointer;    
    }
}

</style>

<script lang="ts">
import { useMainStore } from "@/stores/store";
import type { transactions } from '@prisma/client';
import * as arrayHelper from "snippets/arrayHelper";
import vIntOnly from "snippets/vite-vue-ts/directives/vIntegerOnly";
import networkPagination from "@/networkPagination.vue";
import { ref } from "vue";
import vArea from "snippets/vite-vue-ts/directives/vArea";

export default 
{
    directives: {'int-only': vIntOnly, 'area': vArea},
    components: {'network-pagination':networkPagination},
    data()
    {
        let data = 
        {
            columns:
            [
                {
                    label: "Title",
                    field: "title",
                    width:"1fr"
                }
            ],
            store: useMainStore(),
            currentPage: 0
        };
        return data;
    },
    methods:
    {
        getTxnType(txn: transactions)
        {
            if (txn.from && txn.to) return "Transfer";
            else if (txn.from && !txn.to) return "Expense";
            else return "Income";
        },
        getTxnTypeName(typePubID:string)
        {
            return this.store?.txnTypes?.find(x => x.pubID == typePubID)?.name ?? "<undefined>";
        },
        async updator(start:number, count:number)
        {
            let allTxns:any[] = (await (this.store.authGet(`/api/finance/transactions?start=${start}&end=${start+count}`))!)!.data;
            return allTxns;
        },
        getContainerName(pubID: string)
        {
            return this.store?.containers?.find(x => x.pubID == pubID)?.name ?? "undefined";
        },
        formatChangeInValue(value:number)
        {
            if (value == undefined) return '';
            if (value == 0) return '~'
            if (value > 0) return `+${value.toFixed(1)}`;
            else return value.toFixed(1);
        }
    },
    computed:
    {
        pageReadable:
        {
            get() { return (this as any).currentPage + 1; },
            set(value:any) 
            { 
                let refs = (this as any).$refs as any;
                if (refs.pagination === undefined) return;
                (this as any).currentPage = value - 1; 
                // alert("setting page to " + this.currentPage);
                (refs.pagination as any).setPage((this as any).currentPage);
            }
        } as any
    },
    mounted()
    {
        this.store.updateAll();
    }
}
</script>

