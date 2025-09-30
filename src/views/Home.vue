<template>
  <div class="space-y-6 sm:space-y-8">
    <!-- Header -->
    <div class="slide-in-up">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Social Feed
          </h1>
          <p class="text-gray-600 mt-2">Share updates and convert them to accounting transactions</p>
        </div>
        
        <!-- Quick stats badges -->
        <div class="flex items-center space-x-3 mt-4 sm:mt-0">
          <div class="flex items-center space-x-2 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
            <div class="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
            <span>{{ totalPosts }} posts</span>
          </div>
          <div class="flex items-center space-x-2 bg-success-50 text-success-700 px-3 py-1 rounded-full text-sm font-medium">
            <div class="w-2 h-2 bg-success-500 rounded-full"></div>
            <span>{{ pendingTransactions }} pending</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 xl:grid-cols-4 gap-6 lg:gap-8">
      <!-- Main feed area -->
      <div class="xl:col-span-3">
        <div class="slide-in-up" style="animation-delay: 100ms;">
          <FeedContainer
            @create-journal="handleCreateJournal"
            @view-transaction="handleViewTransaction"
          />
        </div>
      </div>
      
      <!-- Sidebar -->
      <div class="xl:col-span-1 space-y-6">
        <!-- Quick Stats -->
        <div class="card hover-glow slide-in-up" style="animation-delay: 200ms;">
          <div class="flex items-center space-x-2 mb-4">
            <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900">Quick Stats</h3>
          </div>
          
          <div class="space-y-4">
            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-warning-500 rounded-full"></div>
                <span class="text-sm text-gray-700">Pending Transactions</span>
              </div>
              <span class="font-semibold text-gray-900">{{ pendingTransactions }}</span>
            </div>
            
            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-success-50 to-success-100 rounded-lg">
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-success-500 rounded-full"></div>
                <span class="text-sm text-gray-700">This Month</span>
              </div>
              <span class="font-semibold text-success-700">${{ monthlyTotal.toFixed(2) }}</span>
            </div>
            
            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg">
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-primary-500 rounded-full"></div>
                <span class="text-sm text-gray-700">Total Posts</span>
              </div>
              <span class="font-semibold text-primary-700">{{ totalPosts }}</span>
            </div>
          </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="card hover-glow slide-in-up" style="animation-delay: 300ms;">
          <div class="flex items-center space-x-2 mb-4">
            <div class="w-8 h-8 bg-gradient-to-br from-info-500 to-info-600 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          
          <div class="space-y-2">
            <button class="w-full flex items-center space-x-3 px-3 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 rounded-lg transition-all duration-200 hover:scale-105 group">
              <svg class="w-4 h-4 text-gray-400 group-hover:text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 002 2h8a2 2 0 002-2V3a2 2 0 012 2v6h-3a2 2 0 00-2 2v3H6a2 2 0 01-2-2V5zm8 8a2 2 0 012-2h3l-3 3v-1z" clip-rule="evenodd" />
              </svg>
              <span>View All Transactions</span>
            </button>
            
            <button class="w-full flex items-center space-x-3 px-3 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 rounded-lg transition-all duration-200 hover:scale-105 group">
              <svg class="w-4 h-4 text-gray-400 group-hover:text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2z" clip-rule="evenodd" />
              </svg>
              <span>Manage Accounts</span>
            </button>
            
            <button class="w-full flex items-center space-x-3 px-3 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 rounded-lg transition-all duration-200 hover:scale-105 group">
              <svg class="w-4 h-4 text-gray-400 group-hover:text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              <span>Export Data</span>
            </button>
          </div>
        </div>
        
        <!-- Recent Activity -->
        <div class="card hover-glow slide-in-up" style="animation-delay: 400ms;">
          <div class="flex items-center space-x-2 mb-4">
            <div class="w-8 h-8 bg-gradient-to-br from-warning-500 to-warning-600 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          
          <div class="space-y-3 text-sm text-gray-600">
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-success-500 rounded-full"></div>
              <span>Transaction approved</span>
              <span class="text-xs text-gray-400 ml-auto">2m ago</span>
            </div>
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span>New post created</span>
              <span class="text-xs text-gray-400 ml-auto">5m ago</span>
            </div>
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-warning-500 rounded-full"></div>
              <span>Transaction pending</span>
              <span class="text-xs text-gray-400 ml-auto">10m ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Transaction Modal Placeholder -->
    <transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showTransactionModal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50" @click="showTransactionModal = false">
        <transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-4 scale-95"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0 scale-100"
          leave-to-class="opacity-0 translate-y-4 scale-95"
        >
          <div v-if="showTransactionModal" class="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4" @click.stop>
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900">Create Transaction</h3>
            </div>
            
            <p class="text-gray-600 mb-6">Transaction creation will be implemented in future tasks.</p>
            
            <div class="flex justify-end space-x-3">
              <button
                @click="showTransactionModal = false"
                class="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FeedContainer } from '../components'
import { usePosts } from '../composables/usePosts'
import type { Post } from '../types'

// Composables
const { posts } = usePosts()

// Component state
const showTransactionModal = ref(false)
const selectedPost = ref<Post | null>(null)

// Computed properties for sidebar stats
const totalPosts = computed(() => posts.value.length)
const pendingTransactions = computed(() => {
  // Count posts that have been converted to transactions but are still pending
  return posts.value.filter(post => post.transactionId).length
})
const monthlyTotal = computed(() => {
  // Placeholder calculation - in real app would calculate from actual transaction amounts
  return posts.value.length * 100 // Mock calculation
})

// Event handlers
const handleCreateJournal = (post: Post) => {
  selectedPost.value = post
  showTransactionModal.value = true
  // In future tasks, this will open the transaction creation modal
}

const handleViewTransaction = (transactionId: string) => {
  // In future tasks, this will navigate to transaction detail view
  console.log('View transaction:', transactionId)
}
</script>