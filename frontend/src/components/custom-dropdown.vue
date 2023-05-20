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
    <div @focusin="opened=true" @focusout="opened=false" id="topDiv" tabindex=0>
        <div @click="opened=!opened" style="height:100%;">
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
        <div id="dropdownMenu" v-if="opened" style="width:100%; position:absolute;">
            <div v-for="item in items" @click="$emit('update:currentItem', item); opened=false;">
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
        "currentItem": { default: undefined }
    },
    // props:["items", "currentItem"],
    emits:["update:items", "update:currentItem"],
    data() 
    { 
        var data = { "opened": false };
        return data;
    },
    setup(){ return; },
    computed: 
    { 
        
    }
}
</script>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';
#topDiv
{
    position:relative;
    width:fit-content;
    background:@backgroundDark;
    height:100%;

    #unselectOverlay { position:fixed; top:0; bottom:0; left:0; right:0; }
    #dropdownMenu { z-index:1000; max-height:250px; overflow:auto; }

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
</style>