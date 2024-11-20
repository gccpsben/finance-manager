import { createApp, defineAsyncComponent } from 'vue'
import { createPinia } from 'pinia'
import axios from 'axios'
import VueAxios from 'vue-axios'
import { createMetaManager } from 'vue-meta'
import { createVuetify } from 'vuetify';

import App from './App.vue'
import router from './router.js'
import gridShortcut from '@/modules/core/components/layout/GridShortcut.vue';
import faIcon from "@/modules/core/components/decorations/FaIcon.vue";
import faIconButton from "@/modules/core/components/inputs/FaIconButton.vue";
import gridArea from "@/modules/core/components/layout/GridArea.vue";
import cell from "@/modules/core/components/data-display/Cell.vue";
import numberCell from "@/modules/core/components/data-display/NumberCell.vue";
import customTable from "@/modules/core/components/data-display/CustomTable.vue";
import viewTitle from "@/modules/core/components/data-display/ViewTitle.vue";
import vBasic from '@/modules/core/directives/vBasic';
import vArea from '@/modules/core/directives/vArea';
import vIntegerOnly from '@/modules/core/directives/vIntegerOnly'
import GaIcon from './modules/core/components/decorations/GaIcon.vue'

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
app.component('list-cell', defineAsyncComponent(() => import("@/modules/core/components/data-display/ListCell.vue")));
app.component('custom-dropdown', defineAsyncComponent(() => import("@/modules/core/components/inputs/CustomDropdown.vue")));
app.component('container-values-graph-cell', defineAsyncComponent(() => import("@/modules/containers/components/ContainerValuesGraphCell.vue")));
app.component('view-title', viewTitle);

const pinia = createPinia();
app.use(pinia)
app.use(vuetify)
app.mount('#app')