<template>
    <div id="topDiv">
        <custom-dropdown style="width:150px;">
            <template #main="props">
                <grid-shortcut columns="1fr 25px" style="padding:5px;">
                    <div style="color:white;" class="middleLeft">{{ props.currentItem }}</div>
                    <div class="center">
                        <fa-icon style="font-size:12px; color:white;" icon="fa-solid fa-chevron-down"></fa-icon>
                    </div>
                </grid-shortcut>
            </template>
        </custom-dropdown>
    </div>
</template>

<script lang="ts">
export default
{
    data()
    {
        return { sampleData: [1,2,3,4] }
    }
}
</script>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap');

#topDiv
{
    background: @background;
    .fullSize;
}
</style>