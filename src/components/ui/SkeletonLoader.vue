<template>
  <div class="animate-pulse">
    <!-- Post skeleton -->
    <div v-if="type === 'post'" class="card">
      <div class="flex space-x-4">
        <!-- Avatar skeleton -->
        <div class="skeleton-avatar"></div>
        
        <div class="flex-1 space-y-3">
          <!-- Header skeleton -->
          <div class="space-y-2">
            <div class="skeleton-text w-1/4"></div>
            <div class="skeleton-text w-1/6 h-3"></div>
          </div>
          
          <!-- Content skeleton -->
          <div class="space-y-2">
            <div class="skeleton-text w-full"></div>
            <div class="skeleton-text w-4/5"></div>
            <div class="skeleton-text w-3/5"></div>
          </div>
          
          <!-- Actions skeleton -->
          <div class="flex space-x-4 pt-2">
            <div class="skeleton-text w-20 h-8"></div>
            <div class="skeleton-text w-16 h-8"></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Card skeleton -->
    <div v-else-if="type === 'card'" class="card">
      <div class="space-y-4">
        <div class="skeleton-text w-1/3"></div>
        <div class="space-y-2">
          <div class="skeleton-text w-full"></div>
          <div class="skeleton-text w-4/5"></div>
        </div>
      </div>
    </div>
    
    <!-- List item skeleton -->
    <div v-else-if="type === 'list-item'" class="flex items-center space-x-3 p-3">
      <div class="skeleton-avatar w-8 h-8"></div>
      <div class="flex-1 space-y-2">
        <div class="skeleton-text w-1/3"></div>
        <div class="skeleton-text w-1/2 h-3"></div>
      </div>
    </div>
    
    <!-- Table row skeleton -->
    <div v-else-if="type === 'table-row'" class="grid grid-cols-4 gap-4 p-4 border-b border-gray-200">
      <div class="skeleton-text w-full"></div>
      <div class="skeleton-text w-3/4"></div>
      <div class="skeleton-text w-1/2"></div>
      <div class="skeleton-text w-2/3"></div>
    </div>
    
    <!-- Custom skeleton -->
    <div v-else class="space-y-3">
      <div v-for="line in lines" :key="line" class="skeleton-text" :class="getLineWidth(line)"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'post' | 'card' | 'list-item' | 'table-row' | 'custom'
  lines?: number
  widths?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  type: 'custom',
  lines: 3,
  widths: () => ['w-full', 'w-4/5', 'w-3/5']
})

const getLineWidth = (lineIndex: number): string => {
  if (props.widths && props.widths[lineIndex - 1]) {
    return props.widths[lineIndex - 1]
  }
  
  // Default widths based on line number
  const defaultWidths = ['w-full', 'w-4/5', 'w-3/5', 'w-2/3', 'w-1/2']
  return defaultWidths[(lineIndex - 1) % defaultWidths.length] || 'w-full'
}
</script>