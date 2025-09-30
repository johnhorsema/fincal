# Requirements Document

## Introduction

This feature simplifies the existing social accounting feed interface to match a cleaner, more streamlined design. The goal is to reduce visual complexity while maintaining all core functionality, focusing on a more intuitive user experience with better visual hierarchy and simplified interactions.

## Requirements

### Requirement 1

**User Story:** As a user, I want a simplified post composer interface, so that I can quickly create posts without visual clutter.

#### Acceptance Criteria

1. WHEN viewing the post composer THEN the system SHALL display a clean text input with minimal styling
2. WHEN selecting a persona THEN the system SHALL show persona options with avatar and role in a simple dropdown
3. WHEN typing a post THEN the system SHALL show placeholder text like "E.g. 'Paid meal from credit card for 2k'"
4. WHEN ready to post THEN the system SHALL provide a single "Post" button with clear styling
5. IF creating a journal entry THEN the system SHALL show a "+ Create Journal" button alongside the post button

### Requirement 2

**User Story:** As a user, I want a cleaner feed display, so that I can focus on the content without visual distractions.

#### Acceptance Criteria

1. WHEN viewing the feed THEN the system SHALL display posts in clean white cards with subtle shadows
2. WHEN viewing a post THEN the system SHALL show author avatar, name, persona, and timestamp in a single line
3. WHEN viewing post content THEN the system SHALL use clear typography with proper spacing
4. WHEN viewing interaction buttons THEN the system SHALL show minimal icons for comments, shares, and likes
5. IF a post has transaction details THEN the system SHALL display them inline within the same card

### Requirement 3

**User Story:** As a user, I want simplified transaction details display, so that I can quickly understand the accounting information.

#### Acceptance Criteria

1. WHEN viewing transaction details THEN the system SHALL show them in a clean expandable section
2. WHEN viewing account entries THEN the system SHALL display them in a simple table format
3. WHEN viewing amounts THEN the system SHALL show currency with proper formatting (e.g., "USD 200,000,000.00")
4. WHEN viewing transaction status THEN the system SHALL show approval status with clear visual indicators
5. IF editing is allowed THEN the system SHALL provide an "Edit Transaction" button with approval status

### Requirement 4

**User Story:** As a user, I want consistent spacing and typography, so that the interface feels cohesive and professional.

#### Acceptance Criteria

1. WHEN viewing any component THEN the system SHALL use consistent padding and margins
2. WHEN viewing text THEN the system SHALL use a clear font hierarchy with appropriate sizes
3. WHEN viewing cards THEN the system SHALL use consistent border radius and shadow styles
4. WHEN viewing buttons THEN the system SHALL use consistent styling with proper hover states
5. IF viewing on mobile THEN the system SHALL maintain proper spacing and readability

### Requirement 5

**User Story:** As a user, I want reduced visual noise, so that I can focus on the important information.

#### Acceptance Criteria

1. WHEN viewing the interface THEN the system SHALL use minimal colors with a clean palette
2. WHEN viewing borders THEN the system SHALL use subtle gray borders instead of heavy lines
3. WHEN viewing backgrounds THEN the system SHALL use white/light gray backgrounds for clarity
4. WHEN viewing icons THEN the system SHALL use simple, consistent icon styles
5. IF showing status indicators THEN the system SHALL use subtle but clear visual cues

### Requirement 6

**User Story:** As a user, I want improved information hierarchy, so that I can quickly scan and understand the content.

#### Acceptance Criteria

1. WHEN viewing posts THEN the system SHALL clearly separate post content from transaction details
2. WHEN viewing transaction details THEN the system SHALL group related information logically
3. WHEN viewing amounts THEN the system SHALL align numbers properly for easy comparison
4. WHEN viewing dates THEN the system SHALL format them consistently and clearly
5. IF viewing multiple transactions THEN the system SHALL maintain consistent layout patterns