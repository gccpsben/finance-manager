<template>
    <div class="fullSize" >
        <fieldset class="rootFieldset" :class="{'float': shouldTextFloat.get(), 'highlighted': shouldHighlight.get()}"
            :style="fieldsetRootStyleOverrideObj">
            <legend v-if="shouldTextFloat.get()" ref="legend">{{ fieldName.get() }}</legend>
            <div ref="contentPanel" class="contentPanel fullSize">
                <div class="contentPanelInner fullSize" v-area="'main'">
                    <slot name="content" :ref="'textFieldInput'"></slot>
                    <div class="center">
                        <slot name="fieldActions"></slot>
                    </div>
                </div>
                <div ref="placeholderText" v-basic="'.placeholderText'" v-area="'main'"
                    :style="placeholderTextStyleOverrideObj" >{{ fieldName.get() }}</div>
                <div ref="unscaledPlaceholderText" v-basic="'.unscaledPlaceholderText'" v-area="'main'">
                    {{ fieldName.get() }}
                </div>
            </div>
        </fieldset>
    </div>
</template>

<script lang="ts" setup>
import vBasic from '@/modules/core/directives/vBasic';
import vArea from '@/modules/core/directives/vArea';
import { useElementSize } from '@vueuse/core';
import { ref, computed } from 'vue';
import { defineProperty } from '../../utils/defineProperty';
import tinycolor from "tinycolor2";

export type TextFieldProps =
{
    fieldName?: string,
    overrideThemeColor?: string | undefined,
    shouldTextFloat: boolean,
    shouldHighlight: boolean
};

const props = withDefaults(defineProps<TextFieldProps>(),
{
    fieldName: 'Placeholder here',
    overrideThemeColor: undefined,
    shouldTextFloat: false,
    shouldHighlight: false
});
const fieldName = defineProperty<string, "fieldName", typeof props>(
    "fieldName",
    { emitFunc: undefined, props: props, default: 'Placeholder here' }
);
const overrideThemeColor = defineProperty<string | undefined, "overrideThemeColor", typeof props>(
    "overrideThemeColor",
    { emitFunc: undefined, props: props, default: undefined }
);
const shouldTextFloat = defineProperty<boolean, "shouldTextFloat", typeof props>(
    "shouldTextFloat",
    { emitFunc: undefined, props: props, default: false }
);
const shouldHighlight = defineProperty<boolean, "shouldHighlight", typeof props>(
    "shouldHighlight",
    { emitFunc: undefined, props: props, default: false }
);

const placeholderText = ref(null);
const unscaledPlaceholderText = ref(null);
const contentPanel = ref(null);
const legend = ref(null);

const { height: unscaledPlaceholderTextHeight } = useElementSize(unscaledPlaceholderText);
const { height: legendHeight, width: legendWidth } = useElementSize(legend);
const { height: contentPanelHeight } = useElementSize(contentPanel);

const rootYOffsetStyle = computed(() => `translateY(-${legendHeight.value / 2}px)`);
const rootHeightOffsetStyle = computed(() => `calc(100% + ${legendHeight.value / 2}px)`);
const contentYOffsetStyle = computed(() => `translateY(-${legendHeight.value / 2}px)`);
const contentHeightOffsetStyle = computed(() => `calc(100% + ${legendHeight.value / 2}px)`);
const placeholderTextYOffsetStyle = computed(() =>
{
    if (shouldTextFloat.get()) return "translateY(calc(-50% - 1px))";
    return `translateY(${(contentPanelHeight.value - unscaledPlaceholderTextHeight.value) / 2}px)`
});
const fieldsetRootStyleOverrideObj = computed(() => // a style object overriding the style of fieldsetRoot base on props
{
    return overrideThemeColor.get() && shouldHighlight.get()
    ? { 'border-color': overrideThemeColor.get() }
    : { };
});
const placeholderTextStyleOverrideObj = computed(() => // a style object overriding the style of placeholderText base on props
{
    return overrideThemeColor.get() && shouldHighlight.get()
    ? { 'color': "#" + tinycolor(overrideThemeColor.get()).lighten(30).toHex() }
    : { };
});

</script>

<style lang="less" scoped>
// Default variables, the @import below will override these if defined
@customFieldsetFocusThemeColor: cyan;
@customFieldsetLegendLeftPadding: 5px;
@customFieldsetLegendRightPadding: 5px;
@customFieldsetLegendLeftMargin: 5px;
@customFieldsetInputLeftPadding: 10px;
@customFieldsetInputRightPadding: 10px;
@customFieldsetFloatingTextFontSize: 12px;
@customFieldsetNonfloatingTextFontSize: 14px;
@customFieldsetPlaceholderColor: #606060;

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
    &.highlighted { border-color: @customFieldsetFocusThemeColor; }

    input::placeholder { color: @customFieldsetPlaceholderColor; }

    legend
    {
        // This element is invisible to the user, only to serve as the blocking element for the border
        color: transparent;
        font-size: @customFieldsetFloatingTextFontSize;
        margin-left: @customFieldsetLegendLeftMargin;
        padding-left: @customFieldsetLegendLeftPadding;
        padding-right: @customFieldsetLegendRightPadding;
        z-index: 999;
        text-align: left;
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

        .placeholderText
        {
            pointer-events: none;
            padding-left: @customFieldsetInputLeftPadding;
            padding-right: @customFieldsetInputRightPadding;
            font-size: @customFieldsetNonfloatingTextFontSize;
            height: fit-content;
            width: fit-content;
            transition: all 0.5s ease;
            transform: v-bind(placeholderTextYOffsetStyle);
            color: @customFieldsetPlaceholderColor;
            white-space: nowrap;
        }

        .unscaledPlaceholderText
        {
            opacity: 0;
            font-size: @customFieldsetNonfloatingTextFontSize;
            height: fit-content;
            width: fit-content;
            pointer-events: none;
        }
    }

    &.highlighted
    {
        .placeholderText
        {
            color: lighten(@customFieldsetFocusThemeColor, 30%);
        }
    }

    &.float
    {
        .placeholderText
        {
            font-size: @customFieldsetFloatingTextFontSize;
        }
    }
}
</style>