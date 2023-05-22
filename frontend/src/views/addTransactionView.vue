<template>

    <metainfo>
        <template v-slot:title="{content}">{{content}}</template>
    </metainfo>

    <div id="topDiv" class="center">

        <div v-if="isLoading" class="fullSize center">Loading...</div>

        <div id="containersSelectDiv" v-else style="width:500px; height:500px;">
            
            <grid-shortcut style="height:45px;" columns="100px 1fr" class="fullWidth">
                <div class="middleLeft">From:</div>
                <custom-dropdown :items="store.containers" v-model:currentItem="selectedFromContainer" style="width:100%; height:100%;">
                    <template #itemToText="props">
                        <grid-shortcut :style="{'padding-left': props.isSelector ? '0px' : '5px', 'padding-right': props.isSelector ? '5px' : '0px'}" columns="1fr 1fr" class="fullWidth">
                            <div class="middleLeft">{{ props.item?.name }}</div>
                            <div class="middleRight containerValueText">{{ props.item?.value.toFixed(1) }} {{ props.item ? 'HKD' : '' }}</div>
                        </grid-shortcut>
                    </template>
                </custom-dropdown>
            </grid-shortcut>

            <grid-shortcut style="height:45px; margin-top:5px;" columns="100px 1fr" class="fullWidth">
                <div class="middleLeft">To:</div>
                <custom-dropdown :items="store.containers" v-model:currentItem="selectedToContainer" style="width:100%; height:100%;">
                    <template #itemToText="props">
                        <grid-shortcut :style="{'padding-left': props.isSelector ? '0px' : '5px', 'padding-right': props.isSelector ? '5px' : '0px'}" columns="1fr 1fr" class="fullWidth">
                            <div class="middleLeft">{{ props.item?.name }}</div>
                            <div class="middleRight containerValueText">{{ props.item?.value.toFixed(1) }} {{ props.item ? 'HKD' : '' }}</div>
                        </grid-shortcut>
                    </template>
                </custom-dropdown>
            </grid-shortcut>

            <grid-shortcut v-if="selectedFromContainer" style="height:45px; margin-top:5px;" columns="100px 1fr 100px" class="fullWidth">
                <div class="middleLeft">Spending:</div>
                <input @keypress="isNumber($event)" type="number"/>
                <custom-dropdown :items="store.currencies" v-model:currentItem="selectedSpendingCurrency" style="width:100%; height:100%;">
                    <template #itemToText="props">
                        {{ props.item?.symbol }}
                    </template>
                </custom-dropdown>
            </grid-shortcut>

            <grid-shortcut v-if="selectedToContainer" style="height:45px; margin-top:5px;" columns="100px 1fr 100px" class="fullWidth">
                <div class="middleLeft">Receiving:</div>
                <input @keypress="isNumber($event)" type="number"/>
                <custom-dropdown :items="store.currencies" v-model:currentItem="selectedReceivingCurrency" style="width:100%; height:100%;">
                    <template #itemToText="props">
                        {{ props.item?.symbol }}
                    </template>
                </custom-dropdown>
            </grid-shortcut>

            <grid-shortcut id="summaryBox" columns="1fr 1fr" class="fullWidth debug" style="height:45px;">
                <div class="middleLeft fullWidth">{{ selectedFromContainer?.name }}</div>
                <div class="middleRight fullWidth">{{ selectedToContainer?.name }}</div>
            </grid-shortcut>

<!-- 
            <grid-shortcut style="height:45px; width:100%;" columns="100px 1fr">
                <div class="center">From:</div>
                <custom-dropdown :items="store.availablePages" v-model:currentItem="selectedData" style="width:100%; height:100%;">
                    <template #itemToText="props">{{ props.item?.name }}</template>
                </custom-dropdown>
            </grid-shortcut> -->

        </div>
    </div>
</template>

<script lang="ts">
import { useMainStore } from "@/stores/store";
import { useMeta } from 'vue-meta';

export default
{
    setup () 
    {
        useMeta(
        {
            title: 'Add Txns',
            htmlAttrs: 
            {
                lang: 'en',
                amp: true
            }
        })
    },
    async mounted() 
    { 
        this.isLoading = true;
        await this.store.updateAll(); 
        this.isLoading = false;
    },
    data()
    {
        return { 
            isLoading: true,
            store: useMainStore(),
            selectedFromContainer: undefined as any,
            selectedToContainer: undefined as any,
            selectedSpendingCurrency: undefined as any,
            selectedReceivingCurrency: undefined as any
        }
    },
    methods:
    {
        isNumber: (evt: any) =>
        {
            evt = (evt) ? evt : window.event;
            var charCode = (evt.which) ? evt.which : evt.keyCode;
            if ((charCode > 31 && (charCode < 48 || charCode > 57)) && charCode !== 46) evt.preventDefault();
            else return true;
        }
    },
    computed:
    {
        txnMode() : "transfer" | "spending" | "receiving" | "unknown"
        {
            if (this.selectedFromContainer && this.selectedToContainer) return "transfer";
            if (this.selectedFromContainer && !this.selectedToContainer) return "spending";
            if (!this.selectedFromContainer && !this.selectedToContainer) return "unknown"
            return "receiving";
        },
        summaryBoxStyle() : any
        {
            
        }
    }
}
</script>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap');

#topDiv
{
    background: @background;
    .fullSize;
    color:white;

    input
    {
        appearance: none;
        outline: none;
        background: @backgroundDark;
        border:0px;
        color:white;
        padding-left:10px;
        font-size:16px;
    }

    #summaryBox
    {
        margin-top:15px;
    }
}

.containerValueText
{
    color:gray;
    font-family: Consolas;
}
</style>