<template>
    <button>
        <div class="baseBtnInner" :class="{'noIcon': !icon}">
            <div class="center fullSize" v-if="icon">
                <GaIcon :style="{ fontSize: iconSize }" :icon="icon"/>
            </div>
            <div class="center fullSize" style="transform: translateY(1px)">
                <slot />
            </div>
        </div>
    </button>
</template>

<script setup lang="ts">
import GaIcon from '../decorations/gaIcon.vue';

export type BaseButtonProps =
{
    iconSize?: string;
    gap?: string;
    icon?: string | undefined;
    fontSize?: string;
};
withDefaults
(
    defineProps<BaseButtonProps>(),
    { iconSize: "16px", gap: "4px", fontSize: "12px" }
)
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

button
{
    .minButtonBase;
    background: transparent;
    border: 1px solid @border;
    color: @foreground;
    padding:10px;
    border-radius: 5px;
    &:hover:not(:disabled) { background: fade(@focus, 10%); }
    &:disabled { opacity: 0.5; user-select: none; cursor:not-allowed; }

    padding:5px;
    font-size:v-bind(fontSize);
    font-weight: bold;

    .baseBtnInner
    {
        display: grid;
        grid-template-columns: auto 1fr;
        grid-template-rows: 1fr;
        gap: v-bind(gap);
        &.noIcon { gap: 0px; }
    }
}
</style>