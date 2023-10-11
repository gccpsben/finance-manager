<script setup lang="ts">
import vArea from 'snippets/vite-vue-ts/directives/vArea';
import vBasic from 'snippets/vite-vue-ts/directives/vBasic';
</script>

<script lang="ts">
import { useMainStore, type PageDefinition } from "@/stores/store";
export default 
{
    directives: {vArea},
    data()
    {
        return {
            store: useMainStore(),
        };
    },
    mounted()
    {
        this.store.updateAll();
    },
    computed:
    {
        currentPageName() { return this.$router.currentRoute.value.fullPath.split('/').pop(); }
    },
    methods:
    {
        goToPage(page: PageDefinition) { this.$router.push( { name: page.name }); },
        isSelected(page: PageDefinition) { return this.$route.fullPath.startsWith(`/main/${page.name}`); }
    }
}
</script>

<template>
    <div id="topDiv">
        <grid-shortcut v-basic="'#topGrid.fullSize'" columns="minmax(13vw, 225px) 1fr" rows="1fr" areas="'leftBar content'">

            <grid-shortcut v-basic="'#leftBar.fullSize'" v-area="'leftBar'" columns="1fr" rows="250px 1fr">
                <div v-basic="'#userDiv.center'" style="overflow:hidden;">
                    <div>
                        <div v-basic="'#userIcon.center'">P1</div>
                        <div id="accountButtonsContainer">
                            <button><i class="fa fa-gear"></i></button>
                            <button><i class="fa fa-right-from-bracket"></i></button>
                        </div>
                    </div>
                </div>
                <div id="leftButtonsContainer">
                    <div v-for="page in store.availablePages" @click="goToPage(page)"
                    :class="{'activeButton': isSelected(page)}">
                        <i :class="page.iconClass"></i>
                        <div class="iconTitle">{{page.displayName}}</div>
                    </div>
                </div>
            </grid-shortcut>

            <div v-basic="'#mobileBar'">
                <div v-for="page in store.availablePages" :class="{'activeButton': isSelected(page)}"
                @click="goToPage(page)">
                    <div class="center fullSize">
                        <i class="tight" :class="page.iconClass"></i>
                    </div>
                </div>
            </div>

            <router-view v-area="'content'"></router-view>
            
        </grid-shortcut>
    </div>
</template>

<style lang="less" scoped>
@import "../stylesheets/globalStyle.less";

#mobileBar { display:none; }

@media only screen and (max-width: 800px) 
{
    #topGrid
    {
        grid-template-columns: 1fr !important;
        grid-template-rows: 1fr 50px !important;
        grid-template-areas: 'content' 'leftBar' !important;

        & :deep(#mobileBar)
        { 
            display:unset; 
            .bg(#151515); .fg(gray);
            box-sizing: border-box;

            & > div
            {
                .size(50px, 50px); display:inline-block;
                &.activeButton i { .fg(white); }
                &.activeButton { .bg(@focusDark); box-sizing: border-box; }
            }
        }
    }

    #leftBar { display:none; }
}

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
            .horiPadding(10px); 
            font-size:14px;
            grid-template-columns: 0.5fr 1fr; 
            grid-template-rows: 1fr; 
            grid-template-areas: 'icon header'; 
            cursor:pointer; height:40px; 
            color: white;

            i { grid-area:icon; display:inline-block; color: inherit; }
            &:hover 
            { 
                .bg(@focusDark); transition: all 0.2s ease;
            }
            div { grid-area:header; text-align: justify; }
        }

        .activeButton 
        { 
            .bg(@backgroundDark); border-right:2px solid @focus; color: @focusLight; 
            i { color: @focusLight; }
        }
    }
    
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
