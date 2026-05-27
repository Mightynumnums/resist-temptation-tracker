

```markdown
# Resist. — Wishlist Temptation Tracker

Track what you want but won't buy. Watch your savings grow with interactive milestone celebrations.

---

## 🚀 Quick Start (Local Development)

Follow these steps to get the application up and running on your local machine.

### 1. Install Dependencies

Clone your repository (or open the project folder) and install the necessary Node.js packages:

npm install

### 2. Configure Environment Variables

Copy the example environment file to create your active .env file:

cp .env.example .env

Open the .env file in your code editor. The application is built with defensive defaults, meaning Google OAuth and SMTP Email features are strictly optional. If you do not provide credentials for them, the UI automatically hides those buttons and safely bypasses them without crashing.

# App Configuration

PORT=3000
BASE_URL=http://localhost:3000
SESSION_SECRET=change-me-to-a-long-random-string

# Google OAuth (Optional — leave blank to disable in UI)

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# SMTP Email for Password Resets (Optional)

SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=noreply@resist.app

### 3. Start the Server

**Production Mode:**
npm start

**Development Mode (Auto-reloads on file changes):**
npm run dev

Once started, open your web browser and navigate to: http://localhost:3000

---

## 📱 How to Use the App

### 1. Guest Trial Mode (Accountless)

* **Instant Access:** On the landing screen, click **"Try without an account →"** to jump straight into the dashboard without entering an email or password.
* **Local Storage:** In Guest Mode, all your temptations and data are saved locally using your browser's `LocalStorage`.
* **The Trial Limit:** You can add up to **10 items** in guest mode. Once you reach this limit, an upgrade modal will prompt you to create a free account to permanently save your progress and continue tracking.

### 2. Upgrading to a Permanent Account

* **Seamless Migration:** When you choose to create an account, any items currently saved in your Guest Trial are automatically and seamlessly migrated to your new permanent profile in the database.

### 3. Managing Temptations

* **Adding an Item:** Input the item name, numerical price, and choose a category (e.g., Tech, Fashion, Food).
* **Pastel Color Coding:** Each item card features a colored dot corresponding to its category. Click the dot to choose a custom color palette override.
* **"I Bought It" (The Slip Button):** If you give in to temptation, click **😬 I bought it**. The app will mark the item, deduct its cost from your total savings pool, and log a slip.
* **Deletion:** Click the **✕** button to permanently remove an item from your list.

### 4. Milestone Celebrations

* **Confetti Animations:** Every time your *Potential Total Saved* net value crosses a new rolling **$100 increment** baseline (e.g., $100, $200, $300), a burst of canvas confetti will trigger on screen to celebrate your financial discipline!

---

## 🔒 Security & Data Integrity

* **Session Isolation:** HTTP-only cookie parameters prevent client-side script cross-site reflection attacks (XSS).
* **Encryption Standards:** Full cryptographic `bcryptjs` routines secure user passwords with a robust 10-cycle iteration work-factor.
* **Production Protection:** Cookies automatically switch to an encrypted `secure: true` layer when running under a production environment, blocking plaintext network sniffing.
* **Storage Layer:** User profiles and items are saved in `db.json` using an atomic serialization layer (`lowdb`).

---

## ☁️ How to Deploy

The application is fully optimized for standard cloud deployment platforms. **Render.com** is recommended for its free tier and simple environment setup.

### Deploying to Render.com

1. Push your finalized project repository to **GitHub**.
2. Log into your **Render.com** dashboard console and choose **New + → Web Service**.
3. Link your GitHub repository.
4. Input the following configuration options:
* **Runtime Engine:** Node
* **Build Command:** npm install
* **Start Command:** npm start


5. Navigate to the **Environment** tab section and define your keys:

| Environment Key | Recommended Value |
| --- | --- |
| NODE_ENV | production |
| PORT | 3000 |
| SESSION_SECRET | *A unique, long random string* |
| BASE_URL | [https://your-app-name.onrender.com](https://www.google.com/search?q=https://your-app-name.onrender.com) |
```