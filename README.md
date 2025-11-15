# AgentOS Platform - Unified Real Estate SaaS

Complete real estate platform with 4 integrated interfaces in ONE application.

## Routes

- `/` - Public property search (HomeFinder AI) - NO login required
- `/admin` - Platform admin dashboard (Roy's interface)
- `/[company]/dashboard` - Multi-tenant realtor dashboard
- `/customer` - Customer/buyer portal

## Features

- Multi-tenant architecture with RLS
- All 7 property categories (residential, commercial, industrial, rental, land, vacation, investment)
- AI-powered lead scoring
- Blockchain transaction verification
- Partnership revenue tracking (60-70% to agents)
- Real-time property search
- Complete CRM system

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS  
- Supabase (database + auth)
- Recharts (analytics)

## Deployment

1. Deploy database: AGENTOS-COMPLETE-SCHEMA.sql to Supabase
2. Set environment variables
3. Deploy to Vercel
4. Configure custom domain

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://kteobfyferrukqeolofj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```
