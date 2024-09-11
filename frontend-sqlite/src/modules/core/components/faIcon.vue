<template>
    <div id="main">
        <i :class="icon"></i>
    </div>
</template>

<script lang="ts" setup>
defineProps<{icon: string}>();
</script>