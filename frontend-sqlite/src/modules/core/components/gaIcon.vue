<template>
    <div id="main">
        <span class="material-symbols-outlined">{{ icon }}</span>
    </div>
</template>

<script lang="ts" setup>
defineProps<{icon: string}>();
</script>