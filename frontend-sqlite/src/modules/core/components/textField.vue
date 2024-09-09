<template>
    <div>
        <fieldset class="rootFieldset" :class="{'float': shouldTextFloat, 'highlighted': shouldHighlight}" 
                  :style="fieldsetRootStyleOverrideObj">
            <legend v-if="shouldTextFloat" ref="legend">{{ fieldName.get() }}</legend>
            <div ref="contentPanel" class="contentPanel fullSize">
                <div class="contentPanelInner fullSize" v-area="'main'">
                    <input :type="inputType.get()" 
                           ref="textFieldInput" 
                           class="textFieldInput" 
                           :value="text.get()" 
                           :readonly="readonly.get()"
                           :disabled="disabled.get()"
                           @focus="$emit('focus')"
                           @blur="$emit('blur')"
                           @keyup="text.set(($event.target as HTMLInputElement).value!)" 
                           :placeholder="textFieldInputIsFocused ? placeholder.get() : ''"/>
                    <div class="center">
                        <slot name="fieldActions"></slot>
                    </div>
                </div>
                <div ref="placeholderText" v-basic="'.placeholderText'" v-area="'main'" :style="placeholderTextStyleOverrideObj" >{{ fieldName.get() }}</div>
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
import type { HTMLInputType } from '@/shims-vue';
import tinycolor from "tinycolor2";

const props = withDefaults(defineProps<
{ 
    text: string|null, 
    fieldName: string, 
    inputType: HTMLInputType, 
    overrideThemeColor: string | undefined,
    placeholder: string | undefined,
    disabled: boolean | undefined,
    readonly: boolean | undefined
}>(), 
{ 
    text: null, 
    fieldName: 'Placeholder here',
    inputType: 'text',
    overrideThemeColor: undefined,
    placeholder: undefined,
    disabled: false,
    readonly: false
});
const emit = defineEmits<
{ 
    (e: 'update:text', v: string): void,
    (e: 'focus'):void,
    (e: 'blur'):void
}>();
const text = defineProperty<null | string, "text", typeof props>("text", { emitFunc: emit, props: props, withEmits: true });
const placeholder = defineProperty<undefined | string, "placeholder", typeof props>("placeholder", { emitFunc: undefined, props: props, withEmits: false });
const fieldName = defineProperty<string, "fieldName", typeof props>("fieldName", { emitFunc: undefined, props: props, withEmits: false });
const inputType = defineProperty<HTMLInputType, "inputType", typeof props>("inputType", { emitFunc: undefined, props: props, withEmits: false });
const overrideThemeColor = defineProperty<string | undefined, "overrideThemeColor", typeof props>("overrideThemeColor", { emitFunc: undefined, props: props, withEmits: false });
const disabled = defineProperty<boolean | undefined, "disabled", typeof props>("disabled", { emitFunc: undefined, props: props, withEmits: false });
const readonly = defineProperty<boolean | undefined, "readonly", typeof props>("readonly", { emitFunc: undefined, props: props, withEmits: false });

const textFieldInput = ref(null);
const placeholderText = ref(null);
const unscaledPlaceholderText = ref(null);
const contentPanel = ref(null);
const legend = ref(null);

const { focused:textFieldInputIsFocused } = useFocus(textFieldInput);
const { focused:placeholderTextIsFocused } = useFocus(placeholderText);
const { height: unscaledPlaceholderTextHeight } = useElementSize(unscaledPlaceholderText);
const { height: legendHeight, width: legendWidth } = useElementSize(legend);
const { height: contentPanelHeight } = useElementSize(contentPanel);

const rootYOffsetStyle = computed(() => `translateY(-${legendHeight.value / 2}px)`);
const rootHeightOffsetStyle = computed(() => `calc(100% + ${legendHeight.value / 2}px)`);
const contentYOffsetStyle = computed(() => `translateY(-${legendHeight.value / 2}px)`);
const contentHeightOffsetStyle = computed(() => `calc(100% + ${legendHeight.value / 2}px)`);
const placeholderTextYOffsetStyle = computed(() => 
{
    if (shouldTextFloat.value) return "translateY(calc(-50% - 1px))";
    return `translateY(${(contentPanelHeight.value - unscaledPlaceholderTextHeight.value) / 2}px)`
});
const fieldsetRootStyleOverrideObj = computed(() => // a style object overriding the style of fieldsetRoot base on props
{
    return overrideThemeColor.get() && shouldHighlight.value
    ? { 'border-color': overrideThemeColor.get() }
    : { };
});
const placeholderTextStyleOverrideObj = computed(() => // a style object overriding the style of placeholderText base on props
{
    return overrideThemeColor.get() && shouldHighlight.value
    ? { 'color': "#" + tinycolor(overrideThemeColor.get()).lighten(30).toHex() }
    : { };
});

const shouldTextFloat = computed(() => 
{
    if (textFieldInputIsFocused.value || placeholderTextIsFocused.value) return true;
    if (text.get()) return true;
    return false;
});
const shouldHighlight = computed(() => 
{
    if (textFieldInputIsFocused.value) return true;
    return false;
});

function parseColor(input:string) 
{
    var div = document.createElement('div'), m;
    div.style.color = input;
    m = getComputedStyle(div).color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if( m) return [m[1],m[2],m[3]];
    else throw new Error("Colour "+input+" could not be parsed.");
}
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
@textFieldPlaceholderColor: #606060;

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
    &.highlighted { border-color: @textFieldFocusThemeColor; }

    input::placeholder { color: @textFieldPlaceholderColor; }

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

        .contentPanelInner
        {
            display: grid;
            grid-template-columns: 1fr auto;
            grid-template-rows: 1fr;
        }

        .textFieldInput
        {
            .fullSize;
            outline: none;
            appearance: none;
            padding-left: @textFieldInputLeftPadding;
            padding-right: @textFieldInputRightPadding;
            &:read-only { opacity: 0.4; }
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
            color: @textFieldPlaceholderColor;
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

    &.highlighted
    {
        .placeholderText 
        { 
            color: lighten(@textFieldFocusThemeColor, 30%);
        }
    }

    &.float
    {
        .placeholderText 
        { 
            font-size: @textFieldFloatingTextFontSize; 
        }
    }
}
</style>