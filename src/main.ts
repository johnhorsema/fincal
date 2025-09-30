import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './styles/simplified.css'
import { ErrorHandlerPlugin } from './utils/clientErrorHandler'
import { PerformancePlugin, performanceMonitor, createLazyComponent } from './utils/performance'

// Performance monitoring setup
performanceMonitor.recordMetric('app_start', performance.now(), 'timing')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Feed',
      component: createLazyComponent(() => import('./views/SimpleHome.vue'))
    },
    {
      path: '/transactions',
      name: 'Transactions',
      component: createLazyComponent(() => import('./views/Transactions.vue'))
    },
    {
      path: '/accounts',
      name: 'Accounts',
      component: createLazyComponent(() => import('./views/Accounts.vue'))
    },
    {
      path: '/user-demo',
      name: 'UserDemo',
      component: createLazyComponent(() => import('./views/UserDemo.vue'))
    }
  ]
})

// Router performance monitoring
router.beforeEach((to, from, next) => {
  performanceMonitor.recordMetric('route_navigation', performance.now(), 'timing', {
    from: from.path,
    to: to.path
  })
  next()
})

const app = createApp(App)

// Install plugins
app.use(router)
app.use(ErrorHandlerPlugin)
app.use(PerformancePlugin)

// Mount app and record timing
const mountStart = performance.now()
app.mount('#app')
const mountEnd = performance.now()

performanceMonitor.recordMetric('app_mount', mountEnd - mountStart, 'timing')

// Performance reporting in development
if (import.meta.env.DEV) {
  // Report performance metrics every 30 seconds in development
  setInterval(() => {
    const report = performanceMonitor.getMetrics('', 10)
    if (report.length > 0) {
      console.group('Performance Metrics')
      report.forEach(metric => {
        console.log(`${metric.name}: ${metric.value.toFixed(2)}ms`)
      })
      console.groupEnd()
    }
  }, 30000)
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  performanceMonitor.recordMetric('app_unload', performance.now(), 'timing')
})