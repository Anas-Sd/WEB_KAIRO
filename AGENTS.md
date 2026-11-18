# Autonomous Execution & Delivery Rules (Web)

## 1. Auto-Push to GitHub & Auto-Deploy to Vercel
- Immediately push everything to GitHub (`origin/main`) whenever changes are committed after executing any task, fix, or feature in `c:\PROJECTS\WEB_KAIRO`.
- Never leave local commits unpushed. Always run `git push origin main` automatically without waiting for user prompting.
- Pushing to `origin/main` automatically triggers production deployment on Vercel at `https://admin-kairo.vercel.app`.
