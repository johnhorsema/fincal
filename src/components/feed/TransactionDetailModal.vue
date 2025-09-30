<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
          </svg>
          <h2 class="text-xl font-semibold text-gray-900">Transaction Details</h2>
        </div>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
        <div v-if="transaction" class="space-y-6">
          <!-- Transaction Status and Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Status Card -->
            <div :class="[
              'p-4 rounded-lg border',
              statusConfig.bgColor,
              statusConfig.borderColor
            ]">
              <div class="flex items-center space-x-2 mb-2">
                <svg :class="['w-5 h-5', statusConfig.textColor]" fill="currentColor" viewBox="0 0 20 20">
                  <!-- Clock icon for pending -->
                  <path v-if="statusConfig.icon === 'clock'" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                  <!-- Check icon for approved -->
                  <path v-else-if="statusConfig.icon === 'check'" fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  <!-- X icon for rejected -->
                  <path v-else-if="statusConfig.icon === 'x'" fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                <h3 :class="['font-medium', statusConfig.textColor]">Status</h3>
              </div>
              <p :class="['text-lg font-semibold', statusConfig.textColor]">{{ statusConfig.label }}</p>
              <p v-if="transaction.approvedBy" :class="['text-sm mt-1', statusConfig.textColor]">
                Approved by: {{ transaction.approvedBy }}
              </p>
            </div>

            <!-- Basic Info Card -->
            <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 class="font-medium text-gray-900 mb-2">Transaction Info</h3>
              <div class="space-y-2 text-sm">
                <div>
                  <span class="text-gray-600">ID:</span>
                  <span class="ml-2 font-mono text-gray-900">{{ transaction.id }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Date:</span>
                  <span class="ml-2 text-gray-900">{{ formatDate(transaction.date) }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Created by:</span>
                  <span class="ml-2 text-gray-900">{{ transaction.createdBy }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 class="font-medium text-gray-900 mb-2">Description</h3>
            <p class="text-gray-700">{{ transaction.description }}</p>
          </div>

          <!-- Transaction Entries -->
          <div class="p-4 bg-white rounded-lg border border-gray-200">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-medium text-gray-900">Account Entries</h3>
              <div v-if="transactionTotals" class="text-sm">
                <span class="mr-4 text-red-700">Total Debits: {{ formatCurrency(transactionTotals.totalDebits) }}</span>
                <span class="text-green-700">Total Credits: {{ formatCurrency(transactionTotals.totalCredits) }}</span>
                <div v-if="!transactionTotals.isBalanced" class="text-red-600 font-medium mt-1">
                  Unbalanced by: {{ formatCurrency(transactionTotals.balance) }}
                </div>
              </div>
            </div>

            <div v-if="enrichedEntries.length > 0" class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-gray-200">
                    <th class="text-left py-2 px-3 font-medium text-gray-900">Account</th>
                    <th class="text-left py-2 px-3 font-medium text-gray-900">Type</th>
                    <th class="text-right py-2 px-3 font-medium text-gray-900">Debit</th>
                    <th class="text-right py-2 px-3 font-medium text-gray-900">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="entry in enrichedEntries"
                    :key="entry.id"
                    class="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td class="py-3 px-3">
                      <div>
                        <div class="font-medium text-gray-900">{{ entry.accountName }}</div>
                        <div class="text-xs text-gray-500 font-mono">{{ entry.accountId }}</div>
                      </div>
                    </td>
                    <td class="py-3 px-3">
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {{ entry.accountType }}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-right font-mono">
                      <span v-if="entry.debitAmount" class="text-red-700 font-medium">
                        {{ formatCurrency(entry.debitAmount) }}
                      </span>
                      <span v-else class="text-gray-400">—</span>
                    </td>
                    <td class="py-3 px-3 text-right font-mono">
                      <span v-if="entry.creditAmount" class="text-green-700 font-medium">
                        {{ formatCurrency(entry.creditAmount) }}
                      </span>
                      <span v-else class="text-gray-400">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div v-else class="text-center py-8 text-gray-500">
              No entries found for this transaction
            </div>
          </div>

          <!-- Related Post -->
          <div v-if="relatedPost" class="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 class="font-medium text-blue-900 mb-2">Related Post</h3>
            <div class="flex items-start space-x-3">
              <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span class="text-white font-medium text-xs">
                  {{ relatedPost.authorPersona.charAt(0) }}
                </span>
              </div>
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-1">
                  <span class="font-medium text-blue-900">{{ relatedPost.authorPersona }}</span>
                  <span class="text-blue-700 text-sm">•</span>
                  <time class="text-blue-700 text-sm">{{ formatTimestamp(relatedPost.createdAt) }}</time>
                </div>
                <p class="text-blue-800 text-sm">{{ relatedPost.content }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8">
          <div class="text-gray-500">Transaction not found</div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
        <div class="flex items-center space-x-3">
          <button
            v-if="transaction && (transaction.status === 'pending' || transaction.status === 'rejected')"
            @click="handleEdit"
            class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            Edit Transaction
          </button>
          
          <button
            v-if="transaction && transaction.status === 'pending'"
            @click="handleApprove"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Approve
          </button>
          
          <button
            v-if="transaction && transaction.status === 'pending'"
            @click="handleReject"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Reject
          </button>
        </div>
        
        <button
          @click="handleClose"
          class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTransactions } from '../../composables/useTransactions'
import { useAccounts } from '../../composables/useAccounts'
import { usePosts } from '../../composables/usePosts'
import type { Transaction, Post } from '../../types'

const props = defineProps<{
  isOpen: boolean
  transactionId: string | null
}>()

const emit = defineEmits<{
  close: []
  edit: [transactionId: string]
  approve: [transactionId: string]
  reject: [transactionId: string]
}>()

// Composables
const { getTransaction, calculateTransactionTotals, approveTransaction, rejectTransaction } = useTransactions()
const { accountsList } = useAccounts()
const { getPost } = usePosts()

// Component state
const transaction = ref<Transaction | null>(null)
const transactionTotals = ref<{ totalDebits: number; totalCredits: number; balance: number; isBalanced: boolean } | null>(null)
const relatedPost = ref<Post | null>(null)

// Computed properties
const statusConfig = computed(() => {
  if (!transaction.value) return null
  
  const status = transaction.value.status
  const configs = {
    pending: {
      label: 'Pending Review',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200',
      icon: 'clock'
    },
    approved: {
      label: 'Approved',
      bgColor: 'bg-green-50',
      textColor: 'text-green-800',
      borderColor: 'border-green-200',
      icon: 'check'
    },
    rejected: {
      label: 'Rejected',
      bgColor: 'bg-red-50',
      textColor: 'text-red-800',
      borderColor: 'border-red-200',
      icon: 'x'
    }
  }
  
  return configs[status]
})

const enrichedEntries = computed(() => {
  if (!transaction.value?.entries) return []
  
  return transaction.value.entries.map(entry => {
    const account = accountsList.value.find(acc => acc.id === entry.accountId)
    return {
      ...entry,
      accountName: account?.name || entry.accountId,
      accountType: account?.type || 'unknown'
    }
  })
})

// Methods
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatTimestamp = (date: Date): string => {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) {
    return 'just now'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  } else if (diffInMinutes < 1440) { // 24 hours
    const hours = Math.floor(diffInMinutes / 60)
    return `${hours}h ago`
  } else {
    const days = Math.floor(diffInMinutes / 1440)
    if (days === 1) {
      return 'yesterday'
    } else if (days < 7) {
      return `${days}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

const handleClose = () => {
  emit('close')
}

const handleEdit = () => {
  if (transaction.value) {
    emit('edit', transaction.value.id)
  }
}

const handleApprove = async () => {
  if (transaction.value) {
    try {
      await approveTransaction(transaction.value.id, 'current-user') // In real app, get current user
      emit('approve', transaction.value.id)
      // Refresh transaction data
      loadTransaction()
    } catch (error) {
      console.error('Failed to approve transaction:', error)
    }
  }
}

const handleReject = async () => {
  if (transaction.value) {
    try {
      await rejectTransaction(transaction.value.id)
      emit('reject', transaction.value.id)
      // Refresh transaction data
      loadTransaction()
    } catch (error) {
      console.error('Failed to reject transaction:', error)
    }
  }
}

const loadTransaction = () => {
  if (props.transactionId) {
    const foundTransaction = getTransaction(props.transactionId)
    if (foundTransaction) {
      transaction.value = foundTransaction
      transactionTotals.value = calculateTransactionTotals(foundTransaction)
      
      // Load related post
      const post = getPost(foundTransaction.postId)
      if (post) {
        relatedPost.value = post
      }
    } else {
      transaction.value = null
      transactionTotals.value = null
      relatedPost.value = null
    }
  }
}

// Watch for changes in transactionId
watch(() => props.transactionId, () => {
  loadTransaction()
}, { immediate: true })
</script>