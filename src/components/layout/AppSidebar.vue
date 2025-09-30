<template>
  <div 
    :class="[
      'fixed inset-y-0 left-0 z-50 w-64 bg-white/95 backdrop-blur-md shadow-strong transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:shadow-soft',
      isOpen ? 'translate-x-0' : '-translate-x-full'
    ]"
  >
    <div class="flex flex-col h-full">
      <!-- Logo -->
      <div class="flex items-center justify-between h-16 px-4 border-b border-gray-200/50">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <h1 class="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              FinCal
            </h1>
          </div>
        </div>
        <button
          @click="$emit('toggle')"
          class="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 hover:scale-105"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-6 space-y-1">
        <router-link
          v-for="(item, index) in navigationItems"
          :key="item.name"
          :to="item.href"
          :class="[
            'group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-105',
            $route.path === item.href
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          ]"
          :style="{ animationDelay: `${index * 50}ms` }"
          class="fade-in"
        >
          <component 
            :is="item.icon" 
            :class="[
              'mr-3 h-5 w-5 transition-transform duration-200 group-hover:scale-110',
              $route.path === item.href
                ? 'text-white'
                : 'text-gray-400 group-hover:text-gray-600'
            ]"
          />
          {{ item.name }}
          
          <!-- Active indicator -->
          <div 
            v-if="$route.path === item.href"
            class="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"
          ></div>
        </router-link>
      </nav>

      <!-- Footer -->
      <div class="flex-shrink-0 p-4 border-t border-gray-200/50">
        <div class="text-xs text-gray-500 text-center">
          <div class="font-medium">Social Accounting Feed</div>
          <div class="mt-1 opacity-75">v1.0.0</div>
        </div>
        
        <!-- Status indicator -->
        <div class="mt-3 flex items-center justify-center space-x-2">
          <div class="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
          <span class="text-xs text-gray-500">Online</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'

defineProps<{
  isOpen: boolean
}>()

defineEmits<{
  toggle: []
}>()

// Simple icon components using SVG
const HomeIcon = () => h('svg', {
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
  })
])

const DocumentIcon = () => h('svg', {
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
  })
])

const CogIcon = () => h('svg', {
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
  }),
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'
  })
])

const UserIcon = () => h('svg', {
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor'
}, [
  h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
  })
])

const navigationItems = [
  { name: 'Feed', href: '/', icon: HomeIcon },
  { name: 'Transactions', href: '/transactions', icon: DocumentIcon },
  { name: 'Accounts', href: '/accounts', icon: CogIcon },
  { name: 'User Demo', href: '/user-demo', icon: UserIcon },
]
</script>