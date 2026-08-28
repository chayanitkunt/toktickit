# Zen Green UI Specification & Component Rules

## 1. Design Tokens (Zen Green Palette)
* **Primary Green:** `#006B3C` (App header background, primary actions, main headings)
* **Secondary Green:** `#0B7A46` (Active tabs, focus outlines, clickable text links, hover states)
* **Pale Green:** `#EAF6EF` (Selected list items, success alerts, highlight container backgrounds)
* **Page Background:** `#F5F7F6` (Quiet near-white light gray-green)
* **Surface/Cards:** `#FFFFFF` (White with 1px border `#E0E6E2` and subtle box shadow `0 2px 4px rgba(0,0,0,0.05)`)
* **Text Main:** `#1A2E26` (Dark charcoal-green for high contrast reading)
* **Text Muted:** `#5A6E65` (Secondary info, timestamps)
* **Editable Field Background:** `#FFFFFF` with `#C8D4CE` neutral border
* **Read-only Field Background:** `#EEF2F0` with `#D5DDD9` muted border
* **Error Token:** `#D32F2F` text and border with `#FDE8E8` background callout
* **Warning Token:** `#D97706` amber callout/badge
* **Success Token:** `#16A34A` green notification container

## 2. Global UI Behavior & Component Rules
* **Field Labels:** Positioned above input controls. Bold font weight (500/600).
* **Required Indicator:** Red asterisk (`*`) placed right after the label text.
* **Field Messages:** Validation error messages appear directly below the corresponding field in red text (`#D32F2F`).
* **Buttons:**
  * **Primary:** Background `#006B3C`, text white. Shows spinning indicator and is disabled (`opacity: 0.6`) during API submissions.
  * **Secondary:** Background white, border `#006B3C`, text `#006B3C`.
  * **Destructive:** Background white, border `#D32F2F`, text `#D32F2F`.
* **Badges:**
  * Status `NEW`: Pale blue background (`#E0F2FE`), text `#0369A1`.
  * Priority `HIGH`: Soft red (`#FEE2E2`), text `#B91C1C`.
  * Priority `MEDIUM`: Soft amber (`#FEF3C7`), text `#B45309`.
  * Priority `LOW`: Soft green (`#DCFCE7`), text `#15803D`.

## 3. Core Screen Specifications

### 3.1 Development Requester Selection Screen
* Banner clearly stating: *"Select Development Requester - This is for testing only and is not a login screen."*
* Dropdown containing only active requesters.
* **Continue** button redirects to My Tickets or Create Ticket.

### 3.2 Create Ticket Screen
* Top Section: Read-only generated fields indicator (Ticket Number assigned after submit).
* System Classification Group: Category dropdown & Related System dropdown.
* Priority Group: Radio buttons or selector for Requested Priority (`LOW`, `MEDIUM`, `HIGH`).
* Detail Section:
  * Ticket Summary input (Full width, placeholder text provided).
  * Description textarea (Height 120px, resizable vertically).
* Attachment Dropzone / File Picker:
  * Helper text: *"Allowed: JPG, PNG, WEBP, PDF (Max 5MB each, up to 5 files)"*.
  * Displays preview list of selected files with size and remove button before submission.
* Footer Actions: **Cancel** (Secondary) and **Submit Ticket** (Primary).

### 3.3 My Tickets Screen
* Header Bar: Screen Title, **+ Create Ticket** primary button.
* Filter & Search Panel:
  * Search input: *"Search by ticket number or summary..."*
  * Dropdowns: Category, Requested Priority, Status.
  * **Clear Filters** button.
* Ticket Table (Desktop) / Cards (Mobile):
  * Columns: Ticket No., Created Date, Summary, Category, Priority, Status, Last Updated.
  * Clickable Ticket No. links to Ticket Detail screen.
* Pagination Controls: Rows status (*"Showing 1 to 10 of 42 tickets"*), **Previous**, Page numbers, **Next**.
* States:
  * **Loading:** Skeleton rows or spinner.
  * **Empty State:** *"You haven't submitted any IT support tickets yet."* + Create Ticket button.
  * **No Results State:** *"No tickets match your search filters."* + Clear Filters button.

### 3.4 Requester Ticket Detail Screen
* Read-only view of Ticket attributes formatted in clear grid.
* Attachment Section:
  * Active attachments list with **Download** icon link.
  * Soft-removed attachments list displayed with strikethrough/gray metadata and badge *"Removed: <reason>"* (Download button disabled).
  * **+ Add Attachment** button (if active count < 5).
  * Soft-remove confirmation modal prompting for mandatory removal reason.

## 4. Responsive Viewport Rules
* **Desktop (>= 992px):** Grid container centered max-width 1200px. Table layout for tickets list.
* **Tablet (768px - 991px):** Grid converts to 2 columns. Table retains scroll if needed.
* **Mobile (< 768px):** Form fields stack 100% width. Tables transform into card view. Nav bar converts to mobile burger menu or compact layout. No horizontal scrollbars.