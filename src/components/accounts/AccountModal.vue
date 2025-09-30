<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 overflow-y-auto"
    aria-labelledby="modal-title"
    role="dialog"
    aria-modal="true"
  >
    <!-- Background overlay -->
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div
        class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        aria-hidden="true"
        @click="handleClose"
      ></div>

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="w-full">
              <!-- Modal header -->
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900" id="modal-title">
                  {{ isEditing ? 'Edit Account' : 'Create New Account' }}
                </h3>
                <button
                  type="button"
                  class="text-gray-400 hover:text-gray-600 focus:outline-none"
                  @click="handleClose"
                >
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Account form -->
              <AccountForm
                :account="account"
                :loading="loading"
                @submit="handleSubmit"
                @cancel="handleClose"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AccountForm from './AccountForm.vue'
import type { Account } from '@/types'

interface Props {
  isOpen: boolean
  account?: Account | null
  loading?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'submit', account: Omit<Account, 'id'>): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const isEditing = computed(() => !!props.account)

function handleClose() {
  emit('close')
}

function handleSubmit(accountData: Omit<Account, 'id'>) {
  emit('submit', accountData)
}
</script>