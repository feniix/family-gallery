# Duplicate Test Files

This directory contains files for testing duplicate detection functionality.

## Files

- `original.jpg` - Original image file
- `copy.jpg` - Exact copy of original.jpg (same hash)
- `renamed.jpg` - Same content as original.jpg but different filename
- `similar.jpg` - Visually similar but different content (different hash)
- `different-year/original.jpg` - Same file in different year folder (cross-year duplicate test)

## Usage

These files are used to test:
- Hash-based duplicate detection
- Cross-year duplicate searching
- Filename variation handling
- Visual similarity vs actual duplicates

## Test Scenarios

1. **Exact Duplicates**: `original.jpg` and `copy.jpg` should have identical hashes
2. **Renamed Files**: `renamed.jpg` should be detected as duplicate of `original.jpg`
3. **Cross-Year**: Files in `different-year/` should be found when searching across years
4. **False Positives**: `similar.jpg` should NOT be detected as duplicate (different content) 