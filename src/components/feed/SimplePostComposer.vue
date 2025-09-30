<template>
  <PostComposer
    @posted="handlePosted"
    @create-journal="handleCreateJournal"
    @error="handleError"
  />
</template>

<script setup lang="ts">
import PostComposer from './PostComposer.vue'
import type { Post } from '../../types'

const emit = defineEmits<{
  posted: [post: Post]
  'create-journal': [data: { content: string; authorPersona?: string }]
  error: [error: string]
}>()

const handlePosted = (post: Post) => {
  emit('posted', post)
}

const handleCreateJournal = (data: { content: string; authorPersona?: string }) => {
  emit('create-journal', data)
}

const handleError = (error: string) => {
  emit('error', error)
}
</script>