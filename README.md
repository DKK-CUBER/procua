# Procura — Autonomous B2B Procurement Intelligence & AI Negotiation Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.5.25-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Twilio Voice](https://img.shields.io/badge/Twilio_Voice-Telephony-F22F46?style=for-the-badge&logo=twilio)](https://www.twilio.com/)
[![Razorpay](https://img.shields.io/badge/Razorpay-B2B_Payments-0C2340?style=for-the-badge&logo=razorpay)](https://razorpay.com/)
[![Shiprocket](https://img.shields.io/badge/Shiprocket-Logistics_Tracking-7A1CAC?style=for-the-badge)](https://www.shiprocket.in/)
[![Tests](https://img.shields.io/badge/Tests-58%2F58_Passed-10B981?style=for-the-badge)]()

**Procura** is an enterprise-grade autonomous procurement platform that bridges strategic sourcing, AI multilingual voice negotiation, automated purchase order lifecycle management, milestone-based B2B payments, and real-time logistics tracking into a unified editorial workflow.

---

## 🏛️ System Architecture Overview

```
                               ┌───────────────────────────────────────────────┐
                               │             PROCURA WEB PLATFORM              │
                               │        (Next.js App Router + TypeScript)      │
                               └──────┬──────────────┬──────────────┬──────────┘
                                      │              │              │
             ┌────────────────────────┘              │              └────────────────────────┐
             ▼                                       ▼                                       ▼
┌─────────────────────────┐      ┌───────────────────────────────┐      ┌─────────────────────────┐
│ 1. SUPPLIER DISCOVERY   │      │ 2. AUTONOMOUS NEGOTIATION     │      │ 3. ORDER & FULFILLMENT  │
├─────────────────────────┤      ├───────────────────────────────┤      ├─────────────────────────┤
│ • SerpApi Multi-Search  │      │ • Twilio Outbound Telephony   │      │ • PO PDF Engine         │
│ • Domain Classifier     │      │ • Gemma 3 / Ollama Reasoning  │      │ • Razorpay Integer Money│
│ • Website Confidence    │      │ • Multilingual Code-Switching │      │ • Shiprocket AWB Ledger │
│ • Wholesale Benchmarks  │      │ • Strategic Counter-Offers    │      │ • Delay Risk Predictor  │
└─────────────────────────┘      └───────────────────────────────┘      └─────────────────────────┘
             │                                       │                                       │
             └───────────────────────► SQLite Prisma DB ◄────────────────────────────────────┘
```

---

## ⚡ Key Capabilities & Built Systems

### 1. Direct Supplier Discovery & Classification Engine
- **Multi-Intent Marketplace Separation**: Segregates open marketplaces (IndiaMART, Amazon, Flipkart) from direct B2B manufacturers and distributors using domain classification heuristics.
- **Wholesale Price Intelligence**: Calculates baseline commercial wholesale benchmark ranges and indexes candidates with `Supplier-confirmed quote` or `Indicative wholesale price` badges.
- **Truthful Safeguards**: Never fabricates contact information; validates official websites using confidence scoring (`confidence >= 0.90`) and gates outbound contact channels.

### 2. Autonomous Multilingual Voice AI Negotiator
- **Live Outbound Telephony (Twilio REST API)**: Direct voice calling pipeline equipped with Amazon Polly (`Polly.Aditi`) neural voice synthesis for Indian English and regional accents.
- **Dynamic Code-Switching & Language Understanding**: Detects and adapts in real time across **English, Tamil (Tanglish), Hindi (Hinglish), Telugu, and Kannada**.
- **Strategic Constraint-Driven Reasoning**:
  - Automatically respects buyer budget ceilings without ever leaking internal confidential caps.
  - Generates calculated counter-offers based on quantity scale and freight terms.
  - Non-binding rule enforcement: Never finalizes binding orders without human buyer review.
- **Real-Time Live Transcript Feed**: Live bi-directional turn recording displayed on the web dashboard with instant seller speech simulation controls.

### 3. Smart RFQ Email Threading & Extraction
- **Local Gemma 3 AI Extraction**: Extracts unit prices, lead times, MOQ, GST terms, and freight status from inbound email quotations.
- **RFC-Compliant SMTP Dispatch**: Automated preview and dispatch with tracking reference IDs (`PROC-2026-XXXXX`).

### 4. Legally Enforceable Purchase Order (PO) & PDF Engine
- **Deterministic PO Generation**: Calculates line items, GST breakdown (18%), delivery terms, and milestone payment terms.
- **Cryptographic PDF Buffer Generator**: Compiles downloadable, publication-grade Purchase Order PDFs with verifiable signatures.

### 5. Razorpay Enterprise B2B Payment Gateway
- **Integer Paise Money Architecture**: Zero floating-point rounding errors across advance payments (30%) and delivery balance milestones (70%).
- **HMAC-SHA256 Cryptographic Verification**: Signature verification for checkout orders and server-to-server webhook events.
- **Live / Test Mode Toggle**: Seamless support for instant test validation and live Razorpay merchant accounts.

### 6. Shiprocket Logistics Tracking Ledger & Delay Risk Predictor
- **Real Carrier Ledger Integration**: Merges purchase orders with real-time Shiprocket AWB tracking (`SR1031`, `SR2930`).
- **Dynamic Checkpoint Feed**: Simulates carrier logistics scans (Pickup, Linehaul Hub Dispatch, Out for Delivery, Warehouse Arrival) with persistent audit logs.
- **AI Delay Risk & Trade-off Recovery**: Heuristic prediction engine categorizing delays as Low/Medium/High risk and providing actionable expedited recovery routes.

### 7. SQLite Prisma DB & Secure Role-Based Auth
- **Durable Persistence**: Complete database backing for `User`, `Business`, `BusinessMember`, `ProcurementRequest`, `PurchaseOrder`, `Shipment`, and `Session`.
- **Bcrypt Hashing & JWT Claims**: Secure authentication pipeline with role hierarchy enforcement (Owner, Manager, Viewer).

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 15.5 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend** | Next.js Route Handlers, Node.js, Prisma ORM (v5.22.0), SQLite |
| **Voice AI & Telephony** | Twilio REST API, TwiML, Amazon Polly (`Polly.Aditi`), Dynamic Language Parser |
| **AI Reasoning** | Gemma 3 via local Ollama LLM client + Deterministic Semantic Extractor |
| **Payments** | Razorpay B2B Payments (HMAC-SHA256, Integer Paise Math) |
| **Logistics** | Shiprocket API, Real AWB Ledger, Carrier Checkpoint Simulator |
| **Testing** | Custom Node.js & TypeScript automated test runner (5 suites, 58+ tests) |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18.x or higher
- npm or pnpm

### 1. Installation
```bash
git clone https://github.com/DKK-CUBER/procua.git
cd procua
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the project root:
```env
# Telephony Configuration (Twilio)
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_API_KEY="your_twilio_api_key"
TWILIO_API_SECRET="your_twilio_api_secret"
TWILIO_PHONE_NUMBER="+17372508034"
TWILIO_RECORD_CALLS="true"
PUBLIC_BASE_URL="http://localhost:3000"
DEMO_DESTINATION_PHONE="+916369763938"

# Search & Market Intelligence (SerpApi)
SERPAPI_API_KEY="your_serpapi_api_key"

# Local AI LLM (Ollama)
OLLAMA_BASE_URL="http://127.0.0.1:11434"
OLLAMA_MODEL="gemma3:latest"

# Database Configuration
DATABASE_URL="file:./dev.db"

# Payment Gateway (Razorpay)
PAYMENT_MODE="test"
```

### 3. Database Initialization
```bash
npx prisma generate
npx prisma db push
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Comprehensive Automated Test Suites

Procura includes an extensive suite of automated tests verifying the entire production flow:

```bash
npm test
```

### Test Suite Coverage:
1. **Production Flow Suite**: Domain separation, website confidence scoring, local Gemma 3 AI extraction, and binary PO PDF compilation.
2. **Business Hours & Voice AI Suite**: Calling window safeguard, multilingual code-switching (Tamil/Hindi/English), budget protection, and TwiML voice XML synthesis.
3. **Payments & Logistics Suite**: Integer paise arithmetic, HMAC-SHA256 webhook signatures, address verification gates, and real AWB tracking requirements.
4. **Database Auth Suite**: Bcrypt password hashing, Prisma SQLite persistence, JWT session claims, and RBAC hierarchy.
5. **Core Backend Suite**: Variance calculations, shipment delay predictions, and recovery engine recommendations.

---

## 📄 API Reference Summary

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/procurement/search` | `POST` | Multi-intent direct supplier discovery and market indexing |
| `/api/negotiations/start` | `POST` | Initiates multi-supplier queue & live outbound Twilio call |
| `/api/negotiations/turn` | `POST` | AI reasoning engine processing dynamic seller spoken turns |
| `/api/negotiations/live` | `GET` | Real-time speech transcript sync endpoint |
| `/api/webhooks/twilio/voice` | `POST` | Twilio bi-directional voice webhook handler |
| `/api/payments/orders` | `POST` | Creates Razorpay order with calculated integer paise |
| `/api/payments/verify` | `POST` | Cryptographically verifies Razorpay payment signature |
| `/api/shipments` | `GET` | Returns consolidated shipment ledger with active scans |
| `/api/shipments/[id]` | `GET` | Fetches live tracking milestones and carrier scans for an AWB |
| `/api/auth/signup` | `POST` | Registers new business and user in SQLite DB |
| `/api/auth/login` | `POST` | Authenticates credentials and issues session token |

---

## 🛡️ License

Built for the **Spiderverse Hackathon 2026**. Licensed under the [MIT License](LICENSE).
