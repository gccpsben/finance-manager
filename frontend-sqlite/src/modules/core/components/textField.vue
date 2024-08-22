<template>
    <div>
        <fieldset class="rootFieldset" :class="{'float': shouldTextFloat}">
            <legend v-if="shouldTextFloat" ref="legend">
                {{ fieldName.get() }}
            </legend>
            <div ref="contentPanel" class="contentPanel fullSize">
                <input ref="textFieldInput" class="textFieldInput" v-area="'main'" :value="text.get()" @keyup="text.set(($event.target as HTMLInputElement).value!)"/>
                <div ref="placeholderText" v-basic="'.placeholderText'" v-area="'main'">{{ fieldName.get() }}</div>
                <div ref="unscaledPlaceholderText" v-basic="'.unscaledPlaceholderText'" v-area="'main'">{{ fieldName.get() }}</div>
            </div>
        </fieldset>
    </div>
</template>

<script lang="ts" setup>
import vBasic from '@/modules/core/directives/vBasic';
import vArea from '@/modules/core/directives/vArea';
import { useElementSize, useFocus } from '@vueuse/core';
import { ref, computed } from 'vue';
import { defineProperty } from '../utils/defineProperty';

const props = withDefaults(defineProps<{ text: string|null, fieldName: string }>(), { text: null, fieldName: 'Placeholder here'});
const emit = defineEmits<{ (e: 'update:text', v: string): void }>();
const text = defineProperty<null | string, "text", typeof props>("text", { emitFunc: emit, props: props, withEmits: true });
const fieldName = defineProperty<string, "fieldName", typeof props>("fieldName", { emitFunc: undefined, props: props, withEmits: true });

const textFieldInput = ref(null);
const placeholderText = ref(null);
const unscaledPlaceholderText = ref(null);
const contentPanel = ref(null);
const legend = ref(null);

const { focused:textFieldInputIsFocused } = useFocus(textFieldInput);
const { focused:placeholderTextIsFocused } = useFocus(placeholderText);
const { height: placeholderTextHeight, width: placeholderTextWidth } = useElementSize(placeholderText);
const { height: unscaledPlaceholderTextHeight } = useElementSize(unscaledPlaceholderText);
const { height: legendHeight, width: legendWidth } = useElementSize(legend);
const { height: contentPanelHeight } = useElementSize(contentPanel);

const rootYOffsetStyle = computed(() => `translateY(-${legendHeight.value / 2}px)`);
const rootHeightOffsetStyle = computed(() => `calc(100% + ${legendHeight.value / 2}px)`);
const contentYOffsetStyle = computed(() => `translateY(-${legendHeight.value / 2}px)`);
const contentHeightOffsetStyle = computed(() => `calc(100% + ${legendHeight.value / 2}px)`);
const placeholderTextYOffsetStyle = computed(() => 
{
    if (shouldTextFloat.value) return "translateY(-50%)";
    return `translateY(${(contentPanelHeight.value - unscaledPlaceholderTextHeight.value) / 2}px)`
});

const shouldTextFloat = computed(() => 
{
    if (textFieldInputIsFocused.value || placeholderTextIsFocused.value) return true;
    if (text.get()) return true;
    return false;
});

// const 

</script>

<style lang="less" scoped>
// Default variables, the @import below will override these if defined
@textFieldFocusThemeColor: cyan;
@textFieldLegendLeftPadding: 5px;
@textFieldLegendRightPadding: 5px;
@textFieldLegendLeftMargin: 5px;
@textFieldInputLeftPadding: 10px;
@textFieldInputRightPadding: 10px;
@textFieldFloatingTextFontSize: 12px;
@textFieldNonfloatingTextFontSize: 14px;

@import "@/modules/core/stylesheets/globalStyle.less";

.rootFieldset
{
    height: v-bind(rootHeightOffsetStyle);
    transform: v-bind(rootYOffsetStyle);
    background: #151515;
    border: 1px solid @border;
    font-family: @font;
    font-weight: 100;
    transition: border-color 0.5s ease;
    &.float { border-color: @textFieldFocusThemeColor; }

    legend
    {
        // This element is invisible to the user, only to serve as the blocking element for the border
        color: transparent;
        font-size: @textFieldFloatingTextFontSize;
        margin-left: @textFieldLegendLeftMargin;
        padding-left: @textFieldLegendLeftPadding;
        padding-right: @textFieldLegendRightPadding;
        z-index: 999;
    }

    .contentPanel
    {
        transform: v-bind(contentYOffsetStyle);
        height: v-bind(contentHeightOffsetStyle);
        display: grid; grid-template-columns: 1fr; grid-template-rows: 1fr; grid-template-areas: 'main';

        .textFieldInput
        {
            .fullSize;
            outline: none;
            appearance: none;
            padding-left: @textFieldInputLeftPadding;
            padding-right: @textFieldInputRightPadding;
        }

        .placeholderText
        {
            pointer-events: none;
            padding-left: @textFieldInputLeftPadding;
            padding-right: @textFieldInputRightPadding;
            font-size: @textFieldNonfloatingTextFontSize;
            height: fit-content;
            width: fit-content;
            transition: all 0.5s ease;
            transform: v-bind(placeholderTextYOffsetStyle);
            color: white;
        }

        .unscaledPlaceholderText
        {
            opacity: 0;
            font-size: @textFieldNonfloatingTextFontSize;
            height: fit-content;
            width: fit-content;
            pointer-events: none;
        }
    }

    &.float
    {
        .placeholderText 
        { 
            font-size: @textFieldFloatingTextFontSize; 
            color: lighten(@textFieldFocusThemeColor, 30%);
        }
    }
}
</style>