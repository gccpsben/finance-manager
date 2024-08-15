import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter(
{
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: 
	[
        {
            path: '/',
            redirect: { name: 'dashboard' }
        },
		{
			path: '/main',
			name: 'main',
			component: () => import("@/modules/core/pages/index.vue"),
            children:
            [
                {
                    path: 'dashboard',
                    name: 'dashboard',
                    component: () => import("@/modules/dashboard/mainPages/dashboard.vue")
                },
                {
                    path: 'currencies/:cid?',
                    name: "currencies",
                    component: () => import('@/modules/currencies/mainPages/currencies.vue'),
                    props: true
                },
                {
                    path: 'transactions/:id?',
                    name: 'transactions',
                    component: () => import('@/modules/transactions/mainPages/transactions.vue'),
                    props: true
                },
                {
                    path: 'charts',
                    name: 'charts',
                    component: () => import('@/modules/charts/mainPages/charts.vue'),
                },
                {
                    path: 'containers',
                    name: 'containers',
                    component: () => import('@/modules/containers/mainPages/containers.vue'),
                }
            ]
		},
        {
            path: '/login',
            name: 'login',
            component: () => import("@/modules/core/pages/loginView.vue")
        },
        {
            path: '/transactions/add',
            name: 'addTransaction',
            component: () => import("@/modules/transactions/pages/addTransactionView.vue")
        },
        {
            path: '/containers/add',
            name: 'addContainer',
            component: () => import("@/modules/containers/pages/addContainerView.vue")
        },
        {
            path: '/types/add',
            name: 'addType',
            component: () => import("@/modules/txnTypes/pages/addTypeView.vue")
        },
        {
            path: '/currencies/add',
            name: 'addCurrency',
            component: () => import("@/modules/currencies/pages/addCurrencyView.vue")
        },
        {
            path: '/transactions/resolve',
            name: 'resolveTransaction',
            component: () => import('@/modules/transactions/pages/resolveTransactionView.vue')
        },
	]
})

export default router
