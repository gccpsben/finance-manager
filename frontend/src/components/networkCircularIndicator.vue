<template>
    <div class="center fullHeight">
        <VTooltip v-if="error" :text="error">
            <template v-slot:activator="{ props }">
                <v-btn v-bind="props" style="color:pink" class="center">
                    <span class="material-symbols-outlined">report</span>
                </v-btn>
            </template>
        </VTooltip>
        <v-progress-circular v-else-if="isLoading" indeterminate />
    </div>
</template>

<script lang="ts">
import { VIcon, VProgressCircular, VTooltip } from 'vuetify/lib/components/index.mjs';
import faIcon from './faIcon.vue';

export default
{
    components: { VProgressCircular, VIcon, faIcon, VTooltip },
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

<style lang="less">
@import '@/stylesheets/globalStyle.less';
@import 'https://cdn.jsdelivr.net/npm/vuetify@3.6.8/dist/vuetify-labs.css';
</style>