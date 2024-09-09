<template>
    <div style="position: relative;">
        <text-field class="fullSize" 
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
    </div>
</template>

<style lang="less" scope>
@dropdownIconColor: white;
@dropdownIconSize: 12px;
@dropdownItemRowPadding: 6px 0px 6px 10px;
@dropdownShadowRange: 15px;
@dropdownRowHighlightBackground: #202020;

@import '@/modules/core/stylesheets/globalStyle.less';

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
    z-index:999;
    opacity: 0;
    position: absolute;
    .fullWidth;
    clip-path: inset(0 0 100% 0);
    transition: all 0.3s ease;
    overflow-y: scroll;
    max-height:500px;
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
</style>

<script lang="ts" setup>
import textField from '@/modules/core/components/textField.vue';
import { defineProperty } from '../utils/defineProperty';
import { ref, computed } from 'vue';
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
    let searchQuery = searchText.get()?.trim();
    if (!searchQuery) return options.get();
    else return options.get().filter(o => o.searchTerms.includes(searchQuery));
});

const isInputFocused = ref<boolean>(false);

const onInputBlur = () => 
{
    isInputFocused.value = false;
    // searchText.set(options.get().find(o => o.id === selectedOption.get())?.label ?? '');
};

</script>