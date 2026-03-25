# Reddit Sentiment

A powerful multi-brand sentiment monitoring platform that tracks Reddit conversations across communities. Built for businesses to understand customer sentiment, identify pain points, and discover actionable insights from Reddit discussions.

![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-blue?logo=postgresql)
![Prisma](https://img.shields.io/badge/Prisma-6.7-2D3748?logo=prisma)

## 🎯 Features

### Core Functionality
- **Multi-Brand Management** - Track sentiment for multiple brands from one account
- **Smart Subreddit Recommendations** - AI-powered suggestions based on industry and location
- **Local Focus** - Target city-specific subreddits for local businesses
- **Real-time Sentiment Analysis** - Track positive, negative, and neutral mentions
- **Keyword Tracking** - Monitor specific phrases, products, or competitors
- **Advanced Filtering** - Filter by sentiment, subreddit, date range, and keywords
- **Complaint Categorization** - Automatically categorize negative feedback
- **Pain Point Discovery** - AI-powered research to identify customer pain points
- **CSV Export** - Export filtered data for further analysis

### Geographic Support
- **100+ City Subreddits** covering:
  - 🇺🇸 18 major US cities (NYC, LA, Chicago, SF, Seattle, Austin, etc.)
  - 🇨🇦 4 Canadian cities (Toronto, Vancouver, Montreal, Calgary)
  - 🇬🇧 3 UK cities (London, Manchester, Birmingham)
  - 🇦🇺 3 Australian cities (Sydney, Melbourne, Brisbane)

### Industry Coverage
- E-commerce / Retail
- Technology / SaaS
- Gaming
- Fashion & Apparel
- Health & Fitness
- Food & Beverage
- Automotive
- Travel & Tourism
- Finance
- And more...

## 🏗️ Tech Stack

### Frontend
- **Next.js 14.2** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful UI components
- **Recharts** - Data visualization
- **React Hook Form** - Form management

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma ORM** - Type-safe database client
- **PostgreSQL** - Production database
- **NextAuth.js** - Authentication system

### Key Libraries
- `@tanstack/react-query` - Data fetching and caching
- `lucide-react` - Icon library
- `date-fns` - Date manipulation
- `zod` - Schema validation
- `bcryptjs` - Password hashing

## 📦 Project Structure

```
meepo_sentiment_dashboard/
├── app/                          # Next.js App Router directory
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── brands/               # Brand management
│   │   │   ├── suggest-subreddits/  # Smart subreddit recommendations
│   │   │   └── [brandId]/keywords/  # Keyword tracking
│   │   ├── sentiment/            # Sentiment data endpoints
│   │   │   ├── categories/       # Complaint categorization
│   │   │   ├── export/          # CSV export
│   │   │   ├── filters/         # Available filters
│   │   │   ├── refresh/         # Data refresh
│   │   │   ├── stats/           # Statistics
│   │   │   └── suggestions/     # AI suggestions
│   │   └── research/            # Pain point research
│   ├── auth/                    # Auth pages (signin/signup)
│   ├── components/              # React components
│   │   ├── brand-setup-wizard.tsx    # Onboarding flow
│   │   ├── brand-switcher.tsx        # Multi-brand selector
│   │   ├── dashboard-client.tsx      # Main dashboard
│   │   ├── keyword-manager.tsx       # Keyword tracking UI
│   │   ├── sentiment-charts.tsx      # Data visualization
│   │   └── subreddit-selector.tsx    # Subreddit selection
│   ├── onboarding/              # Brand setup page
│   ├── research/                # Research dashboard
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home/Dashboard page
│   └── globals.css              # Global styles
├── components/                   # Shared UI components
│   └── ui/                      # shadcn/ui components
├── lib/                         # Utility libraries
│   ├── auth.ts                  # Auth configuration
│   ├── db.ts                    # Prisma client
│   ├── types.ts                 # TypeScript types
│   └── utils.ts                 # Helper functions
├── prisma/                      # Database schema and migrations
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Migration history
├── scripts/                     # Utility scripts
│   ├── seed.ts                  # Database seeding
│   └── meepo_reddit_tracker.py  # Reddit data collection
├── data/                        # Data storage
└── public/                      # Static assets
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and yarn
- PostgreSQL database
- Reddit API credentials (for data collection)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd meepo_sentiment_dashboard
   ```

2. **Install dependencies**
   ```bash
   cd app
   yarn install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `app` directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@host:port/database"
   
   # Authentication
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Reddit API (for data collection)
   REDDIT_CLIENT_ID="your-reddit-client-id"
   REDDIT_CLIENT_SECRET="your-reddit-client-secret"
   REDDIT_USER_AGENT="YourApp/1.0"
   ```

4. **Run database migrations**
   ```bash
   yarn prisma migrate deploy
   ```

5. **Seed the database (optional)**
   ```bash
   yarn prisma db seed
   ```

6. **Start the development server**
   ```bash
   yarn dev
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Schema

### Core Models

**Brand**
- Multi-tenant brand profiles
- Location tracking (city, state, country)
- Local focus toggle
- Subscription tier management

**BrandSubreddit**
- Subreddit assignments per brand
- Priority ordering
- Active/inactive status

**BrandKeyword**
- Keyword tracking per brand
- Track/exclude types
- Optional categorization

**SentimentData**
- Reddit post/comment content
- Sentiment scores and labels
- Brand associations
- Matched keywords

**User**
- Account management
- Multi-brand ownership
- NextAuth integration

## 📊 Key Features Explained

### 1. Smart Subreddit Recommendations

The system intelligently suggests subreddits based on:
- **Industry Category** - Maps business type to relevant communities
- **Brand Keywords** - Extracts keywords from brand name
- **URL Analysis** - Parses website URL for relevant terms
- **Local Focus** - Prioritizes city-specific subreddits when enabled

**Example:**
```
Brand: "Joe's Pizza"
Category: Food & Beverage
Local: Chicago, IL
```

**Suggestions:**
1. r/chicago (city main)
2. r/chicagofood (city + category match)
3. r/AskChicago (city Q&A)
4. r/pizza (keyword match)
5. r/food (category)

### 2. Local Focus

Enable local focus to:
- Track city-specific conversations
- Monitor neighborhood sentiment
- Discover local customer feedback

Supports:
- City input (required)
- State/province (optional)
- Country selection
- Automatic city subreddit detection

### 3. Keyword Tracking

Track specific phrases or terms:
- **Track Keywords** - Monitor mentions (e.g., "customer service", "delivery time")
- **Exclude Keywords** - Filter out irrelevant posts
- **Categories** - Organize keywords (product, complaint, competitor)

### 4. Pain Point Research

AI-powered research to:
- Identify common customer complaints
- Discover product improvement opportunities
- Analyze competitor weaknesses
- Generate actionable business insights

## 🔐 Authentication

The platform uses NextAuth.js with:
- Email/password authentication
- Secure password hashing (bcrypt)
- Session management
- Protected API routes

**Default Test Account:**
- Email: `demo@example.com`
- Password: (set during signup)

## 📈 Usage Guide

### Setting Up Your First Brand

1. **Sign up** and create your account
2. **Complete onboarding**:
   - Enter brand name
   - Select industry category
   - (Optional) Enable local focus and enter location
   - Choose 3-5 subreddits from smart suggestions
3. **Start monitoring** - View sentiment data on dashboard

### Managing Keywords

1. Navigate to the **Keywords** tab
2. Add keywords you want to track
3. Choose type: Track or Exclude
4. (Optional) Assign a category
5. Keywords will be matched against new sentiment data

### Exporting Data

1. Apply desired filters (sentiment, subreddit, date range)
2. Click **Export CSV** button
3. Download filtered data with brand name in filename

### Research Dashboard

1. Navigate to **Research** page
2. Create a research query:
   - Enter subreddits to search
   - Add relevant keywords
   - Set date range
   - Set result limits
3. AI analyzes posts and identifies pain points
4. View categorized insights and business opportunities

## 🔄 Data Collection

The system uses a Python script (`meepo_reddit_tracker.py`) to collect Reddit data:

```python
# Run the Reddit tracker
python scripts/meepo_reddit_tracker.py
```

**Features:**
- Fetches posts and comments from tracked subreddits
- Performs sentiment analysis
- Identifies brand mentions
- Stores data in PostgreSQL

**Requirements:**
- Python 3.8+
- Reddit API credentials
- PRAW library

## 🚢 Deployment

### Environment Variables for Production

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="strong-random-secret"
NEXTAUTH_URL="https://yourdomain.com"
REDDIT_CLIENT_ID="..."
REDDIT_CLIENT_SECRET="..."
REDDIT_USER_AGENT="..."
```

### Build for Production

```bash
cd app
yarn build
yarn start
```

### Recommended Platforms
- **Vercel** - Optimal for Next.js apps
- **Railway** - PostgreSQL + Next.js hosting
- **AWS/GCP/Azure** - Enterprise deployments

## 🧪 Testing

```bash
# Run TypeScript type checking
yarn tsc --noEmit

# Build the application
yarn build
```

## 📝 API Endpoints

### Brands
- `GET /api/brands` - List all brands for user
- `POST /api/brands` - Create new brand
- `POST /api/brands/suggest-subreddits` - Get subreddit recommendations

### Keywords
- `GET /api/brands/[brandId]/keywords` - List keywords
- `POST /api/brands/[brandId]/keywords` - Add keyword
- `PATCH /api/brands/[brandId]/keywords` - Update keyword
- `DELETE /api/brands/[brandId]/keywords` - Remove keyword

### Sentiment
- `GET /api/sentiment` - Get sentiment data (with filters)
- `GET /api/sentiment/stats` - Get statistics
- `GET /api/sentiment/filters` - Get available filters
- `GET /api/sentiment/export` - Export to CSV
- `GET /api/sentiment/categories` - Get complaint categories
- `GET /api/sentiment/suggestions` - Get AI suggestions
- `POST /api/sentiment/refresh` - Refresh data

### Research
- `POST /api/research` - Create research query
- `GET /api/research` - List research queries
- `POST /api/research/analyze` - Analyze results
- `GET /api/research/insights` - Get AI insights

## 🤝 Contributing

This is a private project. If you'd like to contribute, please contact the repository owner.

## 📄 License

Private - All rights reserved

## 🆘 Support

For questions or issues:
1. Check the documentation above
2. Review existing GitHub issues
3. Contact the project maintainer

## 🎯 Roadmap

- [ ] Real-time data refresh automation
- [ ] Email alerts for negative sentiment spikes
- [ ] Multi-language sentiment analysis
- [ ] Competitor comparison dashboard
- [ ] Mobile app (iOS/Android)
- [ ] WhatsApp/Slack integrations
- [ ] Advanced analytics and reporting
- [ ] Custom sentiment model training

## 📊 Performance

- **Fast API responses** - Sub-100ms queries with proper indexing
- **Efficient filtering** - Optimized Prisma queries
- **Scalable architecture** - Supports thousands of brands
- **Real-time updates** - React Query for data synchronization

## 🔒 Security

- Secure password hashing with bcrypt
- Protected API routes with NextAuth
- SQL injection prevention with Prisma
- Environment variable management
- Data isolation per user/brand

---

Built with ❤️ using Next.js, TypeScript, and Prisma
