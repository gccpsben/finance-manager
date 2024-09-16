<template>
    <div>
        <text-field :text="text.get()" @update:text="text.set($event)" :field-name="fieldName.get()" 
                    class="fullSize" :input-type="!isRevealed.get() ? 'password' : 'text'"
                    :override-theme-color="overrideThemeColor.get()">
            <template #fieldActions>
                <div class="revealButton" @click="isRevealed.set(!isRevealed.get())">
                    <span class="material-symbols-outlined">
                    {{ !isRevealed.get() ? "visibility" : "visibility_off" }}
                    </span>
                </div>
            </template>
        </text-field>
    </div>
</template>

<script lang="ts" setup>
import { defineProperty } from '../utils/defineProperty';
import textField from '@/modules/core/components/textField.vue';

const props = withDefaults(defineProps<
{
    text?: string|null, 
    fieldName: string, 
    isRevealed?: boolean|null,
    overrideThemeColor?: string | undefined
}>(), 
{ 
    text: null,
    fieldName: 'Placeholder here',
    isRevealed: null,
    overrideThemeColor: undefined
});
const emit = defineEmits<{ (e: 'update:text', v: string): void, (e: 'update:isRevealed', v: boolean): void }>();
const text = defineProperty<null | string, "text", typeof props>("text", { emitFunc: emit, props: props, withEmits: true });
const fieldName = defineProperty<string, "fieldName", typeof props>("fieldName", { emitFunc: undefined, props: props, withEmits: false });
const isRevealed = defineProperty<null | boolean, "isRevealed", typeof props>("isRevealed", { emitFunc: emit, props: props, withEmits: true });
const overrideThemeColor = defineProperty<string | undefined, "overrideThemeColor", typeof props>("overrideThemeColor", { emitFunc: undefined, props: props, withEmits: false });
</script>

<style lang="less" scoped>
@import "@/modules/core/stylesheets/globalStyle.less";

div /deep/ input
{
    font-family: Consolas;
}

.revealButton
{
    padding-right: 14px;
    .center;
    user-select: none;
    cursor: pointer;
    span { font-size: 18px; }
}
</style>