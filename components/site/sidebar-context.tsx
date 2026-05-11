"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { usePathname } from "next/navigation"

type SidebarCtx = {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  toggle: () => void
}

const Ctx = createContext<SidebarCtx | null>(null)

function isChatRoute(pathname: string) {
  return pathname.startsWith("/dashboard/chat/")
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Default: collapse on chat routes, expanded everywhere else. The user can
  // still toggle mid-route; on navigation the default re-applies.
  const [collapsed, setCollapsed] = useState(() => isChatRoute(pathname))
  const lastPath = useRef(pathname)
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname
      setCollapsed(isChatRoute(pathname))
    }
  }, [pathname])
  const toggle = useCallback(() => setCollapsed((v) => !v), [])
  return (
    <Ctx.Provider value={{ collapsed, setCollapsed, toggle }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSidebar() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useSidebar must be used inside SidebarProvider")
  return v
}
