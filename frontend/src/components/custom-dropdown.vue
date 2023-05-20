<template>
    <div id="topDiv">
        <div @click="opened=!opened" >
            <slot id="selector" name="main" :currentItem="currentItem"></slot>
        </div>
        <div v-if="opened" style="width:100%; background:red; position:absolute;">
            <div v-for="item in items" @click="currentItem = item">
                <slot name="row" :item="item"></slot>
            </div>
        </div>
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
            "currentItem": undefined as any,
            "opened": true
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
    position:relative;
    background:@backgroundDark;
    width:fit-content;
    height:fit-content;
}
</style>