# Family Gallery - Test Cases Documentation

**Status**: Living Document  
**Last Updated**: December 2024  
**Purpose**: Comprehensive test scenarios for all implemented features

## Overview

This document outlines test cases for all features currently implemented in the Family Gallery application. These test cases can be used for manual testing and as a basis for automated Puppeteer tests to ensure no regressions occur as development continues.

## Current Implementation Status

- ✅ Authentication & Authorization (Clerk + Email-based admin)
- ✅ Admin Upload Interface (Drag & drop with progress)
- ✅ EXIF Metadata Extraction (Client-side processing)
- ✅ Duplicate Detection (Hash-based, cross-year searching)
- ✅ JSON Database Storage (R2-based with atomic operations)
- ✅ Video Support & Thumbnails (Stage 2.3 completed)
- ✅ File Processing Pipeline (Metadata, thumbnails, database updates)

---

## 1. Authentication & Authorization Tests

### AUTH-001: User Sign-in/Sign-up Flow
**Priority**: Critical

| Test ID | Scenario | Steps | Expected Result | Status |
|---------|----------|-------|-----------------|--------|
| AUTH-001-01 | Anonymous user visits protected page | 1. Navigate to `/admin/upload` without auth | Redirected to sign-in page | ✅ |
| AUTH-001-02 | Google OAuth sign-in | 1. Click "Sign in with Google"<br>2. Complete OAuth flow | User authenticated, redirected to gallery | ✅ |
| AUTH-001-03 | Facebook OAuth sign-in | 1. Click "Sign in with Facebook"<br>2. Complete OAuth flow | User authenticated, redirected to gallery | ✅ |
| AUTH-001-04 | Sign out functionality | 1. Click user menu<br>2. Click "Sign Out" | Session cleared, redirected to home | ✅ |

### AUTH-002: Admin Access Control
**Priority**: Critical

| Test ID | Scenario | Steps | Expected Result | Status |
|---------|----------|-------|-----------------|--------|
| AUTH-002-01 | Admin user accesses upload | 1. Sign in as admin email<br>2. Navigate to `/admin/upload` | Upload interface displayed | ✅ |
| AUTH-002-02 | Non-admin user blocked | 1. Sign in as non-admin<br>2. Try to access `/admin/upload` | "Access Denied" message shown | ✅ |
| AUTH-002-03 | Server-side admin validation | 1. Make API call to `/api/media` as non-admin | HTTP 403 Forbidden response | ✅ |
| AUTH-002-04 | Admin email configuration | 1. Set `ADMIN_EMAILS` env var<br>2. Sign in with admin email | Admin access granted | ✅ |

---

## 2. File Upload System Tests

### UPLOAD-001: File Selection & Validation
**Priority**: High

| Test ID | Scenario | Steps | Expected Result | Status |
|---------|----------|-------|-----------------|--------|
| UPLOAD-001-01 | Valid image upload | 1. Drag JPG file to upload zone | File added to queue with preview | ✅ |
| UPLOAD-001-02 | Valid video upload | 1. Drag MP4 file to upload zone | File added to queue with video icon | ✅ |
| UPLOAD-001-03 | Invalid file type rejected | 1. Drag PDF file to upload zone | File rejected with error message | ✅ |
| UPLOAD-001-04 | Large file rejected | 1. Drag 60MB file to upload zone | File rejected with size limit error | ✅ |
| UPLOAD-001-05 | Multiple files selection | 1. Drag 5 image files at once | All files added to queue | ✅ |
| UPLOAD-001-06 | File picker alternative | 1. Click "Browse Files" button<br>2. Select files | Selected files added to queue | ✅ |

### UPLOAD-002: EXIF Data Processing
**Priority**: High

| Test ID | Scenario | Steps | Expected Result | Status |
|---------|----------|-------|-----------------|--------|
| UPLOAD-002-01 | Photo with EXIF date | 1. Upload photo with DateTimeOriginal | EXIF date extracted and displayed | ✅ |
| UPLOAD-002-02 | Photo with GPS data | 1. Upload geotagged photo | GPS coordinates extracted | ✅ |
| UPLOAD-002-03 | Photo with camera info | 1. Upload photo with camera metadata | Make/model displayed in queue | ✅ |
| UPLOAD-002-04 | Photo without EXIF | 1. Upload processed/edited photo | Falls back to file modification date | ✅ |
| UPLOAD-002-05 | Screenshot detection | 1. Upload file named "Screenshot_..." | Marked as screenshot in metadata | ✅ |
| UPLOAD-002-06 | Edited photo detection | 1. Upload file with editing software EXIF | Marked as edited in metadata | ✅ |

### UPLOAD-003: Upload Progress & Completion
**Priority**: High

| Test ID | Scenario | Steps | Expected Result | Status |
|---------|----------|-------|-----------------|--------|
| UPLOAD-003-01 | Single file upload flow | 1. Add file to queue<br>2. Click "Start Upload" | Progress bar shows, file uploads successfully | ✅ |
| UPLOAD-003-02 | Multiple files sequential | 1. Add 3 files<br>2. Start upload | Files upload one by one with progress | ✅ |
| UPLOAD-003-03 | Upload progress accuracy | 1. Upload large file<br>2. Observe progress | Progress bar accurately reflects upload % | ✅ |
| UPLOAD-003-04 | Upload completion feedback | 1. Complete file upload | Success toast and green checkmark shown | ✅ |
| UPLOAD-003-05 | Queue management | 1. Remove file from queue<br>2. Retry failed upload | Queue updates correctly | ✅ |

---

## 3. Duplicate Detection Tests

### DUP-001: Hash-Based Detection
**Priority**: Critical  
**⚠️ Recently Fixed**: Now uses photo date instead of upload date

| Test ID | Scenario | Steps | Expected Result | Status |
|---------|----------|-------|-----------------|--------|
| DUP-001-01 | Exact duplicate detection | 1. Upload photo<br>2. Upload same photo again | Second upload shows duplicate warning | 🔄 Fixed |
| DUP-001-02 | Same file, different name | 1. Upload photo.jpg<br>2. Upload photo_copy.jpg (same content) | Detected as duplicate by hash | 🔄 Fixed |
| DUP-001-03 | Different photos not flagged | 1. Upload photo1.jpg<br>2. Upload photo2.jpg (different) | Not flagged as duplicate | ✅ |
| DUP-001-04 | Force upload duplicate | 1. Get duplicate warning<br>2. Choose "Upload anyway" | Duplicate uploaded with warning override | ✅ |

### DUP-002: Cross-Year Detection  
**Priority**: High  
**⚠️ Recently Fixed**: Now checks correct year based on photo date

| Test ID | Scenario | Steps | Expected Result | Status |
|---------|----------|-------|-----------------|--------|
| DUP-002-01 | Photo from 2007 duplicate | 1. Upload 2007 photo<br>2. Upload same photo again | Duplicate detected in 2007 database | 🔄 Fixed |
| DUP-002-02 | Adjacent year search | 1. Upload 2023 photo<br>2. Check for duplicates | Searches 2022, 2023, 2024 databases | ✅ |
| DUP-002-03 | Cross-year duplicate found | 1. Photo exists in 2020<br>2. Upload same photo with 2021 date | Duplicate detected across years | 🔄 Fixed |

---

## 4. Database & Storage Tests

### DB-001: JSON Database Operations
**Priority**: Critical  
**⚠️ Recently Fixed**: Database now properly writes to R2

| Test ID | Scenario | Steps | Expected Result | Status |
|---------|----------|-------|-----------------|--------|
| DB-001-01 | First upload of year | 1. Upload photo from 2007 | Creates `data/media/2007.json` in R2 | ✅ Fixed |
| DB-001-02 | Subsequent same-year uploads | 1. Upload another 2007 photo | Appends to existing 2007.json | ✅ Fixed |
| DB-001-03 | Multiple years | 1. Upload photos from 2020, 2021 | Separate JSON files created | ✅ Fixed |
| DB-001-04 | Metadata completeness | 1. Upload photo with EXIF<br>2. Check database | All metadata fields populated correctly | ✅ Fixed |
| DB-001-05 | Atomic operations | 1. Simulate upload failure | Database not updated if upload fails | ✅ |

### DB-002: R2 Storage Integration
**Priority**: High

| Test ID | Scenario | Steps | Expected Result | Status |
|---------|----------|-------|-----------------|--------|
| R2-001-01 | File path organization | 1. Upload photo from 2007 | Stored at `originals/2007/01/timestamp_filename` | ✅ |
| R2-001-02 | Thumbnail generation | 1. Upload video file | Thumbnail stored in `thumbnails/` path | ✅ |
| R2-001-03 | Presigned URL expiration | 1. Get upload URL<br>2. Wait 16 minutes<br>3. Try to use URL | URL expired, upload fails | ✅ |
| R2-001-04 | CORS configuration | 1. Upload from browser | No CORS errors in console | ✅ |

---

## 5. Video Processing Tests

### VIDEO-001: Video Upload & Processing  
**Priority**: Medium  
**Status**: Stage 2.3 Completed

| Test ID | Scenario | Steps | Expected Result | Status |
|---------|----------|-------|-----------------|--------|
| VIDEO-001-01 | MP4 upload | 1. Upload MP4 video file | Video processed with thumbnail | ✅ |
| VIDEO-001-02 | Video metadata extraction | 1. Upload video with metadata | Duration, dimensions extracted | ✅ |
| VIDEO-001-03 | Video thumbnail generation | 1. Upload video<br>2. Check thumbnail | Thumbnail generated from video frame | ✅ |
| VIDEO-001-04 | Unsupported video format | 1. Upload unsupported video | Graceful failure, no thumbnail | ✅ |
| VIDEO-001-05 | Video codec detection | 1. Upload various video formats | Codec information extracted | ✅ |

---

## 6. Error Handling Tests

### ERROR-001: Network & API Errors
**Priority**: High

| Test ID | Scenario | Steps | Expected Result | Status |
|---------|----------|-------|-----------------|--------|
| ERROR-001-01 | Network disconnection | 1. Start upload<br>2. Disconnect internet | Clear error message, retry option | ✅ |
| ERROR-001-02 | R2 service unavailable | 1. Upload when R2 is down | Helpful error message displayed | ✅ |
| ERROR-001-03 | API timeout | 1. Upload very large file | Timeout handled gracefully | ✅ |
| ERROR-001-04 | CORS misconfiguration | 1. Upload with bad CORS setup | Helpful CORS error message | ✅ |

### ERROR-002: File Processing Errors
**Priority**: Medium

| Test ID | Scenario | Steps | Expected Result | Status |
|---------|----------|-------|-----------------|--------|
| ERROR-002-01 | Corrupted image file | 1. Upload corrupted image | Error message, skips to next file | ✅ |
| ERROR-002-02 | Zero-byte file | 1. Upload empty file | File rejected with validation error | ✅ |
| ERROR-002-03 | EXIF extraction failure | 1. Upload image with corrupt EXIF | Continues upload, uses fallback date | ✅ |
| ERROR-002-04 | Filename with special chars | 1. Upload file with unicode/symbols | Filename sanitized properly | ✅ |

---

## 7. User Interface Tests

### UI-001: Upload Interface UX
**Priority**: High

| Test ID | Scenario | Steps | Expected Result | Status |
|---------|----------|-------|-----------------|--------|
| UI-001-01 | Drag & drop visual feedback | 1. Drag file over upload zone | Zone highlights, shows drop indicator | ✅ |
| UI-001-02 | File queue display | 1. Add files to queue | Files show name, size, status clearly | ✅ |
| UI-001-03 | Progress visualization | 1. Start upload | Progress bars and percentages clear | ✅ |
| UI-001-04 | Error state indication | 1. Upload fails | Error clearly marked with message | ✅ |
| UI-001-05 | Success state feedback | 1. Upload completes | Green checkmark and success message | ✅ |
| UI-001-06 | Mobile responsiveness | 1. Use on mobile device | Interface adapts to mobile screen | ✅ |

### UI-002: Status & Feedback
**Priority**: Medium

| Test ID | Scenario | Steps | Expected Result | Status |
|---------|----------|-------|-----------------|--------|
| UI-002-01 | Toast notifications | 1. Perform various actions | Appropriate toast messages appear | ✅ |
| UI-002-02 | Duplicate warnings | 1. Upload duplicate file | Clear warning with options displayed | ✅ |
| UI-002-03 | Upload statistics | 1. Upload multiple files | Shows count of completed/failed | ✅ |
| UI-002-04 | EXIF processing status | 1. Upload image files | Shows when EXIF is being extracted | ✅ |

---

## 8. Integration Test Scenarios

### INTEGRATION-001: Complete Upload Flow
**Priority**: Critical

| Test ID | Scenario | Expected Result | Status |
|---------|----------|-----------------|--------|
| INT-001-01 | **Complete Photo Upload**<br>1. Admin signs in<br>2. Drags photo with EXIF to upload<br>3. Reviews extracted metadata<br>4. Starts upload<br>5. Verifies completion | Photo uploaded to R2, metadata in database, duplicate detection works | 🔄 Test Required |
| INT-001-02 | **Video Upload with Thumbnail**<br>1. Upload MP4 video<br>2. Verify thumbnail generation<br>3. Check metadata extraction | Video and thumbnail in R2, complete metadata stored | ✅ |
| INT-001-03 | **Duplicate Detection Flow**<br>1. Upload photo<br>2. Upload same photo again<br>3. Handle duplicate warning<br>4. Force upload if desired | Duplicate detected, user given options, database updated correctly | 🔄 Needs Re-test |

---

## Automated Testing Recommendations

### High Priority for Puppeteer
1. **Authentication Flow**: Login with admin/non-admin users
2. **Upload Happy Path**: Complete file upload flow
3. **Duplicate Detection**: Upload same file twice
4. **Admin Access Control**: Verify unauthorized access blocked
5. **Database Persistence**: Verify files appear in correct year database

### API Testing Priorities
1. **Admin Authentication**: `/api/media` endpoints with various user types
2. **Duplicate Check**: `/api/upload/check-duplicate` with various scenarios
3. **Presigned URLs**: `/api/upload/presigned` with different file types
4. **Database Operations**: Verify JSON files created/updated in R2

### Test Data Requirements
- **Sample Images**: JPG with EXIF (2007, 2020, 2024), PNG without EXIF, WEBP
- **Sample Videos**: MP4, MOV with metadata
- **Edge Case Files**: Large files (49MB), corrupted files, duplicates
- **Admin Users**: Valid emails in `ADMIN_EMAILS` environment variable
- **R2 Configuration**: Valid bucket with proper CORS setup

---

## Known Issues & Recent Fixes

### Recently Fixed Issues ✅
1. **JSON Database Not Writing**: Fixed database update step in upload flow
2. **Duplicate Detection Wrong Year**: Fixed to use photo date instead of upload date
3. **Admin Access Control**: Fixed server-side admin validation with proper email checking

### Areas Needing Attention 🔄
1. **Duplicate Detection Testing**: Need to re-test after recent fixes
2. **Cross-Year Duplicate Scenarios**: Verify adjacent year searching works correctly
3. **Large File Upload Performance**: Test with files approaching 50MB limit
4. **Mobile Upload Experience**: Ensure drag & drop works on mobile devices

---

This document should be updated as new features are implemented and test scenarios are discovered during development and QA processes. 