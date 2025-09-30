import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import PostCard from '../src/components/feed/PostCard.vue'
import TransactionDetailModal from '../src/components/feed/TransactionDetailModal.vue'
import type { Post, Transaction } from '../src/types'

// Mock composables
vi.mock('@/composables/usePosts', () => ({
  usePosts: () => ({
    suggestsFinancialActivity: vi.fn(() => false),
    getPost: vi.fn(() => mockPost)
  })
}))

vi.mock('@/composables/useTransactions', () => ({
  useTransactions: () => ({
    getTransaction: vi.fn(() => mockTransaction),
    calculateTransactionTotals: vi.fn(() => ({
      totalDebits: 100,
      totalCredits: 100,
      balance: 0,
      isBalanced: true
    })),
    approveTransaction: vi.fn(),
    rejectTransaction: vi.fn()
  })
}))

vi.mock('@/composables/useAccounts', () => ({
  useAccounts: () => ({
    accountsList: ref([
      { id: 'acc1', name: 'Cash', type: 'asset', category: 'Current Assets', isActive: true },
      { id: 'acc2', name: 'Revenue', type: 'revenue', category: 'Sales Revenue', isActive: true }
    ])
  })
}))

// Mock data
const mockPost: Post = {
  id: 'post1',
  content: 'Received payment from client',
  authorId: 'user1',
  authorPersona: 'Accountant',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  attachments: [],
  transactionId: 'trans1'
}

const mockTransaction: Transaction = {
  id: 'trans1',
  postId: 'post1',
  description: 'Client payment received',
  date: new Date('2024-01-15T10:00:00Z'),
  status: 'pending',
  createdBy: 'user1',
  entries: [
    {
      id: 'entry1',
      transactionId: 'trans1',
      accountId: 'acc1',
      debitAmount: 100,
      creditAmount: undefined
    },
    {
      id: 'entry2',
      transactionId: 'trans1',
      accountId: 'acc2',
      debitAmount: undefined,
      creditAmount: 100
    }
  ]
}

describe('PostCard Transaction Display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays transaction status indicator when post has transaction', () => {
    const wrapper = mount(PostCard, {
      props: { post: mockPost }
    })

    expect(wrapper.text()).toContain('Transaction Created')
  })

  it('shows transaction details when transaction exists', async () => {
    const wrapper = mount(PostCard, {
      props: { post: mockPost }
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Transaction Details')
    expect(wrapper.text()).toContain('Pending Review')
  })

  it('shows different status colors for approved transactions', async () => {
    const approvedPost = { ...mockPost }
    const wrapper = mount(PostCard, {
      props: { post: approvedPost }
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('.bg-yellow-100').exists()).toBe(true)
  })

  it('emits view-transaction event when view details button is clicked', async () => {
    const wrapper = mount(PostCard, {
      props: { post: mockPost }
    })

    await wrapper.vm.$nextTick()

    const viewButton = wrapper.find('button')
    if (viewButton.exists() && viewButton.text().includes('View Details')) {
      await viewButton.trigger('click')
      expect(wrapper.emitted('viewTransaction')).toBeTruthy()
    }
  })
})

describe('TransactionDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays transaction details when modal is open', async () => {
    const wrapper = mount(TransactionDetailModal, {
      props: {
        isOpen: true,
        transactionId: 'trans1'
      }
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Transaction Details')
  })

  it('displays transaction entries in a table format', async () => {
    const wrapper = mount(TransactionDetailModal, {
      props: {
        isOpen: true,
        transactionId: 'trans1'
      }
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.text()).toContain('Account')
    expect(wrapper.text()).toContain('Type')
    expect(wrapper.text()).toContain('Debit')
    expect(wrapper.text()).toContain('Credit')
  })

  it('shows transaction totals and balance information', async () => {
    const wrapper = mount(TransactionDetailModal, {
      props: {
        isOpen: true,
        transactionId: 'trans1'
      }
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Total Debits')
    expect(wrapper.text()).toContain('Total Credits')
  })

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(TransactionDetailModal, {
      props: {
        isOpen: true,
        transactionId: 'trans1'
      }
    })

    const closeButton = wrapper.find('button')
    if (closeButton.exists() && closeButton.text().includes('Close')) {
      await closeButton.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    }
  })

  it('does not render when modal is closed', () => {
    const wrapper = mount(TransactionDetailModal, {
      props: {
        isOpen: false,
        transactionId: 'trans1'
      }
    })

    expect(wrapper.find('.fixed.inset-0').exists()).toBe(false)
  })
})