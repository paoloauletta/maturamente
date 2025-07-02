"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDownIcon, ArrowRightIcon, ChevronDownIcon } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Mockup, MockupFrame } from "@/components/ui/mockup";
import Glow from "@/components/ui/glow";
import { ReactNode } from "react";
import Screenshot from "@/components/ui/screenshot";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { signIn } from "next-auth/react";

const underlineImage = "/underline.svg";

interface HeroButtonProps {
  href: string;
  text: string;
  variant?: ButtonProps["variant"];
  icon?: ReactNode;
  iconRight?: ReactNode;
}

interface HeroProps {
  title?: string;
  description?: string;
  mockup?: ReactNode | false;
  badge?: ReactNode | false;
  buttons?: HeroButtonProps[] | false;
  className?: string;
}

// Add priority prop to Screenshot component for above-the-fold images
interface ScreenshotProps {
  srcLight: string;
  srcDark?: string;
  mobileSrcLight?: string;
  mobileSrcDark?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  mobileBreakpoint?: number;
  priority?: boolean;
}

export default function Hero({
  description = "Lo strumento più avanzato per la tua preparazione all'esame di maturità: teoria, esercizi, simulazioni e molto altro.",
  mockup = (
    <Screenshot
      srcLight="https://pmnothvdbyxdqaiyugpg.supabase.co/storage/v1/object/public/landing/light/landing-light.png"
      srcDark="https://pmnothvdbyxdqaiyugpg.supabase.co/storage/v1/object/public/landing/dark/landing-dark.png"
      alt="MaturaMate dashboard screenshot"
      width={1248}
      height={765}
      className="w-full"
      mobileBreakpoint={768}
      priority={true}
    />
  ),
  badge = (
    <Badge variant="outline" className="animate-appear">
      <span className="text-muted-foreground">
        In arrivo Pit, il tuo AI tutor
      </span>
      <Link href="/" className="flex items-center gap-1">
        Scopri di più
        <ArrowRightIcon className="size-3" />
      </Link>
    </Badge>
  ),
  buttons = [
    {
      href: "/",
      text: "Migliora la tua preparazione",
      variant: "default",
    },
  ],
  className,
}: HeroProps) {
  return (
    <Section
      className={cn(
        "fade-bottom overflow-hidden min-h-screen h-screen flex items-center lg:min-h-screen lg:h-auto lg:pt-24",
        className
      )}
    >
      <div className="max-w-container mx-auto flex flex-col gap-12 pt-16 md:pt-16 sm:gap-24">
        <div className="flex flex-col items-center justify-center gap-6 text-center sm:gap-12">
          {badge !== false && badge}
          <h1 className="animate-appear relative z-10 inline-block text-5xl leading-tight font-semibold text-balance sm:text-6xl sm:leading-tight md:text-7xl lg:text-8xl md:leading-tight">
            <span className="dark:text-white text-blue-900 drop-shadow-2xl">
              Preparati al meglio con
            </span>
            <div className="relative inline-block ml-2">
              <span className="dark:text-primary text-blue-900">Matura</span>
              <span className="dark:text-blue-400 text-primary">Mate</span>
              <span
                className="absolute w-full left-0 top-full -translate-y-1/2 h-container bg-gradient-to-r from-blue-700 to-blue-400 dark:from-blue-500 dark:to-blue-400"
                style={{
                  maskImage: `url(${underlineImage})`,
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                }}
              ></span>
            </div>
          </h1>
          <p className="text-md animate-appear text-muted-foreground relative z-10 max-w-[740px] font-medium text-balance opacity-0 delay-100 lg:text-xl">
            {description}
          </p>
          {buttons !== false && buttons.length > 0 && (
            <div className="animate-appear relative z-10 flex justify-center gap-4 opacity-0 delay-300">
              {buttons.map((button, index) => (
                <div key={index}>
                  <Button
                    onClick={() => {
                      signIn("google", { callbackUrl: "/dashboard" });
                    }}
                    key={index}
                    variant={button.variant || "default"}
                    size="lg"
                    className="flex items-center justify-center gap-2"
                  >
                    <Link href={button.href} className="text-white">
                      {button.icon}
                      {button.text}
                      {button.iconRight}
                    </Link>
                    <ArrowRightIcon className="size-3 text-white" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {mockup !== false && (
            <div className="relative w-full pt-12 shadow-xl hidden sm:block">
              <Mockup
                type="responsive"
                className="bg-transparent w-full rounded-xl border-0"
              >
                {mockup}
              </Mockup>
              <Glow
                variant="top"
                className="animate-appear-zoom opacity-0 delay-1000"
              />
            </div>
          )}
          {/* Mobile glow without image */}
          <div className="relative w-full pt-12 sm:hidden">
            <div className="h-32 relative">
              <Glow
                variant="top"
                className="animate-appear-zoom opacity-0 delay-1000 absolute top-0 left-0 right-0"
              />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
