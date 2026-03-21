import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type MarketingSubpageProps = {
  title: string;
  children: ReactNode;
};

export default function MarketingSubpage({ title, children }: MarketingSubpageProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <Navbar />
      <main id="main-content" className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <article className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
            {children}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
