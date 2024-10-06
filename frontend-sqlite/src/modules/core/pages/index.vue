<script setup lang="ts">
import vArea from '@/modules/core/directives/vArea';
import vBasic from '@/modules/core/directives/vBasic';
</script>

<script lang="ts">
import { useMainStore, type PageDefinition } from "../stores/store";
import router from '@/router';
export default
{
    directives: {vArea},
    data()
    {
        return {
            store: useMainStore(),
        };
    },
    computed:
    {
        currentPageName() { return router.currentRoute.value.fullPath.split('/').pop(); },
        topGridColumns() { return this.store.mainViewSidebarVisible ? `minmax(13vw, 225px) 1fr` : `0px 1fr` }
    },
    methods:
    {
        goToPage(page: PageDefinition) { router.push( { name: page.name }); },
        isSelected(page: PageDefinition) { return router.currentRoute.value.fullPath.startsWith(`/main/${page.name}`); }
    }
}
</script>

<template>
    <div id="routerViewTopDiv">
        <grid-shortcut v-basic="'#topGrid.fullSize'" columns="auto 1fr" rows="1fr" areas="'leftBar content'">

            <grid-shortcut v-basic="'#leftBar.fullSize'" v-area="'leftBar'" columns="1fr" rows="100px 1fr" class="rel" :class="{'hidden': !store.mainViewSidebarVisible}">
                <div v-basic="'#userDiv.center'" style="overflow: hidden;">
                    <!-- <div>
                        <div v-basic="'#userIcon.center'">P1</div>
                    </div> -->
                </div>
                <div id="leftButtonsContainer" style="overflow: hidden;">
                    <div v-for="page in store.availablePages" @click="goToPage(page)"
                    :class="{'activeButton': isSelected(page)}">
                        <i :class="page.iconClass"></i>
                        <div class="iconTitle">{{page.displayName}}</div>
                    </div>
                </div>
                <div class="xRight yCenter abs fullSize" style="pointer-events:none">
                    <div id="sideBarButton" @click="store.mainViewSidebarVisible = !store.mainViewSidebarVisible" class="debug" style="pointer-events:all">
                        <fa-icon v-if="store.mainViewSidebarVisible" icon="fa-solid fa-chevron-left"></fa-icon>
                        <fa-icon v-else icon="fa-solid fa-chevron-right"></fa-icon>
                    </div>
                </div>
            </grid-shortcut>

            <div v-area="'content'" class="rel" style="overflow:auto;">
                <router-view v-area="'content'" v-slot="{ Component }">
                    <Transition name="page-transition">
                        <component :is="Component"/>
                    </Transition>
                </router-view>
            </div>

            <div v-basic="'#mobileBar'">
                <div v-for="page in store.availablePages" :class="{'activeButton': isSelected(page)}"
                @click="goToPage(page)">
                    <div class="center fullSize">
                        <i class="tight" :class="page.iconClass"></i>
                    </div>
                </div>
            </div>

        </grid-shortcut>
    </div>
</template>

<style lang="less" scoped>
@import "../stylesheets/globalStyle.less";

#mobileBar { display:none; }

#topGrid { background: @pageBackground; }

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
            border-top: 1px solid @border;

            & > div
            {
                .size(50px, 50px); display:inline-block;
                &.activeButton i { .fg(@focus); text-shadow: 0px 0px 15px fade(@focus, 50%); }
                &.activeButton { box-sizing: border-box; }
            }
        }
    }

    #leftBar { display:none; }
}

#leftBar
{
    border-right:1px solid @border; z-index:999;
    box-sizing: border-box; box-shadow: 0px 0px 10px black;
    width: 200px;
    transition: all 0.2s ease-in-out;

    &.hidden { width: 0px; }

    #userDiv
    {
        #userIcon { background: @surfaceHigh; .circle(50px); color:white; }
    }

    #leftButtonsContainer
    {
        & > div
        {
            .center; .gridBase;
            transition: all 0.3s ease;
            .horiPadding(10px);
            font-size:14px;
            grid-template-columns: 0.5fr 1fr;
            grid-template-rows: 1fr;
            grid-template-areas: 'icon header';
            cursor:pointer; height:40px;
            color: white;
            font-family: @font;

            i { grid-area:icon; display:inline-block; color: inherit; }
            &:hover
            {
                .bg(@focusDark); transition: all 0.2s ease;
                padding-left: 0px;
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

#sideBarButton
{
    position:fixed;
    height:25px;
    width:15px;
    transform:translateX(100%);
    background: @background;
    border: 1px solid @border;
    border-radius: 0px 5px 5px 0px;
    border-left: 0px;
    color: @foreground;
    z-index: 999;
    font-size: 10px;
    .center;
    cursor:pointer;

    &:hover
    {
        background: @surfaceHigh;
    }
}

#routerViewTopDiv
{
    .fullSize;
	background: @background;
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
    overflow: hidden;
}

.page-transition-enter-active
{
    transition: all 0.5s ease;
    position: absolute;
    opacity:1;
    transform: scale(1);
    & > * { overflow: hidden !important }
}
.page-transition-leave-active
{
    transition: all 0.5s ease;
    position: absolute;
    opacity:0;
    transform: scale(0.9);
    & > * { overflow: hidden !important }
}
.page-transition-enter-from
{
    transition: all 0.5s ease;
    position: absolute;
    transform: scale(0.9);
    opacity:0;
    & > * { overflow: hidden !important }
}
.page-transition-leave-to
{
    transition: all 0.5s ease;
    position: absolute;
    transform: scale(0.9);
    opacity:0;
    & > * { overflow: hidden !important }
}
</style>
