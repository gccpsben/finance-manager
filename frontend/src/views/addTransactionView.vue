<template>
    <div id="topDiv">
        <custom-dropdown style="width:150px; position:absolute; left:500px; top:500px;">
            <template #main="props">
                <grid-shortcut columns="1fr 25px" style="padding:5px; cursor:pointer;">
                    <div style="color:white;" class="middleLeft">{{ props.currentItem }}</div>
                    <div class="center">
                        <fa-icon style="font-size:12px; color:white;" icon="fa-solid fa-chevron-down"></fa-icon>
                    </div>
                </grid-shortcut>
            </template>
            <template #row="props">
                <div style="background:green;">
                    <div>{{ props.item }}</div>
                </div>
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