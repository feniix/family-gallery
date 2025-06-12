# fg-import - Family Gallery Bulk Import Tool

A command-line tool for bulk importing images and videos into your Family Gallery. This tool reuses the existing project modules to ensure consistent behavior with the web interface.

## Features

- 🚀 Bulk import of images and videos from local directories
- 📊 Automatic metadata extraction and file organization
- 🔄 Duplicate detection with skip/overwrite options
- 📁 Recursive directory scanning
- 💾 Direct upload to Cloudflare R2 storage
- 🗄️ Automatic JSON database updates
- 📈 Detailed progress reporting and summary

## Installation

From the project root directory:

```bash
# Install dependencies (if not already installed)
yarn install

# Make the wrapper script executable (if not already done)
chmod +x scripts/fg-import
```

## Usage

### Basic Import

```bash
./scripts/fg-import import \
  --import-dir ./photos \
  --bucket your-bucket-name \
  --endpoint-url https://your-account-id.r2.cloudflarestorage.com \
  --aws_access_key_id your_access_key \
  --aws_secret_access_key your_secret_key
```

### With Duplicate Handling

```bash
# Skip duplicates (default)
./scripts/fg-import import --import-dir ./photos --duplicates skip [other options...]

# Overwrite duplicates
./scripts/fg-import import --import-dir ./photos --duplicates overwrite [other options...]
```

### Alternative: Using Yarn Script

```bash
# You can also run it via yarn
yarn fg-import import --import-dir ./photos [other options...]
```

## Command Options

| Option | Required | Description |
|--------|----------|-------------|
| `--import-dir <path>` | ✅ | Directory containing media files to import |
| `--bucket <name>` | ✅ | R2 bucket name |
| `--endpoint-url <url>` | ✅ | R2 endpoint URL |
| `--aws_access_key_id <key>` | ✅ | AWS access key ID |
| `--aws_secret_access_key <secret>` | ✅ | AWS secret access key |
| `--duplicates <action>` | ❌ | How to handle duplicates: `skip` or `overwrite` (default: `skip`) |

## Supported File Types

### Images
- `.jpg`, `.jpeg` - JPEG images
- `.png` - PNG images  
- `.gif` - GIF images
- `.webp` - WebP images
- `.dng` - Adobe DNG (Raw) images

### Videos
- `.mp4` - MP4 videos
- `.mov` - QuickTime videos
- `.avi` - AVI videos
- `.mkv` - Matroska videos
- `.webm` - WebM videos

## How It Works

1. **Directory Scanning**: Recursively scans the import directory for supported media files
2. **File Processing**: For each file:
   - Generates SHA256 hash for duplicate detection
   - Extracts date from EXIF (images), filename patterns, or file timestamps
   - Creates consistent filename and storage path
   - Builds metadata record
3. **Upload**: Uploads original files to R2 storage
4. **Database Update**: Updates JSON databases with new media records
5. **Progress Reporting**: Shows detailed progress and final summary

## Date Extraction Priority

The tool uses the following priority for determining when a photo/video was taken:

1. **EXIF DateTimeOriginal** (images only) - highest priority
2. **Filename patterns** - YYYY-MM-DD, YYYYMMDD, YYYY_MM_DD
3. **File creation time** - when available and different from modification time
4. **File modification time** - fallback option

## File Organization

Files are organized in R2 storage using the same structure as the web interface:

```
/originals/
  ├── 2024/
  │   ├── 01/[timestamp]_[filename]
  │   └── 12/[timestamp]_[filename]
  └── 2025/
/thumbnails/
  ├── 2024/
  │   └── 01/[timestamp]_[filename]_thumb.jpg
```

**Note**: The CLI tool doesn't generate thumbnails - they will be created on-demand by the web interface when first accessed.

## Database Updates

The tool updates the same JSON databases used by the web interface:

- `data/media/YYYY.json` - Media records organized by year
- `data/media-index.json` - Index of available years

## Example Output

```
🚀 Starting bulk import from: ./vacation-photos
📦 Target bucket: family-gallery-prod
🔄 Duplicate handling: skip

📁 Found 150 media files

[1/150] Processing: IMG_20240615_142035.jpg
  📊 Processing image metadata...
  📤 Uploading original to: originals/2024/06/1718456435_IMG_20240615_142035.jpg
  ℹ️  Thumbnail will be generated on-demand by web interface
  💾 Saving to database...
  ✅ Successfully imported: IMG_20240615_142035.jpg

[2/150] Processing: VID_20240615_143022.mp4
  🎬 Processing video metadata...
  📤 Uploading original to: originals/2024/06/1718456622_VID_20240615_143022.mp4
  ℹ️  Thumbnail will be generated on-demand by web interface
  💾 Saving to database...
  ✅ Successfully imported: VID_20240615_143022.mp4

...

📊 Import Summary
================
Total files found: 150
Successfully uploaded: 148
Skipped (duplicates): 2
Errors: 0

✅ Import completed successfully!
```

## Error Handling

The tool provides detailed error reporting:

- Individual file errors don't stop the entire import
- Failed files are listed in the final summary
- Common issues include network timeouts, invalid files, or permission errors

## Limitations

- **No EXIF extraction**: The CLI tool doesn't extract detailed EXIF metadata (camera settings, GPS, etc.) - this is done by the web interface
- **No thumbnail generation**: Thumbnails are generated on-demand by the web interface
- **No video metadata**: Video duration, dimensions, etc. are not extracted in CLI mode
- **Simplified duplicate detection**: Currently doesn't check existing databases (TODO)

## Troubleshooting

### "Failed to load project modules"
- Make sure you're running the command from the project root directory
- Ensure all dependencies are installed with `yarn install`

### "Import directory does not exist"
- Check that the path in `--import-dir` is correct and accessible

### "R2 upload failed"
- Verify your R2 credentials and endpoint URL
- Check that the bucket exists and you have write permissions
- Ensure your network connection is stable

### "Failed to update database"
- Check that you have write permissions in the project directory
- Ensure the `data/` directory exists or can be created

## Implementation Details

The CLI tool is implemented in TypeScript and includes simplified versions of core project functions to ensure consistency with the web interface:

- **File Processing**: Uses simplified metadata extraction and file naming logic
- **Database Operations**: Directly manipulates the same JSON files used by the web interface
- **Storage**: Uploads files to the same R2 bucket structure
- **Duplicate Detection**: Uses the same SHA256 hashing for file comparison

### Key Files

- `scripts/fg-import.ts` - Main CLI implementation in TypeScript
- `scripts/fg-import` - Bash wrapper script for proper module resolution
- `scripts/README.md` - This documentation

## Development

The CLI tool is designed to maintain consistency with the web interface. Key design decisions:

- Uses simplified implementations for Node.js compatibility
- Maintains the same file naming and organization as the web interface
- Updates the same JSON databases
- Provides detailed progress reporting for bulk operations

For advanced features like EXIF extraction and thumbnail generation, use the web interface upload functionality. 