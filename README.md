# Mosaic Collective Platform 🎨

A massive multiplayer geometric art-canvas platform built on Next.js, React, and Convex.

This project enables seamless collaborative image mapping by utilizing an advanced native math engine inside a `<canvas>` that transforms hundreds of individual photo contributions into a massive orchestrated grid matching a target master image format.

## Architectural Highlights

- **Infinite Canvas Engine (Frontend)**: Real-time geometric mapping algorithms natively animating, zooming, and tracking user-inserted coordinates via physical `Math.lerp()` translations.
- **Client-Side Compression**: Native Javascript DOM parsing to automatically process user photos down into secure 250px matrices locally before engaging the network, dramatically mitigating storage bandwidth and load times.
- **Backend Duplication Masking**: A native array-caching mechanism efficiently paints transparent "ghost grids" mapping approved photos infinitely. This keeps the application feeling visually full while technically preserving backend storage limit thresholds. 
- **Admin Layout Generation Console**: Private endpoints calculating closest RGB match mapping algorithms via Euclidean distancing to securely determine the optimal location for each approved photo.

## Technology Stack

- **Framework**: [Next.js (App Router)](https://nextjs.org/)
- **Frontend State**: [React 19](https://react.dev/)
- **Backend & Database**: [Convex](https://convex.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **File Storage**: Convex Blob Storage Integration 

## Local Development Setup

To run this platform locally:

**1. Clone the project and install dependencies**
```bash
npm install
```

**2. Synchronize the backend & Start the frontend**
Convex uses code execution protocols to guarantee safety in transit. Open two side-by-side terminal instances.

In Terminal 1 (Launches the Next.js runtime server on port 3000):
```bash
npm run dev
```

In Terminal 2 (Spins up your remote dynamic API DB & hot-swaps endpoints):
```bash
npx convex dev
```

### Usage
- **Client Interface**: Enter `http://localhost:3000` to interact with the raw mosaic grid and search verified items.
- **Admin Portal**: Enter `http://localhost:3000/admin` (Passcode: `mosaic2026`) to parse new submissions, verify authentic images, map grid bounds algebraically, and expand capacity.

## Deployment Notes
- Ensure your `CONVEX_DEPLOYMENT` environment parameters are securely linked when setting up Vercel distributions.
- To execute a final production build, you must run `npx convex deploy` which hard-links endpoints prior to standard Next.js building logic.
