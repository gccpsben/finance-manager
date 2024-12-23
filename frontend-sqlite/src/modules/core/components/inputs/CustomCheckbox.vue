<template>
    <div id="checkboxRoot" @click="valueModel! = !valueModel">
        <div class="center">
            <div id="checkboxInner" :class="{'active': valueModel}">
                <div id="check"></div>
            </div>
        </div>
        <div class="yCenter">
            <slot name="contentOuter">
                <div class="yCenter">
                    <slot></slot>
                </div>
            </slot>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

export interface Props { value?: boolean; checkboxSize?: string;padding?: string; }

const props = withDefaults(defineProps<Props>(), { checkboxSize: "16px"});
const valueModel = defineModel<boolean>('modelValue');
const computedPadding = computed(() => `${props.padding ?? '5px'}`);
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

* { box-sizing: border-box }

#checkboxRoot
{
    cursor:pointer;
    user-select: none;
    padding: v-bind(computedPadding);
    display:grid;
    gap:8px;
    grid-template-columns: v-bind(checkboxSize) 1fr;
    grid-template-rows: auto;
    color: @foreground;

    // &:hover { color: saturate(lighten(@primaryColor, 20%), 20%); }

    #checkboxInner
    {
        background: @checkboxBackground;
        border: @checkboxBorder;
        padding:@checkboxInnerPadding;
        .squareSize(v-bind(checkboxSize));

        &:not(.active)
        {
            #check
            {
                opacity: 0;
                transform: scale(0);
            }
        }

        #check
        {
            transform: scale(1);
            transition: all 0.2s ease;
            opacity: 1;
            .fullSize;
            background: @checkboxCheckColor;
        }
    }
}
</style>