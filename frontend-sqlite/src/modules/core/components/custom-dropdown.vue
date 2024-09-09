<template>
    <div ref="dropdownRoot" class="dropdownRoot" style="position: relative;" :class="{'expanded': isInputFocused}">
        <div class="dropdownFieldContainer fullSize">
                <text-field class="fullSize dropdownField" 
                        :field-name="fieldName"
                        :text="isInputFocused ? (searchText.get() === null ? '' : searchText.get()) : (options.get().find(o => o.id === selectedOption.get())?.label) ?? ''"
                        @update:text="searchText.set($event)"
                        @blur="onInputBlur()"
                        @focus="isInputFocused = true">
                <template #fieldActions>
                    <div id="dropdownIconContainer" :class="{'expanded': isInputFocused}">
                        <fa-icon icon="fa-solid fa-chevron-down" />
                    </div>
                </template>
            </text-field>
        </div>

        <div id="dropdownPanelContainer" :class="{'expanded': isInputFocused}">
            <div v-for="option of filteredOptions">
                <slot name="itemRow" :option="option" :selectedOptionId="selectedOption.get()">
                    <div @click="selectedOption.set(option.id)" class="dropdownItemRow">
                        <div> {{ option.label }} </div>
                        <div class="helperText"> {{ option.helperText }} </div>
                        <div v-if="option.id === selectedOption.get()" class="center">
                            <fa-icon icon="fa-solid fa-check"/>
                        </div>
                    </div>
                </slot>
            </div>
            <slot v-if="filteredOptions.length === 0" name="noItemRow">
                <div class="dropdownItemRow">
                    {{ searchText.get()?.trim() ? 'No items matched' : 'No items' }}
                </div>
            </slot>
        </div>
        <div class="mobileDropdownBackdrop"></div>
    </div>
</template>

<style lang="less" scoped>
@dropdownIconColor: white;
@dropdownIconSize: 12px;
@dropdownItemRowPadding: 6px 0px 6px 10px;
@dropdownShadowRange: 15px;
@dropdownRowHighlightBackground: #202020;

@import '@/modules/core/stylesheets/globalStyle.less';

@dropdownZIndex: 999;

#dropdownIconContainer
{
    .fullSize; .center;
    .horiPadding(15px);

    & > div
    {
        font-size: @dropdownIconSize; 
        color: @dropdownIconColor;
        transform: rotate(0deg) !important;
        transition: all 0.5s ease;
    }
    &.expanded > div { transform: rotate(180deg) !important; }
}

#dropdownPanelContainer
{
    z-index: calc(@dropdownZIndex + 1) ;
    opacity: 0;
    position: absolute;
    .fullWidth;
    clip-path: inset(0 0 100% 0);
    transition: all 0.3s ease;
    overflow-y: scroll;
    max-height:200px;
    box-shadow: 0 0 @dropdownShadowRange black;
    border: 1px solid @border;

    &.expanded 
    {
        opacity: 1;
        clip-path: inset(0 calc(@dropdownShadowRange * -1) calc(@dropdownShadowRange * -1) calc(@dropdownShadowRange * -1));
    }

    .dropdownItemRow
    {
        *:not(.fa-solid) { font-family: @font; }
        padding: @dropdownItemRowPadding;
        background: #101010;
        cursor: pointer;
        display: grid;
        grid-template-columns: 1fr auto 35px;
        grid-template-rows: 1fr;
        gap:5px;

        .helperText { color: gray; }

        &:hover { background: @dropdownRowHighlightBackground; }
    }
}

.dropdownField
{
    transition: transform 0.3s ease, width 0.3s ease;
    width: 100%;
}

@media (max-width: 500px) or (max-height: 500px)
{
    @expandedFieldHeight: 45px;

    // Styles for mobile friendly dropdown
    #dropdownPanelContainer
    {
        position: fixed;
        bottom:0px;
        left:0px;
        right:0px;
        clip-path: inset(100% 0 0 0);
        max-height: calc(100svh - @expandedFieldHeight * 2);

        &.expanded 
        {
            clip-path: inset(calc(@dropdownShadowRange * -1) calc(@dropdownShadowRange * -1) 0 calc(@dropdownShadowRange * -1));
        }
    }

    .mobileDropdownBackdrop
    {
        background: transparent;      
        transition: all 0.3s ease;
    }

    .expanded
    {
        .dropdownField
        {
            position: absolute;
            z-index: calc(@dropdownZIndex + 2);
            height: @expandedFieldHeight;
            width: calc(100vw - 50px);
            transform: v-bind(fieldTransform);
        }

        .mobileDropdownBackdrop
        {
            background: #000000AA;
            position: fixed;
            .fullSize;
            top:0; right:0; left:0; bottom:0;
            z-index: @dropdownZIndex;
        }
    }
}

</style>

<script lang="ts" setup>
import textField from '@/modules/core/components/textField.vue';
import { defineProperty } from '../utils/defineProperty';
import { ref, computed, useTemplateRef } from 'vue';
import faIcon from '@/modules/core/components/faIcon.vue';

export type DropdownItem =
{
    id: string,
    searchTerms: string,
    label: string,
    helperText?: string | undefined
}

const props = withDefaults(defineProps<
{ 
    options: DropdownItem[],
    selectedOption: null | undefined | string,
    fieldName: string, 
    overrideThemeColor: string | undefined,
    placeholder: string | undefined,
    disabled: boolean | undefined,
    readonly: boolean | undefined,
    searchText: string | null
}>(), 
{ 
    fieldName: 'Placeholder here',
    overrideThemeColor: undefined,
    placeholder: undefined,
    disabled: false,
    readonly: false,
    searchText: null
});

const emit = defineEmits<{ (e: 'update:selectedOption', v: string): void, (e: 'update:searchText', v: string): void }>();
const searchText = defineProperty<string | null, "searchText", typeof props>("searchText", { emitFunc: emit, props: props, withEmits: true });
const options = defineProperty<DropdownItem[], "options", typeof props>("options", { emitFunc: undefined, props: props, withEmits: false });
const selectedOption = defineProperty<null | undefined | string, "selectedOption", typeof props>("selectedOption", { emitFunc: emit, props: props, withEmits: true });

const filteredOptions = computed(() => 
{
    const normalizeText = (str: string) => str.trim().toLocaleLowerCase();

    const searchQuery = !!searchText.get() ? normalizeText(searchText.get()!) : '';
    if (!searchQuery) return options.get();
    else return options.get().filter(o => normalizeText(o.searchTerms).includes(searchQuery));
});

const dropdownRoot = useTemplateRef('dropdownRoot');
const fieldTransform = computed(() => 
{
    let yPixels = -1 * (dropdownRoot.value?.offsetTop ?? 0) + 25;
    if (!isInputFocused.value) yPixels = 0;

    let xPixels = 25 + -1 * (dropdownRoot.value?.offsetLeft ?? 0);
    if (!isInputFocused.value) xPixels = 0;

    return `translateY(${yPixels}px) translateX(${xPixels}px)`;
});

const isInputFocused = ref<boolean>(false);

const onInputBlur = () => 
{
    isInputFocused.value = false;
    // searchText.set(options.get().find(o => o.id === selectedOption.get())?.label ?? '');
};

</script>