'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, X } from 'lucide-react';

export interface SubjectFilterProps {
  availableSubjects: string[];
  selectedSubjects: string[];
  onSubjectToggle: (subject: string) => void;
  onClearFilters: () => void;
  mediaCount?: number;
}

export function SubjectFilter({
  availableSubjects,
  selectedSubjects,
  onSubjectToggle,
  onClearFilters,
  mediaCount
}: SubjectFilterProps) {
  const hasActiveFilters = selectedSubjects.length > 0;

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="text-sm font-medium">Filter by Subject</span>
          {mediaCount !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {mediaCount} {mediaCount === 1 ? 'photo' : 'photos'}
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Subject Buttons */}
      <div className="flex flex-wrap gap-2">
        {availableSubjects.map((subject) => {
          const isSelected = selectedSubjects.includes(subject);
          return (
            <Button
              key={subject}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onSubjectToggle(subject)}
              className="capitalize"
            >
              <User className="h-3 w-3 mr-1" />
              {subject}
            </Button>
          );
        })}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          <div className="flex flex-wrap gap-1">
            {selectedSubjects.map((subject) => (
              <Badge
                key={subject}
                variant="default"
                className="text-xs capitalize cursor-pointer"
                onClick={() => onSubjectToggle(subject)}
              >
                {subject}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 