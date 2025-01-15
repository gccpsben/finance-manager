<template>
    <div class="attachmentsFieldRoot">
        <FileDialog v-model:is-open="isFileDialogOpen"></FileDialog>
        <CustomFieldset tabindex="0" :should-text-float="true"
                    :should-highlight="false" :field-name="'Attachments / Files'">
            <template #content>
                <AbsEnclosure v-if="props.files.length > 0">
                    <div style="overflow-y: scroll; padding: 14px; padding-top: 0px; transform: translateY(15px); height: calc(100% - 15px);" class="fullSize">
                        <div id="boxesContainer">
                            <template v-for="file in props.files">
                                <AttachmentBox :file-id="file.fileId"/>
                            </template>
                        </div>
                    </div>
                </AbsEnclosure>
                <div v-else class="center">
                    <div class="noItemsContainer">
                        <div>
                            <GaIcon icon="info" style="font-size: 24px;"/>
                            <div>
                                <div>No Attachments Found</div>
                                <a href="#" class="clickableLink" @click="isFileDialogOpen = true">Upload or Select Files</a>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </CustomFieldset>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import GaIcon from '../decorations/GaIcon.vue';
import FileDialog from '../inputs/FileDialog.vue';
import AbsEnclosure from '../layout/AbsEnclosure.vue';
import CustomFieldset from './CustomFieldset.vue';
import AttachmentBox from '@/modules/core/components/data-display/AttachmentBox.vue';
import { useFileById } from '../../composables/useFileById';
import NetworkCircularIndicator from './NetworkCircularIndicator.vue';
import { extractFileExtension } from '../../utils/files';

export type AttachmentsBoxPropsType =
{
    files: { fileId: string }[];
};

const props = defineProps<AttachmentsBoxPropsType>();
const isFileDialogOpen = ref(false);
</script>

<style lang="less" scoped>
@import url('@/modules/core/stylesheets/globalStyle.less');

.attachmentsFieldRoot
{
    box-shadow: 5px black inset;
    container-name: attachmentsFieldRoot;
    container-type: size;

    .noItemsContainer
    {
        color: @foreground;
        .center;
        & > div
        {
            display: grid;
            gap: 14px;
            font-size: 12px;
        }
    }
}

#boxesContainer
{
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: 45px;
    gap: 8px;
    margin-bottom: 6px;
}

@container attachmentsFieldRoot (width <= 600px)
{
    #boxesContainer
    {
        grid-template-columns: 1fr;
    }
}
</style>