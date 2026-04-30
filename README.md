<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Clinic Management System 🏥
**نظام إدارة العيادات**

A professional, AI-powered management system for clinic revenues, patient tracking, and financial analytics with tithe calculation support. Built with React, TypeScript, and Google Gemini AI.

**Live Demo:** https://clinical-management-six.vercel.app

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [Core Components](#core-components)
- [Data Types & Interfaces](#data-types--interfaces)
- [API Integration](#api-integration)
- [Deployment](#deployment)
- [Development](#development)

---

## 🎯 Overview

The Clinic Management System is a comprehensive solution designed to help clinic administrators efficiently manage:
- **Patient Records**: Track patient visits and services across multiple clinic locations
- **Revenue Management**: Calculate and track clinic revenue with automatic tithe and management fee deductions
- **Financial Analytics**: Visualize revenue trends and patient statistics with interactive charts
- **Multi-Clinic Support**: Manage two clinic locations (Minia & Beni Ahmed) with separate pricing and analytics
- **Historical Data**: Maintain complete audit trail of daily operations and financial records

### Key Characteristics
- **Bilingual Support**: Arabic (primary) and English interfaces
- **AI-Powered**: Google Gemini AI integration for enhanced functionality
- **Real-time Analytics**: Instant calculation and visualization of financial metrics
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Data Persistence**: Local storage of patient records and financial data

---

## ✨ Features

### 1. **Patient Management**
- Record patient visits with service type and clinic location
- Track 6 different service types:
  - كشف (Checkup) - General examination
  - إعادة (Follow-up) - Follow-up visits
  - تركيب لولب (IUD Insertion)
  - خلع لولب (IUD Removal)
  - خلع كبسولة (Capsule Removal)
  - اختبار حمل (Pregnancy Test)
- Automatic price calculation based on clinic and service type
- Daily patient summary statistics

### 2. **Revenue Tracking**
- Real-time revenue calculation per service and clinic
- **Automatic Deductions**:
  - Tithe calculation (Islamic financial obligation)
  - Management fees (operational costs)
  - Net revenue calculation
- Revenue breakdown by clinic and service type
- Historical revenue data storage and retrieval

### 3. **Financial Analytics**
- Interactive charts and graphs showing:
  - Revenue trends over time
  - Patient distribution by service type
  - Clinic performance comparison
  - Revenue vs. tithe visualization
- Custom date range filtering
- Detailed daily financial reports

### 4. **Multi-Clinic Management**
- Support for two clinic locations:
  - **عيادة المنيا** (Minia Clinic)
  - **عيادة بني أحمد** (Beni Ahmed Clinic)
- Separate pricing configurations per clinic
- Aggregated analytics across all clinics
- Clinic-specific performance metrics

### 5. **Settings Management**
- Configurable pricing per service and clinic
- Customizable management fee percentages
- Persistent settings storage
- Easy configuration interface

### 6. **Data Export & History**
- View complete patient history
- Lock daily records for financial auditing
- Export financial reports
- Searchable historical records

---

## 🛠 Tech Stack

### Frontend
- **React 19.0.0** - UI library
- **TypeScript ~5.8.2** - Type safety
- **Vite 6.2.0** - Build tool and dev server
- **TailwindCSS 4.1.14** - Utility-first CSS styling
- **Motion 12.23.24** - Animation library

### State Management & Data
- **React Hooks** - State management
- **LocalStorage API** - Client-side data persistence
- **TypeScript Interfaces** - Type definitions

### Charting & Visualization
- **Chart.js 4.5.1** - Charting library
- **react-chartjs-2 5.3.1** - React wrapper for Chart.js
- **Recharts 3.8.1** - Composable React components for charts

### AI Integration
- **Google Genai @1.29.0** - Gemini AI API client
- **AI Studio** - Google's AI application platform

### Backend & Deployment
- **Express 4.21.2** - Optional backend support
- **Vercel** - Hosting and deployment platform

### Development Tools
- **@vitejs/plugin-react 5.0.4** - React fast refresh
- **@tailwindcss/vite 4.1.14** - Vite plugin for Tailwind
- **autoprefixer 10.4.21** - CSS vendor prefixes
- **tsx 4.21.0** - TypeScript execution
- **@types/node 22.14.0** - Node.js type definitions
- **@types/express 4.17.21** - Express type definitions

---

## 📁 Project Structure

```
clinical-management/
├── src/
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # React entry point
│   ├── types.ts                # TypeScript type definitions
│   ├── constants.ts            # Application constants
│   ├── index.css               # Global styles
│   ├── components/
│   │   └── Charts.tsx          # Analytics and charts component
│   └── utils/
│       └── [utility functions] # Helper functions
├── public/                     # Static assets
├── index.html                  # HTML entry point
├── package.json                # Dependencies and scripts
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── vercel.json                 # Vercel deployment config
├── .env.example                # Environment variables template
├── metadata.json               # Application metadata
└── README.md                   # This file
```

---

## 💾 Data Architecture

### Core Type Definitions

#### `ServiceType`
```typescript
type ServiceType = 
  | 'CHECKUP'         // كشف
  | 'FOLLOWUP'        // إعادة
  | 'IUD_INSERTION'   // تركيب لولب
  | 'IUD_REMOVAL'     // خلع لولب
  | 'CAPSULE_REMOVAL' // خلع كبسولة
  | 'PREGNANCY_TEST'  // اختبار حمل
```

#### `ClinicType`
```typescript
type ClinicType = 'BENI_AHMED' | 'MINIA'
```

#### `PatientRecord`
```typescript
interface PatientRecord {
  id: string;              // Unique identifier
  timestamp: number;       // Timestamp of visit
  clinic: ClinicType;      // Which clinic
  service: ServiceType;    // Type of service provided
  price: number;           // Service price
}
```

#### `DailyRecord`
```typescript
interface DailyRecord {
  id: string;
  date: string;                                    // ISO date (YYYY-MM-DD)
  clinic: ClinicType | 'BOTH';                     // Clinic(s) for this record
  totalPatients: number;                           // Total patient count
  patientsByService: Record<ServiceType, number>;  // Breakdown by service
  revenueByService: Record<ServiceType, number>;   // Revenue by service
  patientsByClinic: Record<ClinicType, number>;    // Patients by clinic
  revenueByClinic: Record<ClinicType, number>;     // Revenue by clinic
  managementByClinic?: Record<ClinicType, number>; // Management fees
  allPatients?: PatientRecord[];                   // Full patient history
  totalGrossRevenue: number;                       // Before deductions
  tithe: number;                                   // Islamic tithe (2.5%)
  management: number;                              // Management fee
  totalNetRevenue: number;                         // After all deductions
  isLocked: boolean;                               // Record locked for audit
}
```

#### `AppSettings`
```typescript
interface AppSettings {
  prices: Record<ClinicType, Record<ServiceType, number>>;
  managementPrices: Record<ClinicType, Record<ServiceType, number>>;
}
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **yarn** package manager
- **Git** for version control

### Step 1: Clone the Repository
```bash
git clone https://github.com/baadishy/clinical-management.git
cd clinical-management
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
```bash
# Copy the example env file
cp .env.example .env.local

# Edit .env.local and add your Gemini API key
GEMINI_API_KEY=your_gemini_api_key_here
APP_URL=http://localhost:3000
```

### Step 4: Run Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

---

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```dotenv
# GEMINI_API_KEY: Required for Gemini AI API calls
# Get your key from: https://aistudio.google.com/app/apikeys
GEMINI_API_KEY=your_gemini_api_key_here

# APP_URL: The URL where the app is hosted
# For local development: http://localhost:3000
# For production: https://yourdomain.com
APP_URL=http://localhost:3000
```

### Default Pricing Configuration

The system comes with pre-configured pricing in `src/constants.ts`:

**Minia Clinic Prices:**
- كشف (Checkup): 200 EGP
- إعادة (Follow-up): 100 EGP
- تركيب لولب (IUD Insertion): 500 EGP
- خلع لولب (IUD Removal): 300 EGP
- خلع كبسولة (Capsule Removal): 400 EGP
- اختبار حمل (Pregnancy Test): 150 EGP

**Management Fees (10% of service price):**
- Checkup: 20 EGP
- Follow-up: 10 EGP
- IUD Insertion: 50 EGP
- IUD Removal: 30 EGP
- Capsule Removal: 40 EGP
- Pregnancy Test: 15 EGP

These can be customized through the app settings interface.

---

## 📖 Usage Guide

### Dashboard Overview
The main dashboard displays:
- Current date and clinic summary
- Quick action buttons for recording patient visits
- Real-time revenue metrics
- Patient statistics

### Recording a Patient Visit

1. **Select Clinic**: Choose between Minia or Beni Ahmed clinic
2. **Choose Service**: Select the type of service provided
3. **Confirm Price**: System auto-calculates price based on selection
4. **Record Visit**: Click to add the patient record
5. **View Calculations**: System automatically calculates tithe and management fees

### Viewing Financial Analytics

1. Navigate to the **Analytics** section
2. View interactive charts showing:
   - Revenue trends
   - Patient distribution
   - Clinic comparison
   - Tithe and deductions
3. Filter by date range for custom reports
4. Export data as needed

### Managing Settings

1. Go to **Settings** section
2. View and edit:
   - Service prices per clinic
   - Management fee percentages
   - Clinic information
3. Changes apply immediately

### Viewing History

1. Navigate to **History** section
2. View past records with complete breakdown
3. Lock records for accounting/audit purposes
4. Search by date or clinic

---

## 🔧 Core Components

### App.tsx (Main Component)
The heart of the application, containing:
- Complete state management for all patient and financial data
- UI layout and navigation
- All business logic for calculations
- Integration with Gemini AI
- Local storage management

**Key Features:**
- Manages patient records, daily summaries, and settings
- Calculates tithe (Islamic 2.5% deduction) automatically
- Handles multi-clinic analytics
- Provides export functionality

### Charts.tsx
Visualization component featuring:
- Revenue trend charts
- Patient distribution by service
- Clinic performance comparison
- Tithe vs. net revenue breakdown
- Interactive legends and tooltips

### constants.ts
Configuration constants:
- Clinic information and metadata
- Service type labels (Arabic)
- Default pricing tables
- LocalStorage key definitions

### types.ts
TypeScript interfaces and types defining the data model structure.

---

## 🌐 API Integration

### Google Gemini AI Integration

The application integrates with Google's Gemini API for:
- **AI-Powered Analytics**: Enhanced insights from financial data
- **Smart Recommendations**: Suggestions based on patterns
- **Data Analysis**: Natural language processing of records
- **Report Generation**: Automated report creation

#### Configuration
```typescript
// API key is loaded from environment variables
const apiKey = process.env.GEMINI_API_KEY;
```

#### Usage
The app sends financial data to Gemini for analysis when:
- Generating comprehensive reports
- Requesting insights on revenue trends
- Analyzing patient patterns
- Getting recommendations for pricing optimization

---

## 📦 Deployment

### Deploying to Vercel

This project is optimized for Vercel deployment.

#### Using Vercel CLI:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

#### Using GitHub:
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Vercel automatically deploys on push
4. Add environment variables in Vercel dashboard:
   - `GEMINI_API_KEY`
   - `APP_URL` (production URL)

#### Manual Configuration:
The `vercel.json` file includes:
- SPA routing configuration
- Service worker caching rules
- Manifest file handling
- Cache-Control headers

### Production Build
```bash
npm run build
npm run preview  # Preview production build locally
```

---

## 👨‍💻 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check (no emit)
npm run lint

# Clean build artifacts
npm clean dist
```

### Development Server
- **Port**: 3000 (configurable)
- **Host**: 0.0.0.0 (accessible from network)
- **Hot Module Replacement**: Enabled for instant code updates
- **Source Maps**: Enabled for debugging

### Browser Support
- Modern browsers with ES2020+ support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Code Style & Type Safety
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for React and TypeScript
- **TailwindCSS**: Utility-first CSS approach
- **Type Checking**: Run with `npm run lint`

---

## 🔐 Security & Data Privacy

### Data Storage
- All data stored locally in browser's LocalStorage
- No data sent to external servers except Gemini API
- HTTPS required in production
- Service worker for offline capability

### API Security
- Google Gemini API key stored in environment variables
- Never commit `.env.local` to version control
- Use `.env.example` as template
- API keys rotated regularly

### GDPR & Privacy
- No personal data is stored permanently
- Data can be exported or deleted by user
- No tracking or analytics (except what you configure)
- Compliant with data protection regulations

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: API key not working
- **Solution**: Verify key in `.env.local` and ensure it's valid from Google AI Studio

**Issue**: Data not persisting after refresh
- **Solution**: Check browser LocalStorage is enabled and not full

**Issue**: Charts not displaying
- **Solution**: Ensure date range has valid data; check browser console for errors

### Getting Help
- Check the [Issues page](https://github.com/baadishy/clinical-management/issues)
- Review the code documentation
- Contact the development team

---

## 📄 License

This project is licensed under the Apache 2.0 License - see LICENSE file for details.

```
SPDX-License-Identifier: Apache-2.0
```

---

## 🙏 Acknowledgments

- Built with [Google AI Studio](https://aistudio.google.com)
- Powered by [Google Gemini AI](https://deepmind.google/technologies/gemini/)
- UI Framework: [React](https://react.dev)
- Styling: [Tailwind CSS](https://tailwindcss.com)
- Build Tool: [Vite](https://vitejs.dev)
- Charting: [Recharts](https://recharts.org) and [Chart.js](https://www.chartjs.org)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📊 Project Statistics

- **Repository**: baadishy/clinical-management
- **Language**: TypeScript
- **License**: Apache-2.0
- **Created**: 4 days ago
- **Last Updated**: April 26, 2026
- **Status**: Active Development

---

**Last Updated**: April 30, 2026
