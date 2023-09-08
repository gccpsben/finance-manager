<template>
    <div class="fullWidth xLeft">
        <h3 class="viewTitle">{{ title }}</h3>
    </div>
</template>

<script lang="ts">
export default
{
    props: ['title']
}
</script>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';
</style>