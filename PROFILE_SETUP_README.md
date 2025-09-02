# Profile Setup Screen

## Overview

The Profile Setup Screen (`app/(onboarding)/profile-setup.tsx`) is a new onboarding screen that allows users to personalize their profile right after signup.

## Features

### Profile Picture Upload

- Uses Expo ImagePicker to select photos from the device gallery
- Uploads images to Supabase Storage bucket "images" under "profile_images/" directory
- Supports image editing with 1:1 aspect ratio
- Shows loading state during upload
- Displays uploaded image in a circular frame with theme-colored border

### Form Fields

- **Full Name**: Required field, pre-filled if provided during signup
- **Phone Number**: Optional field with numeric keyboard
- Real-time validation with error messages
- Form validation ensures full name is at least 2 characters

### Navigation Flow

- **Save & Continue**: Validates form, saves to profiles table, shows success toast, navigates to Dashboard
- **Skip for now**: Direct navigation to Dashboard without saving
- **Error handling**: Redirects to login if user not authenticated

## Integration Points

### Updated Navigation Flow

1. **Signup Success**: Now redirects to `/(onboarding)/post-signup-setup` first (for account setup)
2. **Post-Signup Setup**: After creating/renaming accounts or skipping, goes to `/(onboarding)/profile-setup`
3. **Profile Setup**: Success redirects to `/(main)/Dashboard`

### Database Operations

- Uses existing `createProfile` and `updateProfile` functions from `~/lib/services/profiles`
- Checks for existing profile before creating/updating
- Handles both new user profiles and profile updates

### Storage

- Images uploaded to Supabase Storage bucket "images"
- File path: `profile_images/profile_{userId}_{timestamp}.jpg`
- Returns public URL for profile display

## UI/UX Features

### Theme Support

- Respects light/dark theme colors from `useTheme()`
- Uses theme colors for borders, backgrounds, text, and buttons
- Consistent with existing app design patterns

### Localization

- Supports English and Somali languages via `useLanguage()`
- All text strings are localized
- Error messages and validation text are translated

### Accessibility

- Proper keyboard types for different input fields
- Loading states and disabled states during operations
- Clear error messages and success feedback

## Error Handling

### Authentication Errors

- Redirects to login if user not authenticated
- Shows appropriate error messages

### Upload Errors

- Handles image picker permission errors
- Shows toast for upload failures
- Continues to allow user interaction

### Validation Errors

- Real-time form validation
- Clear error messages for each field
- Prevents form submission with invalid data

## Technical Implementation

### Dependencies Used

- `expo-image-picker`: Image selection and camera access
- `base64-arraybuffer`: Image data conversion for upload
- `react-native-toast-message`: User feedback
- `expo-router`: Navigation
- `@supabase/supabase-js`: Database and storage operations

### Key Functions

- `loadCurrentUser()`: Fetches current user and existing profile
- `uploadImage()`: Handles image upload to Supabase Storage
- `pickImage()`: Manages image picker permissions and selection
- `handleSave()`: Validates and saves profile data
- `validateForm()`: Form validation logic

### State Management

- `formData`: Form field values
- `errors`: Validation error messages
- `loading`: Save operation loading state
- `uploadingImage`: Image upload loading state
- `currentUser`: Current authenticated user

## Testing Considerations

### User Flows

1. New user signup → Post-signup setup (accounts) → Profile setup → Dashboard
2. Existing user with profile → Profile setup (pre-filled) → Dashboard
3. Skip profile setup → Dashboard
4. Image upload success/failure scenarios
5. Form validation error scenarios

### Edge Cases

- No internet connection during upload
- Invalid image formats
- Storage quota exceeded
- User logs out during setup
- Profile already exists for user

## Future Enhancements

- Camera capture option in addition to gallery
- Image cropping functionality
- Profile picture removal option
- Additional profile fields (bio, location, etc.)
- Profile completion percentage indicator
