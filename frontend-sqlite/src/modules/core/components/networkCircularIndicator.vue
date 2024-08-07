<template>
    <div class="center fullHeight">
        <VTooltip v-if="error" :text="JSON.stringify(error)">
            <template v-slot:activator="{ props }">
                <div v-bind="props" style="color:pink" class="center">
                    <span class="material-symbols-outlined">report</span>
                </div>
            </template>
        </VTooltip>
        <v-progress-circular v-else-if="isLoading" indeterminate />
    </div>
</template>

<script lang="ts">
import { VIcon, VProgressCircular, VTooltip, VBtn } from 'vuetify/lib/components/index.mjs';
import faIcon from './faIcon.vue';

export default
{
    components: { VProgressCircular, VIcon, faIcon, VTooltip, VBtn },
    props:
    {
        isLoading: { required: true, type: Boolean, default: true },
        error: { default: undefined }
    },
    data() 
    { 
        let data = { };
        return data;
    },
    methods:
    {
        
    },
    mounted() { },
    watch:
    {

    }
}
</script>

<style lang="less" scoped>
@import 'https://cdn.jsdelivr.net/npm/vuetify@3.6.8/dist/vuetify-labs.css';
</style>