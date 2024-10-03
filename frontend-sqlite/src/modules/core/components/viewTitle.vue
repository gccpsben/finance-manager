<template>
    <div ref="viewTitleRoot" id="viewTitleRoot">
        <div id="innerContainer">
            <div class="titleContainer">
                <h3 class="viewTitleH3">{{ title }}</h3>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
const props = defineProps<{ title: string }>();
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

#viewTitleRoot
{
    container-type: inline-size;
    container-name: viewTitleContainer;

    #innerContainer
    {
        font-family: @font;
        font-size:24px;

        .viewTitleH3
        {
            transition: all 0.5s ease;
            color:white;
            font-size: inherit;
            font-weight: 500;
            .tight;
        }

        .titleContainer { .xLeft; }
    }

    &.stuck
    {
        background: @backgroundDark;
        padding-top: 7px;
        padding-bottom: 7px;

        #innerContainer
        {
            font-size: 20px;
        }
    }
}
</style>