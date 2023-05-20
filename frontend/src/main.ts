import { createApp } from 'vue'
import { createPinia } from 'pinia'
import axios from 'axios'
import VueAxios from 'vue-axios'
import { markRaw } from 'vue'
import { createMetaManager } from 'vue-meta'

import App from './App.vue'
import router from './router/router.js'
import type { Router } from 'vue-router';
import gridShortcut from './components/gridShortcut.vue';
import faIcon from "./components/faIcon.vue";
import gridArea from "./components/gridArea.vue";
import numberCell from "@/components/controls/numberCell.vue";
import listCell from "@/components/controls/listCell.vue";
import customTable from "@/components/custom-table.vue";
import customDropdown from "@/components/custom-dropdown.vue"

const app = createApp(App)
app.use(VueAxios, axios)
app.use(router)
app.use(createMetaManager())
app.component('grid-shortcut',gridShortcut)
app.component('fa-icon', faIcon)
app.component('grid-area', gridArea)
app.component('number-cell', numberCell)
app.component('custom-table', customTable)
app.component('list-cell', listCell)
app.component('custom-dropdown', customDropdown)

// Since router isn't defined in the pinia type, add them manually.
declare module 'pinia' 
{
    export interface PiniaCustomProperties { $router: Router; } 
}
const pinia = createPinia();
pinia.use(({ store }) => { store.$router = markRaw(router) })
app.use(pinia)

app.mount('#app')
