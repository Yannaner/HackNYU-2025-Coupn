import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, X } from "lucide-react"

interface Promotion {
  "Expiration Date": string
  "Company": string
  "Category": "retail" | "electronic" | "grocery" | "sports" | "health" | "cosmetics" | "music" | "books" | "misc" | "dining" | "travel" | "clothing"
  "Promo message": string
  "Promo code": string
  "Bar code": string | null
  user_id: string
  created_at: string
}

interface PromotionSearchProps {
  promotions: Promotion[]
  onFilterChange: (indices: number[] | null) => void
}

export function PromotionSearch({ promotions, onFilterChange }: PromotionSearchProps) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) {
      onFilterChange(null)
      return
    }

    setSearching(true)
    console.log('Starting search with query:', query);
    console.log('Number of promotions:', promotions.length);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query,
          promotions // Send all promotions to the API
        }),
      })

      console.log('Search response status:', response.status);
      const data = await response.json()
      console.log('Search response data:', data);
      
      if (response.ok) {
        console.log('Search successful, updating filters with indices:', data.relevant_indices);
        onFilterChange(data.relevant_indices)
      } else {
        console.error('Search error:', data)
        onFilterChange(null)
      }
    } catch (error) {
      console.error('Search error:', error)
      onFilterChange(null)
    } finally {
      setSearching(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    
    // Automatically clear search when input is empty
    if (!newValue.trim()) {
      onFilterChange(null);
    }
  }

  const clearSearch = () => {
    setQuery('')
    onFilterChange(null)
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            placeholder="Search promotions... (e.g., 'electronics discounts' or 'food deals')"
            value={query}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pr-10"
            disabled={searching}
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={searching}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button 
          onClick={handleSearch}
          disabled={searching || !query.trim()}
        >
          {searching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            'Search'
          )}
        </Button>
      </div>
      {searching && (
        <div className="text-sm text-muted-foreground">
          Searching through {promotions.length} promotions...
        </div>
      )}
    </div>
  )
}
