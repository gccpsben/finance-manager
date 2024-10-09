<template>
    <div class="overlapAreaRoot">
        <slot></slot>
    </div>
</template>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

.overlapAreaRoot
{
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: 'main';
}

:deep(& > *) { grid-area: main !important; }
</style>