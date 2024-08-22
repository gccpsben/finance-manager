<template>
    <div>
        <div class="variantSelectorsContainer">
            <div class="variantSelector" v-for="option in availableOptions.get()">
                <h2
                    :class="{'selected': selectedOption.get() == option}" 
                    @click="selectedOption.set(option)" 
                    class="graphPanelTitle variantTab">
                    {{ option }}
                </h2>
            </div>
        </div>        
    </div>
</template>

<style lang="less" scoped>
@import '../stylesheets/globalStyle.less';
.variantSelectorsContainer
{
    display: grid;
    gap: 4px;
    grid-template-rows: 1fr;
    grid-auto-columns: auto;
    grid-auto-flow: column;

    .variantSelector
    {        
        .variantTab 
        { 
            cursor: pointer; 
            color: gray; 
            display: inline-block;
            font-size:14px; 
            user-select: none;
            .yTop;
            font-weight: normal;
        }
        .variantTab.selected { color:@focus; }
    }
}
</style>

<script lang="ts" setup>
import { defineProperty } from '../utils/defineProperty';

const emit = defineEmits<
{
    (e: 'update:selectedOption', v: string): void
}>();

const props = withDefaults(defineProps<
{
    selectedOption: string | null,
    availableOptions: string[]
}>(), {});

const selectedOption = defineProperty<null | string, "selectedOption", typeof props>("selectedOption", 
{
    emitFunc: emit,
    props: props,
    withEmits: true
});

const availableOptions = defineProperty<string[], "availableOptions", typeof props>("availableOptions", 
{   
    emitFunc: undefined,
    props: props,
    withEmits: false
});

if (selectedOption.checkIsControlled() === false)
    selectedOption.uncontrolledRef.value = availableOptions.get()[0]
</script>