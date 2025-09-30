<template>
  <div class="space-y-6">
    <!-- Post Composer -->
    <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <SimplePostComposer @posted="handlePostCreated" />
    </div>
    
    <!-- Feed Content -->
    <div class="space-y-4">
      <!-- Loading State -->
      <div v-if="isLoading && posts.length === 0" class="flex justify-center py-12">
        <div class="text-center">
          <div class="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p class="text-gray-600">Loading posts...</p>
        </div>
      </div>
      
      <!-- Error State -->
      <div v-else-if="error && !isLoading" class="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div class="flex items-start space-x-3">
          <svg class="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <div>
            <h3 class="text-sm font-medium text-red-800">Something went wrong</h3>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
            <Button variant="outline" size="sm" class="mt-3" @click="handleRetry">
              Try again
            </Button>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="!isLoading && posts.length === 0" class="text-center py-16">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
        <p class="text-gray-600">Share your first business update above</p>
      </div>
      
      <!-- Posts List -->
      <div v-else class="space-y-4">
        <PostCard
          v-for="post in posts"
          :key="post.id"
          :post="post"
          @create-journal="handleCreateJournal"
          @view-transaction="handleViewTransaction"
          @edit-transaction="handleEditTransaction"
        />
      </div>
    </div>

    
    <!-- Transaction Modal -->
    <TransactionModal
      :is-open="isTransactionModalOpen"
      :post="selectedPost"
      :existing-transaction="selectedTransaction"
      @close="handleTransactionModalClose"
      @transaction-created="handleTransactionCreated"
      @transaction-updated="handleTransactionUpdated"
    />
    
    <!-- Transaction Detail Modal -->
    <TransactionDetailModal
      :is-open="isTransactionDetailModalOpen"
      :transaction-id="selectedTransactionId"
      @close="handleTransactionDetailModalClose"
      @edit="handleEditTransactionFromDetail"
      @approve="handleTransactionApproved"
      @reject="handleTransactionRejected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePosts } from '../../composables/usePosts'
import { useTransactions } from '../../composables/useTransactions'

import Button from '../ui/Button.vue'
import SimplePostComposer from './SimplePostComposer.vue'
import PostCard from './PostCard.vue'
import TransactionModal from './TransactionModal.vue'
import TransactionDetailModal from './TransactionDetailModal.vue'
import type { Post, Transaction } from '../../types'

const emit = defineEmits<{
  createJournal: [post: Post]
  viewTransaction: [transactionId: string]
}>()

// Composables
const { posts, isLoading, error, refreshPosts, clearError, updatePost } = usePosts()
const { createTransaction, updateTransaction, getTransaction } = useTransactions()

// Transaction modal state
const isTransactionModalOpen = ref(false)
const selectedPost = ref<Post | null>(null)
const selectedTransaction = ref<Transaction | null>(null)

// Transaction detail modal state
const isTransactionDetailModalOpen = ref(false)
const selectedTransactionId = ref<string | null>(null)

// Methods
const handlePostCreated = (post: Post) => {
  // Post created successfully - could add toast notification here
}

const handleCreateJournal = (post: Post) => {
  selectedPost.value = post
  isTransactionModalOpen.value = true
}

const handleViewTransaction = (transactionId: string) => {
  selectedTransactionId.value = transactionId
  isTransactionDetailModalOpen.value = true
}

const handleEditTransaction = (transactionId: string) => {
  const transaction = getTransaction(transactionId)
  if (transaction) {
    // Find the related post
    const relatedPost = posts.value.find(p => p.id === transaction.postId)
    if (relatedPost) {
      selectedPost.value = relatedPost
      selectedTransaction.value = transaction
      isTransactionModalOpen.value = true
    }
  }
}

const handleTransactionModalClose = () => {
  isTransactionModalOpen.value = false
  selectedPost.value = null
  selectedTransaction.value = null
}

const handleTransactionDetailModalClose = () => {
  isTransactionDetailModalOpen.value = false
  selectedTransactionId.value = null
}

const handleEditTransactionFromDetail = (transactionId: string) => {
  // Close detail modal and open edit modal
  isTransactionDetailModalOpen.value = false
  handleEditTransaction(transactionId)
}

const handleTransactionCreated = async (transaction: Transaction) => {
  try {
    await createTransaction(transaction)
    
    if (selectedPost.value) {
      await updatePost(selectedPost.value.id, { transactionId: transaction.id })
    }
  } catch (error) {
    console.error('Error creating transaction:', error)
  }
}

const handleTransactionUpdated = async (transaction: Transaction) => {
  try {
    await updateTransaction(transaction.id, {
      description: transaction.description,
      date: transaction.date,
      status: transaction.status
    })
    
    if (isTransactionDetailModalOpen.value) {
      isTransactionDetailModalOpen.value = false
    }
  } catch (error) {
    console.error('Error updating transaction:', error)
  }
}

const handleTransactionApproved = (transactionId: string) => {
  // Transaction approved
}

const handleTransactionRejected = (transactionId: string) => {
  // Transaction rejected
}

const handleRetry = () => {
  clearError()
  refreshPosts()
}

// Lifecycle
onMounted(() => {
  refreshPosts()
})
</script>