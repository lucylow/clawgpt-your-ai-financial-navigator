import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  MessageSquare,
  PieChart,
  History,
  Wallet,
  Image,
  Settings,
  HelpCircle,
} from "lucide-react";

export type CockpitNavGroupId = "workspace" | "portfolio" | "assets" | "support";

export const COCKPIT_ROUTE_META: Record<
  string,
  { title: string; description: string }
> = {
  "/app": {
    title: "Dashboard",
    description: "Agent chat and live portfolio metrics",
  },
  "/app/chat": {
    title: "Agent",
    description: "Conversational control for Claw",
  },
  "/app/portfolio": {
    title: "Portfolio",
    description: "Holdings and allocation detail",
  },
  "/app/transactions": {
    title: "Transactions",
    description: "History and settlement status",
  },
  "/app/wallets": {
    title: "Wallets",
    description: "Addresses and chain links",
  },
  "/app/nfts": {
    title: "NFTs",
    description: "Collectibles across chains",
  },
  "/app/settings": {
    title: "Settings",
    description: "Preferences and environment",
  },
  "/app/help": {
    title: "Help",
    description: "Guides and support",
  },
};

export function getCockpitRouteMeta(pathname: string): { title: string; description: string } {
  if (pathname === "/app" || pathname === "/app/") {
    return COCKPIT_ROUTE_META["/app"];
  }
  const exact = COCKPIT_ROUTE_META[pathname];
  if (exact) return exact;
  const prefix = Object.keys(COCKPIT_ROUTE_META)
    .filter((k) => k !== "/app")
    .sort((a, b) => b.length - a.length)
    .find((k) => pathname.startsWith(k));
  return prefix ? COCKPIT_ROUTE_META[prefix] : COCKPIT_ROUTE_META["/app"];
}

export type CockpitNavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  group: CockpitNavGroupId;
};

export const COCKPIT_NAV: CockpitNavItem[] = [
  { name: "Dashboard", href: "/app", icon: LayoutDashboard, group: "workspace" },
  { name: "Chat", href: "/app/chat", icon: MessageSquare, group: "workspace" },
  { name: "Portfolio", href: "/app/portfolio", icon: PieChart, group: "portfolio" },
  { name: "Transactions", href: "/app/transactions", icon: History, group: "portfolio" },
  { name: "Wallets", href: "/app/wallets", icon: Wallet, group: "assets" },
  { name: "NFTs", href: "/app/nfts", icon: Image, group: "assets" },
  { name: "Settings", href: "/app/settings", icon: Settings, group: "support" },
  { name: "Help", href: "/app/help", icon: HelpCircle, group: "support" },
];

export const COCKPIT_NAV_GROUP_LABEL: Record<CockpitNavGroupId, string> = {
  workspace: "Workspace",
  portfolio: "Portfolio & flow",
  assets: "Assets",
  support: "Account",
};
