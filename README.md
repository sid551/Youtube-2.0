# 📺 YourTube 2.0 — Next-Generation Video Streaming, Watch Party & Security Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.2.11-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38BDF8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Brevo](https://img.shields.io/badge/Brevo-REST_API-00B289?style=for-the-badge&logo=sendinblue)](https://www.brevo.com/)
[![MailerSend](https://img.shields.io/badge/MailerSend-REST_API-111827?style=for-the-badge)](https://www.mailersend.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Integration-02042B?style=for-the-badge&logo=razorpay)](https://razorpay.com/)

**YourTube 2.0** is a full-featured video streaming and real-time Watch Party web platform modeled after YouTube. Built with Next.js, React 19, TypeScript, Express, Node.js, and MongoDB, it features real-time WebSocket synchronized Watch Parties, WebRTC face-to-face video calling & screen sharing, multi-provider REST API transactional email services (Brevo & MailerSend), Razorpay-powered subscription tiers, multi-factor step-up security verification, and an automated IST time-based theme engine.

---

## 🌟 Key Features

### 🔐 1. Authentication & Step-Up Security (MVP)
* **Firebase Authentication**: Supports Google OAuth Sign-In and Email/Password registration/login.
* **Device & Location Fingerprinting**: Tracks `deviceId` (UUID stored in browser storage), OS, Browser metadata, and IP geolocation (`ipapi.co`).
* **Step-Up Verification (Unusual Login)**:
  * Automatically compares sign-in attempts against `trustedDevices` array stored in MongoDB.
  * If logging in from an unrecognized device or unfamiliar location (city/state), the backend generates a **6-digit numerical OTP code** valid for 10 minutes.
  * Prompts an **OTP Verification Modal** on the frontend with a numeric keyboard layout (`inputMode="numeric"`).
  * Upon successful verification, the device is saved into the user's `trustedDevices` list for future seamless logins.
* **Smart Time-Based Theme Engine**:
  * Manual Light/Dark mode toggle synced with DOM root classes.
  * **Automated IST Schedule**: Automatically switches to Light Mode between 10:00 AM – 12:00 PM Indian Standard Time (IST) and Dark Mode otherwise, with a single-click reset option.

---

### 📧 2. Transactional Email Notification Service (MVP)
* **Multi-Provider REST API Transport (`emailService.js`)**:
  * Operates over **HTTPS (Port 443)** to guarantee reliable delivery on cloud hosting environments (such as Render) where outbound SMTP ports are blocked.
  * **Priority Routing**: `Brevo REST API` (Primary, 300 free emails/day) $\rightarrow$ `MailerSend REST API` $\rightarrow$ `Resend REST API` $\rightarrow$ `Gmail SMTP`.
* **Subscription Purchase Confirmation**:
  * Automatically dispatches HTML invoice receipts after successful Razorpay payment verification.
  * Includes User Name, Plan Name (Bronze, Silver, Gold), Amount Paid, Transaction ID (`paymentId`), Order ID, Purchase Date, and Expiry Date.
* **Security OTP Emails**:
  * Delivers 6-digit numerical OTP security codes instantly to the user's inbox upon step-up login verification triggers.
* **Non-Blocking Architecture**:
  * Email delivery errors are logged without rolling back subscription updates or blocking user sign-in.

---

### 🍿 3. Real-Time Watch Parties & WebRTC Screen Sharing
* **WebSocket Playback Synchronization**: Powered by `socket.io-client` for real-time play, pause, and seek synchronization across all room participants.
* **WebRTC Face-to-Face Video Grid**: Multi-user peer-to-peer webcam grid with mute/unmute and camera toggles.
* **WebRTC Screen Sharing**: In-browser screen sharing with automatic video track replacement across all connected peers.
* **Instant Invite Link Sharing**:
  * Sticky top navbar header button and quick-action bar for 1-click invite link copying.
  * Integrated **Web Share API** (`navigator.share`) for native sharing on mobile devices (WhatsApp, Telegram, Messages).
* **Host Control & Recording**: Master playback lock for hosts and in-browser WebRTC session recording.

---

### 🎬 4. Custom Video Player & Playback Control
* **Multi-Resolution Playback**: Manual resolution selector supporting 1080p, 720p, 480p, 360p, and 240p stream qualities.
* **Playback Features**: Playback speed control (0.25x – 2.0x), Picture-in-Picture (PiP), Theater Mode, Fullscreen, and custom progress scrubbers.
* **Tier-Enforced Access**: Stream resolution caps and ad visibility dynamically enforced based on active membership tier.

---

### 💳 5. Subscription Plans & Razorpay Payments
* **4-Tiered Membership Model**:

  | Plan | Price | Daily Downloads | Max Quality | Ads | Features |
  | :--- | :--- | :--- | :--- | :--- | :--- |
  | **Free** | ₹0 / forever | 1 / day | SD (480p) | Yes | Basic streaming |
  | **Bronze** | ₹49 / month | 5 / day | HD (720p) | Yes | History, Watch later |
  | **Silver** | ₹99 / month | 15 / day | Full HD (1080p) | No | Ad-free, Background play, Offline downloads |
  | **Gold** | ₹199 / month | Unlimited | 4K Ultra HD | No | All features, Early access, Priority support |

* **Razorpay Checkout Integration**: Supports UPI, Credit/Debit Cards, Net Banking, and Wallets using Razorpay Web SDK.
* **Dynamic Badges**: Visual membership badges (Bronze, Silver, Gold) rendered across user profiles and channel headers.

---

### 🎥 6. Webcam Recorder & Video Upload Suite
* **Webcam Recorder (`CameraRecorder`)**: Record video clips directly from the browser using webcam & microphone, preview, and publish to channels.
* **Video Uploader (`VideoUploader`)**: Drag-and-drop file upload with custom title, description, category tag, thumbnail selection, and real-time upload progress bar.

---

### 💬 7. Social Interactions & Library
* **Channel Customization**: Channel creation with custom avatar, channel header, subscriber count, and subscribe/unsubscribe actions.
* **Nested Commenting**: Multi-level comment replies, comment likes/dislikes, and author deletion options.
* **Voice Search**: Web Speech API (`SpeechRecognition`) integration for voice-to-text queries in the header search bar.
* **Personal Library**: Watch History, Liked Videos playlist, Watch Later queue, and Tier-Enforced Offline Downloads Manager.

---

## 🛠️ Tech Stack & Technologies

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | [Next.js 16 (Pages Router)](https://nextjs.org/) | Server-rendered React framework for production |
| **UI Library** | [React 19](https://react.dev/) | Core UI component engine |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Type-safe JavaScript application code |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first CSS framework |
| **Authentication** | [Firebase Auth](https://firebase.google.com/docs/auth) | Google OAuth & Email/Password authentication |
| **Email Services** | [Brevo REST API](https://www.brevo.com/) & [MailerSend REST API](https://www.mailersend.com/) | HTTPS REST API transactional email delivery |
| **Backend Server** | [Express.js](https://expressjs.com/) & [Node.js](https://nodejs.org/) | RESTful API server & WebSockets |
| **Database** | [MongoDB](https://www.mongodb.com/) & [Mongoose](https://mongoosejs.com/) | Document database for users, videos, and comments |
| **Real-Time Communication** | [Socket.io](https://socket.io/) & [WebRTC](https://webrtc.org/) | Watch Party synchronization, video call grid, & screen sharing |
| **Payment Gateway** | [Razorpay SDK](https://razorpay.com/) | Payment gateway for subscription tier purchases |

---

## 📁 Project Structure

```
you_tube2.0/
├── server/                     # Express & Node.js backend server
│   ├── controllers/            # API endpoint logic (auth, video, payment, theme)
│   ├── Modals/                 # Mongoose schemas (Auth.js, video.js, etc.)
│   ├── routes/                 # Express route definitions
│   ├── services/
│   │   └── emailService.js     # MailerSend, Brevo, & Resend REST API email transport
│   ├── sockets/                # Socket.io Watch Party real-time socket handlers
│   ├── index.js                # Express server entry point
│   └── .env                    # Server environment configuration
├── yourtube/                   # Next.js frontend application
│   ├── src/
│   │   ├── components/         # UI components & modals
│   │   │   ├── AuthModal.tsx   # Firebase Email/Password & Google Auth dialog
│   │   │   ├── OtpVerificationModal.tsx # 6-digit security OTP verification modal
│   │   │   ├── PartySidebar.tsx# Watch party chat & invite panel
│   │   │   ├── WatchPartyPlayer.tsx # Synchronized player
│   │   │   └── WatchPartyVideoGrid.tsx # WebRTC video call & screen share grid
│   │   ├── lib/
│   │   │   ├── AuthContext.js  # Central user auth, OTP, & theme state provider
│   │   │   ├── axiosinstance.js# Axios HTTP client
│   │   │   ├── firebase.js     # Firebase SDK initialization
│   │   │   └── socket.ts       # Socket.io client setup
│   │   └── pages/              # Next.js page routes
│   │       ├── watch-party/[roomId].tsx # Real-time watch party page
│   │       └── plans/          # Membership tiers & Razorpay checkout
│   └── .env.local              # Frontend environment variables
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**, **yarn**, or **pnpm**
* **MongoDB**: Local MongoDB instance or MongoDB Atlas cluster

---

### Installation & Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/you_tube2.0.git
   cd you_tube2.0
   ```

2. **Configure Backend Environment (`server/.env`)**:
   Create a `.env` file in the `server` directory:

   ```env
   PORT = 5000
   DB_URL = mongodb+srv://<username>:<password>@cluster.mongodb.net/yourtube
   
   # Razorpay Payment Gateway Credentials
   RAZORPAY_KEY_ID = rzp_test_xxxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET = xxxxxxxxxxxxxxxxxxxxxxxx

   # Brevo REST API Credentials (Recommended — 300 free emails/day)
   BREVO_API_KEY = xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   BREVO_SENDER_EMAIL = your_brevo_account_email@gmail.com
   BREVO_SENDER_NAME = YourTube Platform

   # MailerSend REST API Credentials (Optional)
   MAILERSEND_API_KEY = mlsn.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   MAILERSEND_SENDER_EMAIL = no-reply@yourdomain.com
   MAILERSEND_SENDER_NAME = YourTube Platform
   ```

3. **Configure Frontend Environment (`yourtube/.env.local`)**:
   Create a `.env.local` file in the `yourtube` directory:

   ```env
   # Backend API Server URL
   BACKEND_URL=http://localhost:5000

   # Razorpay Public Key
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx

   # Firebase Auth Keys
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Install Dependencies & Start Server**:

   **Backend Server**:
   ```bash
   cd server
   npm install
   npm start
   ```

   **Frontend App**:
   ```bash
   cd yourtube
   npm install
   npm run dev
   ```

5. **Access Application**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

| Directory | Command | Description |
| :--- | :--- | :--- |
| `yourtube/` | `npm run dev` | Starts Next.js development server on `http://localhost:3000` |
| `yourtube/` | `npm run build` | Compiles frontend for production |
| `yourtube/` | `npm run start` | Runs production Next.js build |
| `server/` | `npm start` | Starts Express backend server on `http://localhost:5000` |

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
