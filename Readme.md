# FusionSpace Backend

Interative Social Media Application
This repository contains the backend code.

## 🔥 Tech Stack

- Built Using Node.js, Express, MongoDB
- Secure password hashing with bcryptjs
- Middleware for authentication and error handling
- Modular controller and route structure
- MongoDB database connnection using Mongoose

---

## ⚙️ Installation Steps

**Prerequisites**

Ensure you have **Node.js** and **MongoDB** installed.

Installation

```
git clone <repo-url>
npm install
```

**Configure Environment Variables**

Create a `.env` file in the directory and add the following. Put your values:

```
PORT=8000

MONGO_URI_LOCAL=your_local_mongodb_uri

# change in src/db/index/js
MONGO_URI_CLOUD=your_remote_mongodb_uri

CORS_ORIGIN="frontend_url"

NODE_ENV=""

REFRESH_TOKEN_SECRET="your_secret"
REFRESH_TOKEN_EXPIRY=7d

# configure in cloudinary
CLOUDINARY_ClOUD_KEY=your_key
CLOUDINARY_API_KEY=your_key_number
CLOUDINARY_API_SECRET=your_api_secret
```

**Run the App**

```
npm run start
```

---

## Connect Frontend with this locally

```
http://localhost:8000/api/v1
```

---

## Routes of Applications

- Health
- Users
- Discovery
- Posts
- Likes
- Comments
- Follows
- Community
- Community Members

---

## Collaboration and contributions

    Feel Free to clone and use repo.
    Suggestions are accepted.

---

## 📝 License

This project is open-source and available under the MIT License.
