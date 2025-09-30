# Design Document

## Overview

This design focuses on simplifying the existing social accounting feed interface by reducing visual complexity, improving information hierarchy, and creating a cleaner, more focused user experience. The design maintains all existing functionality while presenting it in a more intuitive and visually appealing way.

The key design principles are:
- **Simplicity**: Remove unnecessary visual elements and focus on content
- **Clarity**: Improve readability and information hierarchy
- **Consistency**: Use consistent spacing, typography, and styling patterns
- **Focus**: Direct user attention to the most important information

## Architecture

### Component Simplification Strategy
The existing components will be refactored to use:
- **Cleaner layouts**: Reduced padding, better spacing, simplified card designs
- **Improved typography**: Clear font hierarchy, better contrast, consistent sizing
- **Minimal styling**: Subtle borders, clean backgrounds, reduced visual noise
- **Better information architecture**: Logical grouping, clear separation of concerns

### Design System Updates
- **Color Palette**: Simplified to whites, light grays, and minimal accent colors
- **Typography Scale**: Consistent font sizes and weights across components
- **Spacing System**: Standardized padding and margin values
- **Component Patterns**: Reusable design patterns for cards, buttons, and forms

## Components and Interfaces

### PostComposer Simplification

**Current Issues:**
- Too much visual complexity in the composer area
- Unclear persona selection interface
- Inconsistent button styling

**Design Solution:**
```typescript
interface SimplifiedPostComposer {
  // Clean text input with minimal styling
  textInput: {
    placeholder: "E.g. 'Paid meal from credit card for 2k'"
    borderStyle: "subtle gray border"
    padding: "consistent with design system"
  }
  
  // Simplified persona selector
  personaSelector: {
    display: "avatar + name + role in clean dropdown"
    styling: "minimal border, clean typography"
  }
  
  // Action buttons
  actions: {
    postButton: "primary button with consistent styling"
    createJournalButton: "secondary button with + icon"
  }
}
```

### FeedContainer Simplification

**Current Issues:**
- Inconsistent card styling
- Poor visual hierarchy
- Cluttered information display

**Design Solution:**
```typescript
interface SimplifiedFeedContainer {
  // Clean card layout
  cardStyling: {
    background: "white"
    border: "1px solid light gray"
    borderRadius: "8px"
    shadow: "subtle drop shadow"
    padding: "consistent spacing"
  }
  
  // Improved header layout
  postHeader: {
    layout: "avatar + name + persona + timestamp in single line"
    typography: "clear hierarchy with proper font weights"
    spacing: "consistent margins"
  }
}
```

### PostCard Simplification

**Current Issues:**
- Transaction details are visually separated from posts
- Inconsistent interaction button styling
- Poor information hierarchy

**Design Solution:**
```typescript
interface SimplifiedPostCard {
  // Integrated transaction display
  transactionDetails: {
    placement: "inline within the same card"
    styling: "subtle background to differentiate from post content"
    expandable: "clean expand/collapse interaction"
  }
  
  // Simplified interaction buttons
  interactions: {
    buttons: ["comment", "share", "like"]
    styling: "minimal icons with consistent spacing"
    alignment: "left-aligned with proper spacing"
  }
  
  // Clean amount display
  amountDisplay: {
    format: "USD 200,000,000.00 BA"
    alignment: "right-aligned for easy scanning"
    typography: "monospace for number alignment"
  }
}
```

### TransactionDetailModal Simplification

**Current Issues:**
- Complex modal layout
- Inconsistent table styling
- Unclear approval status display

**Design Solution:**
```typescript
interface SimplifiedTransactionDetails {
  // Clean table layout
  accountTable: {
    headers: ["Account", "Debit", "Credit"]
    styling: "minimal borders, consistent padding"
    alignment: "left for accounts, right for amounts"
  }
  
  // Clear status indicators
  approvalStatus: {
    display: "clear visual indicator (Approved/Pending)"
    styling: "subtle background color or icon"
  }
  
  // Simplified edit controls
  editControls: {
    editButton: "consistent with other action buttons"
    personaSelector: "clean dropdown matching composer"
  }
}
```

## Data Models

The existing data models remain unchanged, but the presentation layer will be simplified:

```typescript
// Enhanced display formatting
interface DisplayFormatting {
  currency: {
    format: (amount: number) => string // "USD 200,000,000.00"
    alignment: "right"
    fontFamily: "monospace"
  }
  
  dates: {
    format: (date: Date) => string // "Sep 30"
    placement: "consistent across all components"
  }
  
  personas: {
    display: "Name (Role)" // "Jenny (Marketing)"
    avatarSize: "consistent 32px"
  }
}
```

## Styling Architecture

### Tailwind CSS Utility Classes

**Card Components:**
```css
.simplified-card {
  @apply bg-white border border-gray-200 rounded-lg shadow-sm p-6;
}

.simplified-card-header {
  @apply flex items-center space-x-3 mb-4;
}

.simplified-card-content {
  @apply text-gray-900 leading-relaxed;
}
```

**Typography System:**
```css
.text-primary {
  @apply text-gray-900 font-medium;
}

.text-secondary {
  @apply text-gray-600 text-sm;
}

.text-amount {
  @apply font-mono text-right text-gray-900;
}
```

**Button System:**
```css
.btn-primary {
  @apply bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors;
}

.btn-secondary {
  @apply bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors;
}
```

### Component-Specific Styling

**PostComposer:**
- Clean white background with subtle border
- Consistent padding and spacing
- Minimal visual elements, focus on functionality

**FeedContainer:**
- Consistent card spacing with proper margins
- Clean separation between posts
- Subtle visual hierarchy

**TransactionDetails:**
- Inline display within post cards
- Clean table formatting with proper alignment
- Subtle background to differentiate from post content

## Error Handling

### Visual Error States
- **Form Validation**: Clean inline error messages with consistent styling
- **Loading States**: Subtle loading indicators that don't disrupt the clean design
- **Empty States**: Clean, helpful empty state messages with consistent typography

### Error Message Design
```typescript
interface ErrorDisplay {
  styling: "subtle red border and text"
  placement: "inline with form fields"
  typography: "consistent with design system"
  iconUsage: "minimal, only when necessary"
}
```

## Testing Strategy

### Visual Regression Testing
- Screenshot comparisons for component simplification
- Cross-browser consistency testing
- Mobile responsiveness validation

### Usability Testing
- User flow testing with simplified interface
- Information hierarchy validation
- Accessibility compliance testing

### Component Testing
- Simplified component rendering tests
- Interaction testing with new layouts
- Responsive design testing

## Implementation Approach

### Phase 1: Core Component Simplification
1. Update PostComposer with cleaner styling
2. Simplify FeedContainer card layout
3. Integrate transaction details into PostCard

### Phase 2: Typography and Spacing
1. Implement consistent typography system
2. Apply standardized spacing throughout
3. Update color palette to simplified scheme

### Phase 3: Polish and Refinement
1. Add subtle animations and transitions
2. Optimize for mobile responsiveness
3. Final accessibility and usability improvements

The implementation will focus on maintaining all existing functionality while presenting it through a cleaner, more intuitive interface that matches the provided screenshot design.