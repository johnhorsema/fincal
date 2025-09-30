/**
 * Demo script to test account management functionality
 * This can be run to verify that the account system works correctly
 */

import { initializeDatabase, closeDatabase } from '../db'
import { useAccounts } from '../../src/composables/useAccounts'

export async function runAccountDemo() {
  console.log('🚀 Starting Account Management Demo...')
  
  try {
    // Initialize database
    await initializeDatabase(true) // Seed with default accounts
    
    const { 
      fetchAccounts, 
      createAccount, 
      updateAccount, 
      deleteAccount,
      searchAccounts,
      accountsList,
      accountsByType,
      validateAccount
    } = useAccounts()

    // Test 1: Fetch existing accounts
    console.log('\n📋 Test 1: Fetching accounts...')
    await fetchAccounts()
    console.log(`Found ${accountsList.value.length} accounts`)
    
    // Test 2: Create a new account
    console.log('\n➕ Test 2: Creating new account...')
    const newAccount = {
      name: 'Demo Test Account',
      type: 'asset' as const,
      category: 'Current Assets',
      isActive: true
    }
    
    const validation = validateAccount(newAccount)
    console.log('Validation result:', validation)
    
    if (validation.isValid) {
      const accountId = await createAccount(newAccount)
      console.log(`Created account with ID: ${accountId}`)
      
      // Test 3: Update the account
      console.log('\n✏️ Test 3: Updating account...')
      await updateAccount(accountId, { name: 'Updated Demo Account' })
      console.log('Account updated successfully')
      
      // Test 4: Search accounts
      console.log('\n🔍 Test 4: Searching accounts...')
      const searchResults = searchAccounts('Demo')
      console.log(`Found ${searchResults.length} accounts matching "Demo"`)
      
      // Test 5: Group accounts by type
      console.log('\n📊 Test 5: Grouping accounts by type...')
      await fetchAccounts() // Refresh data
      Object.entries(accountsByType.value).forEach(([type, accounts]) => {
        if (accounts.length > 0) {
          console.log(`${type}: ${accounts.length} accounts`)
        }
      })
      
      // Test 6: Delete the demo account
      console.log('\n🗑️ Test 6: Deleting demo account...')
      await deleteAccount(accountId)
      console.log('Demo account deleted successfully')
    }
    
    console.log('\n✅ Account Management Demo completed successfully!')
    
  } catch (error) {
    console.error('❌ Demo failed:', error)
  } finally {
    closeDatabase()
  }
}

// Export for use in other contexts
export default runAccountDemo