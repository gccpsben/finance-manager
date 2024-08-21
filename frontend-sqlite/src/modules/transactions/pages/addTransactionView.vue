<template>

    <metainfo>
        <template v-slot:title="{content}">{{content}}</template>
    </metainfo>

    <div id="topDiv" class="center">

        <div v-if="isLoading && !isFormUploading" class="fullSize center">
            <div class="upDownGrid" style="gap: 14px;">
                <div class="center">Initializing...</div>
                <div class="center">
                    <v-progress-circular indeterminate style="color:white"/>
                </div>
            </div>
        </div>

        <div v-if="!isLoading && isFormUploading" class="fullSize center">
            <div class="upDownGrid" style="gap: 14px;">
                <div class="center">Uploading...</div>
                <div class="center">
                    <v-progress-circular indeterminate style="color:white"/>
                </div>
            </div>
        </div>

        <div id="containersSelectDiv" v-if="!isFormUploading && !isLoading">
            
            <grid-shortcut id="pendingSelector" columns="1fr 1fr" class="fullWidth field">

                <div>
                    <div :class="{'selected': !isPending}" class="immediate" @click="isPending=false">Immediate</div>
                </div>

                <div>
                    <div :class="{'selected': isPending}" class="pending" @click="isPending=true">Pending</div>
                </div>

            </grid-shortcut>

            <grid-shortcut id="modeSelector" columns="1fr 1fr 1fr" class="fullWidth field">

                <div v-for="option in ['spending', 'earning', 'transfer']">
                    <div :class="{'selected': selectedMode == option}" @click="selectedMode = option"
                    v-bind:class="option" >{{ option }}</div>
                </div>

            </grid-shortcut>

            <grid-shortcut columns="100px 1fr" class="fullWidth field">
                <div class="middleLeft">Title:</div>
                <input type="text" placeholder="Title Here..." v-model="txnTitle"/>
            </grid-shortcut>

            <grid-shortcut columns="100px 1fr" class="fullWidth field">
                <div class="middleLeft">Type:</div>
                <custom-dropdown :items="txnTypesStore.txnTypes.lastSuccessfulData?.rangeItems ?? []" v-model:currentItem="selectedTxnType">
                    <template #itemToText="props">
                        <div class="middleLeft" :class="{'grayText': !props.item?.name, 'dropdownRow': !props.isSelector }">
                            {{ props.item?.name ?? 'No Type Selected' }}
                        </div>
                    </template>
                </custom-dropdown>
            </grid-shortcut>
            
            <grid-shortcut v-if="selectedMode == 'transfer' || selectedMode == 'spending'" columns="100px 1fr" class="fullWidth field">
                <div class="middleLeft">From:</div>
                <custom-dropdown :items="containersStore.containers.lastSuccessfulData?.rangeItems ?? []" v-model:currentItem="selectedFromContainer">
                    <template #itemToText="props">
                        <grid-shortcut :class="{'dropdownRow': !props.isSelector}" columns="1fr auto" class="fullWidth">
                            <div class="middleLeft" :class="{'grayText': !props.item?.name }">{{ props.item?.name ?? '/' }}</div>
                            <!-- <div class="middleRight containerValueText">{{ props.item?.toFixed(1) }} {{ props.item ? 'HKD' : '' }}</div> -->
                        </grid-shortcut>
                    </template>
                </custom-dropdown>
            </grid-shortcut>

            <grid-shortcut v-if="selectedMode == 'transfer' || selectedMode == 'earning'" columns="100px 1fr" class="fullWidth field">
                <div class="middleLeft">To:</div>
                <custom-dropdown :items="containersStore.containers.lastSuccessfulData?.rangeItems ?? []" v-model:currentItem="selectedToContainer">
                    <template #itemToText="props">
                        <grid-shortcut :class="{'dropdownRow': !props.isSelector}" columns="1fr 1fr" class="fullWidth">
                            <div class="middleLeft" :class="{'grayText': !props.item?.name }">{{ props.item?.name ?? '/' }}</div>
                            <!-- <div class="middleRight containerValueText">{{ props.item?.value.toFixed(1) }} {{ props.item ? 'HKD' : '' }}</div> -->
                        </grid-shortcut>
                    </template>
                </custom-dropdown>
            </grid-shortcut>

            <grid-shortcut id="spendingFieldContainer" v-if="selectedFromContainer" class="fullWidth field">
                <div class="middleLeft">Spending:</div>
                <input class="noSpin" inputmode="decimal" type="number" v-model="fromAmount" v-number-only/>
                <custom-dropdown :items="currenciesStore.currencies.lastSuccessfulData?.rangeItems" v-model:currentItem="selectedSpendingCurrency">
                    <template #itemToText="props">
                        <div :class="{'dropdownRow': !props.isSelector}" class="xLeft yCenter">
                            {{ props.item?.ticker ?? '-' }}
                        </div>
                    </template>
                </custom-dropdown>
            </grid-shortcut>

            <grid-shortcut v-if="selectedToContainer" columns="100px 1fr 100px" class="fullWidth field">
                <div class="middleLeft">Receiving:</div>
                <input class="noSpin" inputmode="decimal" type="number" v-model="toAmount" v-number-only/>
                <custom-dropdown :items="currenciesStore.currencies.lastSuccessfulData?.rangeItems" v-model:currentItem="selectedReceivingCurrency">
                    <template #itemToText="props">
                        <div :class="{'dropdownRow': !props.isSelector}" class="xLeft yCenter">
                            {{ props.item?.ticker ?? '-' }}
                        </div>
                    </template>
                </custom-dropdown>
            </grid-shortcut>

            <grid-shortcut v-if="shouldSummaryBoxVisible" id="summaryBox" columns="1fr 50px 1fr" class="fullWidth">
                <div class="middleLeft fullWidth">
                    <div v-if="fromAmount != undefined && selectedSpendingCurrency && selectedFromContainer">
                        <div class="containerValueText" style="text-align: start;">{{ selectedFromContainer.name }}</div>
                        <div style="text-align: start;">{{ fromAmount }} {{ selectedSpendingCurrency.ticker }}</div>
                        <div class="containerValueText" style="text-align: start; margin-top:5px;">{{ fromAmount * decimalJSToNumber(selectedSpendingCurrency.rateToBase) }} {{ currenciesStore.getBaseCurrencySymbol() }}</div>
                    </div>
                </div>
                <div class="center">
                    <fa-icon style="font-size:12px; color:white;" icon="fa-solid fa-chevron-right"></fa-icon>
                </div>
                <div class="middleRight fullWidth">
                    <div v-if="toAmount != undefined && selectedReceivingCurrency && selectedToContainer" >
                        <div class="containerValueText" style="text-align: end;">{{ selectedToContainer.name }}</div>
                        <div style="text-align: end;">{{ toAmount }} {{ selectedReceivingCurrency.ticker }}</div>
                        <div class="containerValueText" style="text-align: end; margin-top:5px;">{{ toAmount * decimalJSToNumber(selectedReceivingCurrency.rateToBase) }} {{ currenciesStore.getBaseCurrencySymbol() }}</div>
                    </div>
                </div>
            </grid-shortcut>

            <grid-shortcut columns="100px 1fr" class="fullWidth field">
                <div class="middleLeft">Date:</div>
                <input type="text" placeholder="YYYY-MM-DD HH:MM:SS" v-model="txnDateInput"/>
            </grid-shortcut>

            <grid-shortcut columns="1fr auto auto" style="gap: 5px;">
                <div class="middleLeft"><button @click="reset">Reset</button></div>
                <div class="middleRight"><button @click="$router.push('./resolve')">Resolve</button></div>
                <div class="middleRight">
                    <button @click="upload" :disabled="!isFormValid">Upload</button>
                </div>
            </grid-shortcut>

        </div>
        
    </div>
</template>

<script lang="ts">
import { useMainStore } from "@/modules/core/stores/store";
import { useCurrenciesStore } from '../../currencies/stores/useCurrenciesStore';
import { useContainersStore } from '../../containers/stores/useContainersStore';
import { useTxnTypesStore } from '../../txnTypes/stores/useTxnTypesStore';
import { useMeta } from 'vue-meta';
import type { ContainerDTO } from "../../../../../api-types/container";
import type { CurrencyDTO } from "../../../../../api-types/currencies";
import type { TxnTypesDTO } from "@/../../api-types/txnType";
import type { PostTxnAPI } from "@/../../api-types/txn";
import vNumberOnly from '@/modules/core/directives/vNumberOnly';
import { VProgressCircular } from "vuetify/components";

export default
{
    directives: { "number-only": vNumberOnly },
    components: { VProgressCircular },
    setup () 
    {
        useMeta(
        {
            title: 'Add Txns',
            htmlAttrs: { lang: 'en', },
            link: 
            [
                { rel: 'icon', href: "/addTxnIcon.png" },
                { rel: 'shortcut icon', type: "image/jpeg", href:"/addTxnIcon.png" },
                { rel: 'apple-touch-icon', href:"/addTxnIcon.png" }
            ] 
        });

        return {
            store: useMainStore(),
            currenciesStore: useCurrenciesStore(),
            containersStore: useContainersStore(),
            txnTypesStore: useTxnTypesStore()
        }
    },
    async mounted() 
    { 
        this.isLoading = true;
        await this.store.updateDashboardBatch();
        this.isLoading = false;
    },
    data()
    {
        return { 
            isLoading: true,
            selectedFromContainer: undefined as undefined | ContainerDTO,
            selectedToContainer: undefined as undefined | ContainerDTO,
            selectedSpendingCurrency: undefined as undefined | CurrencyDTO,
            selectedReceivingCurrency: undefined as undefined | CurrencyDTO,
            selectedTxnType: undefined as undefined | TxnTypesDTO,
            fromAmount: 0 as number,
            toAmount: 0 as number,
            txnTitle: '' as string,
            txnDateInput: '' as string,
            selectedMode: 'spending' as 'spending' | 'earning' | 'transfer' | string,
            isPending: false,
            isFormUploading: false
        }
    },
    methods:
    {
        reset()
        {
            this.selectedFromContainer = undefined;
            this.selectedToContainer = undefined;
            this.selectedSpendingCurrency = undefined;
            this.selectedReceivingCurrency = undefined;
            this.fromAmount = 0;
            this.toAmount = 0;
        },
        upload()
        {
            if (!this.isFormValid) alert("Please complete the form.");
            else
            {
                let self = this;
                let body: Partial<PostTxnAPI.RequestDTO> = 
                {
                    "title": this.txnTitle,
                    "typeId": this.selectedTxnType!.id,
                    "creationDate": Date.now(),
                    "description": "testing desc"
                };

                if (this.enteredDate != undefined) 
                    body['creationDate'] = this.enteredDate.getTime();

                if (this.selectedFromContainer)
                {
                    body.fromAmount = this.fromAmount.toString();
                    body.fromContainerId = this.selectedFromContainer.id;
                    body.fromCurrencyId = this.selectedSpendingCurrency!.id;
                }
                if (this.selectedToContainer)
                {
                    body.toAmount = this.toAmount.toString();
                    body.toContainerId = this.selectedToContainer.id;
                    body.toCurrencyId = this.selectedReceivingCurrency!.id;
                }
                
                this.isFormUploading = true;
                this.store.authPost(`/api/v1/transactions`, body)
                .then(() => { alert("Successfully Added Transaction."); self.reset(); })
                .catch(error => { alert(`Error trying to upload transaction. ${error}`); })
                .finally(() => { self.isFormUploading = false; });
            }
        },
        decimalJSToNumber(decimalJSStr: string)
        {
            return parseFloat(decimalJSStr);
        }
    },
    computed:
    {
        isAmountsValid(): boolean
        {
            if (this.selectedMode == "earning") return typeof this.toAmount == 'number';
            else if (this.selectedMode == "spending") return typeof this.fromAmount == 'number';
            else if (this.selectedMode == "transfer") return typeof this.toAmount == 'number' && typeof this.fromAmount == 'number';
            else { return false; }
        },
        shouldSummaryBoxVisible(): boolean
        {
            if (!this.isAmountsValid) return false;
            if (this.selectedMode == "earning") return this.selectedReceivingCurrency !== undefined && this.selectedToContainer !== undefined;
            else if (this.selectedMode == "spending") return this.selectedSpendingCurrency !== undefined && this.selectedFromContainer !== undefined;
            else if (this.selectedMode == "transfer") 
                return this.selectedSpendingCurrency !== undefined && 
                this.selectedReceivingCurrency !== undefined && 
                this.selectedFromContainer !== undefined && 
                this.selectedToContainer !== undefined;
            else return false;
        },
        isFormValid(): boolean
        {
            return this.shouldSummaryBoxVisible && this.isAmountsValid && this.txnTitle?.length > 0 && this.selectedTxnType !== undefined
            && (this.txnDateInput == '' || this.enteredDate != undefined);
        },
        enteredDate(): Date|undefined
        {
            try
            {
                // Format: YYYY-MM-DD HH:MM:SS
                if (this.txnDateInput == '') return undefined;
                else if (!/^\d{4}-\d{2}-\d{2}[ ]\d{2}:\d{2}:\d{2}$/.test(this.txnDateInput)) return undefined;
                // else if (this.txnDateInput.split('-').length != 3 ||  this.txnDateInput.split(':').length != 3) return false;
                // else if (this.txnDateInput.split(' ').length != 2) return false;
                else 
                {
                    let segments = this.txnDateInput.split(' ');
                    let years = Number.parseInt(segments[0].split("-")[0]);
                    let month = Number.parseInt(segments[0].split("-")[1]);
                    let day = Number.parseInt(segments[0].split("-")[2]);
                    let hours = Number.parseInt(segments[1].split(":")[0]);
                    let minutes = Number.parseInt(segments[1].split(":")[1]);
                    let seconds = Number.parseInt(segments[1].split(":")[2]);
                    let finalDate = new Date(years, month - 1, day, hours, minutes, seconds);
                    return finalDate;
                }
            }
            catch(ex) { return undefined; }
        }
    },
    watch:
    {
        selectedMode(newValue, oldValue) { this.reset(); }
    }
}
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap');

#topDiv
{
    #containersSelectDiv { .size(500px, auto); }

    background: @background; .fullSize;
    color:white;

    #spendingFieldContainer
    {
        grid-template-columns: 100px 1fr 100px;
    }

    #modeSelector
    {
        margin-bottom:15px;
        text-transform: capitalize;
        border: 1px solid @backgroundDark;
        box-sizing: border-box;
        padding:0px;

        div
        {
            box-sizing: border-box;
            --accent-color: #00000055;
            cursor: pointer;
            color:white;
            .center;

            &.transfer { --accent-color: @yellowDark; }
            &.spending { --accent-color: @errorDark; }
            &.earning { --accent-color: @successDark; }
            &.selected { background: var(--accent-color) !important; }
        }
    }

    #pendingSelector
    {
        margin-bottom:15px;
        text-transform: capitalize;
        border: 1px solid @backgroundDark;
        box-sizing: border-box;
        padding:0px;

        div
        {
            box-sizing: border-box;
            --accent-color: #00000055;
            cursor: pointer;
            color:white;
            .center;

            &.pending { --accent-color: @yellowDark; }
            &.immediate { --accent-color: @errorDark; }
            &.selected { background: var(--accent-color) !important; }
        }
    }

    input
    {
        appearance: none;
        outline: none;
        background: @backgroundDark;
        border:0px;
        color:white;
        padding-left:10px;
        font-size:16px;
        border-radius: 0;
        margin:0px;
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

    button { background:@backgroundDark; border:0px; color:white; padding:10px; margin-top:15px; cursor:pointer; }
    button:hover { background:@surfaceHigh; }
    button:disabled { opacity:0.5; cursor:not-allowed; }

    .dropdownRow
    {
        margin-left: 5px;
        margin-right: 5px;
    }
}

.containerValueText
{
    color:gray;
    font-family: Consolas;
}
div.grayText { opacity: 0.2; } 

@media only screen and (max-width: 600px) 
{
    #topDiv { height: 100svh; }

    #containersSelectDiv
    {
        width:90vw !important;
        overflow-x: hidden;
    }
}

</style>