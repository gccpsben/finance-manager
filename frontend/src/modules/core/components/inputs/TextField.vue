<template>
    <div class="fullSize">
        <CustomFieldset :field-name="fieldName.get()"
                        :override-theme-color="overrideThemeColor.get()"
                        :should-text-float="shouldTextFloat"
                        :should-highlight="shouldHighlight">
            <template #content>
                <component :is="textareaMode ? 'textarea' : 'input'"
                           :type="inputType.get()" ref="textFieldInput"
                           class="textFieldInput" :value="text.get()"
                           :readonly="readonly.get()" :disabled="disabled.get()"
                           @focus="$emit('focus')" @blur="$emit('blur')"
                           @input="text.set(($event.target as HTMLInputElement).value!)"
                           :placeholder="textFieldInputIsFocused ? placeholder.get() : ''"/>
            </template>
        </CustomFieldset>
    </div>
</template>

<script lang="ts" setup>
import { useFocus } from '@vueuse/core';
import { ref, computed } from 'vue';
import { defineProperty, Uncontrolled } from '../../utils/defineProperty';
import type { HTMLInputType } from '@/shims-vue';
import CustomFieldset from '../data-display/CustomFieldset.vue';

export type TextFieldProps =
{
    text?: string | typeof Uncontrolled,
    fieldName?: string,
    inputType?: HTMLInputType,
    overrideThemeColor?: string | undefined,
    placeholder?: string | undefined,
    disabled?: boolean | undefined,
    readonly?: boolean | undefined,
    alwaysFloat?: boolean,
    textareaMode?: boolean
};

export type TextFieldEmits =
{
    (e: 'update:text', v: string): void,
    (e: 'focus'):void,
    (e: 'blur'):void
};

const props = withDefaults(defineProps<TextFieldProps>(),
{
    text: Uncontrolled,
    fieldName: 'Placeholder here',
    inputType: 'text',
    overrideThemeColor: undefined,
    placeholder: undefined,
    disabled: false,
    readonly: false,
    alwaysFloat: false,
    textareaMode: false
});
const emit = defineEmits<TextFieldEmits>();
const text = defineProperty<string | typeof Uncontrolled, "text", typeof props>(
    "text",
    { emitFunc: emit, props: props, default: '' }
);
const placeholder = defineProperty<undefined | string, "placeholder", typeof props>(
    "placeholder",
    { emitFunc: undefined, props: props, default: '' }
);
const fieldName = defineProperty<string, "fieldName", typeof props>(
    "fieldName",
    { emitFunc: undefined, props: props, default: 'Placeholder here' }
);
const inputType = defineProperty<HTMLInputType, "inputType", typeof props>(
    "inputType",
    { emitFunc: undefined, props: props, default: 'text' }
);
const overrideThemeColor = defineProperty<string | undefined, "overrideThemeColor", typeof props>(
    "overrideThemeColor",
    { emitFunc: undefined, props: props, default: undefined }
);
const disabled = defineProperty<boolean | undefined, "disabled", typeof props>(
    "disabled",
    { emitFunc: undefined, props: props, default: false }
);
const readonly = defineProperty<boolean | undefined, "readonly", typeof props>(
    "readonly",
    { emitFunc: undefined, props: props, default: false }
);
const alwaysFloat = defineProperty<boolean | undefined, "alwaysFloat", typeof props>(
    "alwaysFloat",
    { emitFunc: undefined, props: props, default: false }
);

const textFieldInput = ref(null);
const placeholderText = ref(null);

const { focused:textFieldInputIsFocused } = useFocus(textFieldInput);
const { focused:placeholderTextIsFocused } = useFocus(placeholderText);

const shouldTextFloat = computed(() =>
{
    if (alwaysFloat.get()) return true;
    if (textFieldInputIsFocused.value || placeholderTextIsFocused.value) return true;
    if (text.get()) return true;
    return false;
});
const shouldHighlight = computed(() =>
{
    if (textFieldInputIsFocused.value) return true;
    return false;
});
</script>

<style lang="less" scoped>
@import "@/modules/core/stylesheets/globalStyle.less";

.textFieldInput
{
    .fullSize;
    outline: none;
    appearance: none;
    padding-left: @textFieldInputLeftPadding;
    padding-right: @textFieldInputRightPadding;
    resize: none; // for textarea mode
    &:read-only { opacity: 0.4; }
}
</style>