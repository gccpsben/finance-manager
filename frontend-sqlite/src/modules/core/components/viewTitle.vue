<template>
    <div ref="viewTitleRoot" id="viewTitleRoot">
        <div id="innerContainer">
            <div id="backBtnContainer" :class="{'hidden': !hasBackButton}">
                <ga-icon id="backBtn" icon="chevron_left"
                         @click="emit('back')"/>
            </div>
            <div class="titleContainer ellipsis">
                <h3 class="viewTitleH3">{{ title }}</h3>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import gaIcon from './gaIcon.vue';

export type ViewTitleProps =
{
    title: string;
    hasBackButton?: boolean;
};

export type ViewTitleEmits =
{
    (e: "back"): void
};

const emit = defineEmits<ViewTitleEmits>();
const props = withDefaults(defineProps<ViewTitleProps>(), { hasBackButton: false });
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

#viewTitleRoot
{
    container-type: inline-size;
    container-name: viewTitleContainer;

    #innerContainer
    {
        display: grid;
        grid-template-columns: auto 1fr;
        grid-template-rows: 1fr;

        font-family: @font;
        font-size:24px;

        .viewTitleH3
        {
            transition: all 0.5s ease;
            color:white;
            font-size: inherit;
            font-weight: 500;
            white-space: nowrap;
            .ellipsis; // both the container and the h3 must have this class for ellipsis to work
            .tight;
        }

        .titleContainer { .xLeft; }
        #backBtnContainer
        {
            .center;
            padding-right: 14px;
            padding-top:2px;
            transition: all 0.3s ease;
            overflow: hidden;
            opacity: 1;

            &.hidden
            {
                max-width: 0px;
                transition: all 0.3s ease;
                opacity: 0;
                .tight;
            }

            #backBtn
            {
                .center;
                .optionIcon;
                color: white;
                .tight;
                &:not(:hover) { background: transparent; }
            }
        }
    }
}
</style>