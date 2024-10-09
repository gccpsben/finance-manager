<template>
    <div class="customTableCellRoot">
        <slot></slot>
    </div>
</template>

<script lang="ts">
/** A row for use with `custom-table-row`. You can directly apply style via CSS to this component to change layout. */
export default {};
</script>

<script setup lang="ts">
const props = withDefaults(defineProps<{gridArea?: string}>(), { gridArea: 'unset' });
</script>

<style lang="less" scoped>
// Use ":where" to attach props to root.
// This will reduce this rule's specificity and to not enforce the use of "!important" outside.
:where(.customTableCellRoot) { grid-area: v-bind('props.gridArea'); overflow: hidden; }
</style>