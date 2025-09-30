<template>
  <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
    <!-- Single-line post header with avatar, name, persona, and timestamp -->
    <div class="flex items-center space-x-3 mb-4">
      <!-- Avatar -->
      <div class="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
        <span class="text-white font-medium text-sm">
          {{ post.authorPersona.charAt(0) }}
        </span>
      </div>
      
      <!-- Name, persona, and timestamp in single line -->
      <div class="flex items-center space-x-2 text-sm min-w-0 flex-1">
        <span class="font-medium text-gray-900">{{ post.authorPersona }}</span>
        <span class="text-gray-400">•</span>
        <time class="text-gray-500" :datetime="post.createdAt.toISOString()">
          {{ formatTimestamp(post.createdAt) }}
        </time>
        <template v-if="post.transactionId">
          <span class="text-gray-400">•</span>
          <span class="text-green-600 font-medium">Journal Entry</span>
        </template>
      </div>
    </div>
    
    <!-- Post content section - Clear visual grouping -->
    <div class="mb-6 space-y-4">
      <!-- Post content -->
      <div>
        <p class="text-gray-900 leading-relaxed">{{ post.content }}</p>
      </div>
      
      <!-- Attachments -->
      <div v-if="post.attachments && post.attachments.length > 0">
        <div class="flex flex-wrap gap-2">
          <div
            v-for="attachment in post.attachments"
            :key="attachment"
            class="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-md text-sm"
          >
            <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clip-rule="evenodd" />
            </svg>
            <span class="text-gray-700">{{ attachment }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Transaction details section - Clear visual separation from post content -->
    <div v-if="post.transactionId && transactionDetails" class="mb-6">
      <!-- Visual separator between post content and transaction details -->
      <div class="border-t border-gray-100 mb-4"></div>
      
      <!-- Expandable transaction section with enhanced visual grouping -->
      <div class="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        <!-- Transaction header with expand/collapse -->
        <button
          @click="toggleTransactionDetails"
          class="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
            </svg>
            <h4 class="font-medium text-gray-900">Transaction Details</h4>
            <span :class="[
              'text-xs px-2 py-1 rounded-full font-medium',
              transactionStatusConfig?.bgColor || 'bg-gray-100',
              transactionStatusConfig?.textColor || 'text-gray-700'
            ]">
              {{ transactionStatusConfig?.label || transactionDetails.status }}
            </span>
          </div>
          <svg 
            :class="['w-5 h-5 text-gray-500 transition-transform', { 'rotate-180': isTransactionExpanded }]"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <!-- Expandable content with improved layout -->
        <div v-if="isTransactionExpanded" class="border-t border-gray-200">
          <!-- Transaction info with consistent spacing -->
          <div class="p-4 bg-white border-b border-gray-100">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium text-gray-700">Description:</span>
                <p class="text-gray-900 mt-1">{{ transactionDetails.description }}</p>
              </div>
              <div>
                <span class="font-medium text-gray-700">Date:</span>
                <p class="text-gray-900 mt-1">{{ formatDate(transactionDetails.date) }}</p>
              </div>
            </div>
          </div>
          
          <!-- Account entries table with enhanced currency alignment -->
          <div v-if="enrichedTransactionEntries.length > 0" class="p-4 bg-white">
            <div class="flex items-center justify-between mb-4">
              <h5 class="font-medium text-gray-900">Account Entries</h5>
              <div v-if="transactionTotals" class="text-xs text-gray-600 space-x-4">
                <span class="font-mono">Dr: {{ formatCurrency(transactionTotals.totalDebits) }}</span>
                <span class="font-mono">Cr: {{ formatCurrency(transactionTotals.totalCredits) }}</span>
              </div>
            </div>
            
            <!-- Enhanced table layout with proper currency alignment -->
            <div class="bg-white rounded-md border border-gray-200 overflow-hidden">
              <!-- Table header with consistent styling -->
              <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div class="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  <div class="col-span-6">Account</div>
                  <div class="col-span-3 text-right">Debit</div>
                  <div class="col-span-3 text-right">Credit</div>
                </div>
              </div>
              
              <!-- Table rows with improved spacing and alignment -->
              <div class="divide-y divide-gray-100">
                <div
                  v-for="entry in enrichedTransactionEntries"
                  :key="entry.id"
                  class="px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div class="grid grid-cols-12 gap-4 items-center">
                    <!-- Account name and type with consistent hierarchy -->
                    <div class="col-span-6">
                      <div class="font-medium text-gray-900 text-sm">{{ entry.accountName }}</div>
                      <div class="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">{{ entry.accountType }}</div>
                    </div>
                    
                    <!-- Debit amount with monospace font for proper alignment -->
                    <div class="col-span-3 text-right">
                      <span v-if="entry.debitAmount" class="font-mono text-sm text-gray-900 tabular-nums">
                        {{ formatCurrency(entry.debitAmount) }}
                      </span>
                      <span v-else class="text-gray-400 text-sm font-mono">—</span>
                    </div>
                    
                    <!-- Credit amount with monospace font for proper alignment -->
                    <div class="col-span-3 text-right">
                      <span v-if="entry.creditAmount" class="font-mono text-sm text-gray-900 tabular-nums">
                        {{ formatCurrency(entry.creditAmount) }}
                      </span>
                      <span v-else class="text-gray-400 text-sm font-mono">—</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Financial suggestion - Subtle visual cue -->
    <div v-if="!post.transactionId && suggestsFinancial" class="mb-4 p-3 bg-yellow-50 rounded-lg">
      <div class="flex items-center space-x-2">
        <svg class="w-4 h-4 text-yellow-700" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <p class="text-sm text-yellow-800">Financial activity detected. Consider creating a journal entry.</p>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="flex items-center justify-between pt-4 border-t border-gray-100">
      <div class="flex items-center space-x-4">
        <!-- Create Journal button -->
        <button
          v-if="!post.transactionId"
          @click="handleCreateJournal"
          class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
        >
          <svg class="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
          </svg>
          Create Journal
        </button>
        
        <!-- Transaction action buttons -->
        <div v-if="post.transactionId" class="flex items-center space-x-2">
          <button
            @click="handleViewTransaction"
            class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg class="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
            </svg>
            View Details
          </button>
          
          <button
            v-if="transactionDetails && (transactionDetails.status === 'pending' || transactionDetails.status === 'rejected')"
            @click="handleEditTransaction"
            class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg class="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Edit Transaction
          </button>
        </div>
      </div>
      
      <!-- Minimal interaction buttons -->
      <div class="flex items-center space-x-1">
        <!-- Comment button - Minimal icon styling -->
        <button class="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-50 rounded-md transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
        
        <!-- Share button - Minimal icon styling -->
        <button class="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-50 rounded-md transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
        </button>
        
        <!-- Like button - Minimal icon styling -->
        <button class="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-50 rounded-md transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { usePosts } from '../../composables/usePosts'
import { useTransactions } from '../../composables/useTransactions'
import { useAccounts } from '../../composables/useAccounts'
import type { Post, Transaction } from '../../types'

const props = defineProps<{
  post: Post
}>()

const emit = defineEmits<{
  createJournal: [post: Post]
  viewTransaction: [transactionId: string]
  editTransaction: [transactionId: string]
}>()

// Composables
const { suggestsFinancialActivity } = usePosts()
const { getTransaction, calculateTransactionTotals } = useTransactions()
const { accountsList } = useAccounts()

// Component state
const transactionDetails = ref<Transaction | null>(null)
const transactionTotals = ref<{ totalDebits: number; totalCredits: number; balance: number; isBalanced: boolean } | null>(null)
const isTransactionExpanded = ref(false)

// Computed properties
const suggestsFinancial = computed(() => suggestsFinancialActivity(props.post.content))

const transactionStatusConfig = computed(() => {
  if (!transactionDetails.value) return null
  
  const status = transactionDetails.value.status
  const configs = {
    pending: {
      label: 'Pending Review',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200',
      icon: 'clock'
    },
    approved: {
      label: 'Approved',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-200',
      icon: 'check'
    },
    rejected: {
      label: 'Rejected',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-200',
      icon: 'x'
    }
  }
  
  return configs[status]
})

const enrichedTransactionEntries = computed(() => {
  if (!transactionDetails.value?.entries) return []
  
  return transactionDetails.value.entries.map(entry => {
    const account = accountsList.value.find(acc => acc.id === entry.accountId)
    return {
      ...entry,
      accountName: account?.name || entry.accountId,
      accountType: account?.type || 'unknown'
    }
  })
})

// Methods
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
      return formatDate(date)
    }
  }
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

const toggleTransactionDetails = () => {
  isTransactionExpanded.value = !isTransactionExpanded.value
}

const handleCreateJournal = () => {
  emit('createJournal', props.post)
}

const handleViewTransaction = () => {
  if (props.post.transactionId) {
    emit('viewTransaction', props.post.transactionId)
  }
}

const handleEditTransaction = () => {
  if (props.post.transactionId) {
    emit('editTransaction', props.post.transactionId)
  }
}

// Load transaction details if post has a transaction
const loadTransactionDetails = async () => {
  if (props.post.transactionId) {
    const transaction = getTransaction(props.post.transactionId)
    if (transaction) {
      transactionDetails.value = transaction
      transactionTotals.value = calculateTransactionTotals(transaction)
    }
  }
}

// Watch for changes in post.transactionId
watch(() => props.post.transactionId, () => {
  loadTransactionDetails()
}, { immediate: true })

onMounted(() => {
  loadTransactionDetails()
})
</script>