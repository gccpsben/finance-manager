<template>
    <div class="customTableRoot">
        <div v-if="'header' in $slots" class="fullSize">
            <slot name="header"></slot>
        </div>
        <slot name="bodyOuter">
            <div v-if="'body' in $slots" class="fullSize" style="display: grid;" :style="{'gridAutoRows': bodyRows}">
                <slot name="body"></slot>
            </div>
        </slot>
        <div v-if="'footer' in $slots" class="fullSize">
            <slot name="footer"></slot>
        </div>
    </div>
</template>

<script lang="ts" setup>
export type CustomTableProps =
{
    rowColumns?: string|undefined;
    rowRows?: string|undefined;
    rowAreas?: string|undefined;
    bodyRows?: string|undefined;
    columns?: string|undefined;
    rows?: string|undefined;
    areas?: string|undefined;
};

defineProps<CustomTableProps>();
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
* { box-sizing: border-box };

.customTableRoot
{
    display: grid;
    .fullSize;
    color: @foreground;
    grid-template-columns: v-bind(columns);
    grid-template-rows: v-bind(rows);
    grid-template-areas: v-bind(areas);

    :deep(.customTableRowRoot)
    {
        grid-template-columns: v-bind(rowColumns);
        grid-template-rows: v-bind(rowRows);
        grid-template-areas: v-bind(rowAreas);
    }
}
</style>