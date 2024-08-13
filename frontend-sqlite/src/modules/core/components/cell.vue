<template>
    <grid-shortcut id="panel" style="padding:15px; box-sizing:border-box; height:100%; gap:15px;" columns="minmax(0,1fr)" rows="auto minmax(0,1fr)">
        <grid-shortcut rows="1fr" columns="1fr auto">
            <div class="yCenter xLeft">
                <h2 class="panelTitle">{{ title.get() }}</h2>
            </div>
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
        </grid-shortcut>
        <slot></slot>
    </grid-shortcut>
</template>

<style lang="less" scoped>
@import '../stylesheets/globalStyle.less';
#panel
{
    .fullSize; .bg(@backgroundDark);
    box-sizing:border-box;
    .panelTitle { text-align:start; color:gray; font-size:14px; .tight; display:inline; }

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
            }
            .variantTab.selected { color:@focus; }
        }
    }
}
</style>

<script lang="ts" setup>
import { defineProperty } from '../utils/defineProperty';

const emit = defineEmits<
{
    (e: 'update:selectedOption', v: string): void
}>();

const props = defineProps<
{
    selectedOption: string | null,
    availableOptions: string[],
    title: string
}>();

const selectedOption = defineProperty("selectedOption", 
{
    default: props.availableOptions[0],
    emitFunc: emit,
    props: props,
    withEmits: true
});

const availableOptions = defineProperty("availableOptions", 
{   
    default: [] as string[],
    emitFunc: undefined,
    props: props,
    withEmits: false
});

const title = defineProperty("title", 
{   
    default: [] as string[],
    emitFunc: undefined,
    props: props,
    withEmits: false
});

</script>