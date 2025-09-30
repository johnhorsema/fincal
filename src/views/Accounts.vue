<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
          <p class="text-gray-600">Manage your accounting accounts</p>
        </div>
        <button
          @click="openCreateModal"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg class="h-4 w-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Account
        </button>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="mb-6 flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search accounts..."
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div class="flex gap-2">
        <select
          v-model="selectedType"
          class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Types</option>
          <option v-for="(label, value) in ACCOUNT_TYPES" :key="value" :value="value">
            {{ label }}
          </option>
        </select>
        <button
          @click="showInactive = !showInactive"
          :class="[
            'px-3 py-2 text-sm font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
            showInactive 
              ? 'text-blue-700 bg-blue-50 border-blue-300 hover:bg-blue-100' 
              : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
          ]"
        >
          {{ showInactive ? 'Hide' : 'Show' }} Inactive
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <svg class="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-md bg-red-50 p-4 mb-6">
      <div class="flex">
        <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="ml-3">
          <p class="text-sm text-red-800">{{ error }}</p>
          <button
            @click="fetchAccounts"
            class="mt-2 text-sm text-red-600 hover:text-red-500 underline"
          >
            Try again
          </button>
        </div>
      </div>
    </div>

    <!-- Accounts List -->
    <div v-else class="space-y-6">
      <!-- Account Type Groups -->
      <div v-for="(accounts, type) in filteredAccountsByType" :key="type" class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ ACCOUNT_TYPES[type] }}
          </h2>
          <span class="text-sm text-gray-500">
            {{ accounts.length }} account{{ accounts.length !== 1 ? 's' : '' }}
          </span>
        </div>

        <!-- Accounts Table -->
        <div v-if="accounts.length > 0" class="overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Name
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="account in accounts" :key="account.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ account.name }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-500">{{ account.category }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="[
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                    account.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  ]">
                    {{ account.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end space-x-2">
                    <button
                      @click="openEditModal(account)"
                      class="text-blue-600 hover:text-blue-900"
                      title="Edit account"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      @click="toggleAccountStatus(account)"
                      :class="[
                        'hover:opacity-75',
                        account.isActive ? 'text-red-600' : 'text-green-600'
                      ]"
                      :title="account.isActive ? 'Deactivate account' : 'Activate account'"
                    >
                      <svg v-if="account.isActive" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State for Account Type -->
        <div v-else class="text-center py-8 text-gray-500">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="mt-2 text-sm">No {{ ACCOUNT_TYPES[type].toLowerCase() }} accounts found</p>
        </div>
      </div>

      <!-- Overall Empty State -->
      <div v-if="Object.keys(filteredAccountsByType).length === 0" class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No accounts found</h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ searchQuery ? 'Try adjusting your search criteria.' : 'Get started by creating your first account.' }}
        </p>
        <div class="mt-6">
          <button
            @click="openCreateModal"
            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Account
          </button>
        </div>
      </div>
    </div>

    <!-- Account Modal -->
    <AccountModal
      :is-open="showModal"
      :account="selectedAccount"
      :loading="modalLoading"
      @close="closeModal"
      @submit="handleAccountSubmit"
    />

    <!-- Success Toast -->
    <div
      v-if="showSuccessToast"
      class="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg z-50"
    >
      {{ successMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAccounts, ACCOUNT_TYPES, type AccountType } from '@/composables/useAccounts'
import AccountModal from '@/components/accounts/AccountModal.vue'
import type { Account } from '@/types'

const {
  accountsList,
  loading,
  error,
  fetchAccounts,
  createAccount,
  updateAccount,
  toggleAccountStatus: toggleStatus,
  searchAccounts
} = useAccounts()

// Component state
const searchQuery = ref('')
const selectedType = ref<AccountType | ''>('')
const showInactive = ref(false)
const showModal = ref(false)
const selectedAccount = ref<Account | null>(null)
const modalLoading = ref(false)
const showSuccessToast = ref(false)
const successMessage = ref('')

// Computed properties
const filteredAccountsByType = computed(() => {
  let accounts = accountsList.value

  // Filter by search query
  if (searchQuery.value.trim()) {
    accounts = searchAccounts(searchQuery.value)
  }

  // Filter by type
  if (selectedType.value) {
    accounts = accounts.filter(a => a.type === selectedType.value)
  }

  // Filter by active status
  if (!showInactive.value) {
    accounts = accounts.filter(a => a.isActive)
  }

  // Group by type
  const grouped: Record<AccountType, Account[]> = {
    asset: [],
    liability: [],
    equity: [],
    revenue: [],
    expense: []
  }

  accounts.forEach(account => {
    if (account.type in grouped) {
      grouped[account.type as AccountType].push(account)
    }
  })

  // Only return types that have accounts
  const result: Record<AccountType, Account[]> = {} as Record<AccountType, Account[]>
  Object.entries(grouped).forEach(([type, accountsArray]) => {
    if (accountsArray.length > 0) {
      result[type as AccountType] = accountsArray
    }
  })

  return result
})

// Methods
function openCreateModal() {
  selectedAccount.value = null
  showModal.value = true
}

function openEditModal(account: Account) {
  selectedAccount.value = account
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  selectedAccount.value = null
  modalLoading.value = false
}

async function handleAccountSubmit(accountData: Omit<Account, 'id'>) {
  modalLoading.value = true
  
  try {
    if (selectedAccount.value) {
      // Update existing account
      await updateAccount(selectedAccount.value.id, accountData)
      showSuccessMessage('Account updated successfully')
    } else {
      // Create new account
      await createAccount(accountData)
      showSuccessMessage('Account created successfully')
    }
    
    closeModal()
  } catch (err) {
    console.error('Error saving account:', err)
    // Error is handled by the composable and displayed in the form
  } finally {
    modalLoading.value = false
  }
}

async function toggleAccountStatus(account: Account) {
  try {
    await toggleStatus(account.id)
    showSuccessMessage(`Account ${account.isActive ? 'deactivated' : 'activated'} successfully`)
  } catch (err) {
    console.error('Error toggling account status:', err)
  }
}

function showSuccessMessage(message: string) {
  successMessage.value = message
  showSuccessToast.value = true
  setTimeout(() => {
    showSuccessToast.value = false
  }, 3000)
}

// Initialize
onMounted(() => {
  fetchAccounts()
})
</script>