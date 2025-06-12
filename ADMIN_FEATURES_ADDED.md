# Admin Features Added

This document outlines the new admin and user management features that have been implemented.

## 🔧 Admin Features (Admin Dashboard)

### 1. Remove License from User
- **Functionality**: Revoke an active license from a user, changing their status from 'active' to 'disabled'
- **Location**: Admin page (`/admin`) - "Revoke License" button for active users
- **API Endpoint**: `PATCH /api/admin/users/:userId/deactivate`
- **Permissions**: Admin only, within same company

### 2. Change User Password
- **Functionality**: Allow admins to reset/change any user's password in their company
- **Location**: Admin page (`/admin`) - "Change Password" button for non-admin users
- **API Endpoint**: `PATCH /api/admin/users/:userId/password`
- **Permissions**: Admin only, within same company, cannot change admin passwords
- **Implementation**: Prompts admin for new password (minimum 6 characters)

### 3. Delete User
- **Functionality**: Permanently delete a user from the company
- **Location**: Admin page (`/admin`) - "Delete" button for non-admin users
- **API Endpoint**: `DELETE /api/admin/users/:userId`
- **Permissions**: Admin only, within same company, cannot delete admin users
- **Safety**: Includes confirmation dialog before deletion

## 👤 User Self-Service Features

### 4. User Password Reset
- **Functionality**: Allow users to change their own password
- **Location**: Accessible via user menu in header -> "Change Password"
- **Route**: `/change-password`
- **API Endpoint**: `PATCH /api/auth/change-password`
- **Requirements**: 
  - Must provide current password
  - New password must be at least 6 characters
  - Confirm new password (frontend validation)

## 🛠 Technical Implementation

### Backend Changes

#### New Controller Functions
- `changeUserPassword()` in `adminController.ts`
- `deleteUser()` in `adminController.ts`
- `changePassword()` in `authController.ts`

#### New API Routes
- `PATCH /api/admin/users/:userId/password` - Admin changes user password
- `DELETE /api/admin/users/:userId` - Admin deletes user
- `PATCH /api/auth/change-password` - User changes own password

### Frontend Changes

#### New Components
- `ChangePassword.tsx` - Full page component for user password change

#### Updated Components
- `Admin.tsx` - Added new admin action buttons and functions
- `Header.tsx` - Added "Change Password" link in user menu
- `App.tsx` - Added route for change password page

#### UI Improvements
- Redesigned admin actions section with smaller, organized buttons
- Color-coded buttons for different actions (assign/revoke/change/delete)
- Better responsive design for admin table actions
- Success/error handling for all operations

## 🔒 Security Features

- **Authentication**: All endpoints require valid JWT token
- **Authorization**: Admin endpoints require admin role
- **Company Isolation**: Admins can only manage users in their own company
- **Admin Protection**: Admins cannot delete other admins or change admin passwords via admin interface
- **Password Hashing**: All passwords are hashed with bcrypt (12 salt rounds)
- **Input Validation**: Minimum password length (6 characters) enforced on both frontend and backend

## 🚀 Usage Instructions

### For Admins:
1. Navigate to `/admin` page
2. View all company users in the table
3. Use action buttons to:
   - **Assign License**: For pending users (if licenses available)
   - **Revoke License**: For active users
   - **Change Password**: For non-admin users
   - **Delete**: For non-admin users (with confirmation)

### For Users:
1. Click user menu (avatar) in header
2. Select "Change Password"
3. Enter current password and new password
4. Confirm new password and submit

## 📋 Status Overview

All requested features have been implemented:
- ✅ Remove license from user (admin)
- ✅ Change user password (admin)
- ✅ Delete user (admin)
- ✅ User password reset (self-service)

The implementation follows security best practices and maintains the existing application architecture and design patterns. 