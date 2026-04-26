# MongoDB Migration Audit Report
**Generated: April 23, 2026**

---

## 📊 EXECUTIVE SUMMARY

**Migration Status: ~35% Complete**

- ✅ **Fully MongoDB**: 7 collections
- ⚠️ **Partially Migrated**: 3 collections  
- ❌ **Memory Only**: 11 collections
- 🔴 **Critical Issues**: 8 found

---

## ✅ FULLY MIGRATED TO MONGODB

### 1. **Users** 
**Status**: ✅ Fully MongoDB
**Mongoose Model**: `server/models/User.ts` ✓
**Functions in MongoStorage**:
- `getUser(id)` - Query by ID
- `getUserByUsername(username)` - Query by username
- `createUser(userInput)` - Create with automatic profile creation
- `isUsernameAvailable(username)` - Count query

**Storage.ts Integration**:
- `getUser()` → wrapped with timeout, falls back to memory
- `getUserByUsername()` → wrapped with timeout, falls back to memory
- `createUser()` → Creates in Mongo + updates memory Map for backward compat

**Data Integrity**: ✅ Good - Mongoose validations in place

---

### 2. **Profiles**
**Status**: ✅ Fully MongoDB
**Mongoose Model**: `server/models/Profile.ts` ✓
**Functions in MongoStorage**:
- `getOwnProfile(username)` - Get profile by username
- `updateOwnProfile(username, updates)` - Update profile with upsert
- `upsertProfile(id, data)` - Direct upsert by profile ID
- `getStudentSubmissionStats(username)` - Aggregate student stats

**Storage.ts Integration**:
- Profiles accessed from both memory (`this.profiles`) AND MongoDB
- Memory is primary, Mongo is backup/sync target
- **Issue**: Mixed source of truth

**Migration Notes**:
- Created automatically when User is created
- Synced to MongoDB on approval (student/teacher)
- Includes: role, name, email, schoolId, studentId, rollNumber, className, section, subject, photoDataUrl, allowExternalView

---

### 3. **Tasks**
**Status**: ✅ Fully MongoDB  
**Mongoose Model**: `server/models/Task.ts` ✓
**Functions in MongoStorage**:
- `createTask(teacherUsername, input)` - Create task
- `listTeacherTasks(teacherUsername)` - List by teacher
- `listStudentTasks(studentUsername)` - List assigned to student
- `submitTask(studentUsername, taskId, photoDataUrlOrList)` - Create submission
- `listSubmissionsForTeacher(teacherUsername, taskId?)` - List submissions
- `reviewSubmission(teacherUsername, submissionId, decision)` - Grade/approve
- `getTaskById(taskId)` - Get single task

**Storage.ts Integration**: ✅ Fully delegated
- All calls use `await mongoStorage.*`
- No memory fallback

**Data Integrity**: ✅ Good - Mongoose validations in place

---

### 4. **Submissions** (Task Submissions)
**Status**: ✅ Fully MongoDB
**Mongoose Model**: `server/models/Submission.ts` ✓
**Functions**: Handled by Task methods above

**Storage.ts Integration**: ✅ Fully delegated to MongoStorage

**Data Integrity**: ✅ Good

---

### 5. **Announcements**
**Status**: ✅ Fully MongoDB
**Mongoose Model**: `server/models/Announcement.ts` ✓
**Functions in MongoStorage**:
- `createAnnouncement(teacherUsername, input)` - Create school announcement
- `listAnnouncementsForTeacher(teacherUsername)` - List by teacher
- `createAdminAnnouncement(adminUsername, input)` - Create global announcement
- `listAdminAnnouncements(adminUsername)` - List by admin
- `updateAdminAnnouncement(adminUsername, announcementId, updates)` - Update
- `deleteAdminAnnouncement(adminUsername, announcementId)` - Delete
- `listStudentAnnouncements(studentUsername)` - List for student

**Storage.ts Integration**: ✅ Fully delegated
- All calls use `await mongoStorage.*`
- No memory fallback

**Data Integrity**: ✅ Good - visibility field (school/global) properly set

---

### 6. **Schools**
**Status**: ✅ Fully MongoDB (Recently Migrated)
**Mongoose Model**: `server/models/School.ts` ✓
**Functions in MongoStorage**:
- `getOrCreateSchoolByName(name)` - Get or create with normalization
  - **Normalizes** name to lowercase + trim
  - Logs: "[School] Created new school" or "[School] Found existing school"
  - Returns schoolId

**Storage.ts Integration**:
- `listSchools()` - Query only from MongoDB
- `addSchool(name)` - Calls mongoStorage.getOrCreateSchoolByName()
- `getOrCreateSchoolByName(name)` - Wrapper with logging
- `removeSchool(id)` - Deletes from MongoDB only

**Recent Changes**:
- ✅ Removed all `this.schools` Map fallback
- ✅ Added normalization in mongoStorage
- ✅ Added comprehensive logging

**⚠️ Known Issue**: Data quality issue discovered
- Existing MongoDB contains ~80+ duplicate schools with mixed cases
- Example: "blue horizon school" + "Blue Horizon School" (two IDs)
- Root cause: Old sync didn't apply normalization
- Impact: New operations work correctly, old data has duplicates

---

### 7. **Quizzes & Quiz Attempts**
**Status**: ✅ Fully MongoDB
**Mongoose Models**: 
- `server/models/Quiz.ts` ✓
- `server/models/QuizAttempt.ts` ✓

**Functions in MongoStorage**:
- `createQuiz(creatorUsername, input, inMemoryUsers?)` - Create quiz
- `listQuizzesByTeacher(teacherUsername, inMemoryUsers?, inMemoryQuizzes?)` - Hybrid query
- `listQuizzesForStudent(studentUsername, ...)` - Hybrid query with dedup
- `getQuizById(id)` - Get single quiz
- `updateQuiz(teacherUsername, id, updates)` - Update quiz
- `deleteQuiz(teacherUsername, id)` - Delete quiz
- `submitQuiz(studentUsername, input)` - Submit answers + grade
- `getStudentQuizAttempt(username, quizId)` - Get attempt

**Storage.ts Integration**:
- Teacher quizzes: `await mongoStorage.createQuiz/listQuizzesByTeacher/updateQuiz/deleteQuiz`
- Admin quizzes: Same as teacher (visibility='global')
- Student quizzes: `await mongoStorage.listQuizzesForStudent/submitQuiz`

**Data Integrity**: ✅ Good
- Visibility field properly set (school/global)
- CreatedByUserId stored
- Questions embedded with answer protection
- One-attempt policy enforced

---

## ⚠️ PARTIALLY MIGRATED

### 1. **Roles** (User Roles)
**Status**: ⚠️ Hybrid (Memory + some MongoDB)
**Mongoose Model**: ❌ **MISSING** - No dedicated model
**Storage in**: `this.roles` Map (in-memory only)

**Functions**:
- Loaded from data.json: `this.roles = new Map(Object.entries(raw.roles))`
- Queried directly from memory in 50+ places
- Not synced to MongoDB

**Used In**:
- `this.roles.get(userId)` - Direct memory access throughout codebase
- Role validation for permissions
- Leaderboard filtering
- Notification routing

**⚠️ Issues**:
- Memory-only storage defeats MongoDB migration goal
- No MongoDB persistence for new roles
- Roles should be part of User or separate collection

**Recommendation**: ✏️ Should migrate roles to MongoDB (attach to User or create Roles collection)

---

### 2. **Profiles** (Complex Hybrid)
**Status**: ⚠️ Partially MongoDB
**Mongoose Model**: `server/models/Profile.ts` ✓
**Storage in**: Both `this.profiles` Map AND MongoDB

**Functions Using Memory**:
- 50+ direct accesses to `this.profiles.get(id)`
- `this.profiles.set(id, {...})` for updates
- `this.profiles.delete(id)` for removals

**Functions Using MongoDB**:
- `getOwnProfile()` - MongoDB query
- `updateOwnProfile()` - MongoDB upsert
- Sync to MongoDB on user approval

**Hybrid Pattern Issues**:
```typescript
// Line 1354 - Fallback pattern
const p = this.profiles.get(tid) || await mongoStorage.getOwnProfile(u.username) || {};
```

**⚠️ Issues**:
- Two sources of truth (memory vs MongoDB)
- Memory is queried first, MongoDB is fallback
- Updates to memory not always synced to MongoDB
- Can cause data inconsistency

**Recommendation**: ✏️ Should be fully MongoDB (remove memory copies except for cache)

---

### 3. **Users** (Hybrid - Fallback Pattern)
**Status**: ⚠️ Partially MongoDB
**Mongoose Model**: `server/models/User.ts` ✓
**Storage in**: Both `this.users` Map AND MongoDB

**Functions Using Memory**:
- Used as fallback when Mongo times out
- Direct access in `seedDefaults()`, `normalizeStoredPasswords()`
- Iterated in loops to find admin/users

**Functions Using MongoDB**:
- All user queries wrapped with timeout → fallback to memory

**Hybrid Pattern**:
```typescript
// Line 673 - getUser with fallback
try {
  return await withTimeout(mongoStorage.getUser(id));
} catch (err) {
  return this.users.get(id);  // Fallback to memory
}
```

**⚠️ Issues**:
- Memory is primary fallback
- Can hide MongoDB failures
- Memory and MongoDB can diverge
- User created in MongoDB but not in memory loses access

**Recommendation**: ✏️ Fix timeout handling; migrate all users to MongoDB before removing memory

---

## ❌ MEMORY ONLY (NOT MIGRATED)

### 1. **GamePlays**
**Status**: ❌ Memory Only
**Mongoose Model**: ❌ **MISSING**
**Storage in**: `this.gamePlays = new Map()`

**Data from**: `data.json` (raw.gamePlays)
**Functions**:
- `addGamePlay(studentUsername, gameId)` - Not visible in code, searches suggest uses this.gamePlays
- Logged in activity tracking

**⚠️ Issues**:
- Not persisted to database on restart
- Lost if server crashes
- No queries implemented

**Lines**: ~204, ~233

---

### 2. **Games** (Game Catalog)
**Status**: ❌ Memory Only
**Mongoose Model**: ❌ **MISSING**
**Storage in**: `this.games = new Map()`

**Data from**: `data.json` + seeded in `ensureDemoGames()`
**Functions**:
- `ensureDemoGames()` - Seed 6 demo games into memory
- Direct access for game info

**Games Tracked**:
- Waste Segregation
- Water Conservation
- Eco Quiz
- Carbon Calculator
- Matching Pairs Date
- (6 total games)

**⚠️ Issues**:
- No persistence
- Games re-created on each server start (wasteful)
- No way to add new games via UI (hardcoded)
- No game scores tracking in MongoDB

**Lines**: ~205, ~234, ~478-499, ~494-499

---

### 3. **LessonCompletions**
**Status**: ❌ Memory Only
**Mongoose Model**: ❌ **MISSING**
**Storage in**: `this.lessonCompletions = new Map()`

**Data from**: `data.json` (raw.lessonCompletions)
**Functions**:
- `listLessonCompletions(studentUsername)` - Filter from memory
- `completeLesson(studentUsername, input)` - Add to memory
- Used in leaderboards and stats calculations

**Used In Stats**:
- Eco points calculation (loops through all completions)
- Leaderboard scores
- Student activity tracking

**⚠️ Issues**:
- Lost on restart
- Used to calculate critical stats (eco points in leaderboard!)
- No archive of completion history
- No timestamps preserved

**Lines**: ~206, ~235, ~1527-1565, referenced 50+ times

---

### 4. **LearningModules**
**Status**: ❌ Memory Only
**Mongoose Model**: ❌ **MISSING**
**Storage in**: `this.learningModules = new Map()`

**Data from**: `data.json` (raw.learningModules)
**Functions**:
- `listLearningModules()` - Return all from memory
- `listManagedLearningModules(managerUsername)` - Return all (manager check not implemented)
- `upsertManagedLearningModule(managerUsername, input)` - Update/create in memory
- `deleteManagedLearningModule(managerUsername, moduleId)` - Tombstone delete

**Data Structure**:
```typescript
{
  id: string,
  managedBy: string,  // manager username
  title: string,
  description?: string,
  deletedAt?: number,
  lessons: Array<{
    id?: string,
    title: string,
    duration?: string,
    points: number,
    content?: string
  }>
}
```

**⚠️ Issues**:
- No persistence
- Manager edits lost on restart
- Tombstone delete pattern doesn't work with memory (can't query deleted status)
- No audit trail

**Lines**: ~207, ~236, ~1566-1664, referenced 20+ times

---

### 5. **Notifications**
**Status**: ❌ Memory Only
**Mongoose Model**: ❌ **MISSING**
**Storage in**: `this.notifications = new Map()`

**Data from**: `data.json` (raw.notifications)
**Functions**:
- `listNotifications(username)` - Filter by userId
- `addNotificationForUserId(userId, title, type)` - Private, adds to memory
- `markAllNotificationsRead(username)` - Update in memory
- `countUnread(userId)` - Count filter

**Used For**:
- Real-time notifications to students
- Activity alerts

**⚠️ Issues**:
- Lost on restart (users lose notification history)
- No persistence
- No delivery tracking
- No way to query historical notifications

**Lines**: ~208, ~237, ~1505-1526, referenced 20+ times

---

### 6. **Videos**
**Status**: ❌ Memory Only
**Mongoose Model**: ❌ **MISSING**
**Storage in**: `this.videos = new Map()`

**Data from**: `data.json` (raw.videos)
**Functions**:
- `getAllVideos()` - Return all from memory
- `getTeacherVideos(teacherId)` - Filter by uploadedBy
- `getTeacherVideosCount(teacherUsername)` - Count query

**Video Data**:
```typescript
{
  id: string,
  title: string,
  description?: string,
  type: 'youtube' | 'file',
  url: string,
  thumbnail?: string,
  credits: number,
  uploadedBy: string,  // username
  uploadedAt: number,
  category?: string,
  duration?: number  // seconds
}
```

**⚠️ Issues**:
- Lost on restart
- No persistence of uploads
- Teachers can't actually upload videos
- Credits system not tracked

**Lines**: ~210, ~238

---

### 7. **UserVideoProgress**
**Status**: ❌ Memory Only
**Mongoose Model**: ❌ **MISSING**
**Storage in**: `this.userVideoProgress = new Map()`

**Data from**: `data.json` (raw.userVideoProgress)
**Functions**: Not exposed in IStorage interface (orphaned)

**Data Structure**:
```typescript
{
  id: string,
  userId: string,
  videoId: string,
  watched: boolean,
  watchedAt?: number,
  creditsAwarded: boolean
}
```

**⚠️ Issues**:
- Lost on restart
- No functions to query/update it
- Credits awarded flag not used
- Orphaned collection (no interface methods)

**Lines**: ~211, ~239

---

### 8. **UserCredits**
**Status**: ❌ Memory Only
**Mongoose Model**: ❌ **MISSING**
**Storage in**: `this.userCredits = new Map()`

**Data from**: `data.json` (raw.userCredits)
**Functions**:
- `getUserCredits(username)` - Query from memory

**Data Structure**:
```typescript
{
  id: string,
  userId: string,
  totalCredits: number,
  lastUpdated: number
}
```

**⚠️ Issues**:
- Lost on restart
- Credits system incomplete
- No way to award credits
- No update function

**Lines**: ~212, ~240

---

### 9. **Groups** (Task Groups)
**Status**: ❌ Memory Only
**Mongoose Model**: ❌ **MISSING**
**Storage in**: `this.groups = new Map()`

**Data from**: `data.json` (raw.groups)
**Functions**:
- `createTaskGroup(studentUsername, taskId, members)` - Create in memory
- `getTaskGroupForStudent(studentUsername, taskId)` - Query from memory

**⚠️ Issues**:
- Lost on restart
- Group submissions linked to group ID (orphaned if group lost)
- No member name resolution
- Limited queries

**Lines**: ~200, ~232

---

### 10. **Assignments** (Global Assignments)
**Status**: ❌ Memory Only
**Mongoose Model**: ❌ **MISSING**
**Storage in**: `this.assignments = new Map()`

**Data from**: `data.json` (raw.assignments)
**Functions**:
- `createAssignment(...)` - Create in memory
- `listTeacherAssignments(teacherUsername)` - Query from memory
- `listGlobalAssignments()` - Query from memory
- `updateAssignment(...)` - Update in memory
- `deleteAssignment(...)` - Delete from memory
- `listStudentAssignments(...)` - Filter by visibility + school

**⚠️ Issues**:
- Lost on restart
- Visibility field stored but not enforced consistently
- SchoolId missing from many old records

**Lines**: ~202, ~243, ~1957-2038

---

### 11. **AssignmentSubmissions**
**Status**: ❌ Memory Only
**Mongoose Model**: ❌ **MISSING**
**Storage in**: `this.assignmentSubmissions = new Map()`

**Data from**: `data.json` (raw.assignmentSubmissions)
**Functions**:
- Created implicitly when assignments submitted
- Queried in assignment UI

**⚠️ Issues**:
- Lost on restart
- No submissions persisted
- Orphaned without assignment persistence

**Lines**: ~203, ~244

---

## 🔴 CRITICAL BUGS & ISSUES

### **Issue 1: Direct Memory Access - `this.profiles`** 
**Severity**: 🔴 HIGH
**Impact**: Data inconsistency, lost updates
**Locations**: 50+ places in storage.ts

```typescript
// Example: Line 1107
const p = this.profiles.get(uid) || {};

// Example: Line 1522
this.profiles.set(id, { ...p, allowExternalView: !!allowExternalView });
```

**Problem**: 
- Profile updates in memory don't sync to MongoDB
- MongoDB updates not reflected in memory
- Two sources of truth

**Fix Required**: ✏️
- Route all profile access through MongoDB
- Remove direct memory copies (except for cache layer)
- Ensure all updates sync bidirectionally

---

### **Issue 2: Direct Memory Access - `this.users`** 
**Severity**: 🔴 HIGH
**Impact**: Authentication failures, hidden MongoDB errors
**Locations**: 20+ places

```typescript
// Example: Line 288
this.users.forEach((u, id) => {
  const hashed = this.toHashedPassword((u as any).password);
```

**Problem**:
- Fallback hides MongoDB connection issues
- Users created in MongoDB but not in memory can't authenticate
- Memory and MongoDB can diverge

**Fix Required**: ✏️
- Migrate all users to MongoDB first
- Test MongoDB connection failures properly
- Remove memory fallback for production

---

### **Issue 3: Direct Memory Access - `this.roles`** 
**Severity**: 🔴 HIGH
**Impact**: Missing data, permission issues
**Locations**: 50+ places

```typescript
// Example: Line 248
const role = this.roles.get(id);
if ((role === 'student' || role === 'teacher') && !this.profiles.get(id)) {
```

**Problem**:
- Roles never persisted to MongoDB
- New roles from signups not stored
- Lost on restart

**Fix Required**: ✏️
- Create Roles collection in MongoDB OR attach role to User
- Remove `this.roles` Map entirely
- Query role from User document

---

### **Issue 4: School Sync Without Normalization**
**Severity**: 🔴 HIGH (DATA QUALITY)
**Impact**: Duplicate schools, schoolId mismatch
**Location**: Line 315-368 (initializeSyncSchoolsToMongo)

```typescript
// Problematic old code - didn't normalize
const memorySchools = Array.from(this.schools.values());
for (const school of memorySchools) {
  // This doesn't apply normalization!
  const mongoSchool = await mongoStorage.getOrCreateSchoolByName(school.name);
  // school.name had original casing, so it bypassed lowercase normalization
}
```

**Current Status**:
- Old sync created duplicates: "blue horizon school" + "Blue Horizon School"
- ~40 school name duplicates in MongoDB

**Fix Required**: ✏️
- Run migration script to deduplicate (see below)
- Ensure all future syncs use normalized names

---

### **Issue 5: Missing Mongoose Models**
**Severity**: 🟡 MEDIUM
**Count**: 11 missing models
**Impact**: Data loss, no persistence

**Missing Collections**:
- GamePlays ❌
- Games ❌
- LessonCompletions ❌
- LearningModules ❌
- Notifications ❌
- Videos ❌
- UserVideoProgress ❌
- UserCredits ❌
- Groups ❌
- Assignments ❌
- AssignmentSubmissions ❌

**Fix Required**: ✏️
- Create Mongoose models for all
- Migrate storage.ts methods to MongoStorage
- Update tests

---

### **Issue 6: No Awaits in Async Functions**
**Severity**: 🟡 MEDIUM  
**Impact**: Race conditions, dropped operations
**Example**: Line 1030
```typescript
async updateOwnProfile(username: string, updates: Partial<ProfileUpsert>) {
  // ... memory updates ...
  // Missing: await mongoStorage.updateOwnProfile(...)
  // This runs async but caller doesn't wait!
}
```

**Locations to Check**:
- Profile updates in lines 1025-1035
- School sync in line 315+
- Application approvals in line 800+

---

### **Issue 7: Orphaned Collections**
**Severity**: 🟡 MEDIUM
**Impact**: Unused code, confusion
**Examples**:
- `userVideoProgress` - has data but no functions to query it
- `games` catalog - hardcoded, not editable
- `assignments` - interface exists but not MongoDB-backed

---

### **Issue 8: Missing SchoolId Fields**
**Severity**: 🟡 MEDIUM
**Impact**: School-level filtering won't work
**Locations**: 
- Old assignments may not have schoolId
- Old announcements may not have schoolId
- Old games definitely don't have schoolId

---

## 📋 DETAILED COLLECTION STATUS TABLE

| Collection | Model | Storage | Functions | Status | Issues |
|-----------|-------|---------|-----------|--------|--------|
| **Users** | ✅ | Mongo + Memory | 3 | ⚠️ Hybrid | Fallback hides errors |
| **Profiles** | ✅ | Mongo + Memory | 4 | ⚠️ Hybrid | Dual source of truth |
| **Roles** | ❌ | Memory Only | ~2 | ❌ Memory | Not in MongoDB |
| **Schools** | ✅ | MongoDB Only | 3 | ✅ Full | Duplicates in old data |
| **Tasks** | ✅ | MongoDB Only | 7 | ✅ Full | Good |
| **Submissions** | ✅ | MongoDB Only | 1 | ✅ Full | Good |
| **Announcements** | ✅ | MongoDB Only | 7 | ✅ Full | Good |
| **Quizzes** | ✅ | MongoDB Only | 8 | ✅ Full | Good |
| **QuizAttempts** | ✅ | MongoDB Only | 1 | ✅ Full | Good |
| **Games** | ❌ | Memory Only | 1 | ❌ Lost | Hardcoded, no persistence |
| **GamePlays** | ❌ | Memory Only | 1 | ❌ Lost | Lost on restart |
| **Groups** | ❌ | Memory Only | 2 | ❌ Lost | No persistence |
| **Assignments** | ❌ | Memory Only | 5 | ❌ Lost | No schoolId |
| **AssignmentSubmissions** | ❌ | Memory Only | 1 | ❌ Lost | No persistence |
| **LearningModules** | ❌ | Memory Only | 4 | ❌ Lost | Tombstone delete broken |
| **LessonCompletions** | ❌ | Memory Only | 2 | ❌ Lost | **Used in leaderboard!** |
| **Videos** | ❌ | Memory Only | 3 | ❌ Lost | No upload mechanism |
| **UserVideoProgress** | ❌ | Memory Only | 0 | ❌ Lost | Orphaned |
| **UserCredits** | ❌ | Memory Only | 1 | ❌ Lost | Incomplete |
| **Notifications** | ❌ | Memory Only | 4 | ❌ Lost | Lost on restart |
| **OTP** | ❌ | Memory Only | 2 | ❌ Lost | TTL management |
| **PendingStudents** | ❌ | Memory Only | 5 | ❌ Lost | Should use MongoDB |
| **PendingTeachers** | ❌ | Memory Only | 5 | ❌ Lost | Should use MongoDB |

---

## 🛠️ RECOMMENDED MIGRATION ORDER

### **Phase 1: Fix Critical Issues (Week 1)**
Priority: 🔴 URGENT

1. **Fix Roles collection**
   - [ ] Create `Roles` MongoDB collection or add `role` field to User
   - [ ] Migrate role lookups to MongoDB
   - [ ] Remove `this.roles` Map entirely
   - [ ] Update 50+ references to use MongoDB

2. **Fix duplicate schools**
   - [ ] Run deduplication script
   - [ ] Merge all case-variants to lowercase canonical form
   - [ ] Update all references from old IDs to new IDs

3. **Remove Memory Fallback from Users**
   - [ ] Migrate all users to MongoDB
   - [ ] Ensure all users in memory also in Mongo
   - [ ] Remove fallback pattern
   - [ ] Handle timeout cases properly

### **Phase 2: Complete Profiles Migration (Week 2)**
Priority: 🟠 HIGH

4. **Convert Profiles to MongoDB-only**
   - [ ] Move all profile updates to MongoDB
   - [ ] Query only from MongoDB
   - [ ] Remove `this.profiles` Map
   - [ ] Update 50+ references

5. **Add missing fields to Profile**
   - [ ] Ensure all profiles have schoolId
   - [ ] Normalize school references

### **Phase 3: High-Impact Collections (Week 3-4)**
Priority: 🟠 HIGH

6. **Migrate LessonCompletions** (used in leaderboard!)
   - [ ] Create Mongoose model
   - [ ] Create `LessonCompletion` collection in MongoDB
   - [ ] Migrate existing data
   - [ ] Update all queries to use MongoDB

7. **Migrate Assignments & AssignmentSubmissions**
   - [ ] Create Mongoose models
   - [ ] Migrate existing data
   - [ ] Add missing schoolId fields
   - [ ] Update all queries

8. **Migrate Notifications**
   - [ ] Create Mongoose model with TTL index
   - [ ] Migrate existing data
   - [ ] Implement proper notification delivery tracking

### **Phase 4: Remaining Collections (Week 5)**
Priority: 🟡 MEDIUM

9. **Migrate Groups**
   - [ ] Create Mongoose model
   - [ ] Update group queries

10. **Migrate Games/GamePlays**
    - [ ] Create Mongoose models
    - [ ] Implement game upload UI
    - [ ] Track gameplay scores

11. **Migrate Videos & UserVideoProgress**
    - [ ] Create Mongoose models
    - [ ] Implement video upload
    - [ ] Track video views and credits

12. **Migrate UserCredits**
    - [ ] Create Mongoose model
    - [ ] Implement credit awarding system

13. **Migrate Application Pending Queues**
    - [ ] Move PendingStudents to MongoDB collection
    - [ ] Move PendingTeachers to MongoDB collection
    - [ ] Create indices for status queries

14. **Migrate OTP Storage**
    - [ ] Create Mongoose model with TTL index
    - [ ] Move OTP storage to MongoDB

---

## 📝 DATA QUALITY CHECKS

### **School Duplicates - Current Status**
```
MongoDB contains ~80+ schools with 30-40 showing duplicate pairs:
- "blue horizon school" (lowercase) - ID: 68f10410-180a-4f0f-8dac-f595bbbc6a7a
- "Blue Horizon School" (original case) - ID: 9f82b135-150a-48a3-8b5d-f5535f07da72
```

**Migration Script Needed**:
```typescript
// Pseudocode
const schools = await School.find({});
const normalized = new Map();
const toDelete = [];

for (const school of schools) {
  const key = school.name.toLowerCase().trim();
  if (normalized.has(key)) {
    // Keep first, delete duplicate
    const canonical = normalized.get(key);
    // Update all references from school.id to canonical.id
    await Profile.updateMany({ schoolId: school.id }, { schoolId: canonical.id });
    await User.updateMany({ schoolId: school.id }, { schoolId: canonical.id });
    await Quiz.updateMany({ schoolId: school.id }, { schoolId: canonical.id });
    // ... etc for all collections
    toDelete.push(school.id);
  } else {
    normalized.set(key, school);
  }
}
// Delete old duplicates
for (const id of toDelete) {
  await School.deleteOne({ id });
}
```

---

## 🎯 SUCCESS CRITERIA

Migration is complete when:

- [ ] ✅ 0 direct accesses to `this.users` (except initialization)
- [ ] ✅ 0 direct accesses to `this.roles` (all queries from MongoDB)
- [ ] ✅ 0 direct accesses to `this.profiles` (all queries from MongoDB)
- [ ] ✅ All 23 collections have Mongoose models
- [ ] ✅ All 23 collections have MongoStorage methods
- [ ] ✅ All IStorage methods delegate to mongoStorage
- [ ] ✅ Memory Maps used only for temporary cache, not persistence
- [ ] ✅ data.json no longer needed (except for backups)
- [ ] ✅ All operations survive server restart
- [ ] ✅ No duplicate schools/users/etc.
- [ ] ✅ SchoolId present in all applicable documents
- [ ] ✅ All async operations properly awaited
- [ ] ✅ No timeout fallbacks in critical paths

---

## 📊 MIGRATION COMPLETION ESTIMATE

**Current**: 35% complete (7/23 collections + 3 hybrid)

**After Phase 1**: 50% (critical fixes)
**After Phase 2**: 60% (profiles)
**After Phase 3**: 80% (high-impact)
**After Phase 4**: 100% (remaining)

**Estimated Timeline**: 2-3 weeks

---

## 🚀 DEPLOYMENT READINESS

**Current Status**: ⚠️ **NOT READY**

**Blockers**:
1. 🔴 Direct memory access patterns (Roles, Users, Profiles)
2. 🔴 School duplicate data quality issue
3. 🔴 11 collections still memory-only
4. 🔴 Leaderboard stats depend on non-persistent data (LessonCompletions)
5. 🟠 No mechanism for teachers to upload videos
6. 🟠 Notification system incomplete

**Safe to Deploy**: Only after Phase 2 complete

---

## 📞 QUESTIONS & NEXT STEPS

1. **Priority Order**: Should we start with Roles or Profiles?
2. **Downtime**: Can we afford data migration downtime?
3. **Schema**: Should Roles be in User collection or separate?
4. **Backup**: Should we keep data.json for historical reference?
5. **Timeline**: Is 2-3 week migration timeline acceptable?

