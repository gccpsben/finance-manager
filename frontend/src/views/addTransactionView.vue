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
                        <div :style="{'padding-left': props.isSelector ? '0px' : '5px'}">{{ props.item?.name }}</div>
                    </template>
                </custom-dropdown>
            </grid-shortcut>

            <grid-shortcut style="height:45px; margin-top:5px;" columns="100px 1fr" class="fullWidth">
                <div class="middleLeft">To:</div>
                <custom-dropdown :items="store.containers" v-model:currentItem="selectedToContainer" style="width:100%; height:100%;">
                    <template #itemToText="props">
                        <div :style="{'padding-left': props.isSelector ? '0px' : '5px'}">{{ props.item?.name }}</div>
                    </template>
                </custom-dropdown>
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
            selectedFromContainer: undefined,
            selectedToContainer: undefined
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
}
</style>