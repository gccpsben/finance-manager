<template>
    <div rows="1fr" columns="1fr auto">
        <div class="pageSelector">
            <fa-icon-btn id="previousArrow"
                    :disabled="modelValue < minPageReadable"
                    @click="$emit('update:modelValue', modelValue - 1)"
                    icon="fa-solid fa-chevron-left" />
            <input  id="currentPage"
                    ref="currentPage"
                    type="number"
                    :min="minPageReadable.toString()"
                    :max="maxPageReadable.toString()"
                    v-int-only size="1" v-model.lazy.number="pageReadable">
            <fa-icon-btn id="nextArrow"
                    :disabled="modelValue >= maxPageReadable - 1"
                    @click="$emit('update:modelValue', modelValue + 1)"
                    icon="fa-solid fa-chevron-right" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref, type PropType } from 'vue';

const currentPage = ref<HTMLInputElement>(null!);
const emit = defineEmits(['update:modelValue']);
const props = defineProps
(
    {
        modelValue: // count from 0
        {
            type: Number,
            default: 0
        },
        minPageReadable: // count from 1
        {
            type: Number,
            default: 1,
        },
        maxPageReadable: // count from 1
        {
            type: Number,
            default: 9,
        }
    }
);

const pageReadable = computed(
{
    get() { return props.modelValue + 1; },
    set(value:number)
    {
        if (value < props.minPageReadable)
        {
            currentPage.value.value = props.minPageReadable.toString();
            emit("update:modelValue", props.minPageReadable - 1);
        }
        else if (value > props.maxPageReadable)
        {
            currentPage.value.value = props.maxPageReadable.toString();
            emit("update:modelValue", props.maxPageReadable - 1);
        }
        else emit("update:modelValue", value - 1);
    }
});
</script>

<style lang="less">
@import "@/modules/core/stylesheets/globalStyle.less";

.pageSelector
{
    color:gray !important;
    transform: translateY(-1px);
}
input
{
    outline: none;
    appearance: none;
}
#currentPage { .horiMargin(4px); font-size:16px; min-width:15px; display:inline-block; text-align: center; }
*[disabled] { pointer-events: none; opacity:0.2; }
</style>