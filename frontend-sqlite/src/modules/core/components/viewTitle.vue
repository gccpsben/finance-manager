<template>
    <div id="container">
        <div id="innerContainer">
            <div class="titleContainer">
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
@import '@/modules/core/stylesheets/globalStyle.less';

#container
{
    container-type: inline-size;
    container-name: viewTitleContainer;
}

#innerContainer
{
    display:grid; gap:15px;
    grid-template-columns: 1fr; grid-template-rows: auto 1fr;
    .fullWidth; padding-bottom: 30px;
    font-family: @font;
    
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
        color:white; 
        font-size:24px; 
        font-weight: 300; 
        .tight;
    }

    .titleContainer { .xLeft; }
}

@container viewTitleContainer (width <= 400px)
{
    #innerContainer
    {
        position: sticky;
        padding-top:14px;
        padding-bottom:26px;
        #title { font-weight: 500; }
    }
}
</style>