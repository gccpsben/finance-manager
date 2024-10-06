<template>

    <metainfo>
        <template v-slot:title="{content}">{{content}}</template>
    </metainfo>

    <div id="topDiv">
        <grid-shortcut id="loginForm" rows="auto 45px 45px 35px" columns="1fr">
            <div id="loginHeader">Login</div>
            <text-field :field-name="'Username'" v-model:text="enteredUsername"/>
            <password-field v-model:text="enteredPassword" :input-type="'text'" :field-name="'Password'"/>
            <div id="loginCell">
                <button @click="login">Login</button>
            </div>
        </grid-shortcut>
    </div>
</template>

<style lang="less" scoped>
@import "@/modules/core/stylesheets/globalStyle.less";

#topDiv
{
    background:@background;
    .fullSize; .center;
    overflow:hidden;
    font-family: @font;

    #loginForm
    {
        #loginHeader
        {
           .center;
           margin-bottom:16px;
           font-weight: bold;
        }

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
import { API_LOGIN_PATH } from '@/apiPaths';
import { useMainStore } from '@/modules/core/stores/store';
import { useMeta } from 'vue-meta';
import passwordField from '@/modules/core/components/passwordField.vue';
import textField from '../components/textField.vue';
import router from '@/router';

export default
{
    components: { "password-field": passwordField, "text-field": textField },
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
        let data =
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
            let self = this;
            this.axios.post(API_LOGIN_PATH,
            {
                "username": self.enteredUsername,
                "password": self.enteredPassword
            })
            .then(response =>
            {
                let jwtToken = response.data.token; // "Bearer xxxxxx..."
                this.store.setCookie("jwt", jwtToken, 30);
                router.push("/main/dashboard");
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