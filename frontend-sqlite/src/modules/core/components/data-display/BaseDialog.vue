<template>
    <Transition name="page-transition">
        <OverlapArea class="dialogRoot" v-if="isOpen.get()">
            <div class="dialogBackdrop" @click="isOpen.set(false)"></div>
            <div class="dialogCardContainer">
                <div class="dialogCard">
                    <div class="dialogHeader">
                        <h3 class="dialogTitleH3">
                            <slot name="headerTitle">Title</slot>
                        </h3>
                    </div>
                    <div class="dialogContent">
                        <slot name="content"></slot>
                    </div>
                </div>
            </div>
        </OverlapArea>
    </Transition>
</template>

<script setup lang="ts">
import { defineProperty, Uncontrolled } from '../../utils/defineProperty';
import OverlapArea from '../layout/OverlapArea.vue';

export type BaseDialogProps =
{
    isOpen?: boolean | typeof Uncontrolled
};

export type BaseDialogEmits =
{
    (e: 'update:isOpen', v: boolean): void
};

const props = withDefaults(defineProps<BaseDialogProps>(),
{
    isOpen: Uncontrolled,
});
const emit = defineEmits<BaseDialogEmits>();
const isOpen = defineProperty<boolean | typeof Uncontrolled, "isOpen", typeof props>(
    "isOpen",
    { emitFunc: emit, props: props, default: false }
);
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

.dialogRoot
{
    .dialogBackdrop
    {
        background:#00000077;
        .fullSize;
    }

    position:fixed;
    left:0px;
    right:0px;
    top:0px;
    bottom:0px;
    z-index: 99999;
    color: @foreground;
    font-family: @font;
    text-align: left;
}

.dialogCardContainer
{
    .center;
    pointer-events: none;
}

.dialogCard
{
    pointer-events: all;
    padding: 18px;
    min-width: 500px;
    min-height: 150px;
    background: @background;
    border-radius: 5px;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    gap: 15px;
    z-index: 999;
}

.page-transition-enter-active
{
    transition: all 0.5s ease;
    position: fixed;
    opacity:1;
    transform: scale(1);
    .dialogBackdrop { transform: scale(2); }
    & > * { overflow: hidden !important }
}
.page-transition-leave-active
{
    transition: all 0.5s ease;
    position: fixed;
    opacity:0;
    transform: scale(0.9);
    .dialogBackdrop { transform: scale(2); }
    & > * { overflow: hidden !important }
}
.page-transition-enter-from
{
    transition: all 0.5s ease;
    position: fixed;
    transform: scale(0.9);
    opacity:0;
    .dialogBackdrop { transform: scale(2); }
    & > * { overflow: hidden !important }
}
.page-transition-leave-to
{
    transition: all 0.5s ease;
    position: fixed;
    transform: scale(0.9);
    opacity:0;
    .dialogBackdrop { transform: scale(2); }
    & > * { overflow: hidden !important }
}
</style>