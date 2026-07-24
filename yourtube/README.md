# 📺 YourTube 2.0 — Next-Generation Video Streaming & Watch Party Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.2.11-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38BDF8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Integration-02042B?style=for-the-badge&logo=razorpay)](https://razorpay.com/)

**YourTube 2.0** is a modern, full-featured video streaming web application modeled after YouTube. Built with Next.js, React 19, TypeScript, and Tailwind CSS v4, it features real-time WebSocket synchronized Watch Parties, in-browser WebRTC webcam video recording, Razorpay-powered subscription plans, multi-factor security verification, voice search, and an automated IST time-based theme engine.

---

## 🌟 Key Features

### 🔐 1. Authentication & Security Engine
* **Google OAuth Sign-In**: Seamless authentication powered by Firebase Auth with desktop popups and mobile-optimized redirect fallbacks.
* **Device & Geolocation Tracking**: Automatically captures IP addresses, OS, Browser metadata, and location (`ipapi.co`) upon sign-in.
* **Multi-Factor OTP Email Verification**: Triggers a 6-digit email OTP modal whenever an unrecognized device or unusual location is detected.
* **Smart Automated Theme Engine**:
  * Manual Light/Dark mode toggle synced with DOM root classes.
  * **Automated IST Schedule**: Automatically switches to Light Mode between 10:00 AM – 12:00 PM IST and Dark Mode otherwise, with a single-click reset option.

---

### 🎬 2. Advanced Custom Video Player
* **Multi-Resolution Playback**: Manual quality selector supporting 1080p, 720p, 480p, 360p, and 240p stream resolutions.
* **Playback Controls**: Variable playback speed (0.25x – 2.0x), Picture-in-Picture (PiP), Theater Mode, Fullscreen, and custom progress scrubbers.
* **Tier-Enforced Quality & Ads**: Stream resolution limits and ad displays dynamically enforced according to the user's active membership plan.
* **Engagement Metrics**: Automatic view count increments, interactive Likes/Dislikes, and Watch Later saving.

---

### 🍿 3. Real-Time Synchronized Watch Parties
* **WebSocket Synchronization**: Powered by `socket.io-client` for real-time play, pause, and seek synchronization across all room participants.
* **Host Control Mode**: Host privileges with master playback locks and room state management.
* **Live Webcam Video Grid**: Overlay grid displaying participants' webcam video feeds alongside the main video stream.
* **Interactive Room Sidebar**: Participant roster, real-time live chat room, and 1-click room invite link sharing.

---

### 🎥 4. Content Creation & Recording Suite
* **Webcam Recorder (`CameraRecorder`)**: In-browser WebRTC & MediaRecorder camera tool allowing users to record video clips directly from their webcam, preview recordings, add titles, and upload to their channel without third-party software.
* **Video Uploader (`VideoUploader`)**: Drag-and-drop or select MP4/WebM video files with custom title, description, category tag, thumbnail image, and real-time upload progress percentage bar.

---

### 💳 5. Subscription Plans & Razorpay Payments
* **4-Tiered Membership Model**:
  | Plan | Price | Daily Downloads | Max Resolution | Ads | Features |
  | :--- | :--- | :--- | :--- | :--- | :--- |
  | **Free** | ₹0 / forever | 1 / day | SD (480p) | Yes | Basic access |
  | **Bronze** | ₹49 / month | 5 / day | HD (720p) | Yes | Watch history, Watch later |
  | **Silver** | ₹99 / month | 15 / day | Full HD (1080p) | No | Ad-free, Background play, Offline downloads |
  | **Gold** | ₹199 / month | Unlimited | 4K Ultra HD | No | All features, Early access, Priority support |
* **Razorpay Checkout Integration**: Integrated online payments supporting UPI, Cards, Net Banking, and Wallets using official Razorpay JS SDK.
* **Dynamic User Badges**: Visual membership badges (Bronze, Silver, Gold) rendered next to user profiles and channel headers.

---

### 💬 6. Channels & Social Interactions
* **Channel Customization**: Channel creation with custom avatar, channel header, subscriber counter, subscribe/unsubscribe buttons, and tabbed navigation (Home, Videos, About).
* **Nested Commenting System**: Multi-level comment replies, comment like/dislike counts, author avatar display, and owner comment deletion.
* **Voice Search**: Web Speech API (`SpeechRecognition`) integration enabling voice-to-text queries directly from the header search bar.
* **Notification Center**: Real-time notification polling for channel updates and upload alerts with unread badge counters.

---

### 📚 7. Personal Library & Management
* **Watch History**: Logs recently watched videos with timestamped history management and clear history options.
* **Liked Videos**: Curated playlist of user-liked videos.
* **Watch Later**: Saved video queue for later viewing.
* **Offline Downloads Manager**: Dedicated downloads hub tracking offline videos and enforcing tier-based daily download limits.

---

## 🛠️ Tech Stack & Technologies

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | [Next.js 16 (Pages Router)](https://nextjs.org/) | Server-rendered React framework for production |
| **UI Library** | [React 19](https://react.dev/) | Core UI rendering engine |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Type-safe JavaScript application code |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Modern utility-first CSS styling engine |
| **Primitives** | [Radix UI](https://www.radix-ui.com/) | Accessible Dialog, Dropdown Menu, Progress, Avatar components |
| **Icons & Toast** | [Lucide React](https://lucide.dev/) & [Sonner](https://sonner.emilkowal.ski/) | Clean UI iconography and toast notifications |
| **Authentication** | [Firebase Auth](https://firebase.google.com/docs/auth) | Google OAuth & session state listener |
| **WebSockets** | [Socket.io Client](https://socket.io/) | Real-time bidirectional Watch Party synchronization |
| **Payments** | [Razorpay SDK](https://razorpay.com/docs/) | Payment gateway for subscription plan checkouts |
| **Networking** | [Axios](https://axios-http.com/) | HTTP client with custom backend interceptors |

---

## 📁 Project Structure

```
yourtube/
├── public/                     # Static assets & public resources
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # Radix UI primitives (button, input, dialog, etc.)
│   │   ├── CameraRecorder.tsx  # In-browser WebRTC webcam video recorder
│   │   ├── ChannelHeader.tsx   # Channel banner & metadata header
│   │   ├── Comments.tsx        # Multi-nested comment system
│   │   ├── DownloadsContent.tsx# Tier-enforced downloads manager
│   │   ├── Header.tsx          # Top navigation bar with search & voice search
│   │   ├── HistoryContent.tsx  # Watch history list
│   │   ├── LikedContent.tsx    # Liked videos list
│   │   ├── OtpVerificationModal.tsx # 6-digit security OTP verification modal
│   │   ├── PartySidebar.tsx    # Watch party live chat & participant panel
│   │   ├── Sidebar.tsx         # Collapsible main navigation sidebar
│   │   ├── VideoUploader.tsx   # File video upload modal
│   │   ├── Videopplayer.tsx    # Custom HTML5 video player with quality options
│   │   ├── WatchLaterContent.tsx # Saved videos queue
│   │   ├── WatchPartyPlayer.tsx  # Socket-synchronized video player
│   │   └── WatchPartyVideoGrid.tsx# Watch party participant webcam grid
│   ├── lib/                    # Core utilities & context providers
│   │   ├── AuthContext.js      # User authentication, OTP, & theme state
│   │   ├── axiosinstance.js    # Centralized Axios HTTP client
│   │   ├── firebase.js         # Firebase initialization configuration
│   │   ├── plans.ts            # Subscription tier definitions & features
│   │   ├── socket.ts           # Socket.io connection helper
│   │   └── utils.ts            # Class merging & URL helpers
│   ├── pages/                  # Next.js Pages router endpoints
│   │   ├── _app.tsx            # Global application entry point & providers
│   │   ├── _document.tsx       # HTML document template
│   │   ├── index.tsx           # Home video feed page
│   │   ├── channel/[id]/       # Dynamic channel profile page
│   │   ├── downloads/          # Offline downloads page
│   │   ├── explore/            # Content exploration page
│   │   ├── history/            # User watch history page
│   │   ├── liked/              # Liked videos playlist page
│   │   ├── plans/              # Membership tier plans & Razorpay payment page
│   │   ├── search/             # Video search results page
│   │   ├── subscriptions/      # Subscribed channels feed page
│   │   ├── watch/[id]/         # Main video watch page
│   │   ├── watch-later/        # Watch later playlist page
│   │   └── watch-party/[roomId].tsx # Real-time watch party room page
│   └── styles/
│       └── globals.css         # Global CSS stylesheet & Tailwind setup
├── components.json             # Shadcn UI configuration
├── next.config.ts              # Next.js environment & compiler setup
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript compiler config
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
* **Node.js**: v18.0.0 or higher
* **npm**, **yarn**, or **pnpm**

---

### Installation & Environment Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/yourtube.git
   cd yourtube
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory and configure the following variables:

   ```env
   # Backend API Server URL
   BACKEND_URL=http://localhost:5000

   # Razorpay Payment Gateway Key (Public)
   NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id

   # Firebase Configuration Keys
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

In the project directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server on `http://localhost:3000` |
| `npm run build` | Compiles and builds the production bundle |
| `npm run start` | Launches the Next.js production server |
| `npm run lint` | Runs ESLint to check for code style & linting errors |

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
