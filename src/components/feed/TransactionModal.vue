<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" data-testid="transaction-modal">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="handleClose"></div>
    
    <!-- Modal -->
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ isEditMode ? 'Edit Journal Entry' : 'Create Journal Entry' }}
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
        <div class="p-6">
          <!-- Original Post -->
          <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 class="text-sm font-medium text-gray-700 mb-2">Original Post</h3>
            <p class="text-gray-900">{{ post?.content }}</p>
            <div class="flex items-center mt-2 text-sm text-gray-500">
              <span>{{ post?.authorPersona }}</span>
              <span class="mx-2">•</span>
              <span>{{ post?.createdAt ? formatDate(post.createdAt) : '' }}</span>
            </div>
          </div>

          <!-- Transaction Form -->
          <form @submit.prevent="handleSubmit">
            <!-- Description -->
            <div class="mb-4">
              <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                id="description"
                v-model="form.description"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="{ 'border-red-300': errors.description }"
                placeholder="Enter transaction description"
                maxlength="200"
              />
              <div v-if="errors.description" class="mt-1 text-sm text-red-600">
                {{ errors.description }}
              </div>
            </div>

            <!-- Date -->
            <div class="mb-6">
              <label for="date" class="block text-sm font-medium text-gray-700 mb-2">
                Transaction Date
              </label>
              <input
                id="date"
                v-model="form.date"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="{ 'border-red-300': errors.date }"
                :max="maxDate"
              />
              <div v-if="errors.date" class="mt-1 text-sm text-red-600">
                {{ errors.date }}
              </div>
            </div>

            <!-- Transaction Entries -->
            <div class="mb-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900">Journal Entries</h3>
                <button
                  type="button"
                  @click="addEntry"
                  data-testid="add-entry-button"
                  class="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Entry</span>
                </button>
              </div>

              <!-- Entry List -->
              <div class="space-y-3">
                <div
                  v-for="(entry, index) in form.entries"
                  :key="entry.id"
                  data-testid="transaction-entry"
                  class="p-4 border border-gray-200 rounded-lg"
                  :class="{ 'border-red-300': entryErrors[index] }"
                >
                  <div class="flex items-start space-x-4">
                    <!-- Account Selection -->
                    <div class="flex-1">
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Account
                      </label>
                      <AccountSelector
                        :model-value="getSelectedAccount(entry.accountId)"
                        :error="entryErrors[index]?.account"
                        @account-selected="(accountId: string) => handleAccountSelected(index, accountId)"
                      />
                    </div>

                    <!-- Debit Amount -->
                    <div class="w-32">
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Debit
                      </label>
                      <input
                        v-model="entry.debitAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        max="999999999.99"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                        :class="{ 'border-red-300': entryErrors[index]?.debit }"
                        placeholder="0.00"
                        @input="handleAmountChange(index, 'debit', $event)"
                      />
                    </div>

                    <!-- Credit Amount -->
                    <div class="w-32">
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Credit
                      </label>
                      <input
                        v-model="entry.creditAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        max="999999999.99"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                        :class="{ 'border-red-300': entryErrors[index]?.credit }"
                        placeholder="0.00"
                        @input="handleAmountChange(index, 'credit', $event)"
                      />
                    </div>

                    <!-- Remove Entry Button -->
                    <div class="flex items-end">
                      <button
                        v-if="form.entries.length > 2"
                        type="button"
                        @click="removeEntry(index)"
                        data-testid="remove-entry-button"
                        class="p-2 text-red-600 hover:text-red-700 transition-colors"
                        title="Remove entry"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Entry Errors -->
                  <div v-if="entryErrors[index]" class="mt-2">
                    <div v-if="entryErrors[index].account" class="text-sm text-red-600">
                      {{ entryErrors[index].account }}
                    </div>
                    <div v-if="entryErrors[index].amount" class="text-sm text-red-600">
                      {{ entryErrors[index].amount }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Balance Summary -->
              <div class="mt-4 p-3 bg-gray-50 rounded-lg">
                <div class="flex justify-between items-center text-sm">
                  <span class="font-medium">Total Debits:</span>
                  <span class="font-mono">{{ formatCurrency(totalDebits) }}</span>
                </div>
                <div class="flex justify-between items-center text-sm mt-1">
                  <span class="font-medium">Total Credits:</span>
                  <span class="font-mono">{{ formatCurrency(totalCredits) }}</span>
                </div>
                <div class="flex justify-between items-center text-sm mt-2 pt-2 border-t border-gray-200">
                  <span class="font-medium">Balance:</span>
                  <span 
                    class="font-mono font-medium"
                    :class="isBalanced ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ formatCurrency(balance) }}
                  </span>
                </div>
                <div v-if="!isBalanced" class="mt-2 text-sm text-red-600">
                  Transaction must balance (debits must equal credits)
                </div>
              </div>
            </div>

            <!-- Form Errors -->
            <div v-if="errors.general" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div class="text-sm text-red-600">{{ errors.general }}</div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                @click="handleClose"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!canSubmit || isSubmitting"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="isSubmitting">{{ isEditMode ? 'Updating...' : 'Creating...' }}</span>
                <span v-else>{{ isEditMode ? 'Update Transaction' : 'Create Transaction' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useAccounts } from '../../composables/useAccounts'
import { validateTransaction, formatCurrency, formatDate, generateId } from '../../utils/validation'
import AccountSelector from '../accounts/AccountSelector.vue'
import type { Post, Transaction, TransactionEntry } from '../../types'

interface TransactionForm {
  description: string
  date: string
  entries: TransactionEntryForm[]
}

interface TransactionEntryForm {
  id: string
  accountId: string
  debitAmount: string
  creditAmount: string
}

interface FormErrors {
  description?: string
  date?: string
  general?: string
}

interface EntryError {
  account?: string
  amount?: string
  debit?: string
  credit?: string
}

const props = defineProps<{
  isOpen: boolean
  post: Post | null
  existingTransaction?: Transaction | null
}>()

const emit = defineEmits<{
  close: []
  transactionCreated: [transaction: Transaction]
  transactionUpdated: [transaction: Transaction]
}>()

// Composables
const { currentUser } = useAuth()
const { accountsList } = useAccounts()

// Form state
const form = ref<TransactionForm>({
  description: '',
  date: new Date().toISOString().split('T')[0],
  entries: []
})

const errors = ref<FormErrors>({})
const entryErrors = ref<EntryError[]>([])
const isSubmitting = ref(false)

// Computed properties
const isEditMode = computed(() => !!props.existingTransaction)

// Computed properties
const maxDate = computed(() => new Date().toISOString().split('T')[0])

const totalDebits = computed(() => {
  return form.value.entries.reduce((sum, entry) => {
    const amount = parseFloat(entry.debitAmount) || 0
    return sum + amount
  }, 0)
})

const totalCredits = computed(() => {
  return form.value.entries.reduce((sum, entry) => {
    const amount = parseFloat(entry.creditAmount) || 0
    return sum + amount
  }, 0)
})

const balance = computed(() => Math.abs(totalDebits.value - totalCredits.value))

const isBalanced = computed(() => balance.value < 0.01)

const canSubmit = computed(() => {
  return form.value.description.trim() !== '' &&
         form.value.date !== '' &&
         form.value.entries.length >= 2 &&
         isBalanced.value &&
         !isSubmitting.value
})

// Methods
const initializeForm = () => {
  if (props.existingTransaction) {
    // Initialize form with existing transaction data
    form.value.description = props.existingTransaction.description
    form.value.date = props.existingTransaction.date.toISOString().split('T')[0]
    form.value.entries = props.existingTransaction.entries.map(entry => ({
      id: entry.id,
      accountId: entry.accountId,
      debitAmount: entry.debitAmount?.toString() || '',
      creditAmount: entry.creditAmount?.toString() || ''
    }))
  } else if (props.post) {
    // Initialize form for new transaction
    form.value.description = props.post.content.length > 200 
      ? props.post.content.substring(0, 197) + '...'
      : props.post.content
    form.value.date = new Date().toISOString().split('T')[0]
    form.value.entries = [
      createEmptyEntry(),
      createEmptyEntry()
    ]
  }
  errors.value = {}
  entryErrors.value = []
}

const createEmptyEntry = (): TransactionEntryForm => ({
  id: generateId(),
  accountId: '',
  debitAmount: '',
  creditAmount: ''
})

const addEntry = () => {
  form.value.entries.push(createEmptyEntry())
  entryErrors.value.push({})
}

const removeEntry = (index: number) => {
  if (form.value.entries.length > 2) {
    form.value.entries.splice(index, 1)
    entryErrors.value.splice(index, 1)
  }
}

const getSelectedAccount = (accountId: string) => {
  return accountsList.value.find(account => account.id === accountId) || null
}

const handleAccountSelected = (index: number, accountId: string) => {
  form.value.entries[index].accountId = accountId
  // Clear account error for this entry
  if (entryErrors.value[index]) {
    delete entryErrors.value[index].account
  }
}

const handleAmountChange = (index: number, type: 'debit' | 'credit', event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value
  
  // Clear the opposite amount when one is entered
  if (type === 'debit' && value) {
    form.value.entries[index].creditAmount = ''
  } else if (type === 'credit' && value) {
    form.value.entries[index].debitAmount = ''
  }
  
  // Clear amount errors for this entry
  if (entryErrors.value[index]) {
    delete entryErrors.value[index].amount
    delete entryErrors.value[index].debit
    delete entryErrors.value[index].credit
  }
}

const validateForm = (): boolean => {
  errors.value = {}
  entryErrors.value = form.value.entries.map(() => ({}))
  
  // Basic form validation
  if (!form.value.description.trim()) {
    errors.value.description = 'Description is required'
  } else if (form.value.description.length > 200) {
    errors.value.description = 'Description must be 200 characters or less'
  }
  
  if (!form.value.date) {
    errors.value.date = 'Date is required'
  } else if (new Date(form.value.date) > new Date()) {
    errors.value.date = 'Date cannot be in the future'
  }
  
  // Validate entries
  let hasValidEntries = true
  form.value.entries.forEach((entry, index) => {
    const entryError: EntryError = {}
    
    if (!entry.accountId) {
      entryError.account = 'Account is required'
      hasValidEntries = false
    }
    
    const hasDebit = entry.debitAmount && parseFloat(entry.debitAmount) > 0
    const hasCredit = entry.creditAmount && parseFloat(entry.creditAmount) > 0
    
    if (!hasDebit && !hasCredit) {
      entryError.amount = 'Either debit or credit amount is required'
      hasValidEntries = false
    }
    
    if (hasDebit && hasCredit) {
      entryError.amount = 'Entry cannot have both debit and credit amounts'
      hasValidEntries = false
    }
    
    if (hasDebit && parseFloat(entry.debitAmount) <= 0) {
      entryError.debit = 'Debit amount must be greater than 0'
      hasValidEntries = false
    }
    
    if (hasCredit && parseFloat(entry.creditAmount) <= 0) {
      entryError.credit = 'Credit amount must be greater than 0'
      hasValidEntries = false
    }
    
    entryErrors.value[index] = entryError
  })
  
  if (!hasValidEntries) {
    errors.value.general = 'Please fix the entry errors above'
  }
  
  if (form.value.entries.length < 2) {
    errors.value.general = 'Transaction must have at least 2 entries'
  }
  
  if (!isBalanced.value) {
    errors.value.general = 'Transaction must balance (debits must equal credits)'
  }
  
  return Object.keys(errors.value).length === 0 && hasValidEntries
}

const handleSubmit = async () => {
  if (!validateForm() || !props.post || !currentUser.value) {
    return
  }
  
  isSubmitting.value = true
  
  try {
    if (isEditMode.value && props.existingTransaction) {
      // Update existing transaction
      const entries: TransactionEntry[] = form.value.entries.map(entry => ({
        id: entry.id || generateId(),
        transactionId: props.existingTransaction!.id,
        accountId: entry.accountId,
        debitAmount: entry.debitAmount ? parseFloat(entry.debitAmount) : undefined,
        creditAmount: entry.creditAmount ? parseFloat(entry.creditAmount) : undefined
      }))
      
      const updatedTransaction: Transaction = {
        ...props.existingTransaction,
        description: form.value.description.trim(),
        date: new Date(form.value.date),
        status: 'pending', // Reset to pending when edited
        entries
      }
      
      // Validate the complete transaction
      const validation = validateTransaction(updatedTransaction)
      if (!validation.isValid) {
        errors.value.general = validation.errors.join(', ')
        return
      }
      
      // Emit the transaction updated event
      emit('transactionUpdated', updatedTransaction)
    } else {
      // Create new transaction
      const entries: TransactionEntry[] = form.value.entries.map(entry => ({
        id: generateId(),
        transactionId: '', // Will be set when transaction is created
        accountId: entry.accountId,
        debitAmount: entry.debitAmount ? parseFloat(entry.debitAmount) : undefined,
        creditAmount: entry.creditAmount ? parseFloat(entry.creditAmount) : undefined
      }))
      
      const transaction: Transaction = {
        id: generateId(),
        postId: props.post.id,
        description: form.value.description.trim(),
        date: new Date(form.value.date),
        status: 'pending',
        createdBy: currentUser.value.id,
        entries
      }
      
      // Update entry transaction IDs
      entries.forEach(entry => {
        entry.transactionId = transaction.id
      })
      
      // Validate the complete transaction
      const validation = validateTransaction(transaction)
      if (!validation.isValid) {
        errors.value.general = validation.errors.join(', ')
        return
      }
      
      // Emit the transaction created event
      emit('transactionCreated', transaction)
    }
    
    // Close the modal
    handleClose()
    
  } catch (error) {
    console.error('Error saving transaction:', error)
    errors.value.general = error instanceof Error ? error.message : 'Failed to save transaction'
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  emit('close')
}

// Watch for modal open/close to initialize form
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      initializeForm()
    })
  }
})

// Initialize form when component mounts
initializeForm()
</script>