
'use client';

import { useState } from 'react';
import { ChevronDown, Plus, Building, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Brand {
  id: number;
  name: string;
  category: string;
  subscriptionTier: string;
  isActive: boolean;
}

interface BrandSwitcherProps {
  brands: Brand[];
  currentBrandId: number | null;
  onBrandChange: (brandId: number) => void;
  onCreateNew: () => void;
}

const TIER_COLORS = {
  trial: 'bg-gray-100 text-gray-800',
  starter: 'bg-blue-100 text-blue-800',
  professional: 'bg-purple-100 text-purple-800',
  enterprise: 'bg-gold-100 text-gold-800',
};

export default function BrandSwitcher({
  brands,
  currentBrandId,
  onBrandChange,
  onCreateNew
}: BrandSwitcherProps) {
  const currentBrand = brands.find(b => b.id === currentBrandId);
  const activeBrands = brands.filter(b => b.isActive);

  if (activeBrands.length === 0) {
    return (
      <Button onClick={onCreateNew} className="flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Create Brand
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 min-w-[200px] justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            <div className="flex flex-col items-start">
              <span className="font-medium">
                {currentBrand?.name || 'Select Brand'}
              </span>
              {currentBrand && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${TIER_COLORS[currentBrand.subscriptionTier as keyof typeof TIER_COLORS] || TIER_COLORS.trial}`}
                >
                  {currentBrand.subscriptionTier}
                </Badge>
              )}
            </div>
          </div>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-[300px]">
        <DropdownMenuLabel>Switch Brand</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {activeBrands.map((brand) => (
          <DropdownMenuItem
            key={brand.id}
            onClick={() => onBrandChange(brand.id)}
            className="flex items-center justify-between p-3"
          >
            <div className="flex items-center gap-3">
              <Building className="w-4 h-4" />
              <div>
                <div className="font-medium">{brand.name}</div>
                <div className="text-sm text-gray-500">{brand.category}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`text-xs ${TIER_COLORS[brand.subscriptionTier as keyof typeof TIER_COLORS] || TIER_COLORS.trial}`}
              >
                {brand.subscriptionTier}
              </Badge>
              {currentBrandId === brand.id && (
                <Check className="w-4 h-4 text-green-600" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onCreateNew} className="flex items-center gap-2 p-3">
          <Plus className="w-4 h-4" />
          <span>Create New Brand</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
