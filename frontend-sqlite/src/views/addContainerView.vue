<template>

    <metainfo>
        <template v-slot:title="{content}">{{content}}</template>
    </metainfo>

    <div id="topDiv" class="center">

        <div v-if="isLoading" class="fullSize center">Initializing...</div>

        <div id="containersSelectDiv" v-if="!isLoading">
            <grid-shortcut columns="100px 1fr" class="fullWidth field">
                <div class="middleLeft">Title:</div>
                <input type="text" placeholder="Title Here..." v-model="containerName"/>
            </grid-shortcut>

            <grid-shortcut columns="1fr 1fr">
                <div></div>
                <div class="middleRight">
                    <button @click="upload">Upload</button>
                </div>
            </grid-shortcut>
        </div>
        
    </div>
</template>

<script lang="ts">
import { useMainStore } from "@/stores/store";
import { useMeta } from 'vue-meta';

export default
{
    setup () 
    {
        useMeta(
        {
            title: 'Add Container',
            htmlAttrs: 
            {
                lang: 'en',
            }
        });
    },
    async mounted() 
    { 
        this.isLoading = true;
        await this.store.updateAll(); 
        this.isLoading = false;
    },
    data()
    {
        return { 
            isLoading: true,
            store: useMainStore(),
            containerName: "",
            isFormUploading: false
        }
    },
    methods:
    {
        async upload()
        {
            let self = this;
            let body = 
            {
                "name": this.containerName,
            };
            
            this.isFormUploading = true;
            this.store.authPost(`/api/finance/containers/add`, body)
            .then(() => { alert("Successfully Added Container."); })
            .catch(error => { alert(`Error trying to upload Container. ${error}`); })
            .finally(() => { self.isFormUploading = false; });
        }
    }
}
</script>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap');

#topDiv
{
    #containersSelectDiv { .size(500px, auto); }

    background: @background; .fullSize;
    color:white;

    input
    {
        appearance: none;
        outline: none;
        background: @backgroundDark;
        border:0px;
        color:white;
        padding-left:10px;
        font-size:16px;
        border-radius: 0;
        margin:0px;
    }

    .field
    {
        height:45px; margin-top:5px;
        div { .fullSize; }
    }

    button { background:@backgroundDark; border:0px; color:white; padding:10px; margin-top:15px; cursor:pointer; }
    button:hover { background:@surfaceHigh; }
    button:disabled { opacity:0.5; cursor:not-allowed; }
}

.containerValueText
{
    color:gray;
    font-family: Consolas;
}
div.grayText { opacity: 0.2; } 

@media only screen and (max-width: 600px) 
{
    #topDiv { height: 100svh; }

    #containersSelectDiv
    {
        width:90vw !important;
        overflow-x: hidden;
    }

    #spendingFieldContainer
    {
        grid-template-columns: 100px 180px auto !important;
    }
}

</style>