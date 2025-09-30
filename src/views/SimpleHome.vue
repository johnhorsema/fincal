<template>
  <div class="space-y-8">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Social Feed</h1>
      <p class="text-gray-600 mt-2">Share updates and convert them to accounting transactions</p>
    </div>
    
    <div class="grid grid-cols-1 xl:grid-cols-4 gap-8">
      <!-- Main feed area -->
      <div class="xl:col-span-3">
        <FeedContainer
          @create-journal="handleCreateJournal"
          @view-transaction="handleViewTransaction"
        />
      </div>
      
      <!-- Sidebar -->
      <div class="xl:col-span-1 space-y-6">
        <!-- Quick Stats -->
        <Card>
          <div class="flex items-center space-x-2 mb-4">
            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900">Quick Stats</h3>
          </div>
          
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-700">Total Posts</span>
              <span class="font-semibold text-gray-900">{{ totalPosts }}</span>
            </div>
            
            <div class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span class="text-sm text-gray-700">Pending Transactions</span>
              <span class="font-semibold text-yellow-700">{{ pendingTransactions }}</span>
            </div>
            
            <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span class="text-sm text-gray-700">This Month</span>
              <span class="font-semibold text-green-700">${{ monthlyTotal.toFixed(2) }}</span>
            </div>
          </div>
        </Card>
        
        <!-- Quick Actions -->
        <Card>
          <div class="flex items-center space-x-2 mb-4">
            <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          
          <div class="space-y-2">
            <router-link
              to="/transactions"
              class="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 002 2h8a2 2 0 002-2V3a2 2 0 012 2v6h-3a2 2 0 00-2 2v3H6a2 2 0 01-2-2V5zm8 8a2 2 0 012-2h3l-3 3v-1z" clip-rule="evenodd" />
              </svg>
              <span>View All Transactions</span>
            </router-link>
            
            <router-link
              to="/accounts"
              class="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2z" clip-rule="evenodd" />
              </svg>
              <span>Manage Accounts</span>
            </router-link>
          </div>
        </Card>
      </div>
    </div>
    
    <!-- Transaction Modal -->
    <TransactionModal
      :is-open="showTransactionModal"
      :post="selectedPost"
      @close="showTransactionModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePosts } from '../composables/usePosts'
import Card from '../components/ui/Card.vue'
import FeedContainer from '../components/feed/FeedContainer.vue'
import TransactionModal from '../components/feed/TransactionModal.vue'
import type { Post } from '../types'

const { posts } = usePosts()

const showTransactionModal = ref(false)
const selectedPost = ref<Post | null>(null)

// Computed properties for sidebar stats
const totalPosts = computed(() => posts.value.length)
const pendingTransactions = computed(() => {
  return posts.value.filter(post => post.transactionId).length
})
const monthlyTotal = computed(() => {
  return posts.value.length * 100 // Mock calculation
})

// Event handlers
const handleCreateJournal = (post: Post) => {
  selectedPost.value = post
  showTransactionModal.value = true
}

const handleViewTransaction = (transactionId: string) => {
  console.log('View transaction:', transactionId)
}
</script>