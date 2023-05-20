<script setup lang="ts">
</script>

<script lang="ts">
import { useMainStore } from "@/stores/store";
export default 
{
    data()
    {
        return {
            store: useMainStore()
        };
    },
    mounted()
    {
        this.store.updateAll();
    }
}
</script>

<template>
    <div id="topDiv">
        <grid-shortcut class="fullSize" columns="minmax(13vw, 225px) 1fr" rows="1fr">
            <grid-shortcut id="leftBar" class="fullSize" columns="1fr" rows="250px 1fr">
                <div id="userDiv" class="center" style="overflow:hidden;">
                    <div>
                        <div id="userIcon" class="center">P1</div>

                        <div id="accountButtonsContainer">
                            <button><i class="fa fa-gear"></i></button>
                            <button><i class="fa fa-right-from-bracket"></i></button>
                        </div>
                    </div>
                </div>
                <div id="leftButtonsContainer">
                    <div v-for="page in store.availablePages"
                    @click="$router.push('./' + page.name)"
                    :class="{'activeButton': $router.currentRoute.value.fullPath.split('/').pop() == page.name}">
                        <i :class="page.iconClass"></i>
                        <div class="iconTitle">{{page.displayName}}</div>
                    </div>
                </div>
            </grid-shortcut>
            <router-view></router-view>
        </grid-shortcut>
    </div>
</template>

<style lang="less">
@import "../stylesheets/globalStyle.less";

#leftBar
{
    border-right:1px solid @border; z-index:999;
    box-sizing: border-box; box-shadow: 0px 0px 10px black;

    #userDiv
    {
        #accountButtonsContainer
        {
            .center; margin-top:15px; width:100%;
            & > button { .minButtonBase; padding-bottom:2px; color:white; background:@focusDark; margin:5px; border-radius: 5px; width:30px; height:30px; font-size:14px; }
            & > button:hover { background: @focus; }
        }

        #userIcon { background: @surfaceHigh; .circle(100px); color:white; }
    }

    #leftButtonsContainer
    {
        & > div 
        {
            .center; .gridBase; 
            transition: width 0s ease, background-color 0.5s ease; 
            .horiPadding(30px); 
            grid-template-columns: 0.5fr 1fr; 
            grid-template-rows: 1fr; 
            grid-template-areas: 'icon header'; 
            cursor:pointer; height:50px; 

            i { grid-area:icon; display:inline-block; color:white; }
            &:hover { .bg(@focus); transition: all 0.2s ease; }
            div { grid-area:header; color:white; text-align: justify; }
        }
    }
    
    .activeButton i { color: #d7f6ff; }
    .activeButton { .bg(@focusDark); border-right:2px solid @focus; }
    .mainGridCell { border-radius: @gridCellBorderRadius; box-sizing: border-box; }
}

#topDiv 
{
    .fullSize;
	background: @background;
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
}
</style>
