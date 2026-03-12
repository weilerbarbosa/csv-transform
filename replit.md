# CSV Transform - File Processor

## Overview
A web application for uploading, transforming, and validating CSV/XLS files with AI-powered column matching, SFTP upload capabilities, and detailed transformation monitoring.

## Current State
MVP complete with all core features:
- Template management (upload reference CSV/XLS files)
- AI-powered column matching using OpenAI (via Replit AI Integrations)
- Transformation dashboard with success/error tracking
- SFTP configuration and file upload
- Upload history with status tracking

## Architecture

### Frontend
- React SPA with Vite
- Tailwind CSS + Shadcn UI components
- Wouter for routing
- TanStack Query for data fetching
- React Dropzone for file uploads
- Pages: Dashboard, Templates, Transform, SFTP Upload, SFTP Settings

### Backend
- Express.js server
- PostgreSQL database (Neon-backed via Replit)
- Drizzle ORM for database operations
- Multer for file upload handling
- XLSX + PapaParse for file parsing
- OpenAI (gpt-5-mini) for AI column matching
- ssh2-sftp-client for SFTP operations

### Database Tables
- `templates` - Target CSV format definitions with columns and sample data
- `transformations` - File transformation records with mappings, errors, output data
- `sftp_configs` - SFTP server connection configurations
- `upload_logs` - SFTP upload history with status tracking
- `users` - User accounts (base schema)

### Key Files
- `shared/schema.ts` - All Drizzle schemas and TypeScript types
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - Database storage layer (DatabaseStorage)
- `server/db.ts` - Database connection
- `client/src/App.tsx` - App layout with sidebar navigation
- `client/src/pages/` - All page components

## Recent Changes
- 2026-02-10: Initial MVP implementation
  - Full schema with templates, transformations, SFTP configs, upload logs
  - AI-powered column matching with OpenAI
  - Complete CRUD for templates and SFTP configs
  - File transformation with download capability
  - SFTP upload with connection testing
  - Dashboard with stats and recent activity

## User Preferences
- None recorded yet
