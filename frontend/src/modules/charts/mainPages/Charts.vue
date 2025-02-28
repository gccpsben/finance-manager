<template>
    <div id="chartsTopDiv">
        <div id="chartsTopDivInner">
            <div id="titleArea">
                <ViewTitle :title="'Charts'" />
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

* { box-sizing: border-box; }
@mobileCutoffWidth: 650px;
@bodyRowHeight: 60px;

#chartsTopDiv
{
    container-name: chartsPage;
    container-type: size;

    overflow-x:hidden;
    .fullSize;
    font-family: @font;

    #chartsTopDivInner
    {
        .fullSize;
        overflow: auto;
        color: @foreground;

        #titleArea
        {
            padding: @desktopPagePadding;
        }
    }
}

@container chartsPage (width <= @mobileCutoffWidth)
{
    #titleArea { padding: @mobilePagePadding !important; }
}
</style>

<script setup lang="ts">
import ViewTitle from '@/modules/core/components/data-display/ViewTitle.vue';
</script>