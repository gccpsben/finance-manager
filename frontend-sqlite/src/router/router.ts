import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter(
{
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: 
	[
		{
			path: '/main',
			name: 'main',
			component: () => import("@/pages/main/.index.vue"),
            children:
            [
                {
                    path: 'dashboard',
                    name: 'dashboard',
                    component: () => import('@/pages/main/dashboard.vue')
                },
                {
                    path: 'currencies/:pubID?',
                    name: "currencies",
                    component: () => import('@/pages/main/currencies.vue'),
                    props: true
                },
                {
                    path: 'transactions/:pubID?',
                    name: 'transactions',
                    component: () => import('@/pages/main/transactions.vue'),
                    props: true
                },
                {
                    path: 'charts',
                    name: 'charts',
                    component: () => import('@/pages/main/charts.vue'),
                },
                {
                    path: 'containers',
                    name: 'containers',
                    component: () => import('@/pages/main/containers.vue'),
                }
            ]
		},
        {
            path: '/login',
            name: 'login',
            component: () => import("../pages/loginView.vue")
        },
        {
            path: '/',
            redirect: { name: 'dashboard' }
        },
        {
            path: '/transactions/add',
            name: 'addTransaction',
            component: () => import("../pages/addTransactionView.vue")
        },
        {
            path: '/containers/add',
            name: 'addContainer',
            component: () => import('../pages/addContainerView.vue')
        },
        {
            path: '/types/add',
            name: 'addType',
            component: () => import('../pages/addTypeView.vue')
        },
        {
            path: '/currencies/add',
            name: 'addCurrency',
            component: () => import('../pages/addCurrencyView.vue')
        },
        {
            path: '/transactions/resolve',
            name: 'resolveTransaction',
            component: () => import('../pages/resolveTransactionView.vue')
        },
	]
})

export default router
