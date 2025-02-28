<template>
    <Teleport defer to="#routerViewOverlay">
        <Transition name="page-transition">
            <OverlapArea class="dialogRoot" v-if="isOpen.get()">
                <div class="dialogBackdrop" @click="isOpen.set(false)"></div>
                <div class="dialogCardContainer">
                    <div class="dialogCard"
                         :style="{
                            minWidth: minWidthDesktop ?? 'min(500px, 80vw)',
                            maxWidth: maxWidthDesktop ?? 'unset',
                            minHeight: minHeightDesktop ?? 'unset',
                            maxHeight: maxHeightDesktop ?? 'unset'
                         }">
                        <div class="dialogHeader">
                            <slot name="headerActionsBefore">
                                <div></div>
                            </slot>
                            <h3 class="dialogTitleH3">
                                <slot name="headerTitle">Title</slot>
                            </h3>
                            <slot name="headerActions">
                                <BaseButton class="closeDialogButton"
                                            @click="isOpen.set(false)">
                                    <GaIcon icon="close"></GaIcon>
                                </BaseButton>
                            </slot>
                        </div>
                        <div class="dialogContent">
                            <slot name="content"></slot>
                        </div>
                    </div>
                </div>
            </OverlapArea>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { defineProperty, Uncontrolled } from '../../utils/defineProperty';
import GaIcon from '../decorations/GaIcon.vue';
import BaseButton from '../inputs/BaseButton.vue';
import OverlapArea from '../layout/OverlapArea.vue';

export type BaseDialogProps =
{
    isOpen?: boolean | typeof Uncontrolled,
    minWidthDesktop? : string | undefined;
    maxWidthDesktop? : string | undefined;
    minHeightDesktop? : string | undefined;
    maxHeightDesktop? : string | undefined;
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
    container-name: baseDialogRoot;
    container-type: size;

    .dialogBackdrop
    {
        background:#00000077;
        .fullSize;
        pointer-events: all;
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

.closeDialogButton
{
    .center;
    font-size: 24px; border:0; padding:0px;
    padding-left: 2px; padding-right: 2px;
    &:hover { color: @error; background: fade(@error, 20%) !important; }
}

.dialogCard
{
    pointer-events: all;
    padding: 18px;
    background: @background;
    border-radius: 5px;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    gap: 15px;
    z-index: 999;
}

.dialogHeader
{
    .leftRightGrid;
    grid-template-columns: auto 1fr auto;
}

@container baseDialogRoot (max-width: 600px)
{
    .dialogCard
    {
        min-width: unset !important;
        max-width: unset !important;
        min-height: unset !important;
        max-height: unset !important;
        width:100%;
        height:100%;
    }
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