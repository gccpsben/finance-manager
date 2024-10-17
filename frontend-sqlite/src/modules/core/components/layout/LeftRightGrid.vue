<template>
    <div style="display: grid; grid-template-rows: 1fr;" :style="{gridTemplateColumns: computedColumns}">
        <slot></slot>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type LeftRightGridProps =
{
    columnWidthConfig: "AUTO" | "EQUAL" | "LEFT_AUTO" | "RIGHT_AUTO";
};

const props = defineProps<LeftRightGridProps>();
const computedColumns = computed(() =>
{
    const columnWidthConfig = props.columnWidthConfig;
    if (columnWidthConfig === 'AUTO')
        return "auto auto";
    if (columnWidthConfig === 'EQUAL')
        return '1fr 1fr';
    if (columnWidthConfig === 'LEFT_AUTO')
        return 'auto 1fr';
    if (columnWidthConfig === 'RIGHT_AUTO')
        return '1fr auto';
});
</script>