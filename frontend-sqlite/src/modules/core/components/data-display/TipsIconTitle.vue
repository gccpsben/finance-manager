<template>
    <div style="display: grid; grid-template-columns: auto 1fr; grid-template-rows: 1fr; gap: 6px;">
        <slot></slot>
        <div class="yCenter">
            <TipsIcon>
                <slot name="tipsContent"></slot>
            </TipsIcon>
        </div>
    </div>
</template>

<script setup lang="ts">
import TipsIcon from './TipsIcon.vue';
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
</style>