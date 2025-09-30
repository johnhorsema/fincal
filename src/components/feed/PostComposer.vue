<template>
  <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
    <div class="space-y-4">
      <!-- Persona selector -->
      <div>
        <PersonaSelector 
          :selected-persona="currentPersonaObj"
          :personas="availablePersonas"
          @change="handlePersonaChange"
          placeholder="Select persona..."
        />
      </div>
      
      <!-- Text input -->
      <div class="relative">
        <textarea
          v-model="content"
          placeholder="E.g. 'Paid meal from credit card for 2k'"
          :maxlength="maxLength"
          rows="3"
          class="w-full p-3 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors text-gray-900 placeholder-gray-500"
          :class="{
            'border-red-300 focus:ring-red-500 focus:border-red-500': hasContentError
          }"
          @input="onContentChange"
        />
      </div>
      
      <!-- Error messages -->
      <div v-if="hasContentError" class="text-sm text-red-600">
        {{ contentErrorMessage }}
      </div>
      <div v-if="hasPersonaError" class="text-sm text-red-600">
        {{ personaErrorMessage }}
      </div>
      
      <!-- Actions -->
      <div class="flex items-center justify-between">
        <button
          v-if="suggestsFinancial && content.trim()"
          @click="handleCreateJournal"
          :disabled="!canPost || isPosting"
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Create Journal
        </button>
        <div v-else></div>
        
        <!-- Post button -->
        <button
          @click="handlePost"
          :disabled="!canPost || isPosting"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isPosting" class="flex items-center space-x-2">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Posting...</span>
          </span>
          <span v-else>Post</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePosts } from '../../composables/usePosts'
import { useAuth } from '../../composables/useAuth'
import { useErrorHandling, validationRules } from '../../composables/useErrorHandling'
import PersonaSelector from '../user/PersonaSelector.vue'
import type { UserPersona } from '../../types'

const props = defineProps<{
  placeholder?: string
  maxLength?: number
}>()

const emit = defineEmits<{
  posted: [post: any]
  error: [error: string]
  'create-journal': [data: { content: string; authorPersona?: string }]
}>()

// Composables
const { createPost, suggestsFinancialActivity } = usePosts()
const { currentUser, currentPersona } = useAuth()
const { 
  handleFormSubmit, 
  validateForm, 
  hasFieldError, 
  getFieldErrorMessage,
  clearAllErrors 
} = useErrorHandling()

// Component state
const content = ref('')
const selectedPersona = ref<UserPersona | null>(currentPersona.value || null)
const attachments = ref<string[]>([])
const isPosting = ref(false)
const fileInput = ref<HTMLInputElement>()

// Validation rules
const validationRulesConfig = {
  content: [
    validationRules.required('Post content is required'),
    validationRules.maxLength(maxLength.value, `Content cannot exceed ${maxLength.value} characters`)
  ],
  authorPersona: [
    validationRules.required('Please select a persona')
  ]
}

// Props with defaults
const placeholder = computed(() => props.placeholder || "What's happening with your business?")
const maxLength = computed(() => props.maxLength || 500)

// Available personas from current user
const availablePersonas = computed(() => currentUser.value?.personas || [])

// Current persona object for PersonaSelector
const currentPersonaObj = computed(() => selectedPersona.value)

// Computed properties
const hasContentError = computed(() => hasFieldError('content'))
const hasPersonaError = computed(() => hasFieldError('authorPersona'))
const contentErrorMessage = computed(() => getFieldErrorMessage('content'))
const personaErrorMessage = computed(() => getFieldErrorMessage('authorPersona'))

const suggestsFinancial = computed(() => suggestsFinancialActivity(content.value))
const canPost = computed(() => {
  return content.value.trim().length > 0 && 
         content.value.length <= maxLength.value && 
         selectedPersona.value &&
         !isPosting.value &&
         !hasContentError.value &&
         !hasPersonaError.value
})

// Handle persona changes
const handlePersonaChange = (persona: UserPersona | null) => {
  selectedPersona.value = persona
}

// Methods
const onContentChange = () => {
  // Clear content errors when user starts typing
  if (hasFieldError('content')) {
    clearAllErrors()
  }
  
  // Real-time validation
  if (content.value.length > maxLength.value) {
    validateForm({ content: content.value }, { content: validationRulesConfig.content })
  }
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (files) {
    const newAttachments = Array.from(files).map(file => file.name)
    attachments.value.push(...newAttachments)
  }
  
  // Clear the input so the same file can be selected again
  if (target) {
    target.value = ''
  }
}

const removeAttachment = (index: number) => {
  attachments.value.splice(index, 1)
}

const handlePost = async () => {
  if (!currentUser.value || !selectedPersona.value) {
    return
  }

  // Validate form data
  const formData = {
    content: content.value,
    authorPersona: selectedPersona.value.name
  }

  if (!validateForm(formData, validationRulesConfig)) {
    return
  }

  isPosting.value = true

  const result = await handleFormSubmit(async () => {
    const post = await createPost({
      content: content.value.trim(),
      authorId: currentUser.value!.id,
      authorPersona: selectedPersona.value!.name,
      attachments: attachments.value.length > 0 ? [...attachments.value] : undefined
    })

    // Reset form on success
    content.value = ''
    attachments.value = []
    
    emit('posted', post)
    return post
  }, {
    context: { component: 'PostComposer', action: 'createPost' }
  })

  isPosting.value = false

  if (!result) {
    emit('error', 'Failed to create post')
  }
}

const handleCreateJournal = () => {
  // Emit event to parent to handle journal creation
  emit('create-journal', {
    content: content.value.trim(),
    authorPersona: selectedPersona.value?.name
  })
}

// Initialize with current persona if available
if (currentPersona.value) {
  selectedPersona.value = currentPersona.value
}
</script>