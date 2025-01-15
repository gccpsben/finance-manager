<template>
    <div class="attachmentBoxRoot">
        <div class="attachmentBoxInner">
            <div class="attachmentBoxInnerGrid" v-if="!!fileInfo.networkRequest.lastSuccessfulData.value && !fileInfo.networkRequest.isLoading.value">
                <div class="center">
                    <div class="chip">{{ (extension ?? '...').toUpperCase() }}</div>
                </div>
                <div class="titleArea">
                    <AbsEnclosure>
                        <div class="fullSize yCenter">
                            <div class="titleAreaInner">
                                {{ fileInfo.networkRequest.lastSuccessfulData.value?.readableName ?? '...' }}
                            </div>
                        </div>
                    </AbsEnclosure>
                </div>
                <div class="actionsArea">
                    <GaIcon v-if="deletable" icon="delete" class="btn"/>
                    <GaIcon v-if="downloadable" icon="download" class="btn"/>
                </div>
            </div>
            <div class="fullSize center" v-else>
                <NetworkCircularIndicator :is-loading="true" :error="fileInfo.networkRequest.error.value" style="width: 25px; height: 25px;"/>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AbsEnclosure from '../layout/AbsEnclosure.vue';
import GaIcon from '../decorations/GaIcon.vue';
import { useFileById } from '../../composables/useFileById';
import { extractFileExtension } from '../../utils/files';
import NetworkCircularIndicator from './NetworkCircularIndicator.vue';

export type AttachmentBoxPropsType =
{
    fileId: string,
    // extension: string,
    // fileName: string,
    deletable?: boolean,
    downloadable?: boolean
}

const props = withDefaults(defineProps<AttachmentBoxPropsType>(), {
    deletable: true,
    downloadable: true
});
const fileInfo = useFileById(props.fileId);
const extension = computed<string | null>(() =>
{
    if (!fileInfo.networkRequest.lastSuccessfulData.value) return null;
    const extension = extractFileExtension(fileInfo.networkRequest.lastSuccessfulData.value.readableName)?.toLowerCase();
    return extension ?? null;
});
const chipColor = computed<{bg:string, fore: string}>(() =>
{
    if (!fileInfo.networkRequest.lastSuccessfulData.value || !extension.value) return { bg: '#252525', fore: '#CCC' };
    switch(extension.value)
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

        .attachmentBoxInnerGrid
        {
            .fullSize;
            display: grid;
            gap: 8px;
            grid-template-columns: auto 1fr auto;
            grid-template-rows: 1fr;
        }

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