<template>
    <grid-shortcut class="panel" style="padding:15px; box-sizing:border-box; height:100%; gap:15px;" columns="minmax(0,1fr)" rows="auto minmax(0,1fr)">
        <grid-shortcut rows="1fr" columns="1fr auto">
            <div class="yCenter xLeft">
                <template v-if="icon && icon.type === 'FontAwesome'">
                    <fa-icon style="font-size:12px; color:white; margin-right: 14px;" :icon="`fa-solid ${icon.name}`" />
                </template>
                <template v-else-if="icon && icon.type === 'Google'">
                    <ga-icon style="font-size:12px; color:white; margin-right: 14px;" :icon="`${icon.name}`" />
                </template>
                <h2 class="panelTitle">{{ title.get() }}</h2>
            </div>
            <div>
                <slot name="cellOptions"></slot>
            </div>
        </grid-shortcut>
        <slot></slot>
    </grid-shortcut>
</template>

<style lang="less" scoped>
// Default values before importing globalStyle.
@cellHeaderColor: white;
@cellBackground: #0f0f0f;

@import '../stylesheets/globalStyle.less';
.panel
{
    .fullSize; 
    .bg(@cellBackground);
    box-sizing:border-box;
    font-family: @font;
    font-weight: normal;

    .panelTitle 
    { 
        color: @cellHeaderColor;
        text-align:start; 
        font-size:14px; 
        .tight; 
        display:inline; 
        font-weight: inherit;
    }
    box-shadow: 0px 0px 15px #050505;

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
            }
            .variantTab.selected { color:@focus; }
        }
    }
}
</style>

<script lang="ts" setup>
import { defineProperty } from '../utils/defineProperty';

export type IconType = "Google" | "FontAwesome";

const props = withDefaults(defineProps<
{
    title: string,
    icon?: { type: IconType, name: string } | undefined
}>(), { title: "No Title", icon: undefined });

const title = defineProperty<string, "title", typeof props>("title", 
{   
    emitFunc: undefined,
    props: props,
    withEmits: false
});
</script>