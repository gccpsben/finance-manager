import { createRouter, createWebHistory } from 'vue-router'

export const ROUTER_NAME_CREATE_NEW_TXN = `createNewTransaction`;
export const ROUTER_NAME_CREATE_NEW_CONTAINER = `createNewContainer`;
export const ROUTER_NAME_ALL_TRANSACTIONS = `transactions`;
export const ROUTER_NAME_ALL_CONTAINERS = `containers`;
export const ROUTER_NAME_SINGLE_CONTAINER = `singleContainer`;

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
			component: () => import("@/modules/core/pages/Index.vue"),
            children:
            [
                {
                    path: 'dashboard',
                    name: 'dashboard',
                    component: () => import("@/modules/dashboard/mainPages/Dashboard.vue")
                },
                {
                    path: 'currencies',
                    children:
                    [
                        {
                            path: '',
                            name: 'currencies',
                            component: () => import('@/modules/currencies/mainPages/Currencies.vue'),
                        },
                        {
                            path: ":cid",
                            name: 'singleCurrency',
                            component: () => import(`@/modules/currencies/mainPages/SingleCurrency.vue`),
                        },
                    ]
                },
                {
                    path: 'transactions',
                    children:
                    [
                        {
                            path: '',
                            name: ROUTER_NAME_ALL_TRANSACTIONS,
                            component: () => import('@/modules/transactions/mainPages/Transactions.vue'),
                        },
                        {
                            path: "new",
                            name: ROUTER_NAME_CREATE_NEW_TXN,
                            component: () => import(`@/modules/transactions/mainPages/SingleTransaction.vue`),
                        },
                        {
                            path: ":id",
                            name: 'singleTransaction',
                            component: () => import(`@/modules/transactions/mainPages/SingleTransaction.vue`),
                        },
                    ]
                },
                {
                    path: 'charts',
                    name: 'charts',
                    component: () => import('@/modules/charts/mainPages/Charts.vue'),
                },
                {
                    path: 'containers',
                    children:
                    [
                        {
                            path: '',
                            name: ROUTER_NAME_ALL_CONTAINERS,
                            component: () => import('@/modules/containers/mainPages/Containers.vue'),
                        },
                        {
                            path: "new",
                            name: ROUTER_NAME_CREATE_NEW_CONTAINER,
                            component: () => import(`@/modules/containers/mainPages/SingleContainer.vue`),
                        },
                        {
                            path: ":id",
                            name: ROUTER_NAME_SINGLE_CONTAINER,
                            component: () => import(`@/modules/containers/mainPages/SingleContainer.vue`),
                        },
                    ]
                }
            ]
		},
        {
            path: '/login',
            name: 'login',
            component: () => import("@/modules/core/pages/LoginView.vue")
        },
        {
            path: '/containers/add',
            name: 'addContainer',
            component: () => import("@/modules/containers/pages/AddContainerView.vue")
        },
        {
            path: '/types/add',
            name: 'addType',
            component: () => import("@/modules/txnTypes/pages/AddTypeView.vue")
        },
        {
            path: '/currencies/add',
            name: 'addCurrency',
            component: () => import("@/modules/currencies/pages/AddCurrencyView.vue")
        },
        {
            path: '/transactions/resolve',
            name: 'resolveTransaction',
            component: () => import('@/modules/transactions/pages/ResolveTransactionView.vue')
        },
	]
})

export default router
