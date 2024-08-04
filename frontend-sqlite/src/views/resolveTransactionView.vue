<template>

    <metainfo>
        <template v-slot:title="{content}">{{content}}</template>
    </metainfo>

    <div id="topDiv" class="center">

        <div v-if="isLoading" class="fullSize center">Initializing...</div>

        <div id="containersSelectDiv" v-if="!isLoading">
            
            <grid-shortcut columns="100px 1fr" class="fullWidth field">
                <div class="middleLeft">Target:</div>
                <custom-dropdown :items="unresolvedTransactions" v-model:currentItem="selectedTransaction">
                    <template #itemToText="props">
                        <div class="middleLeft" :class="{'grayText': !props.item?.title }">{{ props.item?.title ?? 'No Type Selected' }}</div>
                    </template>
                </custom-dropdown>
            </grid-shortcut>

            <grid-shortcut columns="1fr 1fr">
                <div></div>
                <div class="middleRight">
                    <button @click="upload">Resolve</button>
                </div>
            </grid-shortcut>
        </div>
        
    </div>
</template>

<script lang="ts">
import { useMainStore } from "@/stores/store";
import type { HydratedTransaction, Transaction } from "@/types/dtos/transactionsDTO";
import type { TxnType } from "@/types/dtos/txnTypesDTO";
import { useMeta } from 'vue-meta';

export default
{
    setup () 
    {
        useMeta(
        {
            title: 'Add Container',
            htmlAttrs: { lang: 'en', }
        });
    },
    async mounted() 
    { 
        await this.update();
    },
    data()
    {
        return { 
            isLoading: true,
            store: useMainStore(),
            containerName: "",
            isFormUploading: false,
            unresolvedTransactions: [] as HydratedTransaction[],
            selectedTransaction: undefined as TxnType|undefined
        }
    },
    methods:
    {
        async update()
        {
            this.isLoading = true;
            await this.store.updateAll(); 
            this.unresolvedTransactions = (await this.store.authGet("/api/finance/transactions?onlyunresolved=true"))!.data;
            this.isLoading = false;
        },
        async upload()
        {
            let self = this;

            if (this.selectedTransaction == undefined) { alert("Please select a target!"); return; }

            let body = { "resolveID": this.selectedTransaction.pubID, };
            
            this.isFormUploading = true;
            this.store.authPost(`/api/finance/transactions/resolve`, body)
            .then(() => { alert("Successfully resolved transaction."); })
            .catch(error => { alert(`Error trying to resolve transaction. ${error}`); })
            .finally(() => { self.isFormUploading = false; });

            await this.update();
        }
    }
}
</script>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap');

#topDiv
{
    #containersSelectDiv { .size(500px, auto); }

    background: @background; .fullSize;
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
        border-radius: 0;
        margin:0px;
    }

    .field
    {
        height:45px; margin-top:5px;
        div { .fullSize; }
    }

    button { background:@backgroundDark; border:0px; color:white; padding:10px; margin-top:15px; cursor:pointer; }
    button:hover { background:@surfaceHigh; }
    button:disabled { opacity:0.5; cursor:not-allowed; }
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

    #spendingFieldContainer
    {
        grid-template-columns: 100px 180px auto !important;
    }
}

</style>