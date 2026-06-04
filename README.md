# PrepRoute — Test Creation Platform

A web application for creating, managing, and publishing tests with rich question authoring support.

## Tech Stack

- **React 19** with TypeScript
- **Vite** — build tool and dev server
- **Redux Toolkit** — global state management
- **React Router v7** — client-side routing
- **Tiptap** — rich text editor for question content
- **Tailwind CSS** — utility-first styling
- **React Hook Form** — form handling

## Features

- User authentication flow
- Dashboard to manage existing tests
- Step-by-step test creation (details → questions → publish)
- Rich text question editor with image and link support
- Multiple question types with options and correct answer selection
- Edit and publish test workflows

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── common/       # Reusable UI components (Button, Input, Dropdown, etc.)
│   └── layout/       # App shell components (Header, Sidebar, MainLayout)
├── features/         # Redux slices (auth, tests, subjects, testCreation)
├── pages/            # Route-level page components
├── services/         # API service layer
└── store/            # Redux store configuration
```
