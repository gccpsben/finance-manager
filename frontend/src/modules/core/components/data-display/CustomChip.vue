<template>
    <div class="customChipRoot" :style="{ background: props.background, color: props.foreground }">
        <slot>
            <div>
                {{ props.label }}
            </div>
        </slot>
    </div>
</template>

<style lang="less" scoped>
@import "@/modules/core/stylesheets/globalStyle.less";

.customChipRoot
{
    padding:6px;
    padding-left: 10px;
    padding-right: 10px;
    color:white;
    margin:4px;
    border-radius: 4px;
    min-width: 10px;
    width: fit-content;
    height: min-content;
    display: inline-block;
    user-select: none;
}
</style>

<script setup lang="ts">
export type CustomChipProps =
{
    label: string,
    background?: string | undefined,
    foreground?: string | undefined
};
const props = defineProps<CustomChipProps>();
</script>