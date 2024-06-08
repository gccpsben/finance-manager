import { createApp } from 'vue'
import { createPinia } from 'pinia'
import axios from 'axios'
import VueAxios from 'vue-axios'
import { markRaw } from 'vue'
import { createMetaManager } from 'vue-meta'
import { createVuetify } from 'vuetify';

import App from './App.vue'
import router from './router/router.js'
import type { Router } from 'vue-router';
import gridShortcut from './components/gridShortcut.vue';
import faIcon from "./components/faIcon.vue";
import gridArea from "./components/gridArea.vue";
import cell from "@/components/controls/cell.vue";
import numberCell from "@/components/controls/numberCell.vue";
import listCell from "@/components/controls/listCell.vue";
import netWorthGraphCell from "@/components/controls/netWorthGraphCell.vue";
import customTable from "@/components/custom-table.vue";
import viewTitle from "@/components/controls/viewTitle.vue";
import customDropdown from "@/components/custom-dropdown.vue";
import vBasic from 'snippets/vite-vue-ts/directives/vBasic';
import vArea from 'snippets/vite-vue-ts/directives/vArea';
import vIntegerOnly from 'snippets/vite-vue-ts/directives/vIntegerOnly'
import containerValuesGraphCellVue from './components/controls/containerValuesGraphCell.vue'

export const vuetify = createVuetify(
{
    theme: { defaultTheme: 'dark' },
})

const app = createApp(App)
app.use(VueAxios, axios)
app.use(router)
app.use(createMetaManager())
app.directive('area', vArea);
app.directive('basic', vBasic);
app.directive('int-only', vIntegerOnly)
app.component('grid-shortcut',gridShortcut);
app.component('fa-icon', faIcon);
app.component('grid-area', gridArea);
app.component('cell', cell);
app.component('number-cell', numberCell);
app.component('custom-table', customTable);
app.component('list-cell', listCell);
app.component('net-worth-graph-cell', netWorthGraphCell);
app.component('custom-dropdown', customDropdown);
app.component('container-values-graph-cell', containerValuesGraphCellVue);
app.component('view-title', viewTitle);

// Since router isn't defined in the pinia type, add them manually.
declare module 'pinia' 
{
    export interface PiniaCustomProperties { $router: Router; } 
}
const pinia = createPinia();
pinia.use(({ store }) => { store.$router = markRaw(router) });
app.use(pinia)
app.use(vuetify)
app.mount('#app')