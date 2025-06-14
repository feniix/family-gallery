import {NextRequest, NextResponse} from 'next/server';
import {auth} from '@clerk/nextjs/server';
import {configDb, getMediaDb, withRetry} from '@/lib/json-db';
import {getIsAdmin} from '@/lib/server-auth';
import {apiLogger, tagLogger} from '@/lib/logger';
import type {ConfigData} from '@/types/media';

/**
 * GET /api/media/tags
 * List all tags or get tags for specific media
 */
export async function GET(request: NextRequest) {
    try {
        tagLogger.debug('Tags API GET request received');
        
        const {userId} = await auth();
        tagLogger.debug('Authentication check completed', { userId: !!userId });
        
        if (!userId) {
            tagLogger.warn('Unauthorized access attempt to tags API');
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});
        }

        const {searchParams} = new URL(request.url);
        const action = searchParams.get('action');
        const query = searchParams.get('query') || '';
        
        tagLogger.debug('Processing tags GET request', { action, query, userId });

        switch (action) {
            case 'list':
                tagLogger.debug('Handling list tags request');
                return await handleListTags();
            case 'suggestions':
                tagLogger.debug('Handling tag suggestions request', { query });
                return await handleTagSuggestions(query);
            default:
                tagLogger.warn('Invalid action in tags GET request', { action });
                return NextResponse.json({error: 'Invalid action'}, {status: 400});
        }

    } catch (error) {
        tagLogger.error('Error in tags API GET', {error: error instanceof Error ? error.message : String(error)});
        apiLogger.error('Error in tags API', {error: error instanceof Error ? error.message : String(error)});
        return NextResponse.json({error: 'Internal server error'}, {status: 500});
    }
}

/**
 * POST /api/media/tags
 * Create new tags or update tags for media
 */
export async function POST(request: NextRequest) {
    try {
        tagLogger.debug('Tags API POST request received');
        
        const {userId} = await auth();
        tagLogger.debug('Authentication check completed', { userId: !!userId });
        
        if (!userId) {
            tagLogger.warn('Unauthorized access attempt to tags API POST');
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});
        }

        const isAdminUser = await getIsAdmin();
        tagLogger.debug('Admin check completed', { isAdmin: isAdminUser });
        
        const body = await request.json();
        const {action, mediaId, tags, newTag} = body;
        
        tagLogger.debug('Processing tags POST request', { 
            action, 
            mediaId: !!mediaId, 
            tagsCount: Array.isArray(tags) ? tags.length : 0,
            newTag: !!newTag,
            userId 
        });

        switch (action) {
            case 'create-tag':
                if (!isAdminUser) {
                    tagLogger.warn('Non-admin user attempted to create tag', { userId });
                    return NextResponse.json({error: 'Admin access required'}, {status: 403});
                }
                tagLogger.debug('Handling create tag request', { newTag });
                return await handleCreateTag(newTag);

            case 'update-media-tags':
                tagLogger.debug('Handling update media tags request', { mediaId, tagsCount: Array.isArray(tags) ? tags.length : 0 });
                return await handleUpdateMediaTags(mediaId, tags);

            default:
                tagLogger.warn('Invalid action in tags POST request', { action });
                return NextResponse.json({error: 'Invalid action'}, {status: 400});
        }

    } catch (error) {
        tagLogger.error('Error in tags API POST', {error: error instanceof Error ? error.message : String(error)});
        apiLogger.error('Error updating tags', {error: error instanceof Error ? error.message : String(error)});
        return NextResponse.json({error: 'Internal server error'}, {status: 500});
    }
}

/**
 * DELETE /api/media/tags
 * Delete tags (admin only)
 */
export async function DELETE(request: NextRequest) {
    try {
        tagLogger.debug('Tags API DELETE request received');
        
        const {userId} = await auth();
        tagLogger.debug('Authentication check completed', { userId: !!userId });
        
        if (!userId) {
            tagLogger.warn('Unauthorized access attempt to tags API DELETE');
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});
        }

        const isAdminUser = await getIsAdmin();
        tagLogger.debug('Admin check completed', { isAdmin: isAdminUser });
        
        if (!isAdminUser) {
            tagLogger.warn('Non-admin user attempted to delete tag', { userId });
            return NextResponse.json({error: 'Admin access required'}, {status: 403});
        }

        const {searchParams} = new URL(request.url);
        const tagToDelete = searchParams.get('tag');
        
        tagLogger.debug('Processing tag delete request', { tagToDelete, userId });

        if (!tagToDelete) {
            tagLogger.warn('Tag delete request missing tag parameter');
            return NextResponse.json({error: 'Tag parameter required'}, {status: 400});
        }

        tagLogger.debug('Handling delete tag request', { tagToDelete });
        return await handleDeleteTag(tagToDelete);

    } catch (error) {
        tagLogger.error('Error in tags API DELETE', {error: error instanceof Error ? error.message : String(error)});
        apiLogger.error('Error deleting tag', {error: error instanceof Error ? error.message : String(error)});
        return NextResponse.json({error: 'Internal server error'}, {status: 500});
    }
}

async function handleListTags() {
    try {
        tagLogger.debug('Reading tags from config database');
        const config = await configDb.read();
        const tags = config.tags || [];
        tagLogger.debug('Tags retrieved successfully', { count: tags.length, tags });
        return NextResponse.json({tags});
    } catch (error) {
        tagLogger.warn('Failed to read config database, returning empty tags array', { 
            error: error instanceof Error ? error.message : String(error) 
        });
        // If config doesn't exist, return empty array
        return NextResponse.json({tags: []});
    }
}

async function handleTagSuggestions(query: string) {
    try {
        tagLogger.debug('Reading tags for suggestions', { query });
        const config = await configDb.read();
        const allTags = config.tags || [];
        tagLogger.debug('All tags retrieved for filtering', { totalTags: allTags.length });

        const suggestions = allTags
            .filter(tag => tag.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 10);

        tagLogger.debug('Tag suggestions generated', { query, suggestionsCount: suggestions.length, suggestions });
        return NextResponse.json({suggestions});
    } catch (error) {
        tagLogger.warn('Failed to generate tag suggestions', { 
            query, 
            error: error instanceof Error ? error.message : String(error) 
        });
        return NextResponse.json({suggestions: []});
    }
}

async function handleCreateTag(newTag: string) {
    tagLogger.debug('Creating new tag', { newTag });
    
    if (!newTag || typeof newTag !== 'string') {
        tagLogger.warn('Invalid tag name provided', { newTag, type: typeof newTag });
        return NextResponse.json({error: 'Valid tag name required'}, {status: 400});
    }

    const normalizedTag = newTag.trim().toLowerCase();
    tagLogger.debug('Tag normalized', { original: newTag, normalized: normalizedTag });

    if (normalizedTag.length === 0) {
        tagLogger.warn('Empty tag name after normalization', { original: newTag });
        return NextResponse.json({error: 'Tag name cannot be empty'}, {status: 400});
    }

    try {
        tagLogger.debug('Updating config database with new tag');
        const updatedConfig = await withRetry(() =>
            configDb.update((current: ConfigData) => {
                tagLogger.debug('Current config state', { 
                    hasTagsArray: !!current.tags, 
                    currentTagsCount: current.tags?.length || 0 
                });
                
                if (!current.tags) {
                    current.tags = [];
                    tagLogger.debug('Initialized empty tags array');
                }

                if (!current.tags.includes(normalizedTag)) {
                    current.tags.push(normalizedTag);
                    current.tags.sort();
                    tagLogger.debug('Tag added to config', { 
                        tag: normalizedTag, 
                        newTagsCount: current.tags.length 
                    });
                } else {
                    tagLogger.debug('Tag already exists in config', { tag: normalizedTag });
                }

                return current;
            })
        );

        tagLogger.info('Tag created successfully', { tag: normalizedTag, totalTags: updatedConfig.tags.length });
        apiLogger.info('Tag created', {tag: normalizedTag});

        return NextResponse.json({
            success: true,
            tag: normalizedTag,
            allTags: updatedConfig.tags
        });

    } catch (error) {
        tagLogger.error('Failed to create tag', { 
            tag: normalizedTag, 
            error: error instanceof Error ? error.message : String(error) 
        });
        apiLogger.error('Error creating tag', {error: error instanceof Error ? error.message : String(error)});
        return NextResponse.json({error: 'Failed to create tag'}, {status: 500});
    }
}

async function handleUpdateMediaTags(mediaId: string, tags: string[]) {
    tagLogger.debug('Updating media tags', { mediaId, tagsCount: Array.isArray(tags) ? tags.length : 0 });
    
    if (!mediaId || !Array.isArray(tags)) {
        tagLogger.warn('Invalid parameters for media tags update', { 
            hasMediaId: !!mediaId, 
            isTagsArray: Array.isArray(tags) 
        });
        return NextResponse.json({error: 'Media ID and tags array required'}, {status: 400});
    }

    // Normalize tags
    const normalizedTags = tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
    tagLogger.debug('Tags normalized', { 
        originalCount: tags.length, 
        normalizedCount: normalizedTags.length, 
        normalizedTags 
    });

    // Find the media item across all years
    const currentYear = new Date().getFullYear();
    const yearsToCheck = Array.from({length: 20}, (_, i) => currentYear - i + 5);
    let found = false;

    tagLogger.debug('Searching for media across years', { 
        mediaId, 
        yearsToCheck: yearsToCheck.length,
        yearRange: `${yearsToCheck[yearsToCheck.length - 1]}-${yearsToCheck[0]}`
    });

    for (const year of yearsToCheck) {
        try {
            tagLogger.debug('Checking year database', { year, mediaId });
            const yearDb = getMediaDb(year);
            const yearData = await yearDb.read();
            
            tagLogger.debug('Year database loaded', { 
                year, 
                mediaCount: yearData.media.length 
            });

            const mediaIndex = yearData.media.findIndex(media => media.id === mediaId);
            if (mediaIndex !== -1) {
                tagLogger.debug('Media found in year database', { 
                    year, 
                    mediaId, 
                    mediaIndex,
                    currentTags: yearData.media[mediaIndex].tags 
                });
                
                // Update the tags
                yearData.media[mediaIndex].tags = normalizedTags;

                // Save back to database
                tagLogger.debug('Saving updated media data to database', { year, mediaId });
                await yearDb.write(yearData);

                tagLogger.info('Media tags updated successfully', {
                    mediaId,
                    tags: normalizedTags,
                    year
                });
                apiLogger.info('Media tags updated', {
                    mediaId,
                    tags: normalizedTags,
                    year
                });

                found = true;
                break;
            } else {
                tagLogger.debug('Media not found in year database', { year, mediaId });
            }
        } catch (error) {
            tagLogger.debug('Error accessing year database', { 
                year, 
                mediaId,
                error: error instanceof Error ? error.message : String(error)
            });
            // Year database doesn't exist, continue
        }
    }

    if (!found) {
        tagLogger.warn('Media not found in any year database', { mediaId, yearsChecked: yearsToCheck.length });
        return NextResponse.json({error: 'Media not found'}, {status: 404});
    }

    tagLogger.debug('Media tags update completed successfully', { mediaId, normalizedTags });
    return NextResponse.json({
        success: true,
        mediaId,
        tags: normalizedTags
    });
}

async function handleDeleteTag(tagToDelete: string) {
    const normalizedTag = tagToDelete.trim().toLowerCase();
    tagLogger.debug('Deleting tag', { original: tagToDelete, normalized: normalizedTag });

    try {
        // Remove tag from config
        tagLogger.debug('Removing tag from config database');
        const updatedConfig = await withRetry(() =>
            configDb.update((current: ConfigData) => {
                const originalCount = current.tags?.length || 0;
                if (current.tags) {
                    current.tags = current.tags.filter(tag => tag !== normalizedTag);
                }
                const newCount = current.tags?.length || 0;
                tagLogger.debug('Tag removed from config', { 
                    tag: normalizedTag, 
                    originalCount, 
                    newCount,
                    removed: originalCount !== newCount
                });
                return current;
            })
        );

        // Remove tag from all media across all years
        const currentYear = new Date().getFullYear();
        const yearsToCheck = Array.from({length: 20}, (_, i) => currentYear - i + 5);
        let updatedMediaCount = 0;

        tagLogger.debug('Removing tag from media across years', { 
            tag: normalizedTag, 
            yearsToCheck: yearsToCheck.length 
        });

        for (const year of yearsToCheck) {
            try {
                tagLogger.debug('Processing year for tag removal', { year, tag: normalizedTag });
                const yearDb = getMediaDb(year);
                const yearData = await yearDb.read();

                let yearUpdated = false;
                let yearMediaUpdated = 0;
                
                yearData.media.forEach(media => {
                    if (media.tags && media.tags.includes(normalizedTag)) {
                        const originalTagsCount = media.tags.length;
                        media.tags = media.tags.filter(tag => tag !== normalizedTag);
                        yearUpdated = true;
                        yearMediaUpdated++;
                        updatedMediaCount++;
                        
                        tagLogger.debug('Tag removed from media item', {
                            mediaId: media.id,
                            tag: normalizedTag,
                            originalTagsCount,
                            newTagsCount: media.tags.length
                        });
                    }
                });

                if (yearUpdated) {
                    tagLogger.debug('Saving updated year database', { 
                        year, 
                        mediaUpdated: yearMediaUpdated 
                    });
                    await yearDb.write(yearData);
                }
                
                tagLogger.debug('Year processing completed', { 
                    year, 
                    mediaUpdated: yearMediaUpdated,
                    totalMediaInYear: yearData.media.length
                });
            } catch (error) {
                tagLogger.debug('Error processing year for tag removal', { 
                    year, 
                    tag: normalizedTag,
                    error: error instanceof Error ? error.message : String(error)
                });
                // Year database doesn't exist, continue
            }
        }

        tagLogger.info('Tag deleted successfully', {
            tag: normalizedTag,
            mediaUpdated: updatedMediaCount,
            remainingTagsCount: updatedConfig.tags.length
        });
        apiLogger.info('Tag deleted', {
            tag: normalizedTag,
            mediaUpdated: updatedMediaCount
        });

        return NextResponse.json({
            success: true,
            deletedTag: normalizedTag,
            mediaUpdated: updatedMediaCount,
            remainingTags: updatedConfig.tags
        });

    } catch (error) {
        tagLogger.error('Failed to delete tag', { 
            tag: normalizedTag, 
            error: error instanceof Error ? error.message : String(error) 
        });
        apiLogger.error('Error deleting tag', {error: error instanceof Error ? error.message : String(error)});
        return NextResponse.json({error: 'Failed to delete tag'}, {status: 500});
    }
} 