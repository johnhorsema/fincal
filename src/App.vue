<template>
  <div id="app">
    <AppLayout>
      <router-view v-slot="{ Component }">
        <transition
          name="page"
          mode="out-in"
          enter-active-class="transition-opacity duration-200 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-opacity duration-150 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </AppLayout>
  </div>
</template>

<script setup lang="ts">
import AppLayout from './components/layout/AppLayout.vue'
</script>