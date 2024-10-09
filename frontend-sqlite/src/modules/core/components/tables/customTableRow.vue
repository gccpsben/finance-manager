<template>
    <div class="customTableRowRoot">
        <slot></slot>
    </div>
</template>

<script lang="ts">
/** A row for use with `custom-table`. You can directly apply style via CSS to this component to change layout. */
export default {};
</script>

<!-- <script lang='ts' setup>
export type CustomTableRowProps =
{
    columns?: string|undefined;
    rows?: string|undefined;
    areas?: string|undefined;
};

defineProps<CustomTableRowProps>();
</script> -->

<style lang="less" scoped>
// Use ":where" to attach props to root.
// This will reduce this rule's specificity and to not enforce the use of "!important" outside.
:where(.customTableRowRoot)
{
    display: grid;
    grid-template-columns: inherit;
    grid-template-rows: inherit;
    grid-template-areas: inherit;
}
</style>
