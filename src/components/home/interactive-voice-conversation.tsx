"use client";

import * as React from "react";
import Image from "next/image";
import { Mic2, Play, Pause, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatScenario {
  readonly id: string;
  readonly chipLabel: string;
  readonly userMessage: string;
  readonly assistantMessage: string;
}

const CHAT_SCENARIOS: readonly ChatScenario[] = [
  {
    id: "seizure",
    chipLabel: "Seizure List & Identity Suppression",
    userMessage: "Disclose the cyber fraud seizure list but suppress accused identity until chargesheet is filed.",
    assistantMessage: "Acknowledged. Generating bilingual briefing with 4 laptop terminals cited and pre-trial identity suppressed per legal standards.",
  },
  {
    id: "casualties",
    chipLabel: "Verify Casualty Conflict",
    userMessage: "Station memo states two hospitalised, but field radio says three. How should we report?",
    assistantMessage: "Conflicting claim flagged. Rendering as 'The casualty count is under active verification' to preserve credibility until final medical sign-off.",
  },
  {
    id: "bilingual",
    chipLabel: "Generate Hindi Press Draft",
    userMessage: "Prepare the emergency press release in Hindi with verified FIR citations.",
    assistantMessage: "प्रारूप तैयार है: 'साइबर अपराध प्रभाग ने केंद्रीय वाणिज्यिक हब में अवैध वित्तीय डायवर्जन के दो आरोपियों को हिरासत में लिया है।' Merkle seal applied.",
  },
];

export function InteractiveVoiceConversation(): React.JSX.Element {
  const [activeScenarioIndex, setActiveScenarioIndex] = React.useState<number>(0);
  const [isPlaying, setIsPlaying] = React.useState<boolean>(true);
  const [typingText, setTypingText] = React.useState<string>("");
  const [isTyping, setIsTyping] = React.useState<boolean>(true);

  const fallbackScenario = CHAT_SCENARIOS[0]!;
  const scenario = CHAT_SCENARIOS[activeScenarioIndex] ?? fallbackScenario;

  // Animated typewriter effect for assistant's chat bubble
  React.useEffect(() => {
    setTypingText("");
    setIsTyping(true);
    const fullText = scenario.assistantMessage;
    let idx = 0;

    const timer = setInterval(() => {
      idx += 1;
      setTypingText(fullText.slice(0, idx));
      if (idx >= fullText.length) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, 22);

    return () => clearInterval(timer);
  }, [scenario.assistantMessage]);

  return (
    <div className="rounded-[2rem] bg-background p-5 sm:p-8 text-foreground border border-border shadow-float transition-all">
      {/* Card Header with Removed-BG Logo */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <span className="relative grid size-11 place-items-center rounded-full bg-brand text-primary-foreground shadow-xs">
            <Mic2 className="size-5" />
            {isPlaying && (
              <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-background bg-emerald-500 animate-ping" />
            )}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Voice Companion</p>
            <p className="text-xs text-muted-foreground">
              Live voice briefing · Case 412, page 1
            </p>
          </div>
        </div>

        {/* Transparent Logo in Card Header with dark/light adaptation (No plain text or black box) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono bg-card border border-border text-foreground shadow-xs">
          <div className="relative size-4 shrink-0 flex items-center justify-center">
            <Image
              src="/samvaad-symbol-dark.png"
              alt="Logo"
              width={16}
              height={16}
              className="size-full object-contain dark:hidden"
            />
            <Image
              src="/samvaad-symbol-white.png"
              alt="Logo"
              width={16}
              height={16}
              className="size-full object-contain hidden dark:block"
            />
          </div>
          <span className="text-[10px] text-muted-foreground">Voice Active</span>
        </div>
      </div>

      {/* Animated Live Voice Equalizer Waves */}
      <div className="py-6 flex items-center justify-center gap-1.5 text-brand">
        <span className={cn("w-1.5 h-4 rounded-full bg-brand transition-all", isPlaying && "animate-wave-1")} />
        <span className={cn("w-1.5 h-8 rounded-full bg-brand transition-all", isPlaying && "animate-wave-2")} />
        <span className={cn("w-1.5 h-12 rounded-full bg-brand transition-all", isPlaying && "animate-wave-3")} />
        <span className={cn("w-1.5 h-7 rounded-full bg-brand transition-all", isPlaying && "animate-wave-4")} />
        <span className={cn("w-1.5 h-10 rounded-full bg-brand transition-all", isPlaying && "animate-wave-5")} />
        <span className={cn("w-1.5 h-5 rounded-full bg-brand transition-all", isPlaying && "animate-wave-2")} />
        <span className={cn("w-1.5 h-3 rounded-full bg-brand transition-all", isPlaying && "animate-wave-1")} />
      </div>

      {/* Animated Chat Scroll & Dialogue Bubbles */}
      <div className="space-y-3.5 my-3" aria-live="polite">
        {/* User Prompt Bubble (Slides and floats in) */}
        <div className="ml-auto max-w-[88%] rounded-[1.25rem] rounded-br-sm bg-foreground p-3.5 sm:p-4 text-xs sm:text-sm leading-6 text-background shadow-soft animate-chat-in">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-background/60 mb-1">
            <MessageSquare className="size-3 text-brand" />
            <span>Authorized Spokesperson</span>
          </div>
          <p>&ldquo;{scenario.userMessage}&rdquo;</p>
        </div>

        {/* Assistant Response Bubble (Animated Typewriter Stream) */}
        <div className="max-w-[92%] rounded-[1.25rem] rounded-bl-sm bg-card p-3.5 sm:p-4 text-xs sm:text-sm leading-6 text-foreground border border-border shadow-xs animate-chat-in">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
            <span className="flex items-center gap-1.5 text-brand-ink font-semibold">
              <Sparkles className="size-3" />
              <span>Samvaad AI Briefing Engine</span>
            </span>
            <span className="text-[10px] opacity-70">Deterministic</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            &ldquo;{typingText}&rdquo;
            {isTyping && (
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-brand animate-typewriter-blink align-middle" />
            )}
          </p>
        </div>
      </div>

      {/* Interactive Quick Prompts (Click to change chat scenario) */}
      <div className="mt-5 pt-4 border-t border-border">
        <p className="text-[11px] font-mono text-muted-foreground mb-2 flex items-center justify-between">
          <span>Try interactive prompts:</span>
          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            className="text-[11px] text-brand-ink font-medium hover:underline flex items-center gap-1 cursor-pointer"
          >
            {isPlaying ? <Pause className="size-3" /> : <Play className="size-3 fill-current" />}
            <span>{isPlaying ? "Pause voice" : "Resume voice"}</span>
          </button>
        </p>

        <div className="flex flex-wrap gap-2">
          {CHAT_SCENARIOS.map((item, index) => {
            const isSelected = activeScenarioIndex === index;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveScenarioIndex(index)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer text-left",
                  isSelected
                    ? "bg-brand text-primary-foreground border-brand font-semibold shadow-xs scale-102"
                    : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-card/80",
                )}
              >
                {item.chipLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-brand animate-pulse" />
        <span>Speak naturally · interrupt anytime</span>
      </div>
    </div>
  );
}
