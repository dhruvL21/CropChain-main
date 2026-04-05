# CropChain - Your Digital Agriculture Ecosystem

CropChain is a comprehensive web application built with Next.js and Firebase, designed to modernize the agricultural supply chain. It serves as a digital bridge between farmers and buyers, providing specialized tools for each role to facilitate efficient trade, informed decision-making, and access to essential resources.

## Key Features

- **Dual User Roles**: Users can register as a **Farmer** or a **Buyer**, each with a unique, tailored experience.
- **Multilingual Support**: Full internationalization for **English, Hindi, Marathi, and Gujarati**, with a language switcher that saves user preferences.
- **Role-Based Dashboards**:
  - **Farmer Dashboard**: An analytics hub displaying key metrics like revenue, sales volume, and profit margins. It includes charts for sales trends, a table to manage incoming offers, and an inventory overview.
  - **Buyer Dashboard**: A streamlined experience focused on discovering and procuring crops from the marketplace.
- **Dynamic Marketplace**:
  - Buyers can browse listings with **Retail** and **Wholesale** purchasing options.
  - An integrated **Offer System** allows buyers to negotiate prices for bulk orders, with real-time notifications on offer status.
  - Buyers can request **free samples** to verify quality before making a large purchase.
- **Farmer Tools**:
  - **My Listings**: Farmers can easily create, manage, edit, and delete their crop listings.
  - **AI Price Optimizer**: An intelligent tool that leverages Genkit to analyze market data and recommend optimal pricing strategies for crops.
- **Farmer Shop**: An e-commerce section where farmers can purchase agricultural supplies like seeds, fertilizers, and tools.
- **Government Schemes Hub**: A multilingual information center detailing beneficial government schemes, complete with eligibility criteria, benefits, and application links.
- **Firebase Integration**: Secure authentication and a real-time Firestore database for all application data.
- **Fully Responsive**: A polished and accessible user interface that works seamlessly across desktop, tablet, and mobile devices.

## How It Works

### Farmer Journey

1.  **Sign Up**: Register as a "Farmer" using Google or email/password.
2.  **List Crops**: Navigate to "My Listings" to add crops to the marketplace, setting prices, quantities, and quality details.
3.  **Manage Offers**: View and respond to incoming offers from buyers on the main Dashboard.
4.  **Optimize Pricing**: Use the "AI Price Optimizer" to get data-driven suggestions for crop pricing.
5.  **Purchase Supplies**: Browse the "Farmer Shop" to buy agricultural inputs.
6.  **Stay Informed**: Check the "Govt. Schemes" page for information on financial aid and support programs.

### Buyer Journey

1.  **Sign Up**: Register as a "Buyer" and complete your profile.
2.  **Browse Marketplace**: Explore crop listings, switching between retail and wholesale views.
3.  **Purchase or Offer**: Add items directly to the cart for retail purchase or make a custom offer for wholesale quantities.
4.  **Track Offers**: Monitor the status of your submitted offers on the "My Offers" page.
5.  **Get Notified**: Receive real-time notifications when a farmer accepts or rejects your offer.

## Technology Stack

- **Core Framework**: Next.js 15 (using the App Router for server components and optimized routing).
- **Primary Language**: TypeScript, ensuring type safety and improved developer experience.
- **Backend & Database**: Firebase, utilizing Firebase Authentication for secure user management and Firestore for a real-time, scalable NoSQL database.
- **Styling**: A combination of Tailwind CSS for utility-first styling and ShadCN UI for a library of beautifully designed, accessible, and customizable React components.
- **Generative AI**: Google's Genkit framework, specifically using the `@genkit-ai/google-genai` plugin to leverage Gemini models for intelligent features like the AI Price Optimizer.
- **UI & State Management**: Built on React 19, with extensive use of Hooks and the React Context API for managing global state such as the shopping cart, user authentication, and language preferences.
- **Data Visualization**: Recharts is used to create the interactive and responsive charts found on the farmer's dashboard.
- **Forms**: React Hook Form combined with Zod for robust, type-safe schema declaration and validation on all forms.
- **Internationalization (i18n)**: A custom-built solution using JSON files for translations in English, Hindi, Marathi, and Gujarati, managed via a `useLanguage` hook.
- **Icons**: Lucide React provides the clean, consistent, and lightweight icon set used throughout the application.
- **Deployment**: Hosted on Firebase App Hosting for seamless integration with the Firebase backend.

## Getting Started

To run this project locally, you'll need to have Node.js (v18 or later) and npm installed.

### 1. Set up Environment Variables

This project uses Google's Generative AI. To access the AI features, you'll need an API key.

1.  Create a copy of the `.env.example` file and name it `.env`.
2.  Open the new `.env` file.
3.  Replace `YOUR_API_KEY_HERE` with your actual Gemini API key. You can get a key from [Google AI Studio](https://aistudio.google.com/app/apikey).

```
GEMINI_API_KEY="YOUR_API_KEY_HERE"
```

### 2. Install Dependencies

From the project's root directory, run the following command to install all the necessary packages defined in `package.json`:

```bash
npm install
```

### 3. Run the Development Servers

This project requires two separate processes to run simultaneously. You will need to open two terminals.

**In your first terminal, start the Next.js web application:**

```bash
npm run dev
```

The app will be accessible at `http://localhost:9002`.

**In your second terminal, start the Genkit AI server:**

```bash
npm run genkit:dev
```

This starts the AI service and its inspection UI, which you can view at `http://localhost:4000`.
