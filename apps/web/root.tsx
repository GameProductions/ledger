import { useEffect } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Toaster } from "react-hot-toast";

import "./index.css";

export function meta() {
  return [
    { title: "Ledger - Multi-Household Financial Platform" },
    { name: "description", content: "Financial ledger, multi-currency transaction tracking, and accounts management." },
    { property: "og:type", content: "website" },
    { property: "og:title", content: "Ledger - Multi-Household Financial Platform" },
    { property: "og:description", content: "Financial ledger, multi-currency transaction tracking, and accounts management." },
    { property: "og:image", content: "/assets/logo.png" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export function links() {
  return [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" },
    { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.png" },
    { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
    { rel: "manifest", href: "/manifest.json" },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <Meta />
        <Links />
      </head>
      <body className="bg-slate-950 text-slate-100 selection:bg-emerald-500/30">
        {children}
        <Toaster position="top-right" />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  useEffect(() => {
    // [FLEET-RESILIENCE] Asset Recovery Protocol
    const handleAssetError = (e: ErrorEvent) => {
      const target = e.target;
      if (target && (target instanceof HTMLScriptElement || target instanceof HTMLLinkElement)) {
        const src = (target as any).src || (target as any).href;
        if (src && src.includes('/assets/')) {
          console.error('[Asset Recovery] Failed to load essential asset:', src);
          window.location.reload();
        }
      }
    };

    window.addEventListener('error', handleAssetError, true);

    const handleMutate = (e: any) => {
      console.log('[Reactive Sync] Global Mutation Triggered:', e.detail?.path);
    };
    window.addEventListener('ledger-api-mutate', handleMutate);

    return () => {
      window.removeEventListener('error', handleAssetError, true);
      window.removeEventListener('ledger-api-mutate', handleMutate);
    };
  }, []);

  return <Outlet />;
}

export function ErrorBoundary({ error }: any) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center mx-auto max-w-7xl w-full px-6 bg-slate-950">
      <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-900 rounded-[2.5rem] p-12 text-center w-full max-w-lg shadow-xl">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 inline-block">{message === "404" ? "🔍 Not Found" : "⚠️ Error"}</span>
        <h1 className="text-5xl font-black mb-4 text-white">{message}</h1>
        <p className="text-slate-400 text-sm mb-6">{details}</p>
        <a href="/" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs tracking-widest py-3 px-8 rounded-[1.25rem] transition-all active:scale-95 shadow-[0_8px_25px_rgba(16,185,129,0.3)] inline-flex">Back to Home</a>
      </div>
    </main>
  );
}
