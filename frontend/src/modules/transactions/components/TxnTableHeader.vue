<template>
    <div id="tableHeader" class="headerRow fullSize" style="font-weight: bold;">
        <div grid-area="name" class="yCenter xLeft headerRowName">Name</div>
        <div grid-area="fromTo" class="yCenter xLeft headerRowFromTo">From - To</div>
        <div grid-area="valueChange" class="yCenter xRight headerRowValueChange">Δ Value</div>
    </div>
</template>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
@mobileCutoffWidth: 650px;

#tableHeader
{
    .horiPadding(@desktopPagePadding);
    overflow: hidden;
    box-shadow: 0px 4px 5px -4px black;
    border-bottom: 1px solid @border;
    height: min-content;
    .vertPadding(15px);
    display: grid;
    grid-template-columns: 1fr 130px 85px;
}

@container transactionsPage (width <= @mobileCutoffWidth)
{
    // Hide the column "from / to"
    .headerRow { grid-template-columns: 1fr max-content !important; }
    .headerRowFromTo { display: none; }
    .headerRow { .horiPadding(@mobilePagePadding) !important; }
}
</style>