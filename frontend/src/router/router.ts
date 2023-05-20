import { createRouter, createWebHistory } from 'vue-router'
import MainView from '../views/main.vue'
import LoginView from "../views/loginView.vue"

// MainView Pages
import dashboardPage from "../mainViewPages/dashboard.vue"
import transactionsPage from "../mainViewPages/transactions.vue"
import addTransactionsPage from "../views/addTransactionView.vue"

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
                    component: dashboardPage
                },
                {
                    path: 'currencies',
                    component: dashboardPage
                },
                {
                    path: 'transactions',
                    component: transactionsPage
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
            redirect: { name: 'main' }
        },
        {
            path: '/transactions/add',
            name: 'addTransaction',
            component: addTransactionsPage
        },
	]
})

export default router
