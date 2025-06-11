'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Plus, Save, X, Tags } from 'lucide-react';
import { MediaMetadata } from '@/types/media';
import { toast } from 'sonner';

// Simple replacements for missing UI components
const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />
);

const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} {...props} />
);

const Separator = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`shrink-0 bg-border h-[1px] w-full ${className}`} {...props} />
);

interface SubjectManagementProps {
  media?: MediaMetadata;
  onSubjectsUpdate?: (mediaId: string, subjects: string[]) => void;
  className?: string;
}

export function SubjectManagement({ 
  media, 
  onSubjectsUpdate,
  className 
}: SubjectManagementProps) {
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load available subjects on mount
  useEffect(() => {
    loadAvailableSubjects();
  }, []);

  // Set initial selected subjects from media
  useEffect(() => {
    if (media?.subjects) {
      setSelectedSubjects([...media.subjects]);
    }
  }, [media]);

  const loadAvailableSubjects = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/media/subjects?action=list');
      if (response.ok) {
        const data = await response.json();
        setAvailableSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast.error('Failed to load available subjects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subject)) {
        return prev.filter(s => s !== subject);
      } else {
        return [...prev, subject];
      }
    });
  };

  const handleAddNewSubject = () => {
    const trimmedSubject = newSubject.trim().toLowerCase();
    if (trimmedSubject && !availableSubjects.includes(trimmedSubject)) {
      setAvailableSubjects(prev => [...prev, trimmedSubject]);
      setSelectedSubjects(prev => [...prev, trimmedSubject]);
      setNewSubject('');
      toast.success(`Added new subject: ${trimmedSubject}`);
    }
  };

  const handleSaveSubjects = async () => {
    if (!media?.id) {
      toast.error('No media selected to update');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/media/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: media.id,
          subjects: selectedSubjects
        })
      });

      if (response.ok) {
        toast.success('Subjects updated successfully');
        onSubjectsUpdate?.(media.id, selectedSubjects);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update subjects');
      }
    } catch (error) {
      console.error('Error saving subjects:', error);
      toast.error('Failed to save subjects');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = media ? 
    JSON.stringify(selectedSubjects.sort()) !== JSON.stringify((media.subjects || []).sort()) :
    selectedSubjects.length > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Subject Management
        </CardTitle>
        <CardDescription>
          Tag people in this {media?.type || 'media'} file
          {media && (
            <div className="text-xs text-muted-foreground mt-1">
              {media.originalFilename}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Available Subjects */}
        <div>
          <Label className="text-sm font-medium">Available Subjects</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : availableSubjects.length > 0 ? (
              availableSubjects.map((subject) => {
                const isSelected = selectedSubjects.includes(subject);
                return (
                  <Button
                    key={subject}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSubjectToggle(subject)}
                    className="capitalize"
                  >
                    <User className="h-3 w-3 mr-1" />
                    {subject}
                  </Button>
                );
              })
            ) : (
              <div className="text-sm text-muted-foreground">No subjects available</div>
            )}
          </div>
        </div>

        <Separator />

        {/* Add New Subject */}
        <div>
          <Label htmlFor="new-subject" className="text-sm font-medium">
            Add New Subject
          </Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="new-subject"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Enter subject name..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNewSubject();
                }
              }}
            />
            <Button
              onClick={handleAddNewSubject}
              disabled={!newSubject.trim() || availableSubjects.includes(newSubject.trim().toLowerCase())}
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Selected Subjects */}
        <div>
          <Label className="text-sm font-medium">
            Selected Subjects ({selectedSubjects.length})
          </Label>
          <div className="flex flex-wrap gap-2 mt-2 min-h-[2rem]">
            {selectedSubjects.length > 0 ? (
              selectedSubjects.map((subject) => (
                <Badge
                  key={subject}
                  variant="default"
                  className="capitalize cursor-pointer"
                  onClick={() => handleSubjectToggle(subject)}
                >
                  {subject}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No subjects selected</div>
            )}
          </div>
        </div>

        {/* Save Button */}
        {media && (
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSaveSubjects}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Subjects'}
            </Button>
          </div>
        )}

        {/* Summary */}
        {!media && selectedSubjects.length > 0 && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Tags className="h-4 w-4" />
              <span className="font-medium">
                {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              These subjects will be applied to uploaded media
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 