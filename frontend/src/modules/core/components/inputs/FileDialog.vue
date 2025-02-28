<template>
    <div class="fileDialogRoot" :class="{'open': isOpen.get()}">
        <BaseDialog :is-open="isOpen.get()" min-width-desktop="100vw"
                    min-height-desktop="100vh"
                    @update:is-open="(v) => isOpen.set(v)">
            <template #headerActionsBefore>
                <div class="fullSize center" style="overflow: hidden; transition: all 0.5s ease;"
                     :style="{'maxWidth': dialogState.state !== 'Pick' ? '30px' : '0px', 'opacity': dialogState.state !== 'Pick' ? '1' : '0'}">
                    <BaseButton @click="dialogState = { state: 'Pick' }"
                                style="padding:0px; border:0px; margin-right: 14px;">
                        <GaIcon icon="chevron_left" style="font-size: 20px;" />
                    </BaseButton>
                </div>
            </template>
            <template #headerTitle>
                <template v-if="dialogState.state === 'Pick'">
                    Upload or Select Files
                </template>
                <template v-else-if="dialogState.state === 'PreviouslyUploaded'">
                    Existing Files on Server
                </template>
                <template v-else-if="dialogState.state === 'UploadNew'">
                    Upload New Files
                </template>
            </template>
            <template #content>
                <template v-if="dialogState.state === 'Pick'">
                    <div class="fullSize center" style="padding: 24px;">
                        <div style="display: grid; gap: 14px">
                            <div>
                                <BaseButton @click="serverFiles.updateData(); dialogState = { state: 'PreviouslyUploaded' }">
                                    Select Previously Uploaded Files
                                </BaseButton>
                            </div>
                            <div class="center">
                                <BaseButton @click="dialogState = { state: 'UploadNew' }">
                                    Upload New Files
                                </BaseButton>
                            </div>
                        </div>
                    </div>
                </template>
                <template v-else-if="dialogState.state === 'PreviouslyUploaded'">
                    <div class="previouslyUploadedArea">
                        <OverlapArea class="fullSize">
                            <div style="overflow-y: auto; position: relative" >
                                <AbsEnclosure class="fullWidth">
                                    <div class="existingFilesList" style="overflow-y: auto; height: 100%;">
                                        <div v-for="file of serverFiles.lastSuccessfulData.value?.files" class="fileBoxes">
                                            <AttachmentBox :file-id="file.id" :selected="selectedExistingFiles.has(file.id)"
                                                        @click="selectedExistingFiles.toggle(file.id)"/>
                                        </div>
                                    </div>
                                </AbsEnclosure>
                            </div>
                            <div class="center" v-if="serverFiles.isLoading.value">
                                <NetworkCircularIndicator :error="serverFiles.error.value" :is-loading="true"/>
                            </div>
                        </OverlapArea>
                        <div class="xRight">
                            <BaseButton :disabled="selectedExistingFiles.toArray().length == 0"
                                        @click="finish">Finish</BaseButton>
                        </div>
                    </div>
                </template>
                <template v-else-if="dialogState.state === 'UploadNew'">
                    <div class="uploadNewAreaGrid">
                        <div class="uploadNewAreaGridContent">
                            <FileDragZone @change="files => handleFileUploads(files)"
                                        style="width:100%; height: 200px;" />
                            <div>Uploaded files will be stored on the server, and can be attached to transactions / other objects.</div>
                            <div class="rel">
                                <AbsEnclosure>
                                    <div class="fullSize" style="overflow-y: auto;">
                                        <template v-for="file in fileUploads">
                                            <template v-if="file.state.type === 'FINISHED_UPLOAD'">
                                                <FileUploadProgressBox :name="file.file.name" :value="1" :state="'OKAY'"/>
                                            </template>
                                            <template v-else-if="file.state.type === 'UPLOADING_CHUNK'">
                                                <FileUploadProgressBox :name="file.file.name" :value="file.state.endBytes / file.file.size" :state="'PROGRESS'"/>
                                            </template>
                                            <template v-else-if="file.state.type === 'LAST_CHUNK_UPLOADED'">
                                                <FileUploadProgressBox :name="file.file.name" :value="file.state.lastEndBytes / file.file.size" :state="'PROGRESS'"/>
                                            </template>
                                            <template v-else-if="file.state.type === 'LAST_CHUNK_UPLOAD_ERROR'">
                                                <FileUploadProgressBox :name="file.file.name" :value="file.state.failedStartBytes / file.file.size" :state="'ERROR'"/>
                                            </template>
                                            <template v-else-if="file.state.type === 'SESSION_INIT_ERROR'">
                                                <FileUploadProgressBox :name="file.file.name" :value="0" :state="'ERROR'"/>
                                            </template>
                                        </template>
                                    </div>
                                </AbsEnclosure>
                            </div>
                        </div>
                        <div class="xRight">
                            <BaseButton @click="finish">Finish</BaseButton>
                        </div>
                    </div>
                </template>
            </template>
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import BaseDialog from '@/modules/core/components/data-display/BaseDialog.vue';
import { defineProperty, Uncontrolled } from '../../utils/defineProperty';
import BaseButton from './BaseButton.vue';
import { ref, readonly, watch } from 'vue';
import GaIcon from '../decorations/GaIcon.vue';
import AttachmentBox from '../data-display/AttachmentBox.vue';
import FileDragZone from './FileDragZone.vue';
import { useFileUpload } from '../../composables/useFileUpload';
import FileUploadProgressBox from '../data-display/FileUploadProgressBox.vue';
import { useNetworkRequest } from '../../composables/useNetworkRequest';
import { API_FILES_LIST_PATH } from '@/apiPaths';
import OverlapArea from '../layout/OverlapArea.vue';
import NetworkCircularIndicator from '../data-display/NetworkCircularIndicator.vue';
import type { GetServerFilesAPI } from '../../../../../../api-types/files';
import AbsEnclosure from '../layout/AbsEnclosure.vue';
import { ToggleList } from '../../utils/toggleList';

type FileDialogState = { state: "Pick" } | { state: "PreviouslyUploaded" } | { state: "UploadNew" };

export type FileDialogPropsType = { isOpen?: boolean | typeof Uncontrolled };
export type FileDialogEmitsType =
{
    (e: 'update:isOpen', v: boolean): void,
    (e: 'onChange', v: { fileId: string }[]): void
};

const fileUploads = ref<ReturnType<typeof useFileUpload>[]>([]);
const serverFiles = useNetworkRequest<GetServerFilesAPI.ResponseDTO>
(
    { query: {}, url: API_FILES_LIST_PATH, method: "GET" },
    { autoResetOnUnauthorized: true, includeAuthHeaders: true, updateOnMount: false }
);
const selectedExistingFiles = ref<ToggleList<string>>(new ToggleList([]));

const emit = defineEmits<FileDialogEmitsType>();
const props = withDefaults(defineProps<FileDialogPropsType>(), { isOpen: false });
const isOpen = defineProperty<boolean | typeof Uncontrolled, 'isOpen', typeof props>(
    "isOpen",
    { default: false, emitFunc: emit, props: props }
);

watch(() => isOpen.get(), newVal =>
{
    if (!newVal) return;
    fileUploads.value = [];
    dialogState.value = { state: 'Pick' };
});

const dialogState = ref<FileDialogState>({ state: 'Pick' });

function handleFileUploads(files: FileList)
{
    for (const file of files)
    {
        fileUploads.value.push(
            readonly(useFileUpload(file))
        );
    }
}

function finish()
{
    const isPartialUpload = fileUploads.value.some(x => x.state.type !== 'FINISHED_UPLOAD');
    const uploadingMsg = `Some files are not finished uploading...`;
    if (isPartialUpload && !confirm(uploadingMsg)) return;

    if (dialogState.value.state === 'UploadNew')
    {
        const fileIds = fileUploads.value.map(x =>
        {
            if (x.state.type !== 'FINISHED_UPLOAD') return undefined;
            return { fileId: x.state.fileId };
        }).filter(x => x !== undefined);

        emit
        (
            'onChange',
            fileIds
        );

        emit('update:isOpen', false);
    }
    else if (dialogState.value.state === 'PreviouslyUploaded')
    {
        emit
        (
            'onChange',
            selectedExistingFiles.value.toArray().map(x => ({ fileId: x }))
        );

        emit('update:isOpen', false);
    }
}
</script>

<style lang="less" scoped>
@import url('@/modules/core/stylesheets/globalStyle.less');

.fileDialogRoot:not(.open)
{
    opacity: 0;
    * { pointer-events: none; }
}

.fileDialogTeleportRoot
{
    .fullSize;
    .center;
    z-index: 999;

    background: @modalBackdrop !important;
}

.fileBoxes
{
    height: 45px;
}

.fileDialogRoot
{
    pointer-events: none;
    z-index: 999;
    position: fixed !important;
    top:0px;
    left:0px;
    right:0px;
    bottom:0px;
    transition: all 0.3s ease;
    .fullSize;
}

.previouslyUploadedArea
{
    display: grid;
    .fullSize;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
}

.existingFilesList
{
    & > div { margin-bottom: 6px; }
}

.uploadNewAreaGrid
{
    .fullSize;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
    gap: 14px;

    .uploadNewAreaGridContent
    {
        gap: 14px;
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: auto auto 1fr;
   }
}
</style>