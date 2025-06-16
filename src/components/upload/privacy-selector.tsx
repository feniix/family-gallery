'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Lock, Users, Globe, Home } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PrivacySelectorProps {
  value: 'public' | 'family' | 'extended-family' | 'private';
  onChange: (value: 'public' | 'family' | 'extended-family' | 'private') => void;
  className?: string;
}

const privacyOptions = [
  {
    value: 'family' as const,
    label: '👨‍👩‍👧‍👦 Family Only',
    description: 'Visible to immediate family members',
    icon: Home,
    color: 'text-blue-500',
    recommended: true
  },
  {
    value: 'extended-family' as const,
    label: '🏠 Extended Family',
    description: 'Includes relatives and extended family',
    icon: Users,
    color: 'text-green-500'
  },
  {
    value: 'public' as const,
    label: '🌍 Everyone',
    description: 'Visible to all users including friends',
    icon: Globe,
    color: 'text-orange-500'
  },
  {
    value: 'private' as const,
    label: '🔒 Just for Me',
    description: 'Only visible to administrators',
    icon: Lock,
    color: 'text-red-500'
  }
];

export function PrivacySelector({ value, onChange, className = '' }: PrivacySelectorProps) {
  const selectedOption = privacyOptions.find(option => option.value === value);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Privacy Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="privacy-select">Who can see these photos?</Label>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger id="privacy-select">
              <SelectValue placeholder="Select privacy level" />
            </SelectTrigger>
            <SelectContent>
              {privacyOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${option.color}`} />
                      <span>{option.label}</span>
                      {option.recommended && (
                        <Badge variant="secondary" className="text-xs ml-1">
                          Recommended
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Show description for selected option */}
        {selectedOption && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <selectedOption.icon className={`h-4 w-4 ${selectedOption.color}`} />
              <span className="font-medium text-sm">{selectedOption.label}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedOption.description}
            </p>
          </div>
        )}
        
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> You can change privacy settings for individual photos later in the media manager.
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 