<img width="651" alt="coupn" src="https://github.com/user-attachments/assets/0bad20d3-31c2-4752-9708-9054c1f1bae1" />


# Coupn: America's Solution's to Credit Card Debt - SCROLL DOWN FOR INSTALLATION GUIDE

Coupn is built to help you save money by finding promo codes hidden in your email. We noticed many people ignore promo emails and existing promo code tools just don’t work. Coupn fixes that by automatically scanning your promotion emails, finding the best deals, and showing them to you—all in a simple, easy-to-use format.

---

## What Is Coupn?

Coupn grabs your promotion emails from your inbox and looks through every part of the email to find the promo codes and messages you need. We use smart image processing and natural language tools to scan the email, even when it’s filled with up to 30 colorful images. With Coupn, you no longer have to search through long emails or rely on unreliable browser extensions.

---

## How It Works

- **Email Fetching:** Coupn automatically pulls in your promotion emails. No more missing out on deals because you forgot to check your inbox.
- **Image & Text Processing:** Our tool goes through all the images and text in each email. It finds the promo code by looking at every detail, even when the email is busy with multiple images.
- **Big Language Model:** We switched from OpenAI to Gemini because Gemini can handle long emails with many images. This upgrade gives us a huge context window so that no promo code goes unnoticed.
- **Voice Commands:** You can also use your voice. Just say, "Hey Coupn, I want to go grocery shopping, what promos are available?" and Coupn will show you the best deals for grocery shopping.
- **Secure Backend with Supabase:** All the data is stored and processed securely using Supabase, which makes the whole process fast and reliable.

---

## The Problem We Solved

Promotion emails are often ignored, and even when people do check them, it’s hard to pick out the useful deals. Here’s what we noticed:

- **Cluttered Emails:** A typical promo email is filled with many images and long texts. This clutter makes it hard to find the actual promo code.
- **Unreliable Tools:** Existing promo code tools and browser extensions are often inaccurate or just don’t work.
- **Wasting Time:** Users spend too much time scrolling through emails and clicking on wrong codes, which means they miss out on real savings.

Coupn tackles these problems by using advanced tools to sift through the clutter and deliver only the best deals.

---

## Overcoming Challenges

One of the biggest challenges was dealing with the busy design of promo emails. With up to 30 images per email, figuring out which image holds the promo code was like finding a needle in a haystack. We solved this by:

- **Using Gemini:** Gemini gives us a massive context window—up to one million tokens—which means it can process very long emails accurately. This made it possible to extract the promo code even from the most image-heavy emails.
- **Combining Techniques:** By using both image processing and natural language processing, we ensured that we capture both the visual and text parts of the email. This dual approach is what makes Coupn so effective.

---

## What We’re Proud Of

- **Simple:** Coupn is easy to use. You don’t need to be tech-savvy to find the best deals.
- **Unique:** It offers a fresh way to deal with promo emails, unlike any other tool out there.
- **Effective:** Our approach reliably extracts the right promo codes every time, saving you time and money.
- **Useful:** By letting you access the best deals quickly, Coupn helps reduce the burden of credit card debt through smart savings.

---

## What’s Next for Coupn

We’re just getting started. Here’s what we plan to add:

- **Credit Card Cashback Rewards:** We want to integrate credit card cashback rewards so that you can combine promo codes with your card offers for even more savings.
- **Personalized Deal Recommendations:** Future updates will look at your shopping habits and suggest deals that are perfect for you.
- **Mobile App:** We’re planning to develop a mobile app, so you can access Coupn on the go.
- **Expanded Voice Features:** We aim to improve the voice command feature to support more queries and actions, making it even easier to get the deals you want.

---

## Final Thoughts

Coupn is built for anyone tired of missing out on great deals hidden in messy promotion emails. Our tool makes saving money simple, effective, and stress-free. We are excited to see how Coupn can help people manage their spending and reduce credit card debt. We look forward to your feedback and ideas as we continue to improve and add new features.

Try Coupn today and see how easy it is to get the best promo codes without any hassle!

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Gmail Account
- Supabase Account
- OpenAI API Key
- Google Cloud Project with Vision API enabled
- Google Gemini API Key

### Environment Setup

1. **Frontend Setup (.env.local)**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

2. **Backend Setup (.env)**
```bash
GMAIL_CREDENTIALS_PATH=path_to_gmail_credentials.json
GOOGLE_APPLICATION_CREDENTIALS=path_to_google_cloud_credentials.json
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
```

### Installation

1. **Clone the Repository**
```bash
git clone https://github.com/yourusername/coupn.git
cd coupn
```

2. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

3. **Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

4. **Database Setup**
- Create a new Supabase project
- Run the following SQL to create the required tables:
```sql
CREATE TABLE promotions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  company TEXT NOT NULL,
  category TEXT NOT NULL,
  promo_message TEXT NOT NULL,
  promo_code TEXT,
  expiration_date DATE,
  promo_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, company, promo_message)
);
```

### Gmail API Setup
1. Go to Google Cloud Console
2. Create a new project
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Download credentials and save as `gmail_credentials.json`
6. Run the backend once to complete OAuth flow

## Development

### Frontend Structure
```
frontend/
├── app/              # Next.js app router pages
├── components/       # React components
├── lib/             # Utility functions
├── public/          # Static assets
└── styles/          # Global styles
```

### Backend Structure
```
backend/
├── email/           # Email processing modules
├── models/          # Data models
├── utils/           # Utility functions
└── app.py          # Main Flask application
```

### Key Features Implementation

1. **Email Processing Pipeline**
   - Fetches emails using Gmail API
   - Extracts images and text content
   - Processes images with Google Vision API
   - Uses Gemini Pro Vision for comprehensive analysis

2. **Natural Language Search**
   - Implements semantic search using OpenAI
   - Matches user queries with relevant promotions
   - Supports both text and voice input

3. **Voice Commands**
   - Uses Web Speech API for voice recognition
   - Processes natural language queries
   - Returns relevant promotions based on voice input

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

---

*America's answer to credit card debt is here—with Coupn, saving money has never been simpler.*
