# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal

Deliver a professional and responsive Requester-facing IT support ticketing application for TokTickIT. The sprint provides a temporary Development Requester selection mechanism for testing requester-specific behavior and enables the selected Requester to create tickets, upload permitted supporting attachments, receive a backend-generated unique Ticket Number, browse and manage their own tickets through search, filtering, sorting, and pagination, view Ticket Details, and manage permitted attachments. The implementation establishes reusable Zen Green UI conventions and a foundation that can later be extended with real authentication and role-based authorization in Lab 3.


## 2. Stakeholder Request Interpretation

TokTickIT needs a Requester-facing application that allows end users to submit and manage their own IT support requests. Because real authentication is outside the scope of Lab 2, the application uses a Development Requester Selection screen to simulate the current user during testing. The selected Requester determines which tickets can be created, listed, viewed, and used for attachment management.

The system must persist ticket and attachment data in PostgreSQL through the backend and must generate the official Ticket Number on the server. Requesters must be able to locate their own tickets using search, filters, sorting, and pagination, while the backend must prevent one selected Requester from retrieving or managing another Requester's ticket or attachment. The application must provide clear validation, loading, empty, success, and failure states and use a consistent responsive Zen Green design that can be reused in later labs.

## 3. Scope

### Included

* Development Requester Selection for Lab 2 testing.
* Loading and displaying active Development Requesters.
* Changing the current Development Requester and reloading requester-specific data.
* Creating a new IT support Ticket.
* Backend-generated unique Ticket Numbers.
* Backend-generated Ticket Date and initial Current Status.
* Category and Related System reference data.
* Requested Priority selection.
* Ticket Summary and Description validation.
* Attachment validation and upload.
* A maximum of five active attachments per Ticket.
* My Tickets list for the currently selected Requester.
* Search, filtering, sorting, and pagination.
* Requester-owned Ticket Detail retrieval.
* Attachment metadata retrieval and display.
* Downloading active attachments.
* Adding permitted attachments to an existing owned Ticket.
* Soft removal of owned attachments with a recorded removal reason.
* Backend ownership checks for Tickets and Attachments.
* Loading, validation, empty, no-results, success, and failure states.
* Responsive desktop, tablet, and mobile layouts.
* Reusable Zen Green UI components and conventions.
* Automated unit, API, UI, responsive, visual, and end-to-end testing.

### Excluded

* Real authentication, login, logout, passwords, password hashing, sessions, tokens, and authenticated identities.
* Role-based authorization.
* IT Staff dashboards, queues, ticket claiming, reassignment, or IT Priority changes.
* Public Comments, Internal Notes, and Actions Taken.
* Ticket lifecycle changes after the initial `NEW` status.
* Resolving, closing, reopening, or cancelling Tickets.
* Administrator management of users, Requesters, roles, Categories, or Related Systems.
* Any Lab 3 authentication or authorization functionality.

## 4. Functional Requirements

## 5. Business Rules

## 6. UI Specification Summary

## 7. Data Changes

## 8. API Contract

## 9. Acceptance Criteria

## 10. Definition of Done

## 11. Assumptions and Decisions