<template>
  <div class="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- Sidebar -->
    <AppSidebar 
      :is-open="sidebarOpen" 
      @toggle="toggleSidebar"
      class="hidden lg:block"
    />
    
    <!-- Mobile sidebar overlay -->
    <transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="sidebarOpen" 
        class="fixed inset-0 z-40 lg:hidden"
        @click="closeSidebar"
      >
        <div class="absolute inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm"></div>
      </div>
    </transition>
    
    <!-- Mobile sidebar -->
    <AppSidebar 
      :is-open="sidebarOpen" 
      @toggle="toggleSidebar"
      class="lg:hidden"
    />

    <!-- Main content area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <AppHeader @toggle-sidebar="toggleSidebar" />
      
      <!-- Main content -->
      <AppMain>
        <slot />
      </AppMain>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import AppMain from './AppMain.vue'

const sidebarOpen = ref(false)

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const closeSidebar = () => {
  sidebarOpen.value = false
}
</script>