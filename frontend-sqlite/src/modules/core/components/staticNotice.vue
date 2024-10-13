<template>
    <div :style="{color: color}">
        <div>
            <template v-if="type === 'ERR'">
                <span class="material-symbols-outlined">error</span>
            </template>
            <template v-else-if="type === 'WARN'">
                <span class="material-symbols-outlined">warn</span>
            </template>
            <template v-else-if="type === 'INFO'">
                <span class="material-symbols-outlined">info</span>
            </template>
            <template v-else-if="type === 'QUESTION'">
                <span class="material-symbols-outlined">question</span>
            </template>
        </div>
        <div class="label">
            <slot></slot>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
* { box-sizing: border-box; color: inherit; };
.label { font-family: @font; }
</style>

<script setup lang="ts">
import { computed } from 'vue';

export type StaticNoticeType = "ERR" | "WARN" | "INFO" | "QUESTION";
export type StaticErrorNoticeProps = { type: StaticNoticeType };
const props = defineProps<StaticErrorNoticeProps>();

const color = computed(() =>
{
    if (props.type === 'ERR') return 'pink';
    else if (props.type === 'INFO' || props.type === 'QUESTION') return 'cyan';
    else return 'orange';
});
</script>