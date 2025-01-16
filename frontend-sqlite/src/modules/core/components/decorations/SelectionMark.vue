<script setup lang="ts">
import GaIcon from './GaIcon.vue';
</script>

<template>
    <div class="selectionMarkRoot">
        <GaIcon class="selectionCheckmark" icon="check"/>
    </div>
</template>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

.selectionMarkRoot
{
    .fullSize;
    .center;
    pointer-events: none;

    .selectionCheckmark
    {
        font-size: 24px;
        background: @focusDark;
        border-radius: 100%;
        color: @focus;
        padding: 4px;
        user-select: none;
    }
}
</style>