"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Brain,
  CreditCard,
  FileText,
  Home,
  Menu,
  MessagesSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "./theme-toggle"
import { SignOutMenuItem } from "./sign-out-menu-item"

type Plan = "free" | "pro" | string

type NavItem = {
  href: string
  label: string
  icon: typeof Home
  match: (pathname: string) => boolean
}

const startsWithSegment = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(base + "/")

const NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: Home,
    match: (p) => p === "/dashboard",
  },
  {
    href: "/dashboard/documents",
    label: "Documents",
    icon: FileText,
    match: (p) => startsWithSegment(p, "/dashboard/documents"),
  },
  {
    href: "/dashboard/chats",
    label: "Chats",
    icon: MessagesSquare,
    // Conversations live at /dashboard/chat/[id] (singular) — highlight Chats
    // for both the list page and any individual conversation.
    match: (p) =>
      startsWithSegment(p, "/dashboard/chats") ||
      startsWithSegment(p, "/dashboard/chat"),
  },
  {
    href: "/dashboard/billing",
    label: "Billing",
    icon: CreditCard,
    match: (p) => startsWithSegment(p, "/dashboard/billing"),
  },
]

type Props = {
  email: string | null | undefined
  avatarUrl?: string | null
  plan: Plan
  children: React.ReactNode
}

export function AppShell({ email, avatarUrl, plan, children }: Props) {
  const initials = (email ?? "?").slice(0, 2).toUpperCase()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-dvh w-full">
      <DesktopSidebar email={email} avatarUrl={avatarUrl} plan={plan} initials={initials} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MobileTopbar
          open={mobileOpen}
          onOpenChange={setMobileOpen}
          email={email}
          avatarUrl={avatarUrl}
          plan={plan}
          initials={initials}
        />
        {children}
      </div>
    </div>
  )
}

function DesktopSidebar({
  email,
  avatarUrl,
  plan,
  initials,
}: {
  email: string | null | undefined
  avatarUrl?: string | null
  plan: Plan
  initials: string
}) {
  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-border/60 bg-muted/20 md:flex">
      <SidebarBrand />
      <SidebarNav onNavigate={() => {}} />
      <SidebarFooter
        email={email}
        avatarUrl={avatarUrl}
        plan={plan}
        initials={initials}
      />
    </aside>
  )
}

function MobileTopbar({
  open,
  onOpenChange,
  email,
  avatarUrl,
  plan,
  initials,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  email: string | null | undefined
  avatarUrl?: string | null
  plan: Plan
  initials: string
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur md:hidden">
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Open navigation" />
          }
        >
          <Menu />
        </SheetTrigger>
        <SheetContent side="left" className="flex w-64 flex-col p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBrand />
          <SidebarNav onNavigate={() => onOpenChange(false)} />
          <SidebarFooter
            email={email}
            avatarUrl={avatarUrl}
            plan={plan}
            initials={initials}
          />
        </SheetContent>
      </Sheet>

      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center bg-foreground text-background">
          <Brain className="size-4" />
        </div>
        <span className="font-heading text-base font-semibold tracking-wider uppercase">
          DocuMind
        </span>
      </Link>

      <ThemeToggle />
    </header>
  )
}

function SidebarBrand() {
  return (
    <Link
      href="/dashboard"
      className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 px-4"
    >
      <div className="flex size-7 items-center justify-center bg-foreground text-background">
        <Brain className="size-4" />
      </div>
      <span className="font-heading text-base font-semibold tracking-wider uppercase">
        DocuMind
      </span>
    </Link>
  )
}

function SidebarNav({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      <p className="px-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
        Workspace
      </p>
      {NAV.map((item) => {
        const Icon = item.icon
        const active = item.match(pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group/nav relative flex h-9 items-center gap-3 px-3 text-sm transition-colors",
              "border-l-2",
              active
                ? "border-foreground bg-muted font-semibold text-foreground"
                : "border-transparent text-muted-foreground hover:border-foreground/30 hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarFooter({
  email,
  avatarUrl,
  plan,
  initials,
}: {
  email: string | null | undefined
  avatarUrl?: string | null
  plan: Plan
  initials: string
}) {
  const isPro = plan === "pro"
  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border/60 px-3 py-3">
      <Link
        href="/dashboard/billing"
        className={cn(
          "flex items-center justify-between gap-2 border bg-card px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-widest transition-colors hover:bg-muted",
          isPro ? "border-foreground/40" : "border-border",
        )}
      >
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "size-1.5",
              isPro ? "bg-foreground" : "bg-muted-foreground",
            )}
          />
          {isPro ? "Pro plan" : "Free plan"}
        </span>
        <span className="text-muted-foreground">
          {isPro ? "Manage" : "Upgrade"}
        </span>
      </Link>

      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                aria-label="Account menu"
                className="h-9 min-w-0 flex-1 justify-start gap-2 px-2 normal-case tracking-normal"
              />
            }
          >
            <Avatar className="size-7">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-left text-xs font-medium">
              {email ?? "Account"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <SignOutMenuItem />
          </DropdownMenuContent>
        </DropdownMenu>
        <ThemeToggle />
      </div>
    </div>
  )
}

