<!-- # EcoVision - Gamified Environmental Platform

EcoVision is a comprehensive gamified learning platform designed to promote environmental awareness and sustainable practices among students and educational institutions. The platform combines interactive tasks, assignments, quizzes, and engaging mini-games to create an immersive eco-learning experience.

## 🌟 What this app is about

**EcoVision** empowers educational institutions to foster environmental consciousness through gamification:

- 🎯 **Task Management**: Students complete eco-friendly tasks and assignments with photo proof, reviewed by teachers for points
- 🎮 **Interactive Mini-Games**: 15+ sustainability-focused games that award points (once per game per student)
- 📝 **Knowledge Assessment**: Global and school-level quizzes with secure server-side scoring
- 🏆 **Competitive Learning**: Comprehensive leaderboards for schools, students, and teachers
- 👨‍💼 **Admin Portal**: Complete management system for users, content, and analytics
- 📱 **Real-time Updates**: Notifications, announcements, and weekly streak tracking

## 🛠️ Tech Stack

- **Frontend**: React + Vite, Tailwind CSS, Radix UI, Wouter routing
- **Backend**: Express + TypeScript with in-memory storage
- **Database**: SQLite with Drizzle ORM
- **3D Graphics**: Three.js for interactive Earth globe
- **Build Tools**: Vite (client), esbuild (server)
- **Authentication**: Passport.js with local strategy

## ✨ Key Features

### 👥 User Management
- **Multi-role System**: Students, Teachers, and Administrators
- **Approval Workflow**: Teacher and student registration with admin approval
- **Profile Management**: Custom avatars, progress tracking, and statistics

### 🎯 Educational Content
- **Task System**: Photo-verified eco-friendly activities with teacher review
- **Assignments**: School-wide and global environmental challenges
- **Quizzes**: Comprehensive assessment system with secure scoring
- **Announcements**: Real-time updates and important notifications

### 🎮 Gamification
- **15+ Mini-Games**: Interactive sustainability games with unique scoring
- **Points System**: Earn points through tasks, games, and quizzes
- **Leaderboards**: School, student, and teacher rankings
- **Weekly Streaks**: Consistent engagement tracking

### 🌍 3D Experience
- **Interactive Globe**: Three.js powered Earth visualization
- **Environmental Data**: Real-time environmental statistics and facts

### 📊 Analytics & Administration
- **Admin Dashboard**: Complete user and content management
- **Analytics**: Detailed insights into user engagement and progress
- **Content Management**: Create and manage global content

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/teja-sai-2006/Gamified-Environmental-Platform.git
   cd Gamified-Environmental-Platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Navigate to the port displayed in the terminal
   - API endpoints are available under `/api/*`

### Production Build

```bash
npm run build
npm start
```

Production listens on port `5000` by default. The bundled server entrypoint is `dist/index.js`.

Notes
- The server persists in-memory state to `server/data.json`.
- Demo seeders are included for quick content and leaderboard demos.

## 👤 Demo Accounts

For quick testing and demonstration:

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin123` | `admin@1234` |
| Teacher | `test_teacher` | `123@123` |
| Student | `test_student` | `123@123` |

*Note: These accounts are auto-seeded on first run. Passwords can be changed via the Admin Portal.*

## Admin Portal overview
- Approval List: approve pending students/teachers
- Manage Admin Accounts: create/edit/delete admin users (main admin restrictions apply)
- Manage All Accounts: view details, set custom passwords, move users back to pending
- Challenges & Games: manage the games catalog (create/edit/delete)
- Quizzes Management: CRUD for global quizzes
- Schools & Colleges: add/remove schools
- Global Announcements and Global Assignments: create and list global items

## 🛡️ Security & Data Integrity

- **Secure Quiz System**: Server-side scoring with answer protection
- **One-Attempt Policy**: Quiz attempts are limited and tracked
- **Game Point Protection**: Points awarded only once per game per user
- **Session Management**: Secure authentication with Express sessions
- **Rate Limiting**: Built-in throttling prevents abuse

## 🔧 Technical Details

### Database
- SQLite database with Drizzle ORM
- Persistent storage in `server/data.json`
- Automatic migration support

### Development
- TypeScript for type safety
- Hot module replacement (HMR) in development
- ESBuild for fast server bundling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
    tejasai13052006@gmail.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

- **Build Issues**: Stop and restart `npm run dev` after dependency changes
- **HMR Problems**: Clear browser cache and restart development server
- **Database Issues**: Check server console for logs and error messages

---

**Made with 💚 for a sustainable future**
 -->
