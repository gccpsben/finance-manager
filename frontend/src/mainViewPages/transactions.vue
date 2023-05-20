<template>
    <div id="topDiv">
        <custom-table style="height:100%;" :columns="columns" :rows="dataWrappedTxns">
            <template #headercell="headercell">
                <strong>{{ headercell.currentColumn.label }}</strong>
            </template>
            <template #cell="cell">
                <strong>{{ cell.cellValueReadonly }}</strong>
            </template>
        </custom-table>
    </div>
</template>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap');

#topDiv
{
    overflow-x:hidden; .fullSize;
    font-family: 'Schibsted Grotesk', sans-serif;
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

