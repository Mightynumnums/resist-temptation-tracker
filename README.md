```markdown
# Resist. — Temptation Tracker

Track what you want but won't buy. Watch your savings grow, log your shopping slips, and celebrate your financial discipline with interactive milestones.


## 🚀 Quick Start (Local Development)

Follow these steps to get the application up and running on your local machine.

### 1. Install Dependencies

Clone your repository (or open the project folder) and install the required Node.js packages:

```bash
npm install

```

### 2. Configure Your Database Baseline

The app uses an atomic JSON database layout (`lowdb`). Ensure you have a valid `db.json` file in your root directory containing the baseline tracking arrays:

```json
{
  "users": [],
  "items": []
}

```

### 3. Start the Server

Run the application using the Node.js runtime process:

* **Development Mode (Auto-reloads on file changes):**
```bash
npm run dev

```


* **Production Mode:**
```bash
npm start

```



Once started, open your web browser and navigate to: http://localhost:3000/

---

## 📱 How to Use the App

### 1. Guest Trial Mode (Accountless)

* **Instant Access:** On the landing screen, click **"Try without an account →"** to bypass the login forms and drop straight into the workspace dashboard.
* **Local Persistence:** In Guest Mode, all items are saved directly to your browser's `LocalStorage`.
* **The Trial Limit:** The accountless sandbox tracks up to **10 items**. Once you hit this baseline, a lockout modal will prompt you to register a free profile to permanently unlock your dashboard.

### 2. Upgrading & Manual Sign-ins

* **Seamless Account Creation:** Click the **Create account** tab to switch registration forms. When you submit a fresh email and password, the app writes your profile to the database and **automatically signs you in instantly**.
* **Secure Authentication:** If you sign out, use the **Sign in** tab with your registered credentials. The backend verifies your password using secure `bcryptjs` hash matching and mounts your private dashboard session.

### 3. Managing Temptations

* **Adding an Item:** Input the item name, numerical price, and select its matching category wrapper (e.g., Tech, Fashion, Other).
* **Tracking Slips:** If you give in to an impulse buy, click the **😬 I bought it** action. The app marks the item as bought and automatically deducts the cost from your net savings pool.
* **Deletion:** Click the **✕** button to permanently remove an item from your tracking list ledger.

### 4. Milestone Celebrations

* Every time your *Potential Total Saved* value increases across a new rolling **$100 increment** threshold (e.g., $100, $200, $300), a dynamic burst of canvas confetti will trigger on screen to celebrate your financial restraint!

---

## ☁️ How to Deploy

The application is completely stateless (saving to a local file stream) and optimized for rapid deployment on modern cloud application hosting services. **Render.com** is highly recommended for its simple, free-tier Node.js environment setup.

### Step-by-Step Deployment to Render.com

1. Push your finalized, working project folder to a repository on your **GitHub** account.
2. Log into your **Render.com** dashboard and select **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub account and select your **Resist app** repository from the list.
4. Configure the web service environment settings exactly as shown below:
* **Runtime Engine:** `Node`
* **Build Command:** `npm install`
* **Start Command:** `npm start`


5. Click **Advanced** or navigate to the **Environment** tab section to define your runtime variables:

| Environment Key | Recommended Production Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `SESSION_SECRET` | *Type a long, unique, random string of text to encrypt cookies* |

6. Click **Create Web Service**.

> ⚠️ **Note on Free-Tier File Systems:** Render's web services use ephemeral file disks, meaning your `db.json` data will clear itself whenever the server spins down or restarts. For a zero-cost hobby dashboard, the **Guest Trial Mode** provides permanent local persistence across browser refreshes since it saves safely directly inside the user's browser storage!
```
