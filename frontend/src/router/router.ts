import { createRouter, createWebHistory } from 'vue-router'
import MainView from '../views/main.vue'

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
                    component: () => import('../mainViewPages/dashboard.vue')
                },
                {
                    path: 'currencies/:pubID?',
                    name: "currencies",
                    component: () => import('../mainViewPages/currencies.vue'),
                    props: true
                },
                {
                    path: 'transactions/:pubID?',
                    name: 'transactions',
                    component: () => import('../mainViewPages/transactions.vue'),
                    props: true
                },
                {
                    path: 'charts',
                    name: 'charts',
                    component: () => import('../mainViewPages/charts.vue'),
                },
                {
                    path: 'containers',
                    name: 'containers',
                    component: () => import('../mainViewPages/containers.vue'),
                }
            ]
		},
        {
            path: '/login',
            name: 'login',
            component: () => import("../views/loginView.vue")
        },
        {
            path: '/',
            redirect: { name: 'dashboard' }
        },
        {
            path: '/transactions/add',
            name: 'addTransaction',
            component: () => import("../views/addTransactionView.vue")
        },
        {
            path: '/containers/add',
            name: 'addContainer',
            component: () => import('../views/addContainerView.vue')
        },
        {
            path: '/types/add',
            name: 'addType',
            component: () => import('../views/addTypeView.vue')
        },
        {
            path: '/currencies/add',
            name: 'addCurrency',
            component: () => import('../views/addCurrencyView.vue')
        },
        {
            path: '/transactions/resolve',
            name: 'resolveTransaction',
            component: () => import('../views/resolveTransactionView.vue')
        },
	]
})

export default router
