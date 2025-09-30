<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg shadow-sm max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 class="text-xl font-medium text-gray-900">
          {{ isEditMode ? 'Edit Transaction' : 'Transaction Details' }}
        </h2>
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
          <!-- Edit Mode Form -->
          <div v-if="isEditMode">
            <!-- Description Edit -->
            <div class="space-y-4">
              <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  id="description"
                  v-model="editForm.description"
                  type="text"
                  class="w-full p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-300 transition-colors"
                  placeholder="Enter transaction description"
                  maxlength="200"
                />
              </div>

              <!-- Date Edit -->
              <div>
                <label for="date" class="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Date
                </label>
                <input
                  id="date"
                  v-model="editForm.date"
                  type="date"
                  class="w-full p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-300 transition-colors"
                  :max="maxDate"
                />
              </div>

              <!-- Persona Selector for Edit -->
              <div v-if="relatedPost">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Created by
                </label>
                <PersonaSelector 
                  :selected-persona="selectedPersona"
                  :personas="availablePersonas"
                  @change="handlePersonaChange"
                  placeholder="Select persona..."
                />
              </div>
            </div>
          </div>

          <!-- View Mode -->
          <div v-else>
            <!-- Status Display -->
            <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
              <div class="flex items-center space-x-3">
                <div :class="[
                  'w-3 h-3 rounded-full',
                  statusConfig.dotColor
                ]"></div>
                <div>
                  <span class="font-medium text-gray-900">{{ statusConfig.label }}</span>
                  <p v-if="transaction.approvedBy" class="text-sm text-gray-600 mt-1">
                    Approved by {{ transaction.approvedBy }}
                  </p>
                </div>
              </div>
              <div class="text-sm text-gray-600">
                {{ formatDate(transaction.date) }}
              </div>
            </div>

            <!-- Description -->
            <div class="p-4 bg-white rounded-lg border border-gray-200">
              <h3 class="font-medium text-gray-900 mb-2">Description</h3>
              <p class="text-gray-700">{{ transaction.description }}</p>
            </div>
          </div>

          <!-- Transaction Entries -->
          <div class="p-4 bg-white rounded-lg border border-gray-200">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-medium text-gray-900">Account Entries</h3>
              <div v-if="transactionTotals" class="text-sm space-x-4">
                <span class="font-mono text-gray-600">Dr: {{ formatCurrency(transactionTotals.totalDebits) }}</span>
                <span class="font-mono text-gray-600">Cr: {{ formatCurrency(transactionTotals.totalCredits) }}</span>
                <div v-if="!transactionTotals.isBalanced" class="text-red-600 font-medium mt-1 font-mono">
                  Unbalanced: {{ formatCurrency(transactionTotals.balance) }}
                </div>
              </div>
            </div>

            <div v-if="enrichedEntries.length > 0" class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-gray-200">
                    <th class="text-left py-3 px-4 font-medium text-gray-900 text-sm">Account</th>
                    <th class="text-right py-3 px-4 font-medium text-gray-900 text-sm">Debit</th>
                    <th class="text-right py-3 px-4 font-medium text-gray-900 text-sm">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="entry in enrichedEntries"
                    :key="entry.id"
                    class="border-b border-gray-100"
                  >
                    <td class="py-3 px-4">
                      <div class="font-medium text-gray-900 text-sm">{{ entry.accountName }}</div>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <span v-if="entry.debitAmount" class="font-mono text-sm text-gray-900">
                        {{ formatCurrency(entry.debitAmount) }}
                      </span>
                      <span v-else class="text-gray-400 text-sm">—</span>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <span v-if="entry.creditAmount" class="font-mono text-sm text-gray-900">
                        {{ formatCurrency(entry.creditAmount) }}
                      </span>
                      <span v-else class="text-gray-400 text-sm">—</span>
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
          <div v-if="relatedPost && !isEditMode" class="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 class="font-medium text-gray-900 mb-3">Related Post</h3>
            <div class="flex items-start space-x-3">
              <div class="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span class="text-white font-medium text-xs">
                  {{ relatedPost.authorPersona.charAt(0) }}
                </span>
              </div>
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-1">
                  <span class="font-medium text-gray-900">{{ relatedPost.authorPersona }}</span>
                  <span class="text-gray-400 text-sm">•</span>
                  <time class="text-gray-500 text-sm">{{ formatTimestamp(relatedPost.createdAt) }}</time>
                </div>
                <p class="text-gray-700 text-sm">{{ relatedPost.content }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8">
          <div class="text-gray-500">Transaction not found</div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between p-6 border-t border-gray-200 bg-white">
        <div class="flex items-center space-x-3">
          <!-- Edit Mode Actions -->
          <div v-if="isEditMode" class="flex items-center space-x-3">
            <button
              @click="handleSaveEdit"
              :disabled="isSaving"
              class="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isSaving">Saving...</span>
              <span v-else>Save Changes</span>
            </button>
            <button
              @click="handleCancelEdit"
              class="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
          
          <!-- View Mode Actions -->
          <div v-else class="flex items-center space-x-3">
            <button
              v-if="transaction && (transaction.status === 'pending' || transaction.status === 'rejected')"
              @click="handleEdit"
              class="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
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
        </div>
        
        <button
          @click="handleClose"
          class="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
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
import { useAuth } from '../../composables/useAuth'
import PersonaSelector from '../user/PersonaSelector.vue'
import type { Transaction, Post, UserPersona } from '../../types'

const props = defineProps<{
  isOpen: boolean
  transactionId: string | null
}>()

const emit = defineEmits<{
  close: []
  edit: [transactionId: string]
  approve: [transactionId: string]
  reject: [transactionId: string]
  updated: [transaction: Transaction]
}>()

// Composables
const { getTransaction, calculateTransactionTotals, approveTransaction, rejectTransaction, updateTransaction } = useTransactions()
const { accountsList } = useAccounts()
const { getPost } = usePosts()
const { currentUser } = useAuth()

// Component state
const transaction = ref<Transaction | null>(null)
const transactionTotals = ref<{ totalDebits: number; totalCredits: number; balance: number; isBalanced: boolean } | null>(null)
const relatedPost = ref<Post | null>(null)
const isEditMode = ref(false)
const isSaving = ref(false)
const selectedPersona = ref<UserPersona | null>(null)

// Edit form state
const editForm = ref({
  description: '',
  date: ''
})

// Computed properties
const maxDate = computed(() => new Date().toISOString().split('T')[0])

const availablePersonas = computed(() => currentUser.value?.personas || [])

const statusConfig = computed(() => {
  if (!transaction.value) return null
  
  const status = transaction.value.status
  const configs = {
    pending: {
      label: 'Pending Review',
      dotColor: 'bg-yellow-500'
    },
    approved: {
      label: 'Approved',
      dotColor: 'bg-green-500'
    },
    rejected: {
      label: 'Rejected',
      dotColor: 'bg-red-500'
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
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
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
      // Use consistent date format
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date)
    }
  }
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

const handleClose = () => {
  emit('close')
}

const handlePersonaChange = (persona: UserPersona | null) => {
  selectedPersona.value = persona
}

const handleEdit = () => {
  if (transaction.value) {
    // Initialize edit form with current transaction data
    editForm.value.description = transaction.value.description
    editForm.value.date = transaction.value.date.toISOString().split('T')[0]
    
    // Set selected persona if we have related post
    if (relatedPost.value) {
      const persona = availablePersonas.value.find(p => p.name === relatedPost.value?.authorPersona)
      selectedPersona.value = persona || null
    }
    
    isEditMode.value = true
  }
}

const handleCancelEdit = () => {
  isEditMode.value = false
  // Reset form
  editForm.value.description = ''
  editForm.value.date = ''
  selectedPersona.value = null
}

const handleSaveEdit = async () => {
  if (!transaction.value) return
  
  isSaving.value = true
  
  try {
    const updates = {
      description: editForm.value.description.trim(),
      date: new Date(editForm.value.date),
      status: 'pending' as const // Reset to pending when edited
    }
    
    // Update the transaction
    const updatedTransaction = await updateTransaction(transaction.value.id, updates)
    
    // Update local state
    if (updatedTransaction) {
      transaction.value = updatedTransaction
    }
    
    // Exit edit mode
    isEditMode.value = false
    
    // Emit updated event
    if (updatedTransaction) {
      emit('updated', updatedTransaction)
    }
    
  } catch (error) {
    console.error('Failed to update transaction:', error)
  } finally {
    isSaving.value = false
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
  
  // Reset edit mode when loading new transaction
  isEditMode.value = false
  editForm.value.description = ''
  editForm.value.date = ''
  selectedPersona.value = null
}

// Watch for changes in transactionId
watch(() => props.transactionId, () => {
  loadTransaction()
}, { immediate: true })
</script>