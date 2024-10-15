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
import { defineProperty, Uncontrolled } from '../utils/defineProperty';
import textField from '@/modules/core/components/textField.vue';

export type PasswordFieldProps =
{
    text?: string | typeof Uncontrolled,
    fieldName: string,
    isRevealed?: boolean | typeof Uncontrolled,
    overrideThemeColor?: string | undefined
};

export type PasswordFieldEmits =
{
    (e: 'update:text', v: string): void,
    (e: 'update:isRevealed', v: boolean): void
};

const defaultFieldName = "Placeholder here";

const props = withDefaults(defineProps<PasswordFieldProps>(),
{
    text: Uncontrolled,
    isRevealed: Uncontrolled,
    overrideThemeColor: undefined,
    fieldName: defaultFieldName
});
const emit = defineEmits<PasswordFieldEmits>();
const text = defineProperty<string | typeof Uncontrolled, "text", typeof props>(
    "text",
    { emitFunc: emit, props: props, default: '' }
);
const fieldName = defineProperty<string, "fieldName", typeof props>(
    "fieldName",
    { emitFunc: undefined, props: props, default: defaultFieldName }
);
const isRevealed = defineProperty<boolean | typeof Uncontrolled, "isRevealed", typeof props>(
    "isRevealed",
    { emitFunc: emit, props: props, default: false }
);
const overrideThemeColor = defineProperty<string | undefined, "overrideThemeColor", typeof props>(
    "overrideThemeColor",
    { emitFunc: undefined, props: props, default: undefined }
);
</script>

<style lang="less" scoped>
@import "@/modules/core/stylesheets/globalStyle.less";

div:deep(input)
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