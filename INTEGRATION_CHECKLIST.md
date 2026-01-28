# 🔧 Blueprint Integration Checklist

**Quick setup guide to get everything working end-to-end**

---

## ✅ Prerequisites

- [ ] PostgreSQL database running
- [ ] Backend dependencies installed (`pip install google-genai`)
- [ ] Frontend dependencies installed (`npm install @google/genai`)
- [ ] `GEMINI_API_KEY` in `.env` file
- [ ] Python 3.8+ and Node.js 16+

---

## 📋 Integration Steps

### **Step 1: Backend Integration (5 minutes)**

#### 1.1 Add Video Router to Main App
```python
# In backend/main.py (or wherever your app is defined)

from routers import video  # Add this import

# Then add the router
app.include_router(video.router)
```

#### 1.2 Run Database Migration
```bash
cd backend

# Connect to your PostgreSQL database
psql -U your_username -d blueprint_db -f migrations/add_video_content.sql

# Or if you have a different setup:
# python -m alembic upgrade head  # If using Alembic
```

#### 1.3 Verify Backend Routes
```bash
# Start the backend server
cd backend
python -m uvicorn main:app --reload

# In another terminal, check the routes
curl http://localhost:8000/docs

# Look for these new endpoints:
# - POST /video/upload
# - POST /video/transcript
# - GET /grammar/patterns/{language}
# - POST /api/content/analyze-long
```

---

### **Step 2: Frontend Integration (5 minutes)**

#### 2.1 Add Routes to Your Router

**If using React Router v6:**
```typescript
// In your main router file (e.g., App.tsx or routes.tsx)

import { VideoLearningView } from './components/VideoLearningView';
import { GeminiShowcase } from './components/GeminiShowcase';
import { DeepReadingAnalysis } from './components/DeepReadingAnalysis';

// Add these routes
<Routes>
  {/* Existing routes... */}

  <Route path="/showcase" element={<GeminiShowcase />} />
  <Route path="/video-learning" element={<VideoLearningView />} />
  <Route path="/deep-reading" element={<DeepReadingAnalysis />} />

  {/* You might want to make showcase the landing page */}
  <Route path="/" element={<GeminiShowcase />} />
</Routes>
```

#### 2.2 Update Navigation (Optional)

Add links to your main navigation:
```typescript
<nav>
  <Link to="/showcase">Home</Link>
  <Link to="/video-learning">Video Learning</Link>
  <Link to="/conversation">Conversation</Link>
  <Link to="/grammar">Grammar</Link>
  <Link to="/deep-reading">Deep Reading</Link>
  <Link to="/vocabulary">Vocabulary</Link>
</nav>
```

#### 2.3 Verify Frontend Build
```bash
cd frontend
npm run dev

# Or for production build:
npm run build
```

---

### **Step 3: Test Features (30 minutes)**

#### 3.1 Test Showcase Dashboard ✅
- [ ] Navigate to `http://localhost:5173/showcase` (or your frontend URL)
- [ ] Verify all 4 capability cards display
- [ ] Click each card to navigate
- [ ] Check live API counter increments
- [ ] Verify model breakdown shows all 6 models

#### 3.2 Test Video Learning ✅
- [ ] Navigate to `/video-learning`
- [ ] Upload a short MP4 video (under 50MB)
- [ ] Wait for analysis (30-60 seconds)
- [ ] Verify subtitles appear
- [ ] Click subtitle to see it highlight in video
- [ ] Click a word to see deep analysis popup
- [ ] Check vocabulary tab shows words
- [ ] Check grammar tab shows patterns
- [ ] Check exercises tab shows generated exercises

**Test with curl:**
```bash
curl -X POST "http://localhost:8000/video/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@path/to/video.mp4" \
  -F "target_language=Spanish" \
  -F "native_language=English"
```

#### 3.3 Test Enhanced Conversations ✅
- [ ] Navigate to `/conversation`
- [ ] See 10 scenarios in sidebar
- [ ] Click different scenarios
- [ ] Verify scenario details show (icon, difficulty, description)
- [ ] Start a conversation (if microphone available)
- [ ] Or type a message
- [ ] Verify AI responds appropriately for the scenario

#### 3.4 Test Grammar Pattern Library ✅
```bash
# Test the endpoint directly
curl "http://localhost:8000/grammar/patterns/Spanish?level=B1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return comprehensive grammar patterns JSON
```

#### 3.5 Test Deep Reading Analysis ✅
- [ ] Navigate to `/deep-reading`
- [ ] Paste a long article (500+ words)
- [ ] Click "Analyze with Gemini 3 Pro"
- [ ] Wait for analysis (10-30 seconds depending on length)
- [ ] Verify summary tab shows overview
- [ ] Check vocabulary tab filters by level (A1-C2)
- [ ] Check grammar patterns tab shows structures
- [ ] Check difficulty progression chart displays
- [ ] Check discussion questions tab shows 10 questions

**Test with curl:**
```bash
curl -X POST "http://localhost:8000/api/content/analyze-long" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "Your long article text here...",
    "target_language": "Spanish",
    "native_language": "English"
  }'
```

---

## 🔍 Verification Checklist

### Backend ✅
- [ ] No errors in console when starting server
- [ ] `/docs` endpoint shows all new routes
- [ ] Video upload endpoint accepts files
- [ ] Grammar patterns endpoint returns JSON
- [ ] Long-context analysis endpoint works
- [ ] No old `gemini-2.0` or `gemini-2.5` references (verified with grep)

### Frontend ✅
- [ ] No TypeScript errors in build
- [ ] All 3 new components render without errors
- [ ] Navigation works between all pages
- [ ] Showcase dashboard displays properly
- [ ] Video learning view accepts uploads
- [ ] Deep reading accepts text input
- [ ] All API calls use correct endpoints

### Database ✅
- [ ] Migration ran successfully
- [ ] `video_content` table exists
- [ ] `video_vocabulary` table exists
- [ ] `video_exercise_attempts` table exists
- [ ] Indexes created properly
- [ ] Triggers working

---

## 🐛 Common Issues & Fixes

### Issue: Video upload fails
**Fix:** Check file size (<50MB), file type (MP4/WEBM/MOV), and backend logs for errors

### Issue: Deep reading returns 401 Unauthorized
**Fix:** Ensure authentication token is included in request headers

### Issue: Grammar patterns endpoint slow
**Fix:** This is expected on first call (generating comprehensive guide). Implement caching for production.

### Issue: Frontend can't reach backend
**Fix:** Check CORS settings in backend, verify API URL in frontend config

### Issue: Database migration fails
**Fix:** Ensure PostgreSQL is running, user has CREATE TABLE permissions, and tables don't already exist

### Issue: Gemini API errors
**Fix:** Verify `GEMINI_API_KEY` in `.env`, check API quota/billing, ensure using correct Gemini 3 model names

---

## 🚀 Production Deployment Checklist

### Before Deploying:
- [ ] Update Gemini 3 model names if they differ from assumptions
- [ ] Set up Redis for grammar pattern caching
- [ ] Configure proper CORS for production domains
- [ ] Set up file storage (S3/GCS) for video uploads
- [ ] Add rate limiting to prevent abuse
- [ ] Set up monitoring (Sentry, DataDog, etc.)
- [ ] Configure CDN for static assets
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Configure environment variables properly

### Environment Variables Needed:
```bash
# Backend .env
GEMINI_API_KEY=your_api_key_here
DATABASE_URL=postgresql://user:pass@localhost/blueprint_db
REDIS_URL=redis://localhost:6379  # Optional but recommended
SECRET_KEY=your_secret_key
CORS_ORIGINS=https://your-frontend-domain.com

# Frontend .env
VITE_API_URL=https://api.your-domain.com
VITE_API_KEY=your_gemini_api_key  # Only if needed client-side
```

---

## 📊 Feature Coverage Verification

Run this grep command to verify no old models remain:
```bash
# Should return 0 results
grep -r "gemini-2\.0" backend/ frontend/
grep -r "gemini-2\.5" backend/ frontend/

# Should return multiple results (our new config)
grep -r "GEMINI_MODELS" backend/ frontend/
```

---

## ✨ Post-Integration Testing

After integration, test this complete user flow:

1. **Landing:** User visits `/showcase`
2. **Explore:** Clicks "Video Learning" card
3. **Upload:** Uploads a Spanish cooking video
4. **Analyze:** Waits for Gemini 3 analysis
5. **Review:** Explores subtitles, vocabulary, grammar
6. **Practice:** Clicks on words for deep analysis
7. **Conversation:** Navigates to `/conversation`
8. **Scenario:** Selects "Restaurant Ordering"
9. **Chat:** Has a text conversation
10. **Reading:** Navigates to `/deep-reading`
11. **Analysis:** Pastes a long Spanish article
12. **Insights:** Explores vocabulary, grammar, discussion questions
13. **Success!** 🎉

---

## 📈 Performance Benchmarks

Expected performance after integration:

- **Video upload (2-min video):** 30-60 seconds analysis time
- **Long-context analysis (2000 words):** 10-30 seconds
- **Grammar patterns (first call):** 15-45 seconds
- **Grammar patterns (cached):** <1 second
- **Conversation latency:** <500ms
- **Deep analysis (single word):** 2-5 seconds

---

## 🎯 Integration Complete Checklist

Final verification before demo:

- [ ] All 3 new components accessible via routes
- [ ] Video upload works end-to-end
- [ ] Conversations use 10 scenarios
- [ ] Grammar patterns endpoint functional
- [ ] Deep reading analysis works
- [ ] Showcase dashboard displays all features
- [ ] No console errors
- [ ] Mobile responsive (basic check)
- [ ] All Gemini 3 models being used
- [ ] Documentation complete

---

## 📞 Support

If you encounter issues:

1. Check backend logs: `tail -f backend/logs/app.log`
2. Check frontend console: Browser DevTools → Console
3. Verify database: `psql -U user -d blueprint_db -c "\dt"`
4. Test API directly: Use Postman or curl
5. Review implementation docs: `FINAL_IMPLEMENTATION_SUMMARY.md`

---

**Last Updated:** 2026-01-26
**Status:** Ready for Integration
**Estimated Integration Time:** 10-15 minutes
**Estimated Testing Time:** 30 minutes
**Total Time to Demo-Ready:** ~45-60 minutes
