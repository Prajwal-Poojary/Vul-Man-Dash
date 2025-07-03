# Project Documentation

## Overview

This project is a secure, full-stack web application built with Angular (frontend) and Node.js/Express and Flask (backends). It is designed for secure report management, user authentication, and document protection, with a strong focus on security best practices.

---

## Dependencies

### Frontend (Angular)
- @angular/* (core, common, forms, router, material, etc.)
- @fortawesome/fontawesome-free
- axios
- bcryptjs
- chart.js
- docx
- file-saver
- html2canvas
- jspdf, jspdf-autotable
- jwt-decode
- ng2-charts
- rxjs
- zone.js
- (plus dev dependencies for Angular CLI, testing, etc.)

### Backend1 (Node.js/Express)
- bcryptjs
- cors
- dotenv
- express
- jsonwebtoken
- mongoose
- nodemailer
- (dev: nodemon)

### Backend2 (Node.js/Express)
- cors
- dotenv
- express
- jsonwebtoken
- mongodb
- mongoose
- bcryptjs

### Flask Backend
- Flask
- Flask-CORS
- pycryptodome
- python-docx
- PyPDF2
- pikepdf
- gunicorn

---

## Architecture

### Frontend
- **Framework:** Angular
- **Features:**  
  - User authentication (login, registration, password reset)
  - Secure report creation, viewing, and management
  - Password-protected reports
  - Dashboard and analytics
  - Responsive, modern UI

### Backend1 (`backend1/`)
- **Framework:** Node.js/Express
- **Features:**  
  - User authentication (JWT-based)
  - User registration, login, password reset
  - User-specific report management
  - Passwords hashed with bcrypt
  - All sensitive endpoints require authentication

### Backend2 (`backend2/`)
- **Framework:** Node.js/Express
- **Features:**  
  - Report creation, update, and deletion
  - Password-protected reports (passwords hashed with bcrypt)
  - Secure password verification endpoint
  - All sensitive endpoints require JWT authentication
  - No sensitive data (like passwords) ever returned in API responses

### Backend App (`backend/app/`)
- **Framework:** Flask
- **Features:**  
  - Document protection endpoints (PDF, DOCX)
  - Passwords used only server-side, never stored or returned
  - No user data or authentication required

---

## Security Features

- **Password Hashing:** All user and report passwords are hashed with bcrypt before storage.
- **JWT Authentication:** All sensitive endpoints require a valid JWT token.
- **No Sensitive Data Leaks:** Passwords and other sensitive fields are never returned in API responses.
- **Clickjacking Protection:** All backends set `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors 'none'` headers.
- **XSS Protection:** No use of `[innerHTML]`, `bypassSecurityTrust`, or untrusted third-party scripts in the frontend.
- **CORS:** Enabled for frontend-backend communication; should be restricted to trusted origins in production.
- **HTTPS:** Recommended for all deployments (enforced at infrastructure level).

---

## Usage

### Running the Project

1. **Install dependencies:**
   - For each backend:  
     ```
     npm install
     ```
   - For Flask backend:  
     ```
     pip install -r requirements.txt
     ```
2. **Start the servers:**
   - Backend1: `npm start` (in `backend1/`)
   - Backend2: `npm start` (in `backend2/`)
   - Flask backend: `python run.py` (in `backend/app/`)
   - Frontend: `npm start` (in project root or `src/`)

3. **Access the app:**  
   - Open the Angular frontend in your browser (default: `http://localhost:4200`).

---

## API Endpoints

### Authentication (backend1)
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login, returns JWT
- `POST /api/auth/forgot-password` — Request password reset
- `POST /api/auth/reset-password` — Reset password
- `GET /api/auth/user` — Get user info (auth required)

### Reports (backend1 & backend2)
- `GET /api/reports/` — List reports (auth required)
- `POST /api/reports/` — Create report (auth required)
- `GET /api/reports/:id` — Get report by ID (auth required)
- `PUT /api/reports/:id` — Update report (auth required)
- `DELETE /api/reports/:id` — Delete report (auth required)
- `POST /api/reports/verify-password` — Verify report password (auth required, backend2)

### Document Protection (Flask backend)
- `POST /api/report/protect-docx` — Protect DOCX with password
- `POST /api/report/protect-pdf` — Protect PDF with password

---

## Security Best Practices

- All passwords are hashed before storage.
- JWT tokens are required for all sensitive operations.
- No sensitive data is ever returned to the frontend.
- Clickjacking and iframe embedding are prevented by security headers.
- No XSS or template injection vulnerabilities found.
- Only trusted third-party libraries are used.

---

## Recommendations for Deployment

- **Use HTTPS** for all frontend and backend services.
- **Restrict CORS** to your production frontend domain.
- **Monitor dependencies** for vulnerabilities and keep them updated.
- **Educate users** to check the URL before entering credentials.

---

## Contact

For questions, support, or security concerns, please contact the development team.
