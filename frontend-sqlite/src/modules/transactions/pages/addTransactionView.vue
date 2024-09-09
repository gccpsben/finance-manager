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

            <text-field class="fullSize" field-name="Transaction Title" v-model:text="txnTitle"/>

            <custom-dropdown :field-name="'Type'" :options="txnTypesOptions" v-model:selected-option="selectedTxnTypeId" />
            
            <custom-dropdown v-if="selectedMode == 'transfer' || selectedMode == 'spending'"
                             :field-name="'From'" 
                             :options="containersOptions" 
                             v-model:selected-option="selectedFromContainerId" />

            <custom-dropdown v-if="selectedMode == 'transfer' || selectedMode == 'earning'"
                             :field-name="'To'" 
                             :options="containersOptions" 
                             v-model:selected-option="selectedToContainerId" />

            <grid-shortcut v-if="selectedFromContainerId" columns="1fr 150px" class="fullWidth field">
                <text-field field-name="Spending" class="noSpin" :input-type="'number'" :text="fromAmount.toString()" @update:text="fromAmount = parseFloat($event)" v-number-only/>
                <custom-dropdown :field-name="'Currency'" :options="currenciesOptions" v-model:selected-option="selectedSpendingCurrencyId" />
            </grid-shortcut>

            <grid-shortcut v-if="selectedToContainerId" columns="1fr 150px" class="fullWidth field">
                <text-field field-name="Receiving" class="noSpin" :input-type="'number'" :text="toAmount.toString()" @update:text="toAmount = parseFloat($event)" v-number-only/>
                <custom-dropdown :field-name="'Currency'" :options="currenciesOptions" v-model:selected-option="selectedReceivingCurrencyId" />
            </grid-shortcut>

            <grid-shortcut v-if="shouldSummaryBoxVisible" id="summaryBox" columns="1fr 50px 1fr" class="fullWidth">
                <div class="middleLeft fullWidth">
                    <div v-if="fromAmount != undefined && selectedSpendingCurrencyId && selectedFromContainerId">
                        <div class="containerValueText" style="text-align: start;">{{ containersStore.findContainerById(selectedFromContainerId)?.name ?? '-' }}</div>
                        <div style="text-align: start;">{{ fromAmount }} {{ currenciesStore.findCurrencyByPubID(selectedSpendingCurrencyId)?.ticker ?? '-' }}</div>
                        <div class="containerValueText" style="text-align: start; margin-top:5px;">
                            {{ fromAmount * decimalJSToNumber(currenciesStore.findCurrencyByPubID(selectedSpendingCurrencyId)?.rateToBase ?? '0') }} {{ currenciesStore.getBaseCurrencySymbol() }}
                        </div>
                    </div>
                </div>
                <div class="center">
                    <fa-icon style="font-size:12px; color:white;" icon="fa-solid fa-chevron-right"></fa-icon>
                </div>
                <div class="middleRight fullWidth">
                    <div v-if="toAmount != undefined && selectedReceivingCurrencyId && selectedToContainerId" >
                        <div class="containerValueText" style="text-align: end;">{{ containersStore.findContainerById(selectedToContainerId)?.name ?? '-' }}</div>
                        <div style="text-align: end;">{{ toAmount }} {{  currenciesStore.findCurrencyByPubID(selectedReceivingCurrencyId)?.ticker ?? '-' }}</div>
                        <div class="containerValueText" style="text-align: end; margin-top:5px;">
                            {{ toAmount * decimalJSToNumber(currenciesStore.findCurrencyByPubID(selectedReceivingCurrencyId)?.rateToBase ?? '0') }} {{ currenciesStore.getBaseCurrencySymbol() }}
                        </div>
                    </div>
                </div>
            </grid-shortcut>

            <text-field class="fullSize" field-name="Date" placeholder="YYYY-MM-DD HH:MM:SS" 
                        v-model:text="txnDateInput" :override-theme-color="isEnteredDateValid ? undefined : 'red'">
                <template #fieldActions>
                    <div class="nowButtonContainer">
                        <button class="nowButton" @click="resetDateToNow()">Now</button>
                    </div>
                </template>
            </text-field>

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
import type { PostTxnAPI } from "@/../../api-types/txn";
import vNumberOnly from '@/modules/core/directives/vNumberOnly';
import { VProgressCircular } from "vuetify/components";
import textField from '@/modules/core/components/textField.vue';
import customDropdown, { type DropdownItem } from "@/modules/core/components/custom-dropdown.vue";

export default
{
    directives: { "number-only": vNumberOnly },
    components: { VProgressCircular, "text-field": textField, customDropdown },
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
            selectedFromContainerId: undefined as undefined | string,
            selectedToContainerId: undefined as undefined | string,
            selectedSpendingCurrencyId: undefined as undefined | string,
            selectedReceivingCurrencyId: undefined as undefined | string,
            selectedTxnTypeId: undefined as undefined | string,
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
            this.selectedFromContainerId = undefined;
            this.selectedToContainerId = undefined;
            this.selectedSpendingCurrencyId = undefined;
            this.selectedReceivingCurrencyId = undefined;
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
                    "typeId": this.selectedTxnTypeId,
                    "creationDate": Date.now(),
                    "description": "testing desc"
                };

                if (this.enteredDate != undefined) 
                    body['creationDate'] = this.enteredDate.getTime();

                if (this.selectedFromContainerId)
                {
                    body.fromAmount = this.fromAmount.toString();
                    body.fromContainerId = this.selectedFromContainerId;
                    body.fromCurrencyId = this.selectedSpendingCurrencyId;
                }
                if (this.selectedToContainerId)
                {
                    body.toAmount = this.toAmount.toString();
                    body.toContainerId = this.selectedToContainerId;
                    body.toCurrencyId = this.selectedReceivingCurrencyId;
                }
                
                this.isFormUploading = true;
                this.store.authPost(`/api/v1/transactions`, body)
                .then(() => { alert("Successfully Added Transaction."); self.reset(); })
                .catch(error => { alert(`Error trying to upload transaction. ${error}`); })
                .finally(() => { self.isFormUploading = false; });
            }
        },
        decimalJSToNumber(decimalJSStr: string) { return parseFloat(decimalJSStr); },
        resetDateToNow()
        {
            const now = new Date();
            const pad = (arg: string | number, padCount: number = 2) => `${arg}`.padStart(padCount, '0');
            const dateSegment = `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
            const timeSegment = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
            this.txnDateInput = `${dateSegment} ${timeSegment}`;
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
            if (this.selectedMode == "earning") return this.selectedReceivingCurrencyId !== undefined && this.selectedToContainerId !== undefined;
            else if (this.selectedMode == "spending") return this.selectedSpendingCurrencyId !== undefined && this.selectedFromContainerId !== undefined;
            else if (this.selectedMode == "transfer") 
                return this.selectedSpendingCurrencyId !== undefined && 
                this.selectedReceivingCurrencyId !== undefined && 
                this.selectedFromContainerId !== undefined && 
                this.selectedToContainerId !== undefined;
            else return false;
        },
        isFormValid(): boolean
        {
            return this.shouldSummaryBoxVisible && this.isAmountsValid && this.txnTitle?.length > 0 && this.selectedTxnTypeId !== undefined
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
        },
        isEnteredDateValid()
        {
            if (this.txnDateInput.trim() === '') return true;
            return this.enteredDate !== undefined;
        },
        currenciesOptions(): DropdownItem[]
        {
            return this.currenciesStore.currencies.lastSuccessfulData?.rangeItems
            .map(item => ({
                id: item.id,
                label: item.name,
                searchTerms: `${item.name} ${item.id} ${item.owner} ${item.ticker}`
            })) ?? [];
        },
        containersOptions(): DropdownItem[]
        {
            return this.containersStore.containers.lastSuccessfulData?.rangeItems
            .map(item => ({
                id: item.id,
                label: item.name,
                searchTerms: `${item.name} ${item.id} ${item.owner}`
            })) ?? [];
        },
        txnTypesOptions(): DropdownItem[]
        {
            return this.txnTypesStore.txnTypes.lastSuccessfulData?.rangeItems
            .map(item => ({
                id: item.id,
                label: item.name,
                searchTerms: `${item.name} ${item.id} ${item.owner}`
            })) ?? [];
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
    #containersSelectDiv 
    { 
        .size(500px, auto); 
        display:grid;
        grid-template-columns: 1fr;
        grid-auto-rows: minmax(45px, auto);
        grid-auto-flow: row;
        gap: 10px;
    }

    background: @background; .fullSize;
    color:white;

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
        .fullSize;
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

    button { background:@backgroundDark; border:0px; color:white; cursor:pointer; }
    button:hover { background:@surfaceHigh; }
    button:disabled { opacity:0.5; cursor:not-allowed; }

    .dropdownRow
    {
        margin-left: 5px;
        margin-right: 5px;
    }

    .nowButtonContainer
    {
        .fullSize; .center;
        padding-left: 5px; padding-right: 5px;

        .nowButton
        {
            padding:5px;
            font-size:12px;
            font-weight: bold;
        }
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