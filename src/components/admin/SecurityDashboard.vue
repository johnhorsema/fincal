<template>
  <div class="security-dashboard p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold text-gray-900">Security Dashboard</h2>
      <div class="flex space-x-3">
        <button
          @click="refreshData"
          :disabled="isLoading"
          class="btn btn-secondary"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        <button
          @click="clearAllThreats"
          class="btn btn-danger"
        >
          Clear All
        </button>
      </div>
    </div>

    <!-- Security Metrics Overview -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="metric-card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Total Threats</p>
            <p class="text-2xl font-semibold text-gray-900">{{ metrics.totalThreats }}</p>
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Today's Threats</p>
            <p class="text-2xl font-semibold text-gray-900">{{ metrics.threatsToday }}</p>
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Blocked IPs</p>
            <p class="text-2xl font-semibold text-gray-900">{{ metrics.blockedIPs }}</p>
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Security Score</p>
            <p class="text-2xl font-semibold text-gray-900">{{ securityScore }}%</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Threat Types Chart -->
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Top Threat Types</h3>
      <div class="space-y-3">
        <div
          v-for="threatType in metrics.topThreatTypes"
          :key="threatType.type"
          class="flex items-center justify-between"
        >
          <div class="flex items-center space-x-3">
            <div :class="['w-3 h-3 rounded-full', getThreatTypeColor(threatType.type)]"></div>
            <span class="text-sm font-medium text-gray-900 capitalize">
              {{ threatType.type.replace('_', ' ') }}
            </span>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-32 bg-gray-200 rounded-full h-2">
              <div
                :class="['h-2 rounded-full', getThreatTypeColor(threatType.type)]"
                :style="{ width: `${(threatType.count / maxThreatCount) * 100}%` }"
              ></div>
            </div>
            <span class="text-sm text-gray-500 w-8 text-right">{{ threatType.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Threats -->
    <div class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">Recent Security Threats</h3>
      </div>
      <div class="overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Severity
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="threat in metrics.recentThreats"
              :key="threat.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div :class="['w-2 h-2 rounded-full mr-3', getThreatTypeColor(threat.type)]"></div>
                  <span class="text-sm font-medium text-gray-900 capitalize">
                    {{ threat.type.replace('_', ' ') }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="['inline-flex px-2 py-1 text-xs font-semibold rounded-full', getSeverityColor(threat.severity)]">
                  {{ threat.severity }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">{{ threat.description }}</div>
                <div class="text-xs text-gray-500 mt-1 truncate max-w-xs">
                  {{ threat.payload }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ threat.ip || 'Unknown' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatTime(threat.timestamp) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="['inline-flex px-2 py-1 text-xs font-semibold rounded-full', threat.blocked ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800']">
                  {{ threat.blocked ? 'Blocked' : 'Detected' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Suspicious IPs -->
    <div class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">Suspicious IP Addresses</h3>
      </div>
      <div class="overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Threat Count
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Activity
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="ipData in suspiciousIPs"
              :key="ipData.ip"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ ipData.ip }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ ipData.threatCount }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatTime(ipData.lastThreat) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="['inline-flex px-2 py-1 text-xs font-semibold rounded-full', ipData.blocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800']">
                  {{ ipData.blocked ? 'Blocked' : 'Active' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  v-if="!ipData.blocked"
                  @click="blockIP(ipData.ip)"
                  class="text-red-600 hover:text-red-900 mr-3"
                >
                  Block
                </button>
                <button
                  v-else
                  @click="unblockIP(ipData.ip)"
                  class="text-green-600 hover:text-green-900 mr-3"
                >
                  Unblock
                </button>
                <button
                  @click="viewIPDetails(ipData.ip)"
                  class="text-blue-600 hover:text-blue-900"
                >
                  Details
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Security Recommendations -->
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Security Recommendations</h3>
      <div class="space-y-3">
        <div
          v-for="(recommendation, index) in securityReport.recommendations"
          :key="index"
          class="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg"
        >
          <svg class="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <p class="text-sm text-yellow-800">{{ recommendation }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { securityMonitor, type SecurityMetrics, type SecurityThreat } from '../../utils/securityMonitor'
import { useClientErrorHandler } from '../../utils/clientErrorHandler'

// Component state
const metrics = ref<SecurityMetrics>({
  totalThreats: 0,
  threatsToday: 0,
  blockedIPs: 0,
  topThreatTypes: [],
  recentThreats: []
})

const suspiciousIPs = ref<Array<{ ip: string; threatCount: number; blocked: boolean; lastThreat: Date }>>([])
const securityReport = ref<{ summary: SecurityMetrics; recommendations: string[]; criticalThreats: SecurityThreat[] }>({
  summary: metrics.value,
  recommendations: [],
  criticalThreats: []
})

const isLoading = ref(false)
const refreshInterval = ref<NodeJS.Timeout | null>(null)

// Composables
const { handleError } = useClientErrorHandler()

// Computed properties
const maxThreatCount = computed(() => {
  return Math.max(...metrics.value.topThreatTypes.map(t => t.count), 1)
})

const securityScore = computed(() => {
  const totalThreats = metrics.value.totalThreats
  const blockedThreats = metrics.value.recentThreats.filter(t => t.blocked).length
  
  if (totalThreats === 0) return 100
  
  const blockRate = (blockedThreats / totalThreats) * 100
  const threatDensity = Math.min(totalThreats / 100, 1) * 50 // Max 50% penalty for high threat count
  
  return Math.max(0, Math.round(blockRate - threatDensity))
})

// Methods
const refreshData = async () => {
  isLoading.value = true
  
  try {
    metrics.value = securityMonitor.getSecurityMetrics()
    suspiciousIPs.value = securityMonitor.getSuspiciousIPs()
    securityReport.value = securityMonitor.generateSecurityReport()
  } catch (error) {
    handleError(error as Error, {
      component: 'SecurityDashboard',
      action: 'refreshData'
    })
  } finally {
    isLoading.value = false
  }
}

const clearAllThreats = () => {
  if (confirm('Are you sure you want to clear all security threats? This action cannot be undone.')) {
    securityMonitor.clearThreats()
    refreshData()
  }
}

const blockIP = (ip: string) => {
  const reason = prompt(`Enter reason for blocking IP ${ip}:`)
  if (reason !== null) {
    securityMonitor.blockIP(ip, reason || 'Manual block from dashboard')
    refreshData()
  }
}

const unblockIP = (ip: string) => {
  if (confirm(`Are you sure you want to unblock IP ${ip}?`)) {
    securityMonitor.unblockIP(ip)
    refreshData()
  }
}

const viewIPDetails = (ip: string) => {
  const threats = securityMonitor.getThreatsByIP(ip)
  const details = threats.map(t => `${t.type}: ${t.description}`).join('\n')
  alert(`Threats from IP ${ip}:\n\n${details}`)
}

const getThreatTypeColor = (type: string): string => {
  const colors = {
    xss: 'bg-red-500',
    sql_injection: 'bg-red-600',
    path_traversal: 'bg-orange-500',
    rate_limit: 'bg-yellow-500',
    suspicious_activity: 'bg-purple-500',
    csrf: 'bg-pink-500',
    data_exfiltration: 'bg-red-700'
  }
  return colors[type as keyof typeof colors] || 'bg-gray-500'
}

const getSeverityColor = (severity: string): string => {
  const colors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  }
  return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

const formatTime = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

// Lifecycle
onMounted(() => {
  refreshData()
  
  // Auto-refresh every 30 seconds
  refreshInterval.value = setInterval(refreshData, 30000)
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<style scoped>
.metric-card {
  @apply bg-white rounded-lg shadow p-6;
}

.btn {
  @apply px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.btn-secondary {
  @apply text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-blue-500;
}

.btn-danger {
  @apply text-white bg-red-600 border border-transparent hover:bg-red-700 focus:ring-red-500;
}

.btn:disabled {
  @apply opacity-50 cursor-not-allowed;
}
</style>