<template>

    <metainfo>
        <template v-slot:title="{content}">{{content}}</template>
    </metainfo>

    <div id="topDiv">
        <grid-shortcut id="loginForm" rows="45px 45px 35px" columns="1fr">
            <div class="field">
                <div><span class="material-symbols-outlined noHighlight">person</span></div>
                <div class="flex">
                    <input v-model="enteredUsername"
                    placeholder="Username">
                </div>
            </div>
            <div class="field">
                <div><span class="material-symbols-outlined smallIcon noHighlight">key</span></div>
                <div class="flex">
                    <input v-model="enteredPassword"
                    placeholder="Password" :type="pwVisible ? 'text' : 'password'">
                </div>
                <div @click="pwVisible = !pwVisible" class="noHighlight">
                    <span class="material-symbols-outlined smallIcon pwToggle">
                        {{ pwVisible ? 'visibility_off' : 'visibility' }}
                    </span>
                </div>
            </div>
            <div id="loginCell">
                <button @click="login">Login</button>
            </div>
        </grid-shortcut>
    </div>
</template>

<style lang="less" scoped>
@import "@/stylesheets/globalStyle.less";

#topDiv
{
    background:@background;
    .fullSize; .center;
    overflow:hidden;

    #loginForm
    {
        gap: 15px;
        width:clamp(200px, 80vw, 300px);

        .flex { display:flex; }

        .field
        {
            display:flex; .bg(@backgroundDark);
            color:white;

            .smallIcon { font-size:20px; }
            .pwToggle { cursor:pointer; }
            & > div:nth-child(1) { aspect-ratio:1/1; height:100%; .center; }
            & > div:nth-child(2) { width:100%; }
            & > div:nth-child(3) { aspect-ratio:1/1; height:100%; .center; }

            input
            {
                .clearInput; .noBorder;
                background:inherit; color:white;
                padding:15px; padding-left:5px; .fullWidth;
            }
        }

        #loginCell
        {
            .xRight;

            button 
            {
                .horiPadding(15px); border:0;
                .bg(@backgroundDark); cursor:pointer;
                color:white; .clearInput;
            }
        }
    }
}
</style>

<script lang="ts">
import { useMainStore } from '@/stores/store';
import { useMeta } from 'vue-meta';

export default
{
    setup()
    {
        useMeta(
        {
            meta: 
            {
                "name":"viewport",
                "content":"width=device-width, initial-scale=1, maximum-scale=1",
            }
        });
    },
    data()
    {
        var data = 
        {
            enteredUsername: "",
            enteredPassword: "",
            pwVisible: false,
            store: useMainStore()
        };
        return data;
    },
    methods:
    {
        login()
        {
            var self = this;
            this.axios.post("./api/finance/login", 
            {
                "username": self.enteredUsername,
                "password": self.enteredPassword
            })
            .then(response => 
            {
                var jwtToken = response.data.token; // "Bearer xxxxxx..."
                this.store.setCookie("jwt", jwtToken, 30);
                this.$router.push("/main/dashboard");
            })
            .catch(error => 
            {
                if (error.response.status == 401) alert("Incorrect password/username pair.");
                else alert("Unknown error occured, status code: " + error.response.status);
            });
        }
    }
}
</script>