<template>
    <div id="tabsContainerRoot" :style="{'grid-template-columns': columns}" v-if="items.length > 0">
        <div class="tab" :class="{'active': selectedItem == item}" 
        v-for="item in items" @click="$emit('update:selectedItem', item)">
            {{ item }}
        </div>
        <div class="emptySpace"></div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ selectedItem?: string, items?: string[] }>(), 
{
    items: () => [],
    selectedItem: ''
});

defineEmits<{
    (e: 'update:selectedItem', v: string): void,
    (e: 'update:items', v: string[]): void,
}>();

const columns = computed(() => `repeat(${props.items.length}, auto) 1fr`);
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

#tabsContainerRoot
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
</style>