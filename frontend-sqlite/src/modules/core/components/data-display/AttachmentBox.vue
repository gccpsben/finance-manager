<template>
    <div class="attachmentBoxRoot">
        <div class="attachmentBoxInner">
            <div class="center">
                <div class="chip">{{ props.extension.toUpperCase() }}</div>
            </div>
            <div class="titleArea">
                <AbsEnclosure>
                    <div class="fullSize yCenter">
                        <div class="titleAreaInner">
                            {{ props.fileName }}
                        </div>
                    </div>
                </AbsEnclosure>
            </div>
            <div class="actionsArea">
                <GaIcon icon="delete" class="btn"/>
                <GaIcon icon="download" class="btn"/>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AbsEnclosure from '../layout/AbsEnclosure.vue';
import GaIcon from '../decorations/GaIcon.vue';

export type AttachmentBoxPropsType =
{
    extension: string,
    fileName: string
}

const props = defineProps<AttachmentBoxPropsType>();
const chipColor = computed<{bg:string, fore: string}>(() =>
{
    const extension = props.extension.toLowerCase();
    switch(extension)
    {
        case "png": return { bg: '#002222', fore: '#AAFFFF' };
        case 'pdf': return { bg: '#330000', fore: 'pink' };
        case 'jpeg': return { bg: '#452300', fore: '#FFAA00' };
        case 'jpg': return { bg: '#452300', fore: '#FFAA00' };
        case 'docx': return { bg: '#002345', fore: '#00AAFF' };
        default: return { bg: '#252525', fore: '#CCC' };
    }
});
</script>

<style lang="less" scoped>
@import url('@/modules/core/stylesheets/globalStyle.less');

.attachmentBoxRoot
{
    .fullSize;
    cursor: pointer;
    color:@foreground;

    .attachmentBoxInner
    {
        transition: 0.2s ease;
        .fullSize;
        background: #121212;
        border: 1px solid @border;
        padding-left: 10px;
        padding-right: 10px;
        margin-top: 6px;
        border-radius: 6px;
        display: grid;
        gap: 8px;
        grid-template-columns: auto 1fr auto;
        grid-template-rows: 1fr;
        &:hover:not(:has(.btn:hover))
        {
            background: @focusDark;
            border-color: @focus;
        }

        .chip
        {
            .center;

            font-family: @font;
            background: v-bind('chipColor.bg');
            color: v-bind('chipColor.fore');
            font-size: 12px;
            pointer-events: all;

            padding: 4px 6px 4px 6px;
            border-radius: 6px;
            min-width: 4em; // min width equals to 4-letter with the current font.
        }

        .titleArea
        {
            .rel;
            font-size: 14px;
            .yCenter;
            .xLeft;

            .titleAreaInner
            {
                .ellipsis;
                text-align: start;
                overflow-x: hidden;
                white-space: nowrap;
            }
        }

        .actionsArea
        {
            gap: 14px;
            .fullSize;
            .center;
            .btn
            {
                font-size: 18px;
                user-select: none;
                &:hover
                {
                    color: @focus;
                }
            }
        }
    }
}
</style>