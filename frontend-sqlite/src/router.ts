import { createRouter, createWebHistory } from 'vue-router'

export const ROUTER_NAME_SINGLE_TXN = `singleTransaction`;
export const ROUTER_NAME_CREATE_NEW_TXN = `createNewTransaction`;
export const ROUTER_NAME_CREATE_NEW_CONTAINER = `createNewContainer`;
export const ROUTER_NAME_ALL_TRANSACTIONS = `transactions`;
export const ROUTER_NAME_ALL_CONTAINERS = `containers`;
export const ROUTER_NAME_LOGIN = `login`;
export const ROUTER_NAME_EDIT_SINGLE_CONTAINER = `singleContainerEdit`;
export const ROUTER_NAME_SINGLE_CONTAINER_OVERVIEW = `singleContainerOverview`;
export const ROUTER_NAME_ADD_CONTAINER = `addContainer`;
export const ROUTER_NAME_ADD_TYPE = `addType`;
export const ROUTER_NAME_ADD_CURRENCY = `addCurrency`;
export const ROUTER_NAME_DASHBOARD = `dashboard`;
export const ROUTER_NAME_ALL_CURRENCIES = `currencies`;
export const ROUTER_NAME_SINGLE_CURRENCY = `singleCurrency`;

const singleTxnPage = import(`@/modules/transactions/mainPages/SingleTransaction.vue`);

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
                    name: ROUTER_NAME_DASHBOARD,
                    component: () => import("@/modules/dashboard/mainPages/Dashboard.vue")
                },
                {
                    path: 'currencies',
                    children:
                    [
                        {
                            path: '',
                            name: ROUTER_NAME_ALL_CURRENCIES,
                            component: () => import('@/modules/currencies/mainPages/Currencies.vue'),
                        },
                        {
                            path: ":cid",
                            name: ROUTER_NAME_SINGLE_CURRENCY,
                            component: () => import(`@/modules/currencies/mainPages/singleCurrency/components/SingleCurrency.vue`),
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
                            component: () => import('@/modules/transactions/mainPages/transactions.vue'),
                        },
                        {
                            path: "new",
                            name: ROUTER_NAME_CREATE_NEW_TXN,
                            component: () => singleTxnPage,
                        },
                        {
                            path: ":id",
                            name: ROUTER_NAME_SINGLE_TXN,
                            component: () => singleTxnPage,
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
                            component: () => import(`@/modules/containers/mainPages/SingleContainerEditOrAdd.vue`),
                        },
                        {
                            path: ":id/edit",
                            name: ROUTER_NAME_EDIT_SINGLE_CONTAINER,
                            component: () => import(`@/modules/containers/mainPages/SingleContainerEditOrAdd.vue`),
                        },
                        {
                            path: ":id",
                            name: ROUTER_NAME_SINGLE_CONTAINER_OVERVIEW,
                            component: () => import(`@/modules/containers/mainPages/ContainerSingle.vue`),
                        },
                    ]
                }
            ]
		},
        {
            path: '/login',
            name: ROUTER_NAME_LOGIN,
            component: () => import("@/modules/core/pages/LoginView.vue")
        },
        {
            path: '/containers/add',
            name: ROUTER_NAME_ADD_CONTAINER,
            component: () => import("@/modules/containers/pages/AddContainerView.vue")
        },
        {
            path: '/types/add',
            name: ROUTER_NAME_ADD_TYPE,
            component: () => import("@/modules/txnTypes/pages/AddTypeView.vue")
        },
        {
            path: '/currencies/add',
            name: ROUTER_NAME_ADD_CURRENCY,
            component: () => import("@/modules/currencies/pages/AddCurrencyView.vue")
        }
	]
})

export default router
