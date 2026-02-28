# 🎯 Circle Dashboard - n8n Integration

Modern dashboard for Circle community management with n8n workflow monitoring and Google Sheets integration.

## ✨ Features

### 📊 **Dashboard Overview**
- Real-time n8n workflow health monitoring
- Application statistics (pending, approved, rejected)
- Test completion tracking
- Member statistics (active, deactivated)
- Quick actions for common tasks

### 📝 **Application Management**
- View all applications from Google Sheets
- Filter by status (pending, all)
- **One-click approve/reject** (triggers n8n webhook)
- Real-time status updates
- Detailed application information display

### ⚙️ **Workflow Monitoring**
- Live n8n workflow status
- Active/inactive workflow tracking
- Node count per workflow
- Last update timestamps
- Direct links to n8n editor

### 👥 **Member Management** (Coming in Phase 2)
- Active members list
- Deactivated users
- Warning history
- Test results per user

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- n8n instance running (https://83ohvlw5.rpcld.net)
- Google Sheets with service account credentials
- n8n API key

### 1. Install Dependencies

```bash
cd circle-dashboard
npm install
```

### 2. Configure Environment Variables

Create `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# n8n Configuration
N8N_API_URL=https://83ohvlw5.rpcld.net
N8N_API_KEY=your_n8n_api_key_here

# Google Sheets
GOOGLE_SHEETS_ID=your_google_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

### 3. Google Service Account Setup

#### Create Service Account:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **Google Sheets API**
4. Create Service Account:
   - IAM & Admin → Service Accounts → Create Service Account
   - Name: `circle-dashboard-reader`
   - Role: None (we'll use direct sheet sharing)
5. Create JSON Key:
   - Click on service account → Keys → Add Key → JSON
   - Download the JSON file

#### Extract Credentials:

From the downloaded JSON file, copy:
- `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → `GOOGLE_PRIVATE_KEY`

#### Share Google Sheet:

1. Open your Google Sheet
2. Click Share
3. Add service account email (`...@...iam.gserviceaccount.com`)
4. Give **Viewer** permission
5. Done!

### 4. Get n8n API Key

Your n8n instance already has an API key:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0YjZkZGQzOS05ODgxLTQwODctOWQxYS0zNTBmY2U4NTdhNWYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWY1OGRmNDAtMWQ3ZC00NzAyLTllYjktN2Q0NWMxOTBhZTJlIiwiaWF0IjoxNzcyMjM4ODEyLCJleHAiOjE3NzQ3NTY4MDB9.Hl-lBAyNXFzJKVv-w8vUCjWRodBewPW-5FXVCzOJedc
```

Or create a new one:
- n8n → Settings → API → Create API Key

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
circle-dashboard/
├── app/
│   ├── layout.tsx              # Root layout with sidebar
│   ├── page.tsx                # Dashboard overview
│   ├── applications/
│   │   └── page.tsx            # Application management
│   ├── workflows/
│   │   └── page.tsx            # Workflow monitoring
│   └── api/
│       ├── workflows/
│       │   ├── route.ts        # Get workflows
│       │   └── health/         # Health metrics
│       ├── applications/
│       │   ├── route.ts        # Get applications
│       │   └── approve/        # Approve/reject
│       └── sheets/
│           └── stats/          # Dashboard stats
│
├── lib/
│   ├── n8n.ts                  # n8n API client
│   ├── sheets.ts               # Google Sheets client
│   └── utils.ts                # Utilities
│
├── components/
│   └── ui/                     # UI components
│       ├── card.tsx
│       ├── button.tsx
│       └── badge.tsx
│
├── .env.example                # Environment template
└── README.md                   # This file
```

---

## 🔌 API Integration

### n8n API Client

```typescript
import { n8nClient } from '@/lib/n8n'

// Get all workflows
const workflows = await n8nClient.getWorkflows()

// Get executions
const executions = await n8nClient.getExecutions(100)

// Trigger webhook
await n8nClient.triggerWebhook('manuel-onay/email@test.com?action=approve')

// Get health metrics
const health = await n8nClient.getHealthMetrics()
```

### Google Sheets Client

```typescript
import { sheetsClient } from '@/lib/sheets'

// Get applications
const applications = await sheetsClient.getApplications()
const pending = await sheetsClient.getPendingApplications()

// Get test results
const tests = await sheetsClient.getTestResults()

// Get dashboard stats
const stats = await sheetsClient.getDashboardStats()
```

---

## 🎨 UI Components

Using shadcn/ui-inspired components:

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <Button variant="default">Click me</Button>
    <Badge variant="success">Success</Badge>
  </CardContent>
</Card>
```

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Add environment variables in Vercel dashboard.

### Other Platforms

Works on any platform supporting Next.js 14:
- Railway
- Render
- DigitalOcean App Platform
- AWS Amplify

---

## 📊 Dashboard Pages

### 1. **Dashboard (/)**
- Overview stats
- n8n health metrics
- Quick actions
- Real-time updates (30s interval)

### 2. **Applications (/applications)**
- List all applications from Google Sheets
- Filter by status
- Approve/reject actions
- Triggers n8n webhook instantly

### 3. **Workflows (/workflows)**
- n8n workflow list
- Active/inactive status
- Node count
- Links to n8n editor

---

## 🔐 Security Notes

⚠️ **Important:** This is a Phase 1 implementation with basic security.

**Current State:**
- No authentication (anyone can access)
- Service account has read-only access to Sheets
- n8n webhook triggers are public (by design)

**For Production:**
```typescript
// Add NextAuth.js
npm install next-auth

// Protect routes
import { getServerSession } from "next-auth"
```

---

## 🧪 Testing

### Test n8n Connection

```bash
curl -H "X-N8N-API-KEY: YOUR_KEY" \
  https://83ohvlw5.rpcld.net/api/v1/workflows
```

### Test Google Sheets

Check if service account email has access to the sheet.

### Test Webhook Trigger

```bash
curl https://83ohvlw5.rpcld.net/webhook/manuel-onay/test@example.com?action=approve
```

---

## 📈 Performance

- **SSR + ISR:** Server-side rendering with revalidation
- **Caching:** API routes use Next.js cache (30-60s)
- **Real-time:** Client-side polling every 30 seconds
- **Optimized Fetching:** Parallel requests where possible

---

## 🐛 Troubleshooting

### "Error fetching workflows"

Check:
- n8n API URL is correct
- n8n API key is valid
- n8n instance is running

### "Error fetching applications"

Check:
- Google Sheets ID is correct
- Service account has access to the sheet
- Private key is properly formatted (with `\n`)

### Approve/Reject not working

Check:
- n8n webhook URL is accessible
- Workflow "Application Handler" is active
- Check n8n execution log

---

## 🚀 Phase 2 (Planned)

Features coming next:

1. **Supabase Integration**
   - PostgreSQL database
   - Dual-write (Sheets + Supabase)
   - Advanced queries

2. **Authentication**
   - Admin login
   - Role-based access

3. **Real-time Updates**
   - Websockets / Supabase Realtime
   - Live execution logs

4. **Advanced Analytics**
   - Charts & graphs (Recharts)
   - Export reports
   - Trend analysis

---

## 📝 License

MIT

## 👨‍💻 Author

Built with ❤️ for Circle Community Management

---

**Need Help?**

Check the n8n workflows:
- Application Handler
- Test Manager
- Role Assignment
- Warning System
- Daily Checker

All workflows are in `/Users/tuna/Desktop/n8n-circle/`
