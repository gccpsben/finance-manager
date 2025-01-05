<template>
    <div style="line-height: 0; user-select: none;">
        <span style="font-size: inherit" class="material-symbols-outlined">{{ icon }}</span>
    </div>
</template>

<script lang="ts" setup>
defineProps<{icon: string}>();
</script>