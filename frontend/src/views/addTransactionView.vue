<template>

    <metainfo>
        <template v-slot:title="{content}">{{content}}</template>
    </metainfo>

    <div id="topDiv" class="center">

        <div v-if="isLoading" class="fullSize center">Loading...</div>

        <div id="containersSelectDiv" v-else style="width:500px; height:500px;">
            
            <grid-shortcut columns="100px 1fr" class="fullWidth field">
                <div class="middleLeft">From:</div>
                <custom-dropdown :items="store.containers" v-model:currentItem="selectedFromContainer">
                    <template #itemToText="props">
                        <grid-shortcut :style="{'padding-left': props.isSelector ? '0px' : '5px', 'padding-right': props.isSelector ? '5px' : '0px'}" columns="1fr 1fr" class="fullWidth">
                            <div class="middleLeft">{{ props.item?.name ?? 'No Container Selected' }}</div>
                            <div class="middleRight containerValueText">{{ props.item?.value.toFixed(1) }} {{ props.item ? 'HKD' : '' }}</div>
                        </grid-shortcut>
                    </template>
                </custom-dropdown>
            </grid-shortcut>

            <grid-shortcut columns="100px 1fr" class="fullWidth field">
                <div class="middleLeft">To:</div>
                <custom-dropdown :items="store.containers" v-model:currentItem="selectedToContainer">
                    <template #itemToText="props">
                        <grid-shortcut :style="{'padding-left': props.isSelector ? '0px' : '5px', 'padding-right': props.isSelector ? '5px' : '0px' }" columns="1fr 1fr" class="fullWidth">
                            <div class="middleLeft">{{ props.item?.name ?? 'No Container Selected' }}</div>
                            <div class="middleRight containerValueText">{{ props.item?.value.toFixed(1) }} {{ props.item ? 'HKD' : '' }}</div>
                        </grid-shortcut>
                    </template>
                </custom-dropdown>
            </grid-shortcut>

            <grid-shortcut v-if="selectedFromContainer" columns="100px 1fr 100px" class="fullWidth field">
                <div class="middleLeft">Spending:</div>
                <input @keypress="isNumber($event)" type="number" v-model="fromAmount"/>
                <custom-dropdown :items="store.currencies" v-model:currentItem="selectedSpendingCurrency">
                    <template #itemToText="props">
                        {{ props.item?.symbol ?? '-' }}
                    </template>
                </custom-dropdown>
            </grid-shortcut>

            <grid-shortcut v-if="selectedToContainer" columns="100px 1fr 100px" class="fullWidth field">
                <div class="middleLeft">Receiving:</div>
                <input @keypress="isNumber($event)" type="number" v-model="toAmount"/>
                <custom-dropdown :items="store.currencies" v-model:currentItem="selectedReceivingCurrency">
                    <template #itemToText="props">
                        {{ props.item?.symbol ?? '-' }}
                    </template>
                </custom-dropdown>
            </grid-shortcut>

            <grid-shortcut v-if="txnMode != 'unknown'" id="summaryBox" columns="1fr 50px 1fr" class="fullWidth">
                <div class="middleLeft fullWidth">
                    <div v-if="fromAmount && selectedSpendingCurrency && selectedFromContainer">
                        <div class="containerValueText" style="text-align: start;">{{ selectedFromContainer.name }}</div>
                        <div style="text-align: start;">{{ fromAmount }} {{ selectedSpendingCurrency.symbol }}</div>
                        <div class="containerValueText" style="text-align: start; margin-top:5px;">{{ fromAmount * selectedSpendingCurrency.rate }} HKD</div>
                    </div>
                </div>
                <div class="center">
                    <fa-icon style="font-size:12px; color:white;" icon="fa-solid fa-chevron-right"></fa-icon>
                </div>
                <div class="middleRight fullWidth">
                    <div v-if="toAmount && selectedReceivingCurrency && selectedToContainer" >
                        <div class="containerValueText" style="text-align: end;">{{ selectedToContainer.name }}</div>
                        <div style="text-align: end;">{{ toAmount }} {{ selectedReceivingCurrency.symbol }}</div>
                        <div class="containerValueText" style="text-align: end; margin-top:5px;">{{ toAmount * selectedReceivingCurrency.rate }} HKD</div>
                    </div>
                </div>
            </grid-shortcut>

            <grid-shortcut columns="1fr 1fr">
                <div class="middleLeft"><button @click="reset">Reset</button></div>
                <div class="middleRight"><button>Upload</button></div>
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
import type { containers, currencies } from "@prisma/client";
import { useMeta } from 'vue-meta';

export default
{
    setup () 
    {
        useMeta(
        {
            title: 'Add Txns',
            visualViewport: 'width=device-width, initial-scale=1.0',
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
            selectedFromContainer: undefined as undefined | containers,
            selectedToContainer: undefined as undefined | containers,
            selectedSpendingCurrency: undefined as undefined | currencies,
            selectedReceivingCurrency: undefined as undefined | currencies,
            fromAmount: 0 as number,
            toAmount: 0 as number,
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
        },
        reset()
        {
            this.selectedFromContainer = undefined;
            this.selectedToContainer = undefined;
            this.selectedSpendingCurrency = undefined;
            this.selectedReceivingCurrency = undefined;
            this.fromAmount = 0;
            this.toAmount = 0;
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

    .field
    {
        height:45px; margin-top:5px;
        div { .fullSize; }
    }

    #summaryBox
    {
        margin-top:15px;
        background: @backgroundDark;
        padding:10px;
        box-sizing:border-box;

        & > div > div > div:first-child { margin-bottom:5px; }
    }

    button { background:@backgroundDark; border:0px; color:white; padding:10px; margin-top:15px; }
}

.containerValueText
{
    color:gray;
    font-family: Consolas;
}
</style>