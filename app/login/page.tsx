import Link from "next/link"
import { Suspense } from "react"
import { Brain } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-10 flex items-center justify-center gap-2"
        >
          <div className="flex size-8 items-center justify-center bg-foreground text-background">
            <Brain className="size-4" />
          </div>
          <span className="font-heading text-xl font-semibold tracking-wider uppercase">
            DocuMind
          </span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Sign in</CardTitle>
            <CardDescription className="text-center">
              Continue with Google or get a magic link in your inbox.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<LoginFormFallback />}>
              <LoginForm />
            </Suspense>
            <p className="mt-8 text-center text-xs uppercase tracking-widest text-muted-foreground">
              By continuing you agree to our terms
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function LoginFormFallback() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  )
}
