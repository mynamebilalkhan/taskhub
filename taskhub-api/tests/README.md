# TaskHub API Tests

This directory contains tests for the TaskHub API, including Playwright tests for the new unfavorite/unpin functionality.

## Setup

### Prerequisites
- Node.js (v16 or higher)
- Python Flask API running on port 5000

### Installation

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

## Running Tests

### All Tests
```bash
npm test
```

### Tests with UI (headed mode)
```bash
npm run test:headed
```

### Debug Mode
```bash
npm run test:debug
```

### Run specific test file
```bash
npx playwright test task-favorites-pinned.spec.ts
```

## Test Coverage

### Favorite Tasks (`/api/tasks/Favourite`)
- ✅ Add task to favorites (POST)
- ✅ Get favorite tasks for user (GET)
- ✅ Remove task from favorites (DELETE) - **NEW**
- ✅ Error handling for missing parameters
- ✅ Error handling for non-existent favorites

### Pinned Tasks (`/api/tasks/Pinned`)
- ✅ Add task to pinned (POST)
- ✅ Get pinned tasks for user (GET)
- ✅ Remove task from pinned (DELETE) - **NEW**
- ✅ Error handling for missing parameters
- ✅ Error handling for non-existent pinned tasks

### Combined Scenarios
- ✅ Task can be both favorite and pinned simultaneously
- ✅ Removing from favorites doesn't affect pinned status
- ✅ Removing from pinned doesn't affect favorite status

## API Endpoints

### Remove from Favorites
```
DELETE /api/tasks/Favourite?userId={userId}&taskId={taskId}
```

### Remove from Pinned
```
DELETE /api/tasks/Pinned?userId={userId}&taskId={taskId}
```

Both endpoints return:
- `204 No Content` on successful removal
- `404 Not Found` if the favorite/pinned task doesn't exist
- `400 Bad Request` if required parameters are missing