<template>
    <div class="fileDragZoneRoot" :class="{'dragOver': isDragOver}">
        <input type="file" ref="fileInput" @change="onFileInputClicked" multiple style="display: none;"/>
        <div id="fileDragZoneClickableArea" @click="$refs.fileInput.click()"
             @dragenter.prevent="onDragEnter"
             @dragleave.prevent="onDragLeave"
             @dragover.prevent
             @drop.prevent="onFileInputDrop">
            <div style="display: grid; gap: 8px;">
                <div class="center">
                    <GaIcon icon="upload" style="font-size: 24px;" />
                </div>
                <div class="center">
                    Drop or click to upload files
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { readonly, ref } from 'vue';
import GaIcon from '../decorations/GaIcon.vue';
import { useFileUpload } from '../../composables/useFileUpload';

export type FileDragZoneEmitsType = { (e: 'change', v: FileList): void };
const emits = defineEmits<FileDragZoneEmitsType>();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragOver = ref<boolean>(false);

function onFileInputClicked(event: Event)
{
    event.preventDefault();
    event.stopPropagation();

    const eventTarget = event.target as HTMLInputElement;
    const hasFiles = eventTarget.files && (event.target as HTMLInputElement).files!.length;
    if (!hasFiles) return;
    const files = eventTarget.files!;
    processFiles(files);
}

function onDragEnter() { isDragOver.value = true; }
function onDragLeave() { isDragOver.value = false; }

function onFileInputDrop(event: DragEvent)
{
    isDragOver.value = false;
    const files = event.dataTransfer?.files;
    processFiles(files ?? null);
}

function processFiles(files: FileList | null)
{
    isDragOver.value = false;
    if (!files || files.length === 0) return;
    emits('change', files);
    // alert(files.length);

    // // TODO: FINISH
    // for (const file of files)
    // {
    //     fileUploads.value.push(readonly(useFileUpload(file)));
    // }
}
</script>

<style lang="less" scoped>
@import url('@/modules/core/stylesheets/globalStyle.less');

.fileDragZoneRoot
{
    border: 3px dashed #444;
    stroke-dashoffset: 50px;
    border-radius: 4px ;
    cursor: pointer;
    &:hover { background: #FFFFFF10; }

    #fileDragZoneClickableArea
    {
        .fullSize;
        .center;
        pointer-events: all;
        user-select: none;
        background: #FFFFFF05;
    }

    &.dragOver
    {
        border-color: @focus !important;
        background: fade(@focus, 20%);
    }
}
</style>