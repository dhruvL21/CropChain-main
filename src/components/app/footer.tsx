'use client';

import Link from 'next/link';
import { Logo } from './logo';
import { ShieldCheck, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-border/40 bg-background/60 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 animate-fade-in">
          <div className="flex flex-col gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <Logo textClassName="text-xl group-hover:text-primary transition-colors duration-300" iconClassName="h-6 w-6" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Empowering farmers and buyers through a secure, decentralized agricultural supply chain and smart escrow payment ecosystem.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="h-4 w-4 animate-pulse" />
              Secured by CropChain Escrow
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold tracking-wider text-foreground uppercase mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/marketplace" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/dashboard/shop" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">
                  Agri Shop
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-wider text-foreground uppercase mb-4">Resources</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/dashboard/schemes" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">
                  Govt. Schemes
                </Link>
              </li>
              <li>
                <Link href="/dashboard/settings" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">
                  Settings
                </Link>
              </li>
              <li>
                <Link href="/dashboard/profile" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">
                  Profile
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-wider text-foreground uppercase mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <span className="text-muted-foreground cursor-not-allowed hover:text-foreground/80 transition-colors">Privacy Policy</span>
              </li>
              <li>
                <span className="text-muted-foreground cursor-not-allowed hover:text-foreground/80 transition-colors">Terms of Service</span>
              </li>
              <li>
                <span className="text-muted-foreground cursor-not-allowed hover:text-foreground/80 transition-colors">Support Helpdesk</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border/20 pt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} CropChain Inc. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-rose-500 fill-rose-500 animate-bounce" /> for sustainable agriculture.
          </p>
        </div>
      </div>
    </footer>
  );
}
