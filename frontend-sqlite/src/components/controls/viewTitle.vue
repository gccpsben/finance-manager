<template>
    <div id="container">
        <div class="xLeft">
            <h3 id="title">{{ title }}</h3>
        </div>
        <div id="tabsContainer" :style="{'grid-template-columns': columns}" v-if="items.length > 0">
            <div class="tab" :class="{'active': selectedItem == item}" 
            v-for="item in items" @click="$emit('update:selectedItem', item)">
                {{ item }}
            </div>
            <div class="emptySpace"></div>
        </div>
    </div>
</template>

<script lang="ts">
export default
{
    props: 
    {
        "title": { type: String },
        "selectedItem": { type: String, default: '' },
        "items": { type: Array<String>, default: [] }
    },
    emits: ["update:selectedItem", "update:items"],
    computed:
    {
        columns() { return `repeat(${this.items.length}, auto) 1fr`; }
    }
}
</script>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';

#container
{
    display:grid; gap:15px;
    grid-template-columns: 1fr; grid-template-rows: auto 1fr;
    .fullWidth; padding-bottom: 30px;
    
    #tabsContainer
    {
        .fg(@foreground); font-weight:100; box-sizing: content-box;
        .fullWidth; position: relative; font-size:14px; display:grid;
        grid-template-rows: 1fr;
        
        div { border-bottom: 2px solid @border; }
        .emptySpace { .fullWidth; }

        .tab
        {
            padding: 10px 15px 10px 15px; cursor: pointer;
            width:max-content;
            &.active { border-color: @focus; }
            &:hover { background: @surfaceHigh; }
        }
    }

    #title 
    { 
        color:white; font-size:24px; font-weight: 300; 
        font-family: 'Lato', sans-serif; 
        font-family: 'Roboto', sans-serif; 
        .tight;
    }
}
</style>