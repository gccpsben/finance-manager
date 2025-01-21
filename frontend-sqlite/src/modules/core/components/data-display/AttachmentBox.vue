<template>
    <div class="attachmentBoxRoot" :class="{'selected': selected}">
        <OverlapArea class="fullSize" @click="download">
            <div class="fullSize">
                <SelectionMark v-if="selected"/>
            </div>
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
                        <GaIcon v-if="deletable" @click="emit('delete')" icon="delete" class="btn"/>
                        <GaIcon v-if="downloadable" @click="emit('download')" icon="download" class="btn"/>
                        <GaIcon v-if="removable" @click="emit('remove')" icon="close" class="btn"/>
                    </div>
                </div>
                <div class="fullSize center" v-else>
                    <NetworkCircularIndicator :is-loading="true" :error="fileInfo.networkRequest.error.value" style="width: 25px; height: 25px;"/>
                </div>
            </div>
        </OverlapArea>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AbsEnclosure from '../layout/AbsEnclosure.vue';
import GaIcon from '../decorations/GaIcon.vue';
import { useFileById } from '../../composables/useFileById';
import { downloadFileFromAxiosResponse, extractFileExtension } from '../../utils/files';
import NetworkCircularIndicator from './NetworkCircularIndicator.vue';
import OverlapArea from '../layout/OverlapArea.vue';
import SelectionMark from '../decorations/SelectionMark.vue';
import { API_FILES_DOWNLOAD_PATH } from '@/apiPaths';
import { useNetworkRequest } from '../../composables/useNetworkRequest';

export type AttachmentBoxPropsType =
{
    fileId: string,
    deletable?: boolean,
    downloadable?: boolean,
    removable?: boolean,
    selected?: boolean
}

export type AttachmentBoxEmitsType =
{
    (e: 'download'): void,
    (e: 'remove'): void,
    (e: 'delete'): void,
};

const emit = defineEmits<AttachmentBoxEmitsType>();
const props = withDefaults(defineProps<AttachmentBoxPropsType>(),
{
    deletable: true,
    downloadable: true,
    removable: true,
    selected: false
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

async function download()
{
    const networkRequest = useNetworkRequest
    (
        {
            url: API_FILES_DOWNLOAD_PATH,
            query: {"id": props.fileId},
            axiosOptions: { responseType: 'blob' }
        },
        {
            autoResetOnUnauthorized: true,
            includeAuthHeaders: true,
            updateOnMount: false
        }
    );

    await networkRequest.updateData();

    downloadFileFromAxiosResponse(networkRequest.lastAxiosResponse.value!);
}
</script>

<style lang="less" scoped>
@import url('@/modules/core/stylesheets/globalStyle.less');

.attachmentBoxRoot
{
    &.selected
    {
        .attachmentBoxInner { background: fade(@focus, 10%); }
        .attachmentBoxInner { opacity: 0.5; }
    }

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