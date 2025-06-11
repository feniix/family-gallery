'use client';

import React from 'react';
import { Calendar, Camera } from 'lucide-react';

interface DateHeaderProps {
  date: string;
  count: number;
  year: number;
  month?: number; // Made optional since it's not used in the component
}

export function DateHeader({ date, count, year }: DateHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-2xl font-semibold tracking-tight">{date}</h2>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Camera className="h-4 w-4" />
          <span>{count} {count === 1 ? 'photo' : 'photos'}</span>
        </div>
      </div>
      
      {/* Timeline progress indicator */}
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1 w-8 bg-primary rounded-full"></div>
        <div className="text-xs text-muted-foreground">
          {year > 0 ? `${year}` : 'No date available'}
        </div>
      </div>
    </div>
  );
} 