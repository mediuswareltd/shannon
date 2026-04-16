Build a desktop Electron application (TypeScript preferred) that acts as a unified developer activity dashboard across GitHub.

Goal

The app should help me track my entire GitHub activity across my accounts and organizations in one place, including commits, issues, pull requests, and repository activity. I can connect whatever account i want and then i will have this dashboard

Core Features
1. Unified GitHub Activity Feed
Show activity from:
My personal account
Multiple connected GitHub accounts (I use ~5 accounts)
Organizations I belong to
Include:
Latest commits
Issues created/assigned/updated
Pull requests (opened, merged, reviewed)
Repository-level activity
2. Project / Repository View
Group all activity by repository
Each repo should show:
Latest commit
Recent PRs
Active issues
Last updated timestamp
3. Activity Analytics Dashboard

Provide a board-style analytics view:

Filter by:
Last 24 hours
Weekly
Monthly
Show:
Number of commits per repo
Number of issues created/closed
Number of PRs merged/opened
Highlight most active repositories
4. Multi-Account Support
Connect multiple GitHub accounts via OAuth or token-based auth
Merge all data into a single timeline
Clearly label which account/org each activity belongs to
5. Global Search & Filtering
Search across:
Repositories
Issues
PRs
Filter by:
Account
Organization
Repository
Activity type
6. UI Requirements
Clean dashboard layout (Notion / Linear style preferred)
Sidebar navigation:
Dashboard
Repositories
Activity Feed
Analytics
Settings
Main panel shows dynamic cards and tables
Dark mode support
Technical Requirements
Electron + React (or similar modern frontend)
TypeScript everywhere
GitHub API integration (GraphQL preferred for efficiency)
Local caching (SQLite or IndexedDB)
Background sync service to periodically fetch updates
Secure token storage (OS keychain preferred)
Bonus (if possible)
Notifications for new PRs/issues
“Top active repo” insight
Daily summary report
Export activity to CSV