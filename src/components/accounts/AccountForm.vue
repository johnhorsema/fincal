<template>
  <FormValidator
    v-model="form"
    entity-type="account"
    :show-error-summary="true"
    :field-labels="fieldLabels"
    @validate="onValidate"
    @sanitize="onSanitize"
  >
    <template #default="{ isValid, hasErrors, getFieldError }">
      <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Account Name -->
    <div>
      <label for="account-name" class="block text-sm font-medium text-gray-700 mb-1">
        Account Name <span class="text-red-500">*</span>
      </label>
      <input
        id="account-name"
        v-model="form.name"
        type="text"
        required
        :class="[
          'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          { 'border-red-300': getFieldError('name') }
        ]"
        placeholder="Enter account name"
      />
      <p v-if="getFieldError('name')" class="mt-1 text-sm text-red-600">{{ getFieldError('name') }}</p>
    </div>

    <!-- Account Type -->
    <div>
      <label for="account-type" class="block text-sm font-medium text-gray-700 mb-1">
        Account Type <span class="text-red-500">*</span>
      </label>
      <select
        id="account-type"
        v-model="form.type"
        required
        :class="[
          'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          { 'border-red-300': getFieldError('type') }
        ]"
        @change="updateCategoryOptions"
      >
        <option value="">Select account type</option>
        <option v-for="(label, value) in ACCOUNT_TYPES" :key="value" :value="value">
          {{ label }}
        </option>
      </select>
      <p v-if="getFieldError('type')" class="mt-1 text-sm text-red-600">{{ getFieldError('type') }}</p>
    </div>

    <!-- Account Category -->
    <div>
      <label for="account-category" class="block text-sm font-medium text-gray-700 mb-1">
        Category <span class="text-red-500">*</span>
      </label>
      <div class="flex space-x-2">
        <select
          id="account-category"
          v-model="form.category"
          :class="[
            'flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            { 'border-red-300': getFieldError('category') }
          ]"
          @change="customCategory = ''"
        >
          <option value="">Select category</option>
          <option v-for="category in availableCategories" :key="category" :value="category">
            {{ category }}
          </option>
          <option value="__custom__">Custom...</option>
        </select>
      </div>
      
      <!-- Custom category input -->
      <input
        v-if="form.category === '__custom__'"
        v-model="customCategory"
        type="text"
        placeholder="Enter custom category"
        class="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        @blur="handleCustomCategory"
      />
      
      <p v-if="getFieldError('category')" class="mt-1 text-sm text-red-600">{{ getFieldError('category') }}</p>
    </div>

    <!-- Active Status -->
    <div class="flex items-center">
      <input
        id="account-active"
        v-model="form.isActive"
        type="checkbox"
        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />
      <label for="account-active" class="ml-2 block text-sm text-gray-700">
        Active account
      </label>
    </div>

    <!-- Form Actions -->
    <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
      <button
        type="button"
        @click="$emit('cancel')"
        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Cancel
      </button>
      <button
        type="submit"
        :disabled="loading || !isValid || hasErrors"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="loading" class="flex items-center">
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Saving...
        </span>
        <span v-else>{{ isEditing ? 'Update Account' : 'Create Account' }}</span>
      </button>
    </div>

      </form>
    </template>
  </FormValidator>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAccounts, ACCOUNT_TYPES, ACCOUNT_CATEGORIES, type AccountType } from '@/composables/useAccounts'
import { useErrorHandling } from '@/composables/useErrorHandling'
import FormValidator from '@/components/ui/FormValidator.vue'
import type { Account } from '@/types'

interface Props {
  account?: Account | null
  loading?: boolean
}

interface Emits {
  (e: 'submit', account: Omit<Account, 'id'>): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const { validateAccount } = useAccounts()
const { handleFormSubmit } = useErrorHandling()

// Form state
const form = ref({
  name: '',
  type: '' as AccountType | '',
  category: '',
  isActive: true
})

const customCategory = ref('')
const isFormValid = ref(false)
const sanitizedData = ref<any>(null)

// Field labels for better error messages
const fieldLabels = {
  name: 'Account Name',
  type: 'Account Type',
  category: 'Category',
  isActive: 'Active Status'
}

// Computed properties
const isEditing = computed(() => !!props.account)

const availableCategories = computed(() => {
  if (!form.value.type || !(form.value.type in ACCOUNT_CATEGORIES)) {
    return []
  }
  return ACCOUNT_CATEGORIES[form.value.type as AccountType]
})

// Validation handlers
const onValidate = (isValid: boolean, errors: Record<string, string | string[]>) => {
  isFormValid.value = isValid
}

const onSanitize = (sanitized: Record<string, any>) => {
  sanitizedData.value = sanitized
}

// Watch for account changes (editing mode)
watch(() => props.account, (newAccount) => {
  if (newAccount) {
    form.value = {
      name: newAccount.name,
      type: newAccount.type,
      category: newAccount.category,
      isActive: newAccount.isActive
    }
  } else {
    resetForm()
  }
}, { immediate: true })

// Methods
function resetForm() {
  form.value = {
    name: '',
    type: '',
    category: '',
    isActive: true
  }
  customCategory.value = ''
  isFormValid.value = false
  sanitizedData.value = null
}

function updateCategoryOptions() {
  // Reset category when type changes
  form.value.category = ''
  customCategory.value = ''
}

function handleCustomCategory() {
  if (customCategory.value.trim()) {
    form.value.category = customCategory.value.trim()
  }
}

async function handleSubmit() {
  if (!isFormValid.value) {
    return
  }

  const result = await handleFormSubmit(async () => {
    // Use sanitized data if available, otherwise use form data
    const accountData = sanitizedData.value || {
      name: form.value.name.trim(),
      type: form.value.type as AccountType,
      category: form.value.category,
      isActive: form.value.isActive
    }

    emit('submit', accountData)
    return accountData
  }, {
    context: { component: 'AccountForm', action: 'submit' }
  })

  if (result) {
    resetForm()
  }
}
</script>