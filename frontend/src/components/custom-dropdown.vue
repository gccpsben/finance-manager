<!--

    A simple-customizable dropdown for vue.

    Slots and Templates:

        #selector: 
            The template of the dropdown in an unopened state. Setting this will replace default template.
            You will have to write dropdown arrow and content yourself.
            Usage: <template #selector="props">...</template>

        #itemToText:
            The template of the content of each of the row (including the #selector). Setting this will replace default template.
            Props: 
                -> isSelector: boolean 
                Indictate that the current row is the row shown in the menu's unopened state.
                -> currentItem: any
                The current object of the row. This will depend on the given list of selectable values.
            Usage: <template #itemToText="props">...</template>

        #row:
            The template of each of the row in an opened state. Setting this will replace the default template.
            Props:
                -> item: any
                The current object of the row.
            Usage: <template #row="props">...</template>

        #noItemsNotice:
            The template of the dropdown if there's no elements to select from. Setting this will replace the default template.
            Usage: <template #row="noItemsNotice">.....</template>

    Usage:
    <custom-dropdown :items="store.elementsToChoose" v-model:currentItem="selectedData">
        <template #row="noItemsNotice">.....</template>
        <template #row="props">...</template>
        <template #itemToText="props">...</template>
        <template #selector="props">...</template>
    </custom-dropdown>

-->

<template>
    <div @focusin="opened=true" @focusout="opened=false" id="root_custom_dropdown" tabindex=0>
        <div @mousedown="opened=!opened" style="height:100%;">
            <slot id="selector" name="main" :currentItem="currentItem">
                <grid-shortcut columns="1fr 25px" style="padding:5px; cursor:pointer; height:100%; box-sizing: border-box;">
                    <div style="color:white; padding-left:5px;" class="middleLeft">
                        <slot name="itemToText" :item="currentItem" :isSelector="true">
                            <div :class="{'disabled': currentItem === undefined}">{{ currentItem ?? "No Item Selected" }}</div>
                        </slot>
                    </div>
                    <div class="center">
                        <fa-icon style="font-size:12px; color:white;" icon="fa-solid fa-chevron-down"></fa-icon>
                    </div>
                </grid-shortcut>
            </slot>
        </div>
        <div v-if="opened" id="unselectOverlay" @click="opened=false"></div>
        <div id="dropdownMenu" v-if="opened" style="position:absolute;">
            <div v-for="item in items" @click="onItemClicked(item)" class="fullWidth">
                <slot name="row" :item="item">
                    <grid-shortcut class="row" columns="1fr 30px">
                        <div class="middleLeft">
                            <slot name="itemToText" :item="item" :isSelector="false">
                                <div style="padding-left:5px;">{{ item }}</div>
                            </slot>
                        </div>
                        <div v-if="currentItem==item" class="checkIcon">
                            <fa-icon style="font-size:12px; color:white;" icon="fa-solid fa-check"></fa-icon>
                        </div>
                    </grid-shortcut>
                </slot>
            </div>
            <slot v-if="items.length === 0" name="noItemsNotice">
                <div class="row"><div>No Items Available</div></div>
            </slot>
        </div>
    </div>
</template>

<script lang="ts">
export default
{
    props:
    {
        "items": { default: [], type: Array<any> },
        "currentItem": { default: undefined },
        "allowDeselect": { default: true }
    },
    // props:["items", "currentItem"],
    emits:["update:items", "update:currentItem"],
    data() 
    { 
        let data = { "opened": false };
        return data;
    },
    setup() { return; },
    methods:
    {
        onItemClicked(itemClicked:any)
        {
            if (this.allowDeselect && this.currentItem === itemClicked) { this.$emit('update:currentItem', undefined); }
            else this.$emit('update:currentItem', itemClicked);
            this.opened = false;
        }
    }
}
</script>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';
#root_custom_dropdown
{
    position:relative;
    width:fit-content;
    background:@backgroundDark;
    height:100%;
    user-select: none;

    #unselectOverlay { position:fixed; top:0; bottom:0; left:0; right:0; }
    #dropdownMenu 
    { 
        z-index:1000; max-height:250px; overflow:auto !important; 
        width:100%;
    }

    .checkIcon { transform: translateX(2px); }

    .row 
    { 
        appearance: none; border:0;
        background: @backgroundDark; 
        padding:5px;
        color:white;
        cursor:pointer;
        &:hover { background:@background; }
    }
}

@media only screen and (max-width: 600px) 
{
    #dropdownMenu 
    { 
        left:0px; bottom:0px; width:100vw; right:0px;
        position: fixed !important;
        border-top:3px solid @surfaceHigh;
        max-height:70vh !important;
        background: @backgroundDark;
        padding:5px;
        box-sizing: border-box !important;
    }

    #unselectOverlay
    {
        background: #000000AA;
    }
}
</style>