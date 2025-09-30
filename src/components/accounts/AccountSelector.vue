<template>
  <div class="relative">
    <label v-if="label" :for="inputId" class="block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    
    <div class="relative">
      <input
        :id="inputId"
        v-model="searchQuery"
        type="text"
        :placeholder="placeholder"
        :class="[
          'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          { 'border-red-300': hasError }
        ]"
        @focus="showDropdown = true"
        @blur="handleBlur"
        @keydown="handleKeydown"
        autocomplete="off"
      />
      
      <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <!-- Dropdown -->
    <div
      v-if="showDropdown && (filteredAccounts.length > 0 || allowCreate)"
      class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
    >
      <!-- Grouped accounts -->
      <template v-for="(accounts, type) in groupedFilteredAccounts" :key="type">
        <div v-if="accounts.length > 0" class="py-1">
          <div class="px-3 py-1 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
            {{ ACCOUNT_TYPES[type] }}
          </div>
          <button
            v-for="(account, index) in accounts"
            :key="account.id"
            type="button"
            :class="[
              'w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none',
              { 'bg-blue-50': highlightedIndex === getAccountIndex(account) }
            ]"
            @click="selectAccount(account)"
            @mouseenter="highlightedIndex = getAccountIndex(account)"
          >
            <div class="flex justify-between items-center">
              <div>
                <div class="font-medium text-gray-900">{{ account.name }}</div>
                <div class="text-xs text-gray-500">{{ account.category }}</div>
              </div>
              <div v-if="!account.isActive" class="text-xs text-red-500">Inactive</div>
            </div>
          </button>
        </div>
      </template>

      <!-- Create new account option -->
      <div v-if="allowCreate && searchQuery.trim() && !exactMatch" class="border-t border-gray-200">
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
          @click="$emit('create-account', searchQuery.trim())"
        >
          <div class="flex items-center">
            <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create "{{ searchQuery.trim() }}"
          </div>
        </button>
      </div>

      <!-- No results -->
      <div v-if="filteredAccounts.length === 0 && !allowCreate" class="px-3 py-2 text-sm text-gray-500">
        No accounts found
      </div>
    </div>

    <!-- Error message -->
    <p v-if="hasError && errorMessage" class="mt-1 text-sm text-red-600">
      {{ errorMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useAccounts, ACCOUNT_TYPES, type AccountType } from '@/composables/useAccounts'
import type { Account } from '@/types'

interface Props {
  modelValue?: Account | null
  label?: string
  placeholder?: string
  required?: boolean
  allowCreate?: boolean
  filterType?: AccountType
  includeInactive?: boolean
  errorMessage?: string
}

interface Emits {
  (e: 'update:modelValue', value: Account | null): void
  (e: 'create-account', name: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search accounts...',
  allowCreate: false,
  includeInactive: false
})

const emit = defineEmits<Emits>()

const { accountsList, fetchAccounts } = useAccounts()

// Component state
const searchQuery = ref('')
const showDropdown = ref(false)
const highlightedIndex = ref(-1)
const inputId = `account-selector-${Math.random().toString(36).substr(2, 9)}`

// Initialize accounts
fetchAccounts()

// Computed properties
const filteredAccounts = computed(() => {
  let accounts = props.includeInactive 
    ? accountsList.value 
    : accountsList.value.filter(a => a.isActive)

  // Filter by type if specified
  if (props.filterType) {
    accounts = accounts.filter(a => a.type === props.filterType)
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    accounts = accounts.filter(a =>
      a.name.toLowerCase().includes(query) ||
      a.category.toLowerCase().includes(query)
    )
  }

  return accounts
})

const groupedFilteredAccounts = computed(() => {
  const grouped: Record<AccountType, Account[]> = {
    asset: [],
    liability: [],
    equity: [],
    revenue: [],
    expense: []
  }

  filteredAccounts.value.forEach(account => {
    if (account.type in grouped) {
      grouped[account.type as AccountType].push(account)
    }
  })

  return grouped
})

const exactMatch = computed(() => {
  return filteredAccounts.value.some(a => 
    a.name.toLowerCase() === searchQuery.value.toLowerCase().trim()
  )
})

const hasError = computed(() => {
  return props.required && !props.modelValue && props.errorMessage
})

// Watch for external value changes
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    searchQuery.value = newValue.name
  } else {
    searchQuery.value = ''
  }
}, { immediate: true })

// Methods
function selectAccount(account: Account) {
  searchQuery.value = account.name
  showDropdown.value = false
  highlightedIndex.value = -1
  emit('update:modelValue', account)
}

function handleBlur() {
  // Delay hiding dropdown to allow for clicks
  setTimeout(() => {
    showDropdown.value = false
    highlightedIndex.value = -1
    
    // If no exact match and not creating, clear the input
    if (!exactMatch.value && !props.modelValue) {
      searchQuery.value = ''
      emit('update:modelValue', null)
    }
  }, 200)
}

function handleKeydown(event: KeyboardEvent) {
  if (!showDropdown.value) {
    if (event.key === 'ArrowDown' || event.key === 'Enter') {
      showDropdown.value = true
      event.preventDefault()
    }
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredAccounts.value.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
      break
    case 'Enter':
      event.preventDefault()
      if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredAccounts.value.length) {
        selectAccount(filteredAccounts.value[highlightedIndex.value])
      } else if (props.allowCreate && searchQuery.value.trim() && !exactMatch.value) {
        emit('create-account', searchQuery.value.trim())
      }
      break
    case 'Escape':
      showDropdown.value = false
      highlightedIndex.value = -1
      break
  }
}

function getAccountIndex(account: Account): number {
  return filteredAccounts.value.findIndex(a => a.id === account.id)
}

// Clear selection
function clearSelection() {
  searchQuery.value = ''
  emit('update:modelValue', null)
}

defineExpose({
  clearSelection
})
</script>