<template>
    <div class="fileUploadProgressBoxRoot">
        <OverlapArea>
            <div class="fileUploadProgressBoxRootInner">
                <div class="fullWidth">
                    <div class="yBottom">
                        <div class="fileUploadProgressBoxTitle">
                            {{ props.name }}
                        </div>
                    </div>
                    <div class="fileUploadProgressGrid" style="grid-area: progress;">
                        <div :class="{[props.state]: true}"></div>
                        <div></div>
                    </div>
                </div>
            </div>
        </OverlapArea>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import OverlapArea from '../layout/OverlapArea.vue';
import AbsEnclosure from '../layout/AbsEnclosure.vue';

export type FileUploadProgressBoxPropsType =
{
    value: number;
    name: string;
    state: "ERROR" | "OKAY" | "PROGRESS";
};

const props = defineProps<FileUploadProgressBoxPropsType>();
const progressGridColumns = computed(() => `${props.value}fr ${1 - props.value}fr`);
</script>

<style lang="less" scoped>
@import url('@/modules/core/stylesheets/globalStyle.less');

.fileUploadProgressBoxRoot
{

    padding: 7px;
    padding-top: 2px;
    &:hover { cursor: pointer; background: #222; }

    .fileUploadProgressBoxRootInner
    {
        .yCenter;

        .fileUploadProgressBoxTitle
        {
            width: 100%;
            height: 100%;
            // .ellipsis;
        }

        .fileUploadProgressGrid
        {
            margin-top: 4px;
            display: grid;
            grid-template-rows: 1fr;
            grid-template-columns: v-bind(progressGridColumns);

            & > div:nth-child(1)
            {
                height: 3px;

                &.ERROR { background:@error; }
                &.OKAY { background: @success; }
                &.PROGRESS { background:@focus; }
            }
        }
    }
}
</style>