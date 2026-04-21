# NetVent Organizer Dashboard

The **NetVent Organizer Dashboard** is a comprehensive, real-time web application built for event organizers. It allows you to manage everything from attendee check-ins and VIP role assignments to interactive 3D venue maps, live staff monitoring, and push-notification marketing campaigns.

Powered by **React**, **Vite**, **TypeScript**, and **Supabase**.

## 🚀 Features

- **Dashboard & Analytics:** Live statistics, check-in tracking, and overall event performance.
- **Event & Ticket Management:** Create events, set agendas, and manage generic to VIP ticket tiers.
- **Role Assignment:** Easily filter and assign custom roles (VIP, Speaker, Staff, Organizer, Attendee).
- **Interactive Venue Map:** Manage event zones, monitor crowd densities, and set zone access rules in real-time.
- **Live Staff Monitor:** Dedicated tablet view for staff members to oversee check-ins and zone capacities.
- **Marketing & Notifications:** Send targeted push notifications to the mobile app based on attendee interests.
- **Social Feed & Connections:** Review attendee engagements, DMs, and social feed activity.

## 🛠️ Technologies Used

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, Lucide React (Icons)
- **State Management:** Zustand
- **Backend & Database:** Supabase (PostgreSQL, Auth, RPC Functions)

## 📦 How to Run

1. **Install Dependencies**
   `ash
   npm install
   `

2. **Configure Environment Variables**
   Create a .env file in the root directory (if not present) and add your Supabase credentials:
   `env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   `

3. **Start the Development Server**
   `ash
   npm run dev
   `
   The dashboard will be available at http://localhost:5173.

4. **Build for Production**
   `ash
   npm run build
   `

## 🗂️ Project Structure

- src/components/: Reusable UI elements and layout wrappers (Header, Sidebar, Map).
- src/pages/: Main application views organized by feature (e.g., /auth, /roles, /marketing, /venue).
- src/lib/: Core utilities including Supabase client configuration and mock data helpers.
- src/stores/: Global Zustand stores (uthStore, eventStore).
- supabase/migrations/: SQL migration files storing backend schema shapes, RPC functions, and triggers.
- org-docs/: Technical documentation reference files for event and venue setups (e.g., layout specs, mobile push guide).
