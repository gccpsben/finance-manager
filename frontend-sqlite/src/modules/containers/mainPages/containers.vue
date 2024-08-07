<template>
    <div id="topDiv">

        <view-title :title="title"></view-title>

        <pagination v-if="!selectedContainerID" v
                    -model:currentPage="currentPage" :itemsInPage="15" :items="store.containers.lastSuccessfulData ?? []" 
                    v-slot="props" class="fullSize" style="height:calc(100svh - 170px);"> 
            <div id="panel">
                <grid-shortcut rows="1fr" columns="1fr auto">
                    <h2 class="panelTitle">All Containers</h2>
                    <div class="pageSelector">
                        <fa-icon @click="props.previous()" id="previousArrow" icon="fa-solid fa-chevron-left"></fa-icon>
                        <input type="number" size="1" v-int-only v-model.lazy="pageReadable" min="1"> 
                        <fa-icon @click="props.next()" id="nextArrow" icon="fa-solid fa-chevron-right"></fa-icon>
                    </div>
                </grid-shortcut> 
                <grid-shortcut class="fullSize" rows="repeat(20, 1fr)" columns="1fr" style="padding-top:15px;">

                    <div class="row tight" style="font-size:14px;" @click="selectContainer(Container.pubID)"
                    v-for="Container in props.pageItems">
                        <div v-area="'name'" class="tight yCenter ellipsisContainer">
                            <div>{{ Container.name }}</div>
                        </div>
                        <div v-area="'value'" class="tight yCenter ellipsisContainer">
                            <div>{{ Number(Number(Container.value).toPrecision(3)) }}</div>
                        </div>
                        <div v-area="'valueActual'" class="tight yCenter ellipsisContainer">
                            <div>{{ Number(Number(Container.valueActual).toPrecision(3)) }}</div>
                        </div>
                        <!-- <div v-area="'arrow'" class="tight yCenter xRight ellipsisContainer">
                            <fa-icon icon="fa-solid fa-arrow-right"></fa-icon>
                        </div> -->
                    </div>

                </grid-shortcut>
            </div>
        </pagination>

        <div id="panel" v-if="selectedContainerID" >
            <grid-shortcut rows="300px 1fr" columns="300px 1fr auto">
                <div class="panel center">
                    <grid-shortcut rows="auto auto auto" columns="1fr">
                        <div class="center">
                            <div id="coinIcon">?</div>
                        </div>
                        <div class="center">
                            <h2 class="fsNumbers">{{ selectedContainer?.name }}</h2>
                        </div>
                        <div class="center">
                            
                        </div>
                    </grid-shortcut> 
                </div>
            </grid-shortcut> 
        </div>

    </div>
</template>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
@import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Roboto:ital,wght@0,100;0,300;0,500;0,700;0,900;1,100;1,300;1,500;1,700;1,900&display=swap');

#coinIcon
{
    border-radius:100%; width:100px; height:100px; background:#222222;
    .center; .fg(white);
}

.panel 
{ 
    background:@background; 
    padding:25px;
    color:gray;
    & h2 { font-weight:100; }
    & .fsNumbers { margin-top:35px; }
}

#topDiv
{
    padding:50px; box-sizing: border-box;
    overflow-x:hidden;
    font-family: 'Schibsted Grotesk', sans-serif;
    .gradBackground;

    input 
    {
        color:white;
        background:transparent; 
        border:1px solid #252525;
        width:30px;
        padding:0px; .horiMargin(5px);
        text-align: center;
    }

    #panel
    {
        height: calc(100svh - 290px);
        box-sizing:border-box;
        .panelTitle { text-align:start; color:gray; font-size:14px; .tight; display:inline; }
        .pageSelector  { color:gray !important; transform: translateY(-3px); }
        #nextArrow, #previousArrow { margin:0px; display:inline; font-size:14px; cursor: pointer; }
        #currentPage { .horiMargin(15px); .vertMargin(5px); font-size:16px; min-width:15px; display:inline-block; text-align: center; }
        .disabled { pointer-events: none; opacity:0.2; }

        .row
        {
            background:#050505; color:gray;
            box-sizing: border-box; border:1px solid #101010;
            display:grid; padding:15px; .vertMargin(5px);

            gap: 15px;

            grid-template: 
              "name value valueActual dataSource arrow" 1fr
            / 175px 75px   100px 1fr        50px;

            cursor:pointer;

            &:hover 
            {
                background: @focusDark;
                color: @focus;
            }

            .rowContent
            {
                display:grid; box-sizing: border-box;
                grid-template-columns: 1fr 1fr 1fr;
                grid-template-rows: 1fr 1fr;
            }

            .txnName
            {
                overflow:hidden !important;
            }
        }
    }
}
</style>

<script lang="ts">
import { useMainStore } from '@/modules/core/stores/store';
import type { Container, ValueHydratedContainer } from '@/types/dtos/containersDTO';
import paginationVue from 'snippets/vite-vue-ts/components/pagination.vue';

export default
{
    components: {'pagination':paginationVue},
    data()
    {
        let data = 
        {
            store: useMainStore(),
            currentPage: 0
        };
        return data;
    },
    computed:   
    {
        selectedContainerID() 
        { 
            return this.$route.params.pubID as string;
        },
        pageReadable:
        {
            get() { return this.currentPage + 1; },
            set(value:number) { this.currentPage = value - 1;  }
        },
        selectedContainer()
        {
            if (this.selectedContainerID == undefined) return undefined;
            let container = this.store.findContainerByPubID(this.selectedContainerID);
            return container as Container|undefined;
        },
        title()
        {
            if (this.selectedContainer) return `Containers - ${this.selectedContainer.name}`;
            return `Containers`;
        }
    },
    methods:
    {
        selectContainer(pubID: string)
        {
            this.$router.push(
            {
                name: "containers",
                params: { pubID: pubID }
            });
        }
    }
}
</script>