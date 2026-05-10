import Link from "next/link"
import {
  ArrowRight,
  Bot,
  Brain,
  Check,
  ChevronDown,
  Database,
  FileSearch,
  Hash,
  ListTree,
  Quote,
  ScrollText,
  Search,
  Sparkles,
  User,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

const features = [
  {
    icon: Brain,
    title: "Agentic navigation",
    description:
      "The model decides which sections to read, what to search for, and which pages to pull. No naive top-k chunking.",
  },
  {
    icon: FileSearch,
    title: "Real citations",
    description:
      "Every answer links back to the exact section and page — click to jump straight to the source in the original PDF.",
  },
  {
    icon: Quote,
    title: "No vector database",
    description:
      "We never embed your documents. No pgvector, no Pinecone, no chunking heuristics. Just structured text and full-text search.",
  },
]

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try the agent on a few documents.",
    features: [
      "3 documents",
      "50 questions / month",
      "Single-document chats",
      "Citations to section & page",
    ],
    cta: "Start free",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "For serious research and writing.",
    features: [
      "Unlimited documents",
      "Unlimited questions",
      "Multi-document conversations",
      "Priority model latency",
      "Export chats",
    ],
    cta: "Go Pro",
    href: "/login",
    highlighted: true,
  },
]

const faqs = [
  {
    q: "What does “vectorless RAG” actually mean?",
    a: "Most RAG pipelines split documents into chunks, embed them into vectors, and retrieve the top-k matches by cosine similarity. DocuMind doesn't. Instead, the model navigates your document with tools — it reads the table of contents, opens specific sections, runs full-text searches, and pulls page ranges as needed. It works the way a researcher would.",
  },
  {
    q: "Why is this better than embeddings?",
    a: "Embedding-based retrieval is brittle on long, structured documents — it loses ordering, hierarchy, and context. Agentic navigation preserves all of that, gives you real citations, and avoids the chunk-size and overlap tuning that plagues vector RAG. It's also cheaper to run for many documents.",
  },
  {
    q: "How do citations work?",
    a: "Every fact the model surfaces is tagged with the section title and page number it came from. We render those as clickable links that jump to the exact location in the original PDF. No more “trust me, it's in the document somewhere.”",
  },
  {
    q: "What models do you use?",
    a: "We route through OpenRouter to DeepSeek V4 Flash by default — fast and inexpensive while still strong at long-context tool use.",
  },
  {
    q: "Is my data private?",
    a: "PDFs are stored in your own Supabase project under row-level security. Only your account can read or query them.",
  },
]

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Hero />
        <ProductDemo />
        <VsVectors />
        <Features />
        <HowItWorks />
        <Pricing />
        <Faq />
        <SiteFooter />
      </main>
    </div>
  )
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center bg-foreground text-background">
            <Brain className="size-4" />
          </div>
          <span className="font-heading text-lg font-semibold tracking-wider uppercase">
            DocuMind
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-xs font-semibold tracking-widest uppercase text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#how" className="hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#pricing" className="hover:text-foreground transition-colors">
            Pricing
          </a>
          <a href="#faq" className="hover:text-foreground transition-colors">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Sign in
          </Button>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Get started
          </Button>
        </div>
      </div>
    </header>
  )
}

function ProductDemo() {
  return (
    <section className="border-b border-border/60 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="mb-12 max-w-2xl">
          <Badge variant="outline">In the chat</Badge>
          <h2 className="font-heading mt-4 text-4xl font-semibold tracking-tight">
            See the agent navigate, live.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            A glance at what a single answer looks like — outline on the left,
            agent reasoning on the right, real citations under every reply.
          </p>
        </div>
        <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-[1fr_2fr_1fr]">
          <MockOutline />
          <MockChat />
          <MockReasoning />
        </div>
      </div>
    </section>
  )
}

function MockOutline() {
  const items = [
    { num: "1", title: "Introduction", pages: "1–3", level: 0 },
    { num: "2", title: "Methodology", pages: "4–9", level: 0, active: true },
    { num: "2.1", title: "Data collection", pages: "5–6", level: 1 },
    { num: "2.2", title: "Statistical model", pages: "7–9", level: 1 },
    { num: "3", title: "Results", pages: "10–18", level: 0 },
    { num: "4", title: "Discussion", pages: "19–22", level: 0 },
  ]
  return (
    <div className="bg-background p-4">
      <div className="mb-3 flex items-center gap-2 text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground">
        <ListTree className="size-3" />
        Outline
      </div>
      <ul className="flex flex-col gap-0.5">
        {items.map((it) => (
          <li
            key={it.num}
            className={
              "flex items-baseline gap-2 px-2 py-1 text-xs " +
              (it.active ? "bg-muted text-foreground" : "text-muted-foreground")
            }
            style={{ paddingLeft: 8 + it.level * 12 }}
          >
            <span className="font-mono text-[0.6rem] tracking-wider">
              {it.num}
            </span>
            <span className="line-clamp-1 flex-1">{it.title}</span>
            <span className="flex items-center gap-0.5 text-[0.55rem] uppercase tracking-widest">
              <Hash className="size-2.5" />
              {it.pages}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MockChat() {
  return (
    <div className="flex flex-col gap-6 bg-background p-5 sm:p-7">
      <div className="flex justify-end">
        <div className="flex items-start gap-3">
          <div className="bg-foreground px-3 py-2 text-xs leading-relaxed text-background">
            What methodology did the authors use?
          </div>
          <div className="flex size-6 shrink-0 items-center justify-center bg-muted">
            <User className="size-3" />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex size-6 shrink-0 items-center justify-center bg-foreground text-background">
          <Bot className="size-3" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="inline-flex items-center gap-1.5 self-start border border-border bg-card px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-widest text-muted-foreground">
            <Brain className="size-2.5" />
            Reasoned across 3 steps
            <ChevronDown className="size-2.5" />
          </div>
          <div className="text-xs leading-relaxed">
            They used a mixed-methods design combining a randomized controlled
            trial with semi-structured interviews. Quantitative outcomes were
            modelled with a hierarchical Bayesian regression to account for
            site-level effects.
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2.5">
            <span className="text-[0.55rem] font-semibold uppercase tracking-widest text-muted-foreground">
              Sources
            </span>
            <span className="border border-border bg-card px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider">
              §2.1 · p.5–6
            </span>
            <span className="border border-border bg-card px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider">
              §2.2 · p.7–9
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MockReasoning() {
  const calls = [
    { tool: "Reading outline", detail: "TOC", icon: ListTree },
    { tool: "Reading section", detail: "§2.1", icon: ScrollText },
    { tool: "Reading section", detail: "§2.2", icon: ScrollText },
  ]
  return (
    <div className="bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground">
          <Sparkles className="size-3" />
          Reasoning
        </span>
        <span className="text-[0.55rem] uppercase tracking-widest text-muted-foreground">
          3 calls
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {calls.map((c, i) => {
          const Icon = c.icon
          return (
            <li
              key={i}
              className="flex items-center gap-2 border border-border bg-card px-2 py-1.5 text-[0.65rem]"
            >
              <Icon className="size-3 shrink-0 text-foreground" />
              <span className="flex-1 truncate font-semibold uppercase tracking-widest">
                {c.tool}
              </span>
              <span className="font-mono text-[0.55rem] text-muted-foreground">
                {c.detail}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function VsVectors() {
  const rows = [
    {
      label: "Storage",
      vector: "Embeddings + chunked text in pgvector / Pinecone",
      docu: "Plain text by page + section tree in Postgres",
    },
    {
      label: "Retrieval",
      vector: "Top-k cosine similarity on embeddings",
      docu: "Agent picks tools: outline, section, search, pages",
    },
    {
      label: "Citations",
      vector: "Best-effort — link back to a chunk",
      docu: "Real section + page numbers, always",
    },
    {
      label: "Tuning",
      vector: "Chunk size, overlap, embed model, threshold",
      docu: "None — the agent navigates",
    },
    {
      label: "New doc cost",
      vector: "Re-embed (often per change)",
      docu: "Parse once, search anytime",
    },
  ]
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto w-full max-w-5xl px-6 py-24">
        <div className="mb-12 max-w-2xl">
          <Badge variant="outline">Vectorless vs vector RAG</Badge>
          <h2 className="font-heading mt-4 text-4xl font-semibold tracking-tight">
            What we don't do.
          </h2>
        </div>
        <div className="overflow-hidden border border-border">
          <div className="grid grid-cols-[1fr_1.4fr_1.4fr] divide-x divide-border bg-muted text-[0.65rem] font-semibold uppercase tracking-widest">
            <div className="px-4 py-3 text-muted-foreground">&nbsp;</div>
            <div className="px-4 py-3 text-muted-foreground">
              Vector RAG
            </div>
            <div className="px-4 py-3 text-foreground">DocuMind</div>
          </div>
          {rows.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-[1fr_1.4fr_1.4fr] divide-x divide-border border-t border-border bg-background"
            >
              <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest">
                {r.label}
              </div>
              <div className="px-4 py-3 text-sm text-muted-foreground">
                {r.vector}
              </div>
              <div className="px-4 py-3 text-sm">{r.docu}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Hero() {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-6 py-24 text-center md:py-32">
        <Badge variant="outline" className="gap-2">
          <Sparkles className="size-3" />
          Vectorless RAG
        </Badge>
        <h1 className="font-heading max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          Chat with any PDF — without vectors.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          DocuMind reads, navigates, and cites your documents agentically. No
          embeddings, no vector database, no chunking heuristics — just real
          answers with real page citations.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
            Start free
            <ArrowRight />
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<a href="#how" />}
          >
            See how it works
          </Button>
        </div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          No credit card required · 3 documents free
        </p>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="border-b border-border/60">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="mb-16 max-w-2xl">
          <Badge variant="outline">Why vectorless</Badge>
          <h2 className="font-heading mt-4 text-4xl font-semibold tracking-tight">
            Retrieval the way a person would do it.
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader>
                <div className="flex size-10 items-center justify-center bg-foreground/5 text-foreground">
                  <Icon className="size-5" />
                </div>
                <CardTitle className="mt-4">{title}</CardTitle>
                <CardDescription className="mt-2">
                  {description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Upload",
      body: "Drop a PDF. We parse the structure, build a hierarchical outline, and store full text by page.",
    },
    {
      n: "02",
      title: "Ask",
      body: "Type a question. The agent inspects the outline and decides which sections, searches, or pages to open.",
    },
    {
      n: "03",
      title: "Cite",
      body: "Every claim links to its source. Click any citation to jump to that exact page.",
    },
  ]
  return (
    <section id="how" className="border-b border-border/60 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="mb-16 max-w-2xl">
          <Badge variant="outline">How it works</Badge>
          <h2 className="font-heading mt-4 text-4xl font-semibold tracking-tight">
            Three steps. Zero vectors.
          </h2>
        </div>
        <div className="grid gap-px bg-border md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.n}
              className="flex flex-col gap-4 bg-background p-8"
            >
              <span className="font-mono text-xs tracking-widest text-muted-foreground">
                {step.n}
              </span>
              <h3 className="font-heading text-2xl font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section id="pricing" className="border-b border-border/60">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="mb-16 max-w-2xl">
          <Badge variant="outline">Pricing</Badge>
          <h2 className="font-heading mt-4 text-4xl font-semibold tracking-tight">
            Simple, honest pricing.
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={
                tier.highlighted
                  ? "ring-2 ring-foreground"
                  : undefined
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{tier.name}</CardTitle>
                  {tier.highlighted && <Badge>Most popular</Badge>}
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-heading text-5xl font-semibold tracking-tight">
                    {tier.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {tier.period}
                  </span>
                </div>
                <CardDescription className="mt-2">
                  {tier.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-3 text-sm"
                    >
                      <Check className="size-4 text-foreground" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full"
                  variant={tier.highlighted ? "default" : "outline"}
                  nativeButton={false}
                  render={<Link href={tier.href} />}
                >
                  {tier.cta}
                  <ArrowRight />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="border-b border-border/60">
      <div className="mx-auto w-full max-w-3xl px-6 py-24">
        <div className="mb-12 text-center">
          <Badge variant="outline">FAQ</Badge>
          <h2 className="font-heading mt-4 text-4xl font-semibold tracking-tight">
            Common questions
          </h2>
        </div>
        <Accordion className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={faq.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center bg-foreground text-background">
            <Brain className="size-3.5" />
          </div>
          <span className="text-xs font-semibold tracking-widest uppercase">
            DocuMind
          </span>
        </div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          © {new Date().getFullYear()} DocuMind
        </p>
      </div>
    </footer>
  )
}
