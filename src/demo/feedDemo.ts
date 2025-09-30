/**
 * Demo script to test feed functionality
 * This can be run to verify that the social feed system works correctly
 */

import { usePosts } from '../composables/usePosts'
import type { Post } from '../types'

export async function runFeedDemo() {
  console.log('🚀 Starting Social Feed Demo...')
  
  try {
    const { 
      createPost, 
      updatePost, 
      getPost,
      suggestsFinancialActivity,
      posts,
      clearError
    } = usePosts()

    // Test 1: Create regular posts
    console.log('\n📝 Test 1: Creating regular posts...')
    
    const regularPost = await createPost({
      content: 'Had a great meeting with the client today. Looking forward to the next steps!',
      authorId: 'user1',
      authorPersona: 'Marketing Manager'
    })
    console.log(`Created regular post: ${regularPost.id}`)
    
    // Test 2: Create financial posts
    console.log('\n💰 Test 2: Creating financial posts...')
    
    const financialPost = await createPost({
      content: 'Just paid $500 for office supplies from Staples. Receipt attached.',
      authorId: 'user1',
      authorPersona: 'Accountant',
      attachments: ['receipt_staples_500.pdf']
    })
    console.log(`Created financial post: ${financialPost.id}`)
    
    // Test 3: Test financial detection
    console.log('\n🔍 Test 3: Testing financial content detection...')
    
    const testCases = [
      'Just paid $500 for supplies',
      'Received invoice for services',
      'Had lunch with client',
      'Meeting scheduled for tomorrow',
      'Deposited $1000 into bank account',
      'Working on the quarterly report'
    ]
    
    testCases.forEach(content => {
      const isFinancial = suggestsFinancialActivity(content)
      console.log(`"${content}" -> ${isFinancial ? '💰 Financial' : '📝 Regular'}`)
    })
    
    // Test 4: Test post validation
    console.log('\n✅ Test 4: Testing post validation...')
    
    try {
      await createPost({
        content: 'a'.repeat(501), // Too long
        authorId: 'user1',
        authorPersona: 'Marketing Manager'
      })
    } catch (error) {
      console.log(`✓ Correctly rejected long post: ${error.message}`)
    }
    
    try {
      await createPost({
        content: '   ', // Empty
        authorId: 'user1',
        authorPersona: 'Marketing Manager'
      })
    } catch (error) {
      console.log(`✓ Correctly rejected empty post: ${error.message}`)
    }
    
    // Test 5: Update post with transaction
    console.log('\n🔄 Test 5: Linking post to transaction...')
    
    const updatedPost = await updatePost(financialPost.id, {
      transactionId: 'trans_' + Date.now()
    })
    console.log(`✓ Linked post ${updatedPost.id} to transaction ${updatedPost.transactionId}`)
    
    // Test 6: Retrieve posts
    console.log('\n📋 Test 6: Retrieving posts...')
    
    const retrievedPost = getPost(financialPost.id)
    if (retrievedPost) {
      console.log(`✓ Retrieved post: "${retrievedPost.content.substring(0, 50)}..."`)
      console.log(`  - Author: ${retrievedPost.authorPersona}`)
      console.log(`  - Created: ${retrievedPost.createdAt.toISOString()}`)
      console.log(`  - Attachments: ${retrievedPost.attachments?.length || 0}`)
      console.log(`  - Transaction: ${retrievedPost.transactionId || 'None'}`)
    }
    
    // Test 7: Check posts sorting
    console.log('\n📊 Test 7: Checking posts sorting...')
    console.log(`Total posts: ${posts.value.length}`)
    
    if (posts.value.length >= 2) {
      const first = posts.value[0]
      const second = posts.value[1]
      const isCorrectOrder = first.createdAt >= second.createdAt
      console.log(`✓ Posts are ${isCorrectOrder ? 'correctly' : 'incorrectly'} sorted by date`)
    }
    
    console.log('\n✅ Social Feed Demo completed successfully!')
    
    // Summary
    console.log('\n📈 Demo Summary:')
    console.log(`- Created ${posts.value.length} posts`)
    console.log(`- Financial posts: ${posts.value.filter(p => suggestsFinancialActivity(p.content)).length}`)
    console.log(`- Posts with transactions: ${posts.value.filter(p => p.transactionId).length}`)
    console.log(`- Posts with attachments: ${posts.value.filter(p => p.attachments && p.attachments.length > 0).length}`)
    
  } catch (error) {
    console.error('❌ Feed Demo failed:', error)
    clearError()
  }
}

// Export for use in other contexts
export default runFeedDemo