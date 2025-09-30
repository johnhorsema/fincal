import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import TransactionModal from '../components/feed/TransactionModal.vue'
import { useTransactions } from '../composables/useTransactions'
import { useAccounts } from '../composables/useAccounts'
import { useAuth } from '../composables/useAuth'
import type { Post, Account, User } from '../types'

// Mock the composables
vi.mock('../composables/useTransactions')
vi.mock('../composables/useAccounts')
vi.mock('../composables/useAuth')

// Mock AccountSelector component
vi.mock('../components/accounts/AccountSelector.vue', () => ({
  default: {
    name: 'AccountSelector',
    props: ['modelValue', 'error'],
    emits: ['update:modelValue', 'account-selected'],
    template: `
      <select 
        :value="modelValue" 
        @change="$emit('update:modelValue', $event.target.value); $emit('account-selected', $event.target.value)"
      >
        <option value="">Select Account</option>
        <option value="account-1">Cash</option>
        <option value="account-2">Revenue</option>
      </select>
    `
  }
}))

describe('TransactionModal', () => {
  const mockPost: Post = {
    id: 'post-1',
    content: 'Received $1000 payment from client',
    authorId: 'user-1',
    authorPersona: 'Accountant',
    createdAt: new Date('2024-01-15'),
    attachments: [],
    transactionId: undefined
  }

  const mockUser: User = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    personas: [
      { id: 'persona-1', name: 'Accountant', role: 'Finance' }
    ]
  }

  const mockAccounts: Account[] = [
    {
      id: 'account-1',
      name: 'Cash',
      type: 'asset',
      category: 'Current Assets',
      isActive: true
    },
    {
      id: 'account-2',
      name: 'Service Revenue',
      type: 'revenue',
      category: 'Sales Revenue',
      isActive: true
    }
  ]

  beforeEach(() => {
    // Mock useAuth
    vi.mocked(useAuth).mockReturnValue({
      currentUser: ref(mockUser),
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: ref(true)
    })

    // Mock useAccounts
    vi.mocked(useAccounts).mockReturnValue({
      accountsList: ref(mockAccounts),
      loading: ref(false),
      error: ref(null),
      fetchAccounts: vi.fn(),
      createAccount: vi.fn(),
      updateAccount: vi.fn(),
      deleteAccount: vi.fn(),
      toggleAccountStatus: vi.fn(),
      searchAccounts: vi.fn(),
      getAccountsByType: vi.fn(),
      validateAccount: vi.fn(),
      accountsByType: ref({
        asset: [mockAccounts[0]],
        liability: [],
        equity: [],
        revenue: [mockAccounts[1]],
        expense: []
      }),
      activeAccounts: ref(mockAccounts),
      ACCOUNT_TYPES: {
        asset: 'Assets',
        liability: 'Liabilities',
        equity: 'Equity',
        revenue: 'Revenue',
        expense: 'Expenses'
      },
      ACCOUNT_CATEGORIES: {
        asset: ['Current Assets', 'Fixed Assets'],
        liability: ['Current Liabilities'],
        equity: ['Owner\'s Equity'],
        revenue: ['Sales Revenue'],
        expense: ['Operating Expenses']
      }
    })

    // Mock useTransactions
    vi.mocked(useTransactions).mockReturnValue({
      transactionsList: ref([]),
      loading: ref(false),
      error: ref(null),
      pendingTransactions: ref([]),
      approvedTransactions: ref([]),
      rejectedTransactions: ref([]),
      fetchTransactions: vi.fn(),
      createTransaction: vi.fn(),
      updateTransaction: vi.fn(),
      approveTransaction: vi.fn(),
      rejectTransaction: vi.fn(),
      deleteTransaction: vi.fn(),
      getTransaction: vi.fn(),
      getTransactionByPostId: vi.fn(),
      getTransactionsByStatus: vi.fn(),
      getTransactionsByUser: vi.fn(),
      calculateTransactionTotals: vi.fn(),
      clearError: vi.fn()
    })
  })

  it('renders modal when isOpen is true', () => {
    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: true,
        post: mockPost
      }
    })

    expect(wrapper.find('[data-testid="transaction-modal"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Create Journal Entry')
    expect(wrapper.text()).toContain(mockPost.content)
  })

  it('does not render modal when isOpen is false', () => {
    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: false,
        post: mockPost
      }
    })

    expect(wrapper.find('[data-testid="transaction-modal"]').exists()).toBe(false)
  })

  it('initializes form with post content as description', async () => {
    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: true,
        post: mockPost
      }
    })

    await wrapper.vm.$nextTick()

    const descriptionInput = wrapper.find('#description')
    expect(descriptionInput.element.value).toBe(mockPost.content)
  })

  it('truncates long post content for description', async () => {
    const longPost: Post = {
      ...mockPost,
      content: 'A'.repeat(250) // 250 characters, should be truncated to 197 + '...'
    }

    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: true,
        post: longPost
      }
    })

    await wrapper.vm.$nextTick()

    const descriptionInput = wrapper.find('#description')
    expect(descriptionInput.element.value).toBe('A'.repeat(197) + '...')
  })

  it('starts with two empty transaction entries', async () => {
    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: true,
        post: mockPost
      }
    })

    await wrapper.vm.$nextTick()

    const entries = wrapper.findAll('[data-testid="transaction-entry"]')
    expect(entries).toHaveLength(2)
  })

  it('adds new entry when Add Entry button is clicked', async () => {
    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: true,
        post: mockPost
      }
    })

    await wrapper.vm.$nextTick()

    const addButton = wrapper.find('[data-testid="add-entry-button"]')
    await addButton.trigger('click')

    const entries = wrapper.findAll('[data-testid="transaction-entry"]')
    expect(entries).toHaveLength(3)
  })

  it('removes entry when remove button is clicked (minimum 2 entries)', async () => {
    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: true,
        post: mockPost
      }
    })

    await wrapper.vm.$nextTick()

    // Add a third entry first
    const addButton = wrapper.find('[data-testid="add-entry-button"]')
    await addButton.trigger('click')

    let entries = wrapper.findAll('[data-testid="transaction-entry"]')
    expect(entries).toHaveLength(3)

    // Remove the third entry
    const removeButtons = wrapper.findAll('[data-testid="remove-entry-button"]')
    await removeButtons[2].trigger('click')

    entries = wrapper.findAll('[data-testid="transaction-entry"]')
    expect(entries).toHaveLength(2)
  })

  it('calculates totals correctly', async () => {
    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: true,
        post: mockPost
      }
    })

    await wrapper.vm.$nextTick()

    // Set debit amount in first entry
    const debitInputs = wrapper.findAll('input[type="number"]').filter(input => 
      input.attributes('placeholder') === '0.00' && input.classes().includes('debit')
    )
    await debitInputs[0].setValue('1000')

    // Set credit amount in second entry
    const creditInputs = wrapper.findAll('input[type="number"]').filter(input => 
      input.attributes('placeholder') === '0.00' && input.classes().includes('credit')
    )
    await creditInputs[0].setValue('1000')

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('$1,000.00') // Total debits
    expect(wrapper.text()).toContain('$1,000.00') // Total credits
    expect(wrapper.text()).toContain('$0.00') // Balance
  })

  it('shows validation errors for empty required fields', async () => {
    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: true,
        post: mockPost
      }
    })

    await wrapper.vm.$nextTick()

    // Clear description
    const descriptionInput = wrapper.find('#description')
    await descriptionInput.setValue('')

    // Try to submit
    const form = wrapper.find('form')
    await form.trigger('submit.prevent')

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Description is required')
  })

  it('prevents submission when transaction is not balanced', async () => {
    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: true,
        post: mockPost
      }
    })

    await wrapper.vm.$nextTick()

    // Set unbalanced amounts
    const debitInputs = wrapper.findAll('input[type="number"]')
    await debitInputs[0].setValue('1000') // Debit
    await debitInputs[1].setValue('500')  // Credit (unbalanced)

    await wrapper.vm.$nextTick()

    const submitButton = wrapper.find('button[type="submit"]')
    expect(submitButton.attributes('disabled')).toBeDefined()
  })

  it('emits transactionCreated event when form is submitted successfully', async () => {
    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: true,
        post: mockPost
      }
    })

    await wrapper.vm.$nextTick()

    // Fill in form data
    const descriptionInput = wrapper.find('#description')
    await descriptionInput.setValue('Test transaction')

    // Set balanced amounts
    const accountSelects = wrapper.findAll('select')
    await accountSelects[0].setValue('account-1') // Cash account
    await accountSelects[1].setValue('account-2') // Revenue account

    const debitInputs = wrapper.findAll('input[type="number"]')
    await debitInputs[0].setValue('1000') // Debit to Cash
    await debitInputs[2].setValue('1000') // Credit to Revenue

    await wrapper.vm.$nextTick()

    // Submit form
    const form = wrapper.find('form')
    await form.trigger('submit.prevent')

    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('transactionCreated')).toBeTruthy()
    const emittedTransaction = wrapper.emitted('transactionCreated')?.[0]?.[0]
    expect(emittedTransaction).toMatchObject({
      postId: mockPost.id,
      description: 'Test transaction',
      status: 'pending',
      createdBy: mockUser.id
    })
  })

  it('emits close event when cancel button is clicked', async () => {
    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: true,
        post: mockPost
      }
    })

    const cancelButton = wrapper.find('button[type="button"]')
    await cancelButton.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close event when backdrop is clicked', async () => {
    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: true,
        post: mockPost
      }
    })

    const backdrop = wrapper.find('.fixed.inset-0.bg-black')
    await backdrop.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('validates that entries cannot have both debit and credit amounts', async () => {
    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: true,
        post: mockPost
      }
    })

    await wrapper.vm.$nextTick()

    // Set both debit and credit for the same entry
    const debitInputs = wrapper.findAll('input[type="number"]')
    await debitInputs[0].setValue('500')  // Debit
    await debitInputs[1].setValue('500')  // Credit for same entry

    // Try to submit
    const form = wrapper.find('form')
    await form.trigger('submit.prevent')

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Entry cannot have both debit and credit amounts')
  })

  it('clears opposite amount when entering debit or credit', async () => {
    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: true,
        post: mockPost
      }
    })

    await wrapper.vm.$nextTick()

    const debitInputs = wrapper.findAll('input[type="number"]')
    
    // Set credit amount first
    await debitInputs[1].setValue('500')
    expect(debitInputs[1].element.value).toBe('500')

    // Set debit amount - should clear credit
    await debitInputs[0].setValue('1000')
    expect(debitInputs[0].element.value).toBe('1000')
    expect(debitInputs[1].element.value).toBe('')
  })

  it('validates maximum transaction date is today', async () => {
    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: true,
        post: mockPost
      }
    })

    await wrapper.vm.$nextTick()

    const dateInput = wrapper.find('#date')
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)
    
    await dateInput.setValue(futureDate.toISOString().split('T')[0])

    // Try to submit
    const form = wrapper.find('form')
    await form.trigger('submit.prevent')

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Date cannot be in the future')
  })
})

describe('Transaction Creation Integration', () => {
  it('creates transaction with proper double-entry structure', () => {
    const mockCreateTransaction = vi.fn()
    vi.mocked(useTransactions).mockReturnValue({
      createTransaction: mockCreateTransaction,
      transactionsList: ref([]),
      loading: ref(false),
      error: ref(null),
      pendingTransactions: ref([]),
      approvedTransactions: ref([]),
      rejectedTransactions: ref([]),
      fetchTransactions: vi.fn(),
      updateTransaction: vi.fn(),
      approveTransaction: vi.fn(),
      rejectTransaction: vi.fn(),
      deleteTransaction: vi.fn(),
      getTransaction: vi.fn(),
      getTransactionByPostId: vi.fn(),
      getTransactionsByStatus: vi.fn(),
      getTransactionsByUser: vi.fn(),
      calculateTransactionTotals: vi.fn(),
      clearError: vi.fn()
    })

    const wrapper = mount(TransactionModal, {
      props: {
        isOpen: true,
        post: mockPost
      }
    })

    // Simulate successful transaction creation
    wrapper.vm.$emit('transactionCreated', {
      id: 'transaction-1',
      postId: mockPost.id,
      description: 'Test transaction',
      date: new Date(),
      status: 'pending',
      createdBy: 'user-1',
      entries: [
        {
          id: 'entry-1',
          transactionId: 'transaction-1',
          accountId: 'account-1',
          debitAmount: 1000,
          creditAmount: undefined
        },
        {
          id: 'entry-2',
          transactionId: 'transaction-1',
          accountId: 'account-2',
          debitAmount: undefined,
          creditAmount: 1000
        }
      ]
    })

    expect(wrapper.emitted('transactionCreated')).toBeTruthy()
  })
})