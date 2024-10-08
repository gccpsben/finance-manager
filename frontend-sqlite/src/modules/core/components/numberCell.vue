<template>
    <cell :title="title" :icon="icon" :inset-mode="insetMode">
        <div v-if="!isLoading && !networkError" class="fullHeight xLeft">
            <h2 class="variantSelectorTab">{{ currentValue?.toFixed(2) }}</h2>
        </div>
        <div v-else class="fullHeight">
            <networkCircularIndicator :error="networkError" :isLoading="isLoading" class="fullHeight"/>
        </div>
        <template #cellOptions>
            <variantsSelector :available-options="Object.keys(optionValues)"
                              :selected-option="selectedOption.get()"
                              @update:selected-option="selectedOption.set($event)"/>
        </template>
    </cell>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { defineProperty, Uncontrolled } from '../utils/defineProperty';
import networkCircularIndicator from './networkCircularIndicator.vue';
import variantsSelector from './variantsSelector.vue';
import cell, { type IconType } from '@/modules/core/components/cell.vue';

export type NumberCellProps =
{
    title: string,
    isLoading: boolean,
    networkError?: any,
    icon?: { type: IconType, name: string },
    insetMode?: boolean,
    selectedOption?: string | typeof Uncontrolled,
    optionValues: {[option: string]: number}
};

export type NumberCellEmits =
{
    (e: 'update:selectedOption', v: string): void
};

const props = withDefaults(defineProps<NumberCellProps>(),
{
    icon: undefined,
    insetMode: false,
    networkError: undefined,
    selectedOption: Uncontrolled
});

const emit = defineEmits<NumberCellEmits>();
const selectedOption = defineProperty<string, "selectedOption", typeof props>("selectedOption",
{
    emitFunc: emit,
    props: props,
    default: Object.keys(props.optionValues)[0]
});

const currentValue = computed(() => props.optionValues[selectedOption.get()]);
</script>

<style lang="less" scoped>
@import '../stylesheets/globalStyle.less';
.variantSelectorTab
{
    font-weight: normal;
}
</style>