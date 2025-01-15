<template>
    <div id="containerTopDiv">
        <div v-if="container === 'LOADING'" style="position: fixed; top:0px; bottom:0px; left:0px; right:0px;">
            <NetworkCircularIndicator :error="containersStore.containers.error"
                                      is-loading/>
        </div>
        <div v-else-if="container === 'NOT_FOUND'" class="center fullSize">
            <StaticNotice type="ERR">
                <div>
                    Cannot find the container requested.
                    <br /> Please check your URL.
                    <br />
                    <br />
                    <BaseButton @click="router.back()">Back</BaseButton>
                </div>
            </StaticNotice>
        </div>
        <div id="containerTopDivInner" v-else>
            <div id="titleContainer">
                <div>
                    <ViewTitle has-back-button @back="router.back()" :title="container.name"/>
                </div>
                <div class="center">
                    <GaIcon id="editBtn" icon="edit"
                            @click="router.push({ params: { id: urlRequestedID }, name: ROUTER_NAME_EDIT_SINGLE_CONTAINER })"/>
                </div>
            </div>
            <br>
            <br />
            <div id="contentGrid">
                <!-- <Cell>
                    asdasd
                </Cell> -->
                <ContainerWorthHistoryCell v-area="'worthHistory'" :container-id="urlRequestedID" />
                <ContainerWorthHistoryCell v-area="'currWorth'" :container-id="urlRequestedID" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import Cell from '@/modules/core/components/data-display/Cell.vue';
import ViewTitle from '@/modules/core/components/data-display/ViewTitle.vue';
import { useContainersStore } from '../stores/useContainersStore';
import router from '@/router';
import { computed } from 'vue';
import NetworkCircularIndicator from '@/modules/core/components/data-display/NetworkCircularIndicator.vue';
import StaticNotice from '@/modules/core/components/data-display/StaticNotice.vue';
import BaseButton from '@/modules/core/components/inputs/BaseButton.vue';
import GaIcon from '@/modules/core/components/decorations/GaIcon.vue';
import { ROUTER_NAME_EDIT_SINGLE_CONTAINER } from '@/router';
import ContainerWorthHistoryCell from '../components/ContainerWorthHistoryCell.vue';

const urlRequestedID = computed(() => `${router.currentRoute.value.params['id']}`);
const containersStore = useContainersStore();
const container = computed(() =>
{
    if (containersStore.containers.isLoading) return "LOADING";
    const container = containersStore.findContainerById(urlRequestedID.value);
    if (container === undefined) return "NOT_FOUND";
    return container;
});
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

* { box-sizing: border-box; }
@mobileCutoffWidth: 650px;
@bodyRowHeight: 60px;

#containerTopDiv
{
    container-name: containerPage;
    container-type: size;

    overflow-x:hidden;
    .fullSize;
    font-family: @font;

    #editBtn
    {
        font-size: 24px;
        cursor: pointer;
        color: white;
        &:hover { color: @focus; }
    }

    #titleContainer
    {
        display: inline-block;
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: 1fr;
        width:100%;
    }

    #containerTopDivInner
    {
        .fullSize;
        overflow: auto;
        color: @foreground;
        padding: @desktopPagePadding;
    }

    #contentGrid
    {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 450px;
        grid-template-areas: 'worthHistory currWorth' '_ _';
        gap: 14px;
    }
}

@container containerPage (width <= @mobileCutoffWidth)
{
    #containerTopDivInner { padding: @mobilePagePadding !important; }
}
</style>