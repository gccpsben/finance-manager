<template>

    <metainfo>
        <template v-slot:title="{content}">{{content}}</template>
    </metainfo>

    <div id="topDiv" class="center">

        <div v-if="isLoading" class="fullSize center">Initializing...</div>

        <div id="containersSelectDiv" v-if="!isLoading">

            <grid-shortcut id="typeSelector" columns="1fr 1fr" class="fullWidth field">
                <div>
                    <div :class="{'selected': !isDynamic}" class="immediate" @click="isDynamic=false">Static</div>
                </div>
                <div>
                    <div :class="{'selected': isDynamic}" class="pending" @click="isDynamic=true">Dynamic</div>
                </div>
            </grid-shortcut>

            <grid-shortcut columns="100px 1fr" class="fullWidth field">
                <div class="middleLeft">Name:</div>
                <input type="text" placeholder="Full Name Here..." v-model="currencyName"/>
            </grid-shortcut>

            <grid-shortcut columns="100px 1fr" class="fullWidth field">
                <div class="middleLeft">Symbol:</div>
                <input type="text" placeholder="Currency Symbol Here..." v-model="currencySymbol"/>
            </grid-shortcut>

            <div v-if="isDynamic">
                <grid-shortcut columns="200px 1fr" class="fullWidth field">
                    <div class="middleLeft">Data Source Hostname:</div>
                    <input type="text" placeholder="Example: api.coingecko.com" v-model="sourceHostname"/>
                </grid-shortcut>

                <grid-shortcut columns="200px 1fr" class="fullWidth field">
                    <div class="middleLeft">Data Source Path:</div>
                    <input type="text" placeholder="Example: /api/v3/simple/price?ids=nano&vs_currencies=hkd" v-model="sourcePath"/>
                </grid-shortcut>

                <grid-shortcut columns="200px 1fr" class="fullWidth field">
                    <div class="middleLeft">JMES Path:</div>
                    <input type="text" placeholder="Example: nano.hkd" v-model="jmesPath"/>
                </grid-shortcut>
            </div>

            <div v-if="!isDynamic">
                <grid-shortcut columns="100px 1fr" class="fullWidth field">
                    <div class="middleLeft">Rate:</div>
                    <input inputmode="decimal" @keypress="isNumber($event)" type="number" v-model="staticRate"/>
                </grid-shortcut>
            </div>

            <grid-shortcut columns="1fr 1fr">
                <div></div>
                <div class="middleRight">
                    <button @click="upload">Upload</button>
                </div>
            </grid-shortcut>
        </div>
        
    </div>
</template>

<script lang="ts">
import { useMainStore } from "@/stores/store";
import type { containers, currencies, transactionTypes } from "@prisma/client";
import { useMeta } from 'vue-meta';

export default
{
    setup () 
    {
        useMeta(
        {
            title: 'Add Currency',
            htmlAttrs: 
            {
                lang: 'en',
            }
        });
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
            currencyName: "",
            currencySymbol: "",
            isFormUploading: false,
            isDynamic: false,
            sourceHostname: "",
            sourcePath: "",
            jmesPath: "",
            staticRate: 0
        }
    },
    methods:
    {
        async upload()
        {
            var self = this;
            var body = 
            {
                "name": this.currencyName,
                "symbol": this.currencySymbol,
            } as any;

            if (this.isDynamic)
            {
                body.dataSource = 
                {
                    jsonURLHost: this.sourceHostname,
                    jsonURLPath: this.sourcePath,
                    jmesQuery: this.jmesPath
                }
            }
            else { body.rate = this.staticRate }
            
            this.isFormUploading = true;
            this.store.authPost(`/api/finance/currencies/add`, body)
            .then(() => { alert("Successfully Added currency."); })
            .catch(error => { alert(`Error trying to upload currency. ${error}`); })
            .finally(() => { self.isFormUploading = false; });
        },
        isNumber: (evt: any) =>
        {
            evt = (evt) ? evt : window.event;
            var charCode = (evt.which) ? evt.which : evt.keyCode;
            if ((charCode > 31 && (charCode < 48 || charCode > 57)) && charCode !== 46) evt.preventDefault();
            else return true;
        },
    }
}
</script>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap');

#topDiv
{

    #containersSelectDiv { .size(600px, auto); }

    background: @background; .fullSize;
    color:white;

    #typeSelector
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