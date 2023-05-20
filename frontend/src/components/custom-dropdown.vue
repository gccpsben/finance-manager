<template>
    <div id="topDiv">
        <slot name="main" :currentItem="currentItem"></slot>
    </div>
</template>

<script lang="ts">
export default
{
    data() 
    { 
        var data = 
        {
            "items": [123123,12312312],
            "currentItem": undefined
        };

        return data;
    },
    computed: 
    { 
        
    }
}
</script>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';
#topDiv
{
    background:@backgroundDark;
    width:fit-content;
    height:fit-content;
    & /deep/ { cursor:pointer !important; }
}
</style>