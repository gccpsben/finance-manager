<script setup lang="ts">
import { computed, ref } from 'vue';
import CustomFieldset from '../data-display/CustomFieldset.vue';
import CustomChip from '../data-display/CustomChip.vue';
import { defineProperty, Uncontrolled } from '../../utils/defineProperty';

// #region Props and Emits declaration
export type ChipsSelectorEmits = { (e: 'update:values', v: string): void, (e: 'focus'):void, (e: 'blur'):void };
export type ChipOption =
{
    searchTerms?: string | undefined,
    label: string,
    value: string,
    color?: string | undefined
};
export type ChipsSelectorProps =
{
    values?: string[] | typeof Uncontrolled,
    options: ChipOption[],
    fieldName: string
}
const emit = defineEmits<ChipsSelectorEmits>();
const props = withDefaults(defineProps<ChipsSelectorProps>(), { values: Uncontrolled });
const values = defineProperty<string[], "values", typeof props>(
    "values", { emitFunc: emit, props: props, default: [] }
);
const options = defineProperty<ChipOption[], "options", typeof props>(
    "options", { emitFunc: undefined, props: props, default: [] }
);
// #endregion

const optionValuePairs = computed(() => options.get().map(item =>
{
    let optionObj = options.get().find(t => t.value === item.value);
    return {
        id: optionObj!.value,
        color: optionObj!.color,
        label: optionObj!.label,
        isSelected: values.get().includes(item.value)
    }
}));
const toggleSelection = (value: string) =>
{
    let isSelected = values.get().includes(value);
    if (isSelected) values.set(values.get().filter(item => item !== value));
    else values.set([...values.get(), value]);
};
</script>

<style lang="less" scoped>
@import "@/modules/core/stylesheets/globalStyle.less";

.chipSelectorRoot { cursor: pointer; }
.chipSelectorInput
{
    appearance: none;
    outline: none;
    .fullSize;
    padding-left: 14px;
}
.chipSelectorChips
{
    &:not(.selected) { opacity: 0.3; }
    &:hover { opacity: 0.6; }
    &.selected { opacity: 1; }
    transition: all 0.1s ease;
    font-size: 12px;
}
</style>

<template>
     <CustomFieldset class="chipSelectorRoot" tabindex="0" :should-text-float="true"
                     :should-highlight="false" :field-name="fieldName">
        <template #content>
            <div style="padding: 14px; padding-bottom: 0px; text-align: start; transform: translateY(9px)">
                <template v-for="item in optionValuePairs">
                        <CustomChip :background="item.color"
                                    :foreground="'white'"
                                    class="chipSelectorChips"
                                    :class="{'selected': item.isSelected}"
                                    :label="item.label"
                                    @click="toggleSelection(item.id)"/>
                </template>
            </div>
        </template>
    </CustomFieldset>
</template>