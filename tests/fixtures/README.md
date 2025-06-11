# Test Fixtures

This directory contains test files and data used by the automated tests.

## Files

### Sample Media Files
- `test-image.jpg` - Small JPEG image for upload testing (298 bytes)
- `test-image-with-exif.jpg` - JPEG image with embedded metadata (419 bytes)
- `test-video.mp4` - Small MP4 video for video upload testing (5.1KB, 1 second duration)
- `test-large-image.jpg` - Large file for size limit testing (49MB)

### Sample Data
- `sample-metadata.json` - Example media metadata objects with photo/video/WhatsApp examples
- `sample-exif-data.json` - Example EXIF data structures from various devices and scenarios
- `duplicate-test-files/` - Directory with duplicate files for testing hash-based detection

## Duplicate Test Files Structure

```
duplicate-test-files/
├── README.md              # Documentation for duplicate testing
├── original.jpg           # Original image (MD5: 4e56e2d073ea3b78fcf36a73fad62204)
├── copy.jpg              # Exact copy (same hash as original)
├── renamed.jpg           # Same content, different name (same hash as original)
├── similar.jpg           # Different content (MD5: 760ea9dd8a38961c165df980ad3ba892)
└── different-year/
    └── original.jpg      # Cross-year duplicate (same hash as original)
```

## Usage

These fixtures are used by:
- E2E tests for file upload simulation and user workflows
- Unit tests for metadata processing and EXIF extraction
- API tests for request/response validation and file handling
- Duplicate detection algorithm testing (hash-based and cross-year)

## Test Scenarios Covered

### File Upload Testing
- Small files (< 1KB) for basic functionality
- Video files with proper MP4 format
- Large files (49MB) for size limit validation
- Files with and without EXIF metadata

### Duplicate Detection Testing
1. **Exact Duplicates**: `original.jpg`, `copy.jpg`, `renamed.jpg` all have identical hashes
2. **Cross-Year Detection**: File in `different-year/` has same hash as main directory files
3. **False Positives**: `similar.jpg` has different hash and should NOT be detected as duplicate
4. **Edge Cases**: Files with different names but identical content

### Metadata Processing Testing
- Standard EXIF data from phones (iPhone, Samsung, etc.)
- DSLR camera EXIF with lens information
- GPS location data extraction
- WhatsApp compressed image handling
- Corrupted/invalid EXIF data handling
- Files with no EXIF data

## Notes

- All duplicate test files are intentionally small (< 1KB) to avoid repository bloat
- The large test file is 49MB to test the 50MB upload limit
- EXIF test data covers real-world scenarios including edge cases
- File hashes are verified to ensure duplicate detection tests work correctly

## Creating Test Files

To create additional test files:

```bash
# Create a small test image (requires ImageMagick)
convert -size 100x100 xc:red tests/fixtures/test-image.jpg

# Create a test video (requires FFmpeg)
ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=1 -pix_fmt yuv420p tests/fixtures/test-video.mp4
``` 