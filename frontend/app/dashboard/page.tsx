'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { redirect } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Barcode from 'react-barcode'
import { signOutAction } from '../actions'
import { PromotionSearch } from '@/components/promotion-search'
import FlipWords from '@/components/flip-words'
import { X } from '@/components/icons'
import { MultiStepLoader } from "@/components/ui/multi-step-loader";

interface Promotion {
  "Expiration Date": string
  "Company": string
  "Category": "retail" | "electronic" | "grocery" | "sports" | "health" | "cosmetics" | "music" | "books" | "misc" | "dining" | "travel" | "clothing"
  "Promo message": string
  "Promo code": string
  "Link to Promo": string
  "Bar code": string | null
  user_id: string
  created_at: string
}

const CATEGORIES = ["retail", "electronic", "grocery", "sports", "health", "cosmetics", "music", "books", "misc", "dining", "travel", "clothing"] as const

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [filteredIndices, setFilteredIndices] = useState<number[] | null>(null)
  const supabase = createClient()

  const handleSignOut = async () => {
    await signOutAction()
  }

  const handleResetData = async () => {
    if (process.env.NODE_ENV === 'development') {
      try {
        // Clear promotions table
        const { error: deleteError } = await supabase
          .from('promotions')
          .delete()
          .eq('user_id', user?.id)

        if (deleteError) {
          console.error('Error deleting promotions:', deleteError)
          return
        }

        // Refresh the promotions list
        setPromotions([])
        
        alert('All data has been cleared!')
      } catch (error) {
        console.error('Error resetting data:', error)
      }
    }
  }

  // Function to fetch email promotions
  const fetchEmailPromotions = async () => {
    try {
      // Call the backend to fetch and process emails
      const response = await fetch('http://127.0.0.1:5000/fetch-emails')
      if (!response.ok) {
        throw new Error('Failed to fetch emails')
      }
      
      const promotionsData = await response.json()
      console.log('Received promotions:', promotionsData)
      
      if (promotionsData && Array.isArray(promotionsData)) {
        // Transform the data to match your database schema
        const newPromotions = promotionsData.map(promo => ({
          company: promo.Company,
          category: promo.Category,
          promo_message: promo["Promo message"],
          promo_code: promo["Promo code"] || '',
          expiration_date: promo["Expiration Date"],
          promo_link: promo["Link to Promo"] || '',
          user_id: user?.id,
          created_at: new Date().toISOString()
        }))

        // Store in Supabase
        for (const promo of newPromotions) {
          const { error } = await supabase
            .from('promotions')
            .upsert(promo, {
              onConflict: 'user_id,company,promo_message',
            })
          
          if (error) {
            console.error('Error storing promotion:', error)
          }
        }

        // Fetch all promotions from Supabase
        await fetchStoredPromotions()
      }
    } catch (error) {
      console.error('Error fetching promotions:', error)
    }
  }

  // Function to fetch stored promotions from Supabase
  const fetchStoredPromotions = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching stored promotions:', error)
      return
    }

    if (data) {
      // Transform the data back to the format your components expect
      const transformedPromotions = data.map(promo => ({
        "Company": promo.company,
        "Category": promo.category,
        "Promo message": promo.promo_message,
        "Promo code": promo.promo_code,
        "Expiration Date": promo.expiration_date,
        "Link to Promo": promo.promo_link || '',
        "Bar code": "", // We're not storing bar codes
        user_id: promo.user_id,
        created_at: promo.created_at
      }))
      setPromotions(transformedPromotions)
    }
  }

  // Function to delete a promotion
  const deletePromotion = async (company: string, promoMessage: string) => {
    if (!user) return

    try {
      // Delete from Supabase using snake_case field names
      const { error } = await supabase
        .from('promotions')
        .delete()
        .match({
          user_id: user.id,
          company: company,
          promo_message: promoMessage
        })

      if (error) {
        console.error('Error deleting promotion:', error)
        return
      }

      // If Supabase delete was successful, update local state
      setPromotions(currentPromotions => 
        currentPromotions.filter(p => 
          !(p.Company === company && p["Promo message"] === promoMessage)
        )
      )
    } catch (error) {
      console.error('Error deleting promotion:', error)
    }
  }

  // Fetch stored promotions on component mount
  useEffect(() => {
    if (user) {
      fetchStoredPromotions()
    }
  }, [user])

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          redirect('/sign-in')
        }
        setUser(user)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [supabase])

  // Type guard to check if a string is a valid category
  const isValidCategory = (category: string): category is Promotion["Category"] => {
    return CATEGORIES.includes(category as Promotion["Category"])
  }

  // Transform raw promotion data to ensure it matches the Promotion type
  const transformPromotion = (promo: any): Promotion => {
    if (!isValidCategory(promo.Category)) {
      // Default to 'misc' if category is invalid
      promo.Category = 'misc'
    }
    return promo as Promotion
  }

  // Function to save a new promotion
  const savePromotion = async (promotion: Omit<Promotion, 'user_id'>) => {
    if (!user) return

    const newPromotion = {
      ...promotion,
      user_id: user.id,
      created_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('promotions')
      .insert([newPromotion])

    if (error) {
      console.error('Error saving promotion:', error)
      return
    }

    // Refresh promotions list
    const { data: userPromotions } = await supabase
      .from('promotions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (userPromotions) {
      setPromotions(userPromotions.map(transformPromotion))
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      retail: "bg-blue-100 text-blue-800",
      electronic: "bg-purple-100 text-purple-800",
      grocery: "bg-green-100 text-green-800",
      sports: "bg-orange-100 text-orange-800",
      health: "bg-red-100 text-red-800",
      cosmetics: "bg-pink-100 text-pink-800",
      music: "bg-indigo-100 text-indigo-800",
      books: "bg-yellow-100 text-yellow-800",
      misc: "bg-gray-100 text-gray-800",
      dining: "bg-amber-100 text-amber-800",
      travel: "bg-cyan-100 text-cyan-800",
      clothing: "bg-rose-100 text-rose-800"
    }
    return colors[category] || "bg-gray-100 text-gray-800"
  }

  const [refreshLoading, setRefreshLoading] = useState(false);

  const loadingStates = [
    { text: "Checking your email" },
    { text: "Finding new promotions" },
    { text: "Analyzing promotional content" },
    { text: "Extracting details" },
    { text: "Parsing images" },
    { text: "Refactoring text" },
    { text: "Updating your dashboard" }
  ];

  const refreshPromotions = async () => {
    setRefreshLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5000/fetch-emails')
      if (!response.ok) {
        throw new Error('Failed to fetch emails')
      }
      
      const promotionsData = await response.json()
      console.log('Received promotions:', promotionsData)
      
      if (promotionsData && Array.isArray(promotionsData)) {
        // Transform the data to match your database schema
        const newPromotions = promotionsData.map(promo => ({
          company: promo.Company,
          category: promo.Category,
          promo_message: promo["Promo message"],
          promo_code: promo["Promo code"] || '',
          expiration_date: promo["Expiration Date"],
          promo_link: promo["Link to Promo"] || '',
          user_id: user?.id,
          created_at: new Date().toISOString()
        }))

        // Store in Supabase
        for (const promo of newPromotions) {
          const { error } = await supabase
            .from('promotions')
            .upsert(promo, {
              onConflict: 'user_id,company,promo_message',
            })
          
          if (error) {
            console.error('Error storing promotion:', error)
          }
        }

        // Fetch all promotions from Supabase and stop loading
        await fetchStoredPromotions()
        setRefreshLoading(false)
      }
    } catch (error) {
      console.error('Error fetching promotions:', error)
      setRefreshLoading(false)
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Loading...</h2>
          <p>Fetching your promotions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center w-full bg-background min-h-screen">
      <div className="w-[1400px] max-w-[95%] py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="mb-4">
              <div className="text-xl font-normal text-neutral-600 dark:text-neutral-400">
                Introducing{" "}
                <FlipWords
                  words={[
                    "smart promotion tracking",
                    "intelligent spending",
                    "seamless savings",
                    "unparalleled organization"
                  ]}
                />{" "}
                for your wallet.
              </div>
            </div>
            <h1 className="text-2xl font-bold">Welcome, {user?.user_metadata?.first_name || 'User'}!</h1>
            <p className="text-muted-foreground">Here are your saved promotions</p>
          </div>
          <div className="flex gap-2">
            <MultiStepLoader 
              loadingStates={loadingStates} 
              loading={refreshLoading} 
              duration={2000} 
              loop={false} 
            />
            <Button 
              onClick={() => {
                console.log('Fetching more promotions...')
                refreshPromotions()
              }}
            >
              Refresh Promotions
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <PromotionSearch 
            promotions={promotions}
            onFilterChange={setFilteredIndices}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Show "no results" message when filtered promotions are empty */}
          {filteredIndices !== null && 
           promotions.filter((_, index) => filteredIndices.includes(index)).length === 0 && (
            <div className="col-span-full">
              <Card>
                <CardHeader>
                  <CardTitle>No matching promotions found</CardTitle>
                  <CardDescription>Try adjusting your search terms</CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}

          {promotions
            .filter((_, index) => filteredIndices === null || filteredIndices.includes(index))
            .map((promo, index) => (
              <Card 
                key={`${promo.Company}-${promo["Promo message"]}`} 
                className="border-2 hover:border-primary/50 transition-colors flex flex-col h-[500px]"
              >
                <CardHeader className="space-y-3 min-h-[120px] flex flex-col justify-between">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2 line-clamp-2">{promo.Company}</CardTitle>
                      <Badge className={`${getCategoryColor(promo.Category)}`}>
                        {promo.Category}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      Expires: {new Date(promo["Expiration Date"]).toLocaleDateString()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 flex-1 overflow-hidden flex flex-col">
                  <div className="min-h-[80px]">
                    <p className="text-sm text-muted-foreground line-clamp-3">{promo["Promo message"]}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg space-y-4 flex-1">
                    <div className="flex flex-col gap-4">
                      <div>
                        <span className="font-medium text-sm">Promo Code: </span>
                        <span className="font-mono">{promo["Promo code"] || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-medium text-sm">Promo Link: </span>
                        {promo["Link to Promo"] ? (
                          <a 
                            href={promo["Link to Promo"]} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            Visit Promotion
                          </a>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </div>
                      {promo["Bar code"] && (
                        <div className="flex flex-col gap-2">
                          <span className="font-medium text-sm">Bar Code: </span>
                          <div className="w-full flex justify-center bg-white p-2 rounded">
                            <Barcode 
                              value={promo["Bar code"]} 
                              width={1.5}
                              height={50}
                              fontSize={14}
                              margin={10}
                              background="#ffffff"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center pt-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletePromotion(promo.Company, promo["Promo message"])}
                    className="text-red-700 hover:text-red-500 hover:bg-red-100/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(promo["Promo code"])
                    }}
                  >
                    Copy Code
                  </Button>
                </CardFooter>
              </Card>
            ))}
        </div>
      </div>
    </div>
  )
}
