import { createRouter, createWebHistory } from 'vue-router'
import MainView from '../views/main.vue'
import LoginView from "../views/loginView.vue"

// MainView Pages
import dashboardPage from "../mainViewPages/dashboard.vue"
import chartsPage from "../mainViewPages/charts.vue";
import currenciesPage from '../mainViewPages/currencies.vue';
import transactionsPage from "../mainViewPages/transactions.vue"
import addTransactionsPage from "../views/addTransactionView.vue"
import addContainerPage from '../views/addContainerView.vue'
import addTypePage from '../views/addTypeView.vue'
import addCurrencyPage from '../views/addCurrencyView.vue'
import resolveTransactionPage from '../views/resolveTransactionView.vue'

// lazy loading:
// () => import('../views/AboutView.vue')

const router = createRouter(
{
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: 
	[
		{
			path: '/main',
			name: 'main',
			component: MainView,
            children:
            [
                {
                    path: 'dashboard',
                    name: 'dashboard',
                    component: dashboardPage
                },
                {
                    path: 'currencies/:pubID?',
                    name: "currencies",
                    component: currenciesPage,
                    props: true
                },
                {
                    path: 'transactions/:pubID?',
                    name: 'transactions',
                    component: transactionsPage,
                    props: true
                },
                {
                    path: 'charts',
                    name: 'charts',
                    component: chartsPage
                }
            ]
		},
        {
            path: '/login',
            name: 'login',
            component: LoginView
        },
        {
            path: '/',
            redirect: { name: 'dashboard' }
        },
        {
            path: '/transactions/add',
            name: 'addTransaction',
            component: addTransactionsPage
        },
        {
            path: '/containers/add',
            name: 'addContainer',
            component: addContainerPage
        },
        {
            path: '/types/add',
            name: 'addType',
            component: addTypePage
        },
        {
            path: '/currencies/add',
            name: 'addCurrency',
            component: addCurrencyPage
        },
        {
            path: '/transactions/resolve',
            name: 'resolveTransaction',
            component: resolveTransactionPage
        },
	]
})

export default router
