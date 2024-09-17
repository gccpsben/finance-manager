import { createApp, defineAsyncComponent } from 'vue'
import { createPinia } from 'pinia'
import axios from 'axios'
import VueAxios from 'vue-axios'
import { markRaw } from 'vue'
import { createMetaManager } from 'vue-meta'
import { createVuetify } from 'vuetify';

import App from './App.vue'
import router from './router.js'
import type { Router } from 'vue-router';
import gridShortcut from '@/modules/core/components/gridShortcut.vue';
import faIcon from "@/modules/core/components/faIcon.vue";
import faIconButton from "@/modules/core/components/faIconButton.vue";
import gridArea from "@/modules/core/components/gridArea.vue";
import cell from "@/modules/core/components/cell.vue";
import numberCell from "@/modules/core/components/numberCell.vue";
import customTable from "@/modules/core/components/custom-table.vue";
import viewTitle from "@/modules/core/components/viewTitle.vue";
import vBasic from '@/modules/core/directives/vBasic';
import vArea from '@/modules/core/directives/vArea';
import vIntegerOnly from '@/modules/core/directives/vIntegerOnly'
import GaIcon from './modules/core/components/gaIcon.vue'

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
app.directive('int-only', vIntegerOnly);
app.component('grid-shortcut',gridShortcut);
app.component('fa-icon', faIcon);
app.component('ga-icon', GaIcon);
app.component('fa-icon-btn', faIconButton);
app.component('grid-area', gridArea);
app.component('cell', cell);
app.component('number-cell', numberCell);
app.component('custom-table', customTable);
app.component('list-cell', defineAsyncComponent(() => import("@/modules/core/components/listCell.vue")));
app.component('net-worth-graph-cell', defineAsyncComponent(() => import("@/modules/charts/components/netWorthGraphCell.vue")));
app.component('custom-dropdown', defineAsyncComponent(() => import("@/modules/core/components/custom-dropdown.vue")));
app.component('container-values-graph-cell', defineAsyncComponent(() => import("@/modules/containers/components/containerValuesGraphCell.vue")));
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