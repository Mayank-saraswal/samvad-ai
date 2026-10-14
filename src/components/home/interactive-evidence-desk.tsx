"use client";

import * as React from "react";
import Image from "next/image";
import {
  FileText,
  Sparkles,
  Check,
  Scale,
  MousePointer2,
  Mic2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  AlertTriangle,
  Server,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EvidenceParagraph {
  readonly id: string;
  readonly paraNum: number;
  readonly label: string;
  readonly labelHi: string;
  readonly text: string;
  readonly textHi: string;
  readonly audioTranscript: string;
  readonly audioTranscriptHi: string;
  readonly sttNote: string;
  readonly sttNoteHi: string;
  readonly factTitle: string;
  readonly factTitleHi: string;
  readonly factConfidence: string;
  readonly factDescription: string;
  readonly factDescriptionHi: string;
  readonly statusBadge?: {
    readonly label: string;
    readonly labelHi: string;
    readonly type: "success" | "warning" | "neutral";
  };
  readonly englishDraft: string;
  readonly hindiDraft: string;
}

const EVIDENCE_PARAGRAPHS: readonly EvidenceParagraph[] = [
  {
    id: "telemetry",
    paraNum: 2,
    label: "[Para 2] Network Socket Telemetry:",
    labelHi: "[पैरा 2] नेटवर्क सॉकेट टेलीमेट्री:",
    text: "At 02:15 IST, automated network monitoring detected unauthorized socket persistence and privilege escalation across Core Server Cluster 04.",
    textHi: "02:15 IST पर, स्वचालित नेटवर्क मॉनिटरिंग ने कोर सर्वर क्लस्टर 04 पर अनधिकृत सॉकेट दृढ़ता और रूट प्रिविलेज एस्केलेशन का पता लगाया।",
    audioTranscript: "“Log trace dekhiye... cluster four mein zero-two-fifteen par breach hua tha...”",
    audioTranscriptHi: "“लॉग ट्रेस देखिए... क्लस्टर 4 में 02:15 पर अनधिकृत पहुंच का साक्ष्य दर्ज है...”",
    sttNote: "STT · Socket persistence verified",
    sttNoteHi: "एसटीटी · सॉकेट दृढ़ता प्रमाणित",
    factTitle: "Breach Telemetry: Cluster 04 Confirmed",
    factTitleHi: "उल्लंघन टेलीमेट्री: क्लस्टर 04 सत्यापित",
    factConfidence: "p2.b1 (0.98)",
    factDescription: "Automated IDS telemetry verified root privilege escalation on port 8443 under CERT-In watch.",
    factDescriptionHi: "स्वचालित आईडीएस टेलीमेट्री ने सीईआरटी-इन निगरानी में पोर्ट 8443 पर रूट प्रिविलेज एस्केलेशन की पुष्टि की।",
    statusBadge: { label: "Verified Vector", labelHi: "सत्यापित वेक्टर", type: "success" },
    englishDraft: "Forensic telemetry confirms unauthorized access at Core Server Cluster 04 at 02:15 IST.",
    hindiDraft: "फोरेंसिक टेलीमेट्री पुष्टि करती है कि कोर सर्वर क्लस्टर 04 पर 02:15 IST पर अनधिकृत पहुंच दर्ज की गई।",
  },
  {
    id: "arrests",
    paraNum: 3,
    label: "[Para 3] Incident at Central Commercial Hub:",
    labelHi: "[पैरा 3] केंद्रीय वाणिज्यिक हब की घटना:",
    text: "Two suspects apprehended in connection with illegal financial diversion and unauthorized portal access.",
    textHi: "अवैध वित्तीय डायवर्जन और अनधिकृत पोर्टल पहुंच के संबंध में दो संदिग्धों को तुरंत हिरासत में लिया गया।",
    audioTranscript: "“FIR baarah hai... do sandigdh pakde gaye hain... diversion roka gaya...”",
    audioTranscriptHi: "“एफआईआर दर्ज है... दोनों संदिग्धों को हिरासत में लेकर अवैध लेनदेन को तुरंत रोक दिया गया...”",
    sttNote: "STT · Primary charge citation locked",
    sttNoteHi: "एसटीटी · प्राथमिक आरोप उद्धरण लॉक",
    factTitle: "Arrests: 2 Confirmed Suspects",
    factTitleHi: "गिरफ्तारी: 2 संदिग्ध हिरासत में",
    factConfidence: "p3.b2 (0.96)",
    factDescription: "The suspects were apprehended inside the server cluster at 02:40 IST following an alert from state CERT.",
    factDescriptionHi: "राज्य सीईआरटी से चेतावनी के बाद संदिग्धों को 02:40 IST पर सर्वर क्लस्टर परिसर से पकड़ा गया।",
    statusBadge: { label: "In Custody", labelHi: "हिरासत में", type: "success" },
    englishDraft: "Two individuals have been apprehended in connection with illegal financial diversion.",
    hindiDraft: "अवैध वित्तीय डायवर्जन और अनधिकृत पोर्टल पहुंच के संबंध में दो व्यक्तियों को हिरासत में लिया गया है।",
  },
  {
    id: "seizures",
    paraNum: 4,
    label: "[Para 4] Digital Evidence Inventory:",
    labelHi: "[पैरा 4] डिजिटल साक्ष्य जब्ती सूची:",
    text: "Seized hardware includes 4 portable computing terminals, 12 mobile cellular units, and encrypted flash media.",
    textHi: "जब्त हार्डवेयर में 4 पोर्टेबल कंप्यूटिंग टर्मिनल, 12 मोबाइल फोन और एन्क्रिप्टेड फ्लैश मीडिया शामिल हैं।",
    audioTranscript: "“Chaar laptop aur baarah mobile baramad hue hain... NVMe drives forensic seal mein hain...”",
    audioTranscriptHi: "“चार लैपटॉप और बारह मोबाइल फोन बरामद किए गए हैं... सभी ड्राइव्स न्यायिक सील में सुरक्षित हैं...”",
    sttNote: "STT · Hardware chain of custody logged",
    sttNoteHi: "एसटीटी · हार्डवेयर कस्टडी श्रृंखला दर्ज",
    factTitle: "Seizures: 16 Electronic Terminals",
    factTitleHi: "जब्ती: 16 इलेक्ट्रॉनिक उपकरण",
    factConfidence: "p4.b1 (0.99)",
    factDescription: "All 16 devices sealed in anti-static Faraday enclosures under judicial magistrate oversight.",
    factDescriptionHi: "न्यायिक मजिस्ट्रेट की देखरेख में सभी 16 उपकरणों को एंटी-स्टेटिक फैराडे बैग में सील किया गया।",
    statusBadge: { label: "Evidence Sealed", labelHi: "साक्ष्य सीलबंद", type: "success" },
    englishDraft: "Police seized 4 laptop terminals and 12 cellular units under formal forensic seal.",
    hindiDraft: "पुलिस ने फोरेंसिक सील के तहत 4 लैपटॉप टर्मिनल और 12 मोबाइल फोन जब्त किए हैं।",
  },
  {
    id: "casualties",
    paraNum: 5,
    label: "[Para 5] Station Casualty Discrepancy:",
    labelHi: "[पैरा 5] स्टेशन हताहत विसंगति नोट:",
    text: "Discrepancy note: Initial field radio indicated three wounded, while written station memo mentions two persons hospitalised.",
    textHi: "विसंगति नोट: प्रारंभिक फील्ड रेडियो में 3 घायलों की सूचना थी, जबकि लिखित स्टेशन मेमो में 2 व्यक्ति अस्पताल में भर्ती हैं।",
    audioTranscript: "“Field radio pe teen bola gaya tha... lekin hospital record mein do hain... verify karein...”",
    audioTranscriptHi: "“रेडियो पर तीन और स्टेशन रिकॉर्ड में दो दर्ज हैं... अंतिम चिकित्सा सत्यापन तक संख्या रोकें...”",
    sttNote: "STT · Conflicting claim flagged for sign-off",
    sttNoteHi: "एसटीटी · परस्पर विरोधी दावे पर फ्लैग",
    factTitle: "Casualties: Conflicting (2 vs 3)",
    factTitleHi: "हताहत: परस्पर विरोधी (2 बनाम 3)",
    factConfidence: "p5.b4 (Manual Sign-off)",
    factDescription: "Rendered as 'Casualty count under active verification' until investigating officer verifies hospital logs.",
    factDescriptionHi: "जांच अधिकारी द्वारा अस्पताल रिकॉर्ड के अंतिम सत्यापन तक संख्या को 'सत्यापन के अधीन' रखा गया है।",
    statusBadge: { label: "Manual Sign-off", labelHi: "अधिकारी हस्ताक्षर", type: "warning" },
    englishDraft: "The exact casualty count remains unconfirmed pending verification between field radio and hospital records.",
    hindiDraft: "फील्ड रेडियो और अस्पताल रिकॉर्ड के सत्यापन तक घायलों की सही संख्या की पुष्टि नहीं की गई है।",
  },
];

interface StreamingTranscriptBarProps {
  readonly targetTranscript: string;
  readonly activeLanguage: "en" | "hi";
  readonly sttNote: string;
  readonly isPlayingAudio: boolean;
  readonly onToggleAudio: () => void;
  readonly isMuted: boolean;
  readonly onToggleMute: () => void;
}

const StreamingTranscriptBar = React.memo(function StreamingTranscriptBar({
  targetTranscript,
  activeLanguage,
  sttNote,
  isPlayingAudio,
  onToggleAudio,
  isMuted,
  onToggleMute,
}: StreamingTranscriptBarProps): React.JSX.Element {
  const [typedTranscript, setTypedTranscript] = React.useState<string>("");
  const [isTyping, setIsTyping] = React.useState<boolean>(true);

  React.useEffect(() => {
    setTypedTranscript("");
    setIsTyping(true);
    let charIndex = 0;

    const timer = setInterval(() => {
      charIndex += 1;
      setTypedTranscript(targetTranscript.slice(0, charIndex));
      if (charIndex >= targetTranscript.length) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, 20);

    return () => clearInterval(timer);
  }, [targetTranscript]);

  return (
    <div className="absolute bottom-3 sm:bottom-4 left-1/2 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-2.5 sm:gap-3 rounded-full bg-foreground p-2 sm:p-2.5 pl-3 sm:pl-4 text-background shadow-panel transition-all duration-300 hover:shadow-float">
      {/* Left Mic Icon Button */}
      <button
        type="button"
        onClick={onToggleAudio}
        className="grid size-8 sm:size-8.5 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        title={isPlayingAudio ? "Pause live speech feed" : "Play live speech feed"}
        aria-label={isPlayingAudio ? "Pause live speech feed" : "Play live speech feed"}
      >
        {isPlayingAudio ? (
          <Mic2 className="size-4 animate-pulse" />
        ) : (
          <Play className="size-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Middle: Live Animated Typewriting Speech Transcript */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-background">
          {typedTranscript}
          {isTyping && (
            <span className="inline-block w-1 h-3 ml-0.5 bg-brand animate-typewriter-blink align-middle" />
          )}
        </p>

        {/* Clean Transparent Logo Mark */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="relative h-3 w-auto shrink-0 flex items-center justify-center">
            <Image
              src="/samvaad-logo-white.png"
              alt="Samvaad AI"
              width={48}
              height={18}
              className="h-3 w-auto object-contain"
            />
          </div>
          <span className="text-[0.62rem] text-background/70 font-mono truncate">
            {sttNote}
          </span>
        </div>
      </div>

      {/* Right: Audio Wave Equalizer and Mute Toggle */}
      <div className="flex items-center gap-1.5 pr-1.5 shrink-0">
        <div className="flex items-center gap-1 text-brand">
          <span className={cn("w-1 h-3 rounded-full bg-brand", isPlayingAudio && "animate-wave-1")} />
          <span className={cn("w-1 h-5 rounded-full bg-brand", isPlayingAudio && "animate-wave-2")} />
          <span className={cn("w-1 h-4 rounded-full bg-brand", isPlayingAudio && "animate-wave-3")} />
          <span className={cn("w-1 h-5 rounded-full bg-brand", isPlayingAudio && "animate-wave-4")} />
          <span className={cn("w-1 h-3 rounded-full bg-brand", isPlayingAudio && "animate-wave-5")} />
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          className="p-1 rounded-full text-background/60 hover:text-background transition-colors cursor-pointer"
          title={isMuted ? "Unmute" : "Mute"}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
        </button>
      </div>
    </div>
  );
});

export function InteractiveEvidenceDesk(): React.JSX.Element {
  const deskRef = React.useRef<HTMLDivElement>(null);
  const paperScrollContainerRef = React.useRef<HTMLDivElement>(null);
  const paragraphRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const [selectedIndex, setSelectedIndex] = React.useState<number>(1); // Default to Para 3 (Arrests)
  const [isPlayingAudio, setIsPlayingAudio] = React.useState<boolean>(true);
  const [isMuted, setIsMuted] = React.useState<boolean>(false);
  const [activeLanguage, setActiveLanguage] = React.useState<"en" | "hi">("en");
  const [isInViewportRange, setIsInViewportRange] = React.useState<boolean>(false);
  const [userInteracted, setUserInteracted] = React.useState<boolean>(false);
  const userInteractionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const fallbackPara = EVIDENCE_PARAGRAPHS[0]!;
  const activePara = EVIDENCE_PARAGRAPHS[selectedIndex] ?? fallbackPara;

  // Active transcript depends on language
  const targetTranscript =
    activeLanguage === "hi"
      ? activePara.audioTranscriptHi
      : activePara.audioTranscript;

  const currentSttNote =
    activeLanguage === "hi" ? activePara.sttNoteHi : activePara.sttNote;

  // Viewport trigger: auto-play starts when 40% of the desk is visible,
  // and continues until user scrolls past where only 20% remains visible.
  React.useEffect(() => {
    const el = deskRef.current;
    if (!el) return;

    const checkVisibility = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const deskHeight = rect.height;

      if (deskHeight === 0) return;

      const visibleTop = Math.max(0, rect.top);
      const visibleBottom = Math.min(vh, rect.bottom);
      const visiblePixels = Math.max(0, visibleBottom - visibleTop);
      const visibleFraction = visiblePixels / deskHeight;

      // 40% threshold on entering, down to 20% threshold as it leaves viewport
      const isTopPassed = rect.top < 0;
      const threshold = isTopPassed ? 0.20 : 0.40;

      const inRange = visibleFraction >= threshold && rect.bottom > 0 && rect.top < vh;
      setIsInViewportRange(inRange);
    };

    window.addEventListener("scroll", checkVisibility, { passive: true });
    window.addEventListener("resize", checkVisibility, { passive: true });
    checkVisibility();

    return () => {
      window.removeEventListener("scroll", checkVisibility);
      window.removeEventListener("resize", checkVisibility);
      if (userInteractionTimeoutRef.current) {
        clearTimeout(userInteractionTimeoutRef.current);
      }
    };
  }, []);

  // Snappy, smooth auto-play cycle every 2.4s while in viewport range
  React.useEffect(() => {
    if (!isInViewportRange || userInteracted) return;

    const interval = setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % EVIDENCE_PARAGRAPHS.length);
    }, 2400);

    return () => clearInterval(interval);
  }, [isInViewportRange, userInteracted]);

  // Handle direct paragraph clicks: inspect paragraph and pause auto-cycle temporarily
  const handleSelectParagraph = (index: number) => {
    setSelectedIndex(index);
    setUserInteracted(true);
    if (userInteractionTimeoutRef.current) {
      clearTimeout(userInteractionTimeoutRef.current);
    }
    userInteractionTimeoutRef.current = setTimeout(() => {
      setUserInteracted(false);
    }, 4500);
  };

  // Auto-scroll ONLY inside the inner paper container (NEVER scroll the whole window)
  React.useEffect(() => {
    const container = paperScrollContainerRef.current;
    const el = paragraphRefs.current[selectedIndex];
    if (!container || !el) return;

    const elTop = el.offsetTop - container.offsetTop;
    const elBottom = elTop + el.offsetHeight;
    const currentScrollTop = container.scrollTop;
    const visibleHeight = container.clientHeight;

    if (elTop < currentScrollTop) {
      container.scrollTo({ top: Math.max(0, elTop - 8), behavior: "smooth" });
    } else if (elBottom > currentScrollTop + visibleHeight) {
      container.scrollTo({
        top: elBottom - visibleHeight + 8,
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  return (
    <div
      ref={deskRef}
      id="interactive-desk"
      data-layout-card="hero-reader"
      className="mt-8 sm:mt-12 overflow-hidden rounded-[1.75rem] border border-border bg-background shadow-float sm:rounded-[2.25rem] transition-all scroll-mt-24"
    >
      {/* Top Bar with Live Status Indicator (No Play Button Needed) */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4 sm:px-6 bg-card/50">
        <div className="flex items-center gap-3">
          <span className="grid size-8 sm:size-9 place-items-center rounded-full bg-foreground text-background shadow-xs shrink-0">
            <FileText className="size-4" />
          </span>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-foreground">
              {activeLanguage === "hi"
                ? "प्राथमिकी सं. 412/2026 • साइबर क्राइम सेल"
                : "FIR No. 412/2026 • Cyber Crime Cell"}
            </p>
            <p className="text-[0.65rem] sm:text-xs text-muted-foreground font-mono">
              {activeLanguage === "hi"
                ? "पृष्ठ 1 / 3 · स्वायत्त साक्ष्य निरीक्षण सक्रिय"
                : "Page 1 of 3 · Autonomous evidence citation stream"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Auto-Playing Citation Status Pill — Zero Buttons Needed */}
          <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground border border-border shrink-0">
            <span className="relative flex size-2">
              <span
                className={cn(
                  "absolute inline-flex size-full rounded-full bg-emerald-500 opacity-75",
                  isInViewportRange && !userInteracted && "animate-ping",
                )}
              />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span>
              {activeLanguage === "hi"
                ? `पैरा ${activePara.paraNum} उद्धरण`
                : `Seeing Para ${activePara.paraNum}`}
            </span>
          </span>
        </div>
      </div>

      {/* Content Grid: Interactive Document Paper + Live Evidence Sideboard */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Left Column: Interactive Case Document Paper with Safe Inside-Aligned Cursor */}
        <div className="relative flex min-h-[30rem] sm:min-h-[34rem] items-center justify-center bg-canvas p-4 sm:p-6 lg:p-8 select-none">
          <div className="reader-paper relative mx-auto w-full max-w-[29rem] overflow-visible rounded-[1.4rem] border border-reader-ink/10 bg-reader-paper text-reader-ink p-5 sm:p-7 shadow-soft">
            <div className="flex items-center justify-between text-[0.68rem] font-mono tracking-[0.1em] text-reader-muted border-b pb-2.5 border-reader-ink/10">
              <span>{activeLanguage === "hi" ? "राज्य केस डायरी" : "STATE CASE DIARY"}</span>
              <span className="font-semibold text-foreground">2026-CR412</span>
            </div>

            <p className="mt-3 text-center text-xs tracking-[0.12em] font-mono text-reader-muted uppercase">
              {activeLanguage === "hi"
                ? "प्रथम सूचना रिपोर्ट उद्धरण"
                : "First Information Report Extract"}
            </p>

            {/* Concise, Auto-Scrolling Paragraph List with Hidden Scrollbars (Zero Sidebars) */}
            <div
              ref={paperScrollContainerRef}
              className="mx-auto mt-4 max-h-[20rem] sm:max-h-[22rem] overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] space-y-2.5 text-xs sm:text-sm leading-relaxed text-reader-muted pr-0.5 scroll-smooth"
            >
              {EVIDENCE_PARAGRAPHS.map((para, index) => {
                const isSelected = selectedIndex === index;

                return (
                  <div
                    key={para.id}
                    ref={(el) => {
                      paragraphRefs.current[index] = el;
                    }}
                    onClick={() => handleSelectParagraph(index)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleSelectParagraph(index);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    className={cn(
                      "relative rounded-xl transition-all duration-300 ease-out p-3 sm:p-3.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                      isSelected
                        ? "bg-reader-highlight text-reader-ink font-medium shadow-xs ring-1 ring-reader-ink/20 scale-[1.01]"
                        : "hover:bg-reader-ink/5 hover:text-reader-ink text-reader-muted scale-100",
                    )}
                  >
                    <p className="text-[11px] font-mono opacity-70 mb-0.5">
                      {activeLanguage === "hi" ? para.labelHi : para.label}
                    </p>
                    <p className="pr-12 sm:pr-14">{activeLanguage === "hi" ? para.textHi : para.text}</p>

                    {/* REFINED INSIDE-ALIGNED CURSOR BADGE (ZERO CUT-OFF, ZERO SCROLLBAR INTERFERENCE) */}
                    {isSelected && (
                      <div
                        className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 z-20 pointer-events-none select-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground text-background shadow-panel border border-foreground/10 text-[10px] font-mono font-semibold tracking-wide transition-all duration-300 animate-in fade-in zoom-in-90"
                        aria-hidden="true"
                      >
                        <span className="relative flex size-2 shrink-0">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
                          <span className="relative inline-flex size-2 rounded-full bg-brand" />
                        </span>
                        <span className="uppercase text-[9px] tracking-wider text-background/90">
                          {activeLanguage === "hi"
                            ? `पैरा ${para.paraNum}`
                            : `Para ${para.paraNum}`}
                        </span>
                        <MousePointer2 className="size-3 fill-current stroke-[2] ml-0.5 text-brand" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-3 pt-2.5 border-t border-dashed border-reader-ink/15 text-[10px] font-mono text-center text-reader-muted/70">
              {activeLanguage === "hi"
                ? "इंटरैक्टिव ब्रीफिंग कंसोल • मर्कल रूट प्रमाणित"
                : "Interactive Briefing Console • Merkle Root Anchored"}
            </p>
          </div>

          {/* Floating Listening Pill with Isolated Streaming Transcript Bar (No Parent Re-renders) */}
          <StreamingTranscriptBar
            targetTranscript={targetTranscript}
            activeLanguage={activeLanguage}
            sttNote={currentSttNote}
            isPlayingAudio={isPlayingAudio}
            onToggleAudio={() => setIsPlayingAudio((prev) => !prev)}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted((prev) => !prev)}
          />
        </div>

        {/* Right Column: Evidence Sideboard (Dynamic Facts in English & Hindi) */}
        <aside className="flex min-h-[30rem] sm:min-h-[34rem] flex-col border-t border-border bg-background lg:border-l lg:border-t-0">
          <div className="border-b border-border p-4 sm:p-5 bg-card/25 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {activeLanguage === "hi" ? "विजुअल साइडबोर्ड" : "Visual Sideboard"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activeLanguage === "hi"
                  ? `वास्तविक समय में पैरा ${activePara.paraNum} का विश्लेषण`
                  : `Analyzing Para ${activePara.paraNum} in real time`}
              </p>
            </div>
            <Sparkles className="size-4 text-brand-ink" />
          </div>

          <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
            {/* Dynamic Verified Fact Card */}
            <div className="rounded-[1.2rem] border border-border bg-card p-3.5 transition-all duration-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-brand-ink mb-1">
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 stroke-[2.5]" />
                  <span>
                    {activeLanguage === "hi" ? activePara.factTitleHi : activePara.factTitle}
                  </span>
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {activePara.factConfidence}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activeLanguage === "hi"
                  ? activePara.factDescriptionHi
                  : activePara.factDescription}
              </p>
            </div>

            {/* Protocol Verification Card */}
            <div
              className={cn(
                "rounded-[1.2rem] border p-3.5 transition-all duration-200",
                activePara.statusBadge?.type === "warning"
                  ? "border-amber-300/80 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/60"
                  : "border-border bg-card",
              )}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-foreground">
                  {activePara.statusBadge?.type === "warning" ? (
                    <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Server className="size-3.5 text-brand-ink" />
                  )}
                  <span>
                    {activeLanguage === "hi"
                      ? "आधिकारिक प्रोटोकॉल सत्यापन"
                      : "Official Protocol Verification"}
                  </span>
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full font-mono text-[10px]",
                    activePara.statusBadge?.type === "warning"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                      : "bg-brand-soft text-brand-ink",
                  )}
                >
                  {activeLanguage === "hi"
                    ? activePara.statusBadge?.labelHi ?? "प्रमाणित"
                    : activePara.statusBadge?.label ?? "Validated"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activePara.statusBadge?.type === "warning"
                  ? activeLanguage === "hi"
                    ? "स्टेशन ऑडियो और अस्पताल रिकॉर्ड में विसंगति। सार्वजनिक प्रसारण से पूर्व जांच अधिकारी का हस्ताक्षर अनिवार्य।"
                    : "Conflict detected between station audio and hospital log. Mandatory officer sign-off required prior to public broadcast."
                  : activeLanguage === "hi"
                    ? "न्यायिक रिकॉर्ड के विरुद्ध क्रिप्टोग्राफिक मर्कल हैश सत्यापित।"
                    : "Tamper-evident Merkle hash verified against state judicial concordance."}
              </p>
            </div>

            {/* Neutrality Safeguard */}
            <div className="rounded-[1.2rem] border border-border bg-card p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-1">
                <span className="flex items-center gap-1.5">
                  <Scale className="size-3.5 text-brand-ink" />
                  <span>
                    {activeLanguage === "hi" ? "तटस्थता सुरक्षा सक्रिय" : "Neutrality Guard Active"}
                  </span>
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {activeLanguage === "hi" ? "न्यायालय-सुरक्षित" : "Court Safe"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activeLanguage === "hi"
                  ? "परीक्षण-पूर्व अपराध शब्दों को दबाया गया; केवल 'आरोपी' शब्द का वैधानिक प्रयोग।"
                  : "Pre-trial guilt terms suppressed; statutory designation “accused” enforced per BNSS criminal procedure."}
              </p>
            </div>

            {/* Interactive Bilingual Draft Preview Switcher */}
            <div className="mt-auto pt-2.5 border-t border-border flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>
                  {activeLanguage === "hi" ? "सत्यापित आउटपुट प्रारूप" : "Verified Output Draft"}
                </span>
                <span className="text-brand-ink font-semibold">
                  {activeLanguage === "en" ? "EN Active" : "हिंदी सक्रिय"}
                </span>
              </div>

              {/* Language Switcher Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveLanguage("en")}
                  className={cn(
                    "flex-1 text-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                    activeLanguage === "en"
                      ? "bg-brand text-primary-foreground border-brand font-semibold shadow-xs"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  English Draft
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLanguage("hi")}
                  className={cn(
                    "flex-1 text-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                    activeLanguage === "hi"
                      ? "bg-brand text-primary-foreground border-brand font-semibold shadow-xs"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  हिंदी प्रारूप
                </button>
              </div>

              {/* Dynamic Draft Card */}
              <div className="p-3 rounded-xl bg-card/60 border border-border/80 text-xs text-foreground leading-relaxed">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground mb-1">
                  <Layers className="size-3 text-brand-ink" />
                  <span>
                    {activeLanguage === "hi" ? "आधिकारिक प्रसारण प्रति:" : "Broadcaster Copy:"}
                  </span>
                </div>
                <p>
                  {activeLanguage === "en"
                    ? activePara.englishDraft
                    : activePara.hindiDraft}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
