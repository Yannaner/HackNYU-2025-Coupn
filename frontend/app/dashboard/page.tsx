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

  const fetchEmailPromotions = async () => {
    try {
      // Call the backend to fetch emails
      const response = await fetch('http://127.0.0.1:5000/fetch-emails')
      if (!response.ok) {
        throw new Error('Failed to fetch emails')
      }

      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Read the processed promotions from the JSON file
      const processedResponse = await fetch('http://127.0.0.1:5000/get-processed-promotions')
      if (!processedResponse.ok) {
        throw new Error('Failed to get processed promotions')
      }
      
      const processedData = await processedResponse.json()
      if (processedData && Array.isArray(processedData)) {
        // Transform and add the promotions
        const newPromotions = processedData.map(promo => transformPromotion(promo))
        
        // Store in Supabase
        const { error } = await supabase
          .from('promotions')
          .upsert(newPromotions, {
            onConflict: 'Company,"Promo code"',
            ignoreDuplicates: true
          })

        if (error) {
          console.error('Error storing promotions:', error)
          return
        }

        // Refresh the promotions list
        const { data: updatedData } = await supabase
          .from('promotions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (updatedData) {
          setPromotions(updatedData.map(transformPromotion))
        }
      }
    } catch (error) {
      console.error('Error fetching promotions:', error)
    }
  }

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          redirect('/sign-in')
        }
        setUser(user)
        
        // Fetch email promotions after user logs in
        await fetchEmailPromotions()
        
        // Load user's promotions from Supabase
        const { data: userPromotions, error } = await supabase
          .from('promotions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading promotions:', error)
          return
        }

        // If user has no promotions, add sample data
        if (!userPromotions || userPromotions.length === 0) {
          // Generate a random string to make promo codes unique
          const uniqueSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
          
          const samplePromotions = [
            {
              "Expiration Date": "2025-03-15",
              "Company": "Best Buy",
              "Category": "electronic",
              "Promo message": "Get $50 off on purchases over $200",
              "Promo code": `SPRING50_${uniqueSuffix}`,
              "Bar code": `4589721365${uniqueSuffix}`,
              "user_id": user.id,
              "created_at": new Date().toISOString()
            },
            {
              "Expiration Date": "2025-02-28",
              "Company": "Whole Foods",
              "Category": "grocery",
              "Promo message": "20% off on all organic products",
              "Promo code": `ORGANIC20_${uniqueSuffix}`,
              "Bar code": `7856439210${uniqueSuffix}`,
              "user_id": user.id,
              "created_at": new Date().toISOString()
            },
            {
              "Expiration Date": "2025-04-01",
              "Company": "Nike",
              "Category": "sports",
              "Promo message": "30% off on all running shoes",
              "Promo code": `RUN30_${uniqueSuffix}`,
              "Bar code": `9632587410${uniqueSuffix}`,
              "user_id": user.id,
              "created_at": new Date().toISOString()
            },
            {
              "Expiration Date": "2025-03-31",
              "Company": "Sephora",
              "Category": "cosmetics",
              "Promo message": "Free shipping on orders over $35",
              "Promo code": `FREESHIP_${uniqueSuffix}`,
              "Bar code": `1472583690${uniqueSuffix}`,
              "user_id": user.id,
              "created_at": new Date().toISOString()
            }
          ]

          const { error: insertError } = await supabase
            .from('promotions')
            .insert(samplePromotions)
            .select()

          if (insertError) {
            console.error('Error inserting sample promotions:', insertError.message)
            console.error('Error details:', {
              code: insertError.code,
              details: insertError.details,
              hint: insertError.hint
            })
          } else {
            setPromotions(samplePromotions.map(transformPromotion))
          }
        } else {
          setPromotions(userPromotions.map(transformPromotion))
        }
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

  // Function to delete a promotion
  const deletePromotion = async (promoCode: string) => {
    if (!user) return

    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('user_id', user.id)
      .eq('Promo code', promoCode)

    if (error) {
      console.error('Error deleting promotion:', error)
      return
    }

    // Update local state
    setPromotions(promotions.filter(p => p["Promo code"] !== promoCode))
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
    <div className="container mx-auto py-0">
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="mb-4 text-center w-full">
            <div className="text-xl mx-auto font-normal text-neutral-600 dark:text-neutral-400">
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
          <Button 
            onClick={fetchEmailPromotions}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Show "no results" message when filtered promotions are empty */}
        {filteredIndices !== null && 
         promotions.filter((_, index) => filteredIndices.includes(index)).length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="col-span-full">
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
            <Card key={index} className="border-2">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl mb-2">{promo.Company}</CardTitle>
                    <Badge className={`${getCategoryColor(promo.Category)}`}>
                      {promo.Category}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    Expires: {new Date(promo["Expiration Date"]).toLocaleDateString()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{promo["Promo message"]}</p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex flex-col gap-2">
                    <div>
                      <span className="font-bold">Promo Code: </span>
                      {promo["Promo code"]}
                    </div>
                    {promo["Bar code"] && (
                      <div className="flex flex-col gap-2">
                        <span className="font-bold">Bar Code: </span>
                        <div className="w-full flex justify-center">
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
              <CardFooter className="flex justify-between items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deletePromotion(promo["Promo code"])}
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
  )
}
