<template>
    <VTooltip class="mainTxnTooltip" :location="'bottom start'" :close-delay="500" :open-delay="500">
        <template v-slot:activator="{ props }">
            <div v-bind="props">
                <slot></slot>
            </div>
        </template>
        <div style="display: grid; grid-template-columns: 1fr; grid-auto-rows: auto; grid-auto-flow: row;">
            <div>{{ formatDate(computedDate) }}</div>
            <div style="padding-bottom: 14px;"></div>
            <div class="ageLabel">
                <div>{{ dateAge }}</div>
                <div>ago</div>
            </div>
            <div class="ageLabel">
                <div>{{ dateAgeD }}</div>
                <div>days ago</div>
            </div>
            <div class="ageLabel">
                <div>{{ dateAgeH }}</div>
                <div>hours ago</div>
            </div>
            <div class="ageLabel">
                <div>{{ dateAgeM }}</div>
                <div>minutes ago</div>
            </div>
            <div class="ageLabel">
                <div>{{ dateAgeS }}</div>
                <div>seconds ago</div>
            </div>
            <div class="ageLabel">
                <div>{{ dateAgeMs }}</div>
                <div>ms ago</div>
            </div>
            <div style="padding-bottom: 14px;"></div>
            <div class="epochLabel">{{ computedDate.getTime() }}</div>
        </div>
    </VTooltip>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { VTooltip } from 'vuetify/components';
import { formatDate, getDateAgeFull, getDateAgeFullComponents } from '../../utils/date';
import { useNow } from '@vueuse/core';

export type DateTooltipProps = { date: number | Date; };
const props = defineProps<DateTooltipProps>();
const computedDate = computed(() => typeof props.date === 'number' ? new Date(props.date) : props.date);
const dateAge = computed(() => getDateAgeFull(computedDate.value.getTime(), 'combined', now.value.getTime()));
const dateAgeMs = computed(() => getDateAgeFullComponents(computedDate.value.getTime(), 'single', now.value.getTime()).ms);
const dateAgeS = computed(() => getDateAgeFullComponents(computedDate.value.getTime(), 'single', now.value.getTime()).s);
const dateAgeM = computed(() => getDateAgeFullComponents(computedDate.value.getTime(), 'single', now.value.getTime()).m);
const dateAgeH = computed(() => getDateAgeFullComponents(computedDate.value.getTime(), 'single', now.value.getTime()).h);
const dateAgeD = computed(() => getDateAgeFullComponents(computedDate.value.getTime(), 'single', now.value.getTime()).d);
const now = useNow({interval: 1000});
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

.mainTxnTooltip
{
    & > *
    {
        background: @backgroundDark !important;
        border: 1px solid @border;
        box-shadow: 0px 0px 5px #000;
        color: white;
        pointer-events: all;
    }

    * .epochLabel
    {
        font-family: Consolas;
        color: gray;
    }

    * .ageLabel
    {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: 1fr;
        gap: 24px;
        & > *:nth-child(1) { .xLeft; }
        & > *:nth-child(2) { .xRight; color: gray; }
    }
}
</style>