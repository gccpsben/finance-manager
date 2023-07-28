<template>
    <div id="topDiv">
        
        <div id="mainCell">
            <cell title="Transactions">
                <div style="background:red;">
                    <custom-table style="height:100%;" :columns="columns" :rows="dataWrappedTxns">
                        <template #headercell="headercell">
                            <strong>{{ headercell.currentColumn.label }}</strong>
                        </template>
                        <template #cell="cell">
                            <strong>{{ cell.cellValueReadonly }}</strong>
                        </template>
                    </custom-table>
                </div>
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

    #mainCell
    {
        .fullSize;
        .bg(@backgroundDark);
    }
    
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

export default 
{
    data()
    {
        var store = useMainStore();
        return {
            store: store,
            columns:
            [
                {
                    label: "Title",
                    field: "title",
                    width:"1fr",
                }
            ]
        };
    },
    computed:
    {
        dataWrappedTxns()
        {
            var output = [];
            if (this.store.allTransactions.length < 10) return [];
            for (var i = 0; i < 10; i++)
            {
                output.push(
                {
                    "data": this.store.allTransactions[i] 
                });
            }
            return output;
        }
    },
    mounted()
    {
        this.store.updateAll();
    }
}
</script>

