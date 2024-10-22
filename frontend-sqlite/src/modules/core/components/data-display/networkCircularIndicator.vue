<template>
    <div class="center fullHeight">
        <VTooltip v-if="error" :text="JSON.stringify(error)">
            <template v-slot:activator="{ props }">
                <div v-bind="props" style="color:pink" class="center">
                    <span class="material-symbols-outlined">report</span>
                </div>
            </template>
        </VTooltip>
        <VProgressCircular v-else-if="isLoading" indeterminate style="color:white"/>
    </div>
</template>

<script lang="ts" setup>
import { VProgressCircular, VTooltip } from 'vuetify/lib/components/index.mjs';
import { defineProps } from 'vue';

export type NetworkCircularIndicatorProps =
{
    isLoading: boolean;
    error?: Record<string, any> | string;
};

withDefaults
(
    defineProps<NetworkCircularIndicatorProps>(),
    {
        isLoading: true,
        error: undefined
    }
);
</script>

<style lang="less" scoped>
@import 'https://cdn.jsdelivr.net/npm/vuetify@3.6.8/dist/vuetify-labs.css';
</style>