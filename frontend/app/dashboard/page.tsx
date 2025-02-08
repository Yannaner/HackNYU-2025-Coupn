'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { redirect } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Barcode from 'react-barcode'

interface Promotion {
  "Expiration Date": string
  "Company": string
  "Category": "retail" | "electronic" | "grocery" | "sports" | "health" | "cosmetics" | "music" | "books" | "misc" | "dining" | "travel" | "clothing"
  "Promo message": string
  "Promo code": string
  "Bar code": string | null
  user_id: string
}

const CATEGORIES = ["retail", "electronic", "grocery", "sports", "health", "cosmetics", "music", "books", "misc", "dining", "travel", "clothing"] as const

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          redirect('/sign-in')
        }
        setUser(user)
        
        // Load sample data - we'll replace this with real data later
        const sampleData = {
          "promotions": [
            {
              "Expiration Date": "2025-03-15",
              "Company": "Best Buy",
              "Category": "electronic",
              "Promo message": "Get $50 off on purchases over $200",
              "Promo code": "SPRING50",
              "Bar code": "4589721365"
            },
            {
              "Expiration Date": "2025-02-28",
              "Company": "Whole Foods",
              "Category": "grocery",
              "Promo message": "20% off on all organic products",
              "Promo code": "ORGANIC20",
              "Bar code": "7856439210"
            }
          ]
        }

        // Validate if a category string matches our expected categories
        const isValidCategory = (category: string): category is Promotion['Category'] => {
          return CATEGORIES.includes(category as Promotion['Category'])
        }

        // Transform and validate promotion data
        const transformPromotion = (promo: any, userId: string): Promotion => {
          // If category is not valid, default to "misc"
          const category = isValidCategory(promo.Category) ? promo.Category : "misc"
          
          return {
            "Expiration Date": promo["Expiration Date"],
            "Company": promo.Company,
            "Category": category,
            "Promo message": promo["Promo message"],
            "Promo code": promo["Promo code"],
            "Bar code": promo["Bar code"] || null,
            user_id: userId
          }
        }

        // First, let's check if we can read from the table
        const { data: existingData, error: readError } = await supabase
          .from('promotions')
          .select('*')
        
        if (readError) {
          console.error('Error reading promotions:', readError)
          // Add user_id to sample data before setting it
          const promotionsWithUserId = sampleData.promotions.map(promo => 
            transformPromotion(promo, user.id)
          )
          setPromotions(promotionsWithUserId)
          return
        }

        // If we can read successfully, try to store the sample data
        const { error: writeError } = await supabase
          .from('promotions')
          .upsert(sampleData.promotions.map(promo => 
            transformPromotion(promo, user.id)
          ), {
            onConflict: 'Company,"Promo code"',
            ignoreDuplicates: true
          })

        if (writeError) {
          console.error('Error storing promotions:', writeError)
          // Transform the sample data to include user_id before setting state
          setPromotions(sampleData.promotions.map(promo => transformPromotion(promo, user.id)))
        } else {
          // If write successful, fetch the latest data
          const { data: updatedData } = await supabase
            .from('promotions')
            .select('*')
            .eq('user_id', user.id)
          
          setPromotions(updatedData || sampleData.promotions)
        }

        setLoading(false)
      } catch (error) {
        console.error('Unexpected error:', error)
        setLoading(false)
      }
    }

    checkUser()
  }, [])

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
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome, {user?.email}</h1>
        <p className="text-muted-foreground">Here are your available promotions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promotions.map((promo, index) => (
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
            <CardFooter className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(promo["Promo code"])
                }}
              >
                Copy Code
              </Button>
              {promo["Bar code"] && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (promo["Bar code"]) {
                      navigator.clipboard.writeText(promo["Bar code"])
                    }
                  }}
                >
                  Copy Bar Code
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Add More Promotions</CardTitle>
            <CardDescription>Connect your email to find more deals</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We'll scan your inbox for the latest promotional offers.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => {
                console.log('Fetching more promotions...')
              }}
            >
              Refresh Promotions
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
