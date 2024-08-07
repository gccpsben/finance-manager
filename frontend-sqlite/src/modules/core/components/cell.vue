<template>
    <grid-shortcut id="panel" style="padding:15px; box-sizing:border-box; height:100%; gap:15px;" columns="minmax(0,1fr)" rows="auto minmax(0,1fr)">
        <h2 class="panelTitle">{{ title }}</h2>
        <slot></slot>
    </grid-shortcut>
</template>

<script lang="ts">
export default
{
    // props: []"value7d", "valueAll", "value30d", "title"],
    props:
    {
        "title": { default: "Title", type: String },
    }
}
</script>

<style lang="less" scoped>
@import '../stylesheets/globalStyle.less';
#panel
{
    .fullSize; .bg(@backgroundDark);
    box-sizing:border-box;
    .panelTitle { text-align:start; color:gray; font-size:14px; .tight; display:inline; }
}
</style>