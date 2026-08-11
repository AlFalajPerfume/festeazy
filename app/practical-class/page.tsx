"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Flag,
  Fullscreen,
  GraduationCap,
  ImageIcon,
  Keyboard,
  Laptop,
  LayoutDashboard,
  ListChecks,
  Maximize2,
  Menu,
  MonitorPlay,
  Pause,
  Play,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import {
  type TouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./practical-class.module.css";

type SlideDefinition = {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  malayalam: string;
};

const slides: SlideDefinition[] = [
  {
    id: "welcome",
    label: "WELCOME",
    title: "Meelad Software Practical Class",
    subtitle:
      "A practical introduction to planning, operating and publishing an event using Festeazy.",
    malayalam:
      "ഒരു മീലാദ് ഫെസ്റ്റിന്റെ മുഴുവൻ പ്രവർത്തനങ്ങളും ഡിജിറ്റലായി നിയന്ത്രിക്കുന്ന പ്രായോഗിക പരിശീലനം.",
  },
  {
    id: "problem",
    label: "THE CHALLENGE",
    title: "Manual work becomes difficult as the event grows",
    subtitle:
      "Names, lists, marks, results and printouts are often maintained in different places.",
    malayalam:
      "വ്യത്യസ്ത ഫയലുകളിലും പുസ്തകങ്ങളിലും വിവരങ്ങൾ സൂക്ഷിക്കുന്നത് സമയനഷ്ടത്തിനും തെറ്റുകൾക്കും കാരണമാകുന്നു.",
  },
  {
    id: "platform",
    label: "MEET FESTEAZY",
    title: "One platform for the complete event journey",
    subtitle:
      "Enter information once and use it across participants, judging, results, posters and reports.",
    malayalam:
      "ഒരിക്കൽ ചേർത്ത വിവരങ്ങൾ മത്സരാർത്ഥി രജിസ്ട്രേഷൻ മുതൽ ഫലം പ്രസിദ്ധീകരിക്കൽ വരെ ഉപയോഗിക്കാം.",
  },
  {
    id: "workflow",
    label: "CONNECTED WORKFLOW",
    title: "From event setup to published results",
    subtitle:
      "Every module connects with the next stage, creating one reliable flow for the organising team.",
    malayalam:
      "ഇവന്റ് സെറ്റപ്പിൽ നിന്ന് റിസൾട്ട് പ്രസിദ്ധീകരണം വരെ എല്ലാ ഘട്ടങ്ങളും പരസ്പരം ബന്ധിപ്പിച്ചിരിക്കുന്നു.",
  },
  {
    id: "features",
    label: "CORE FEATURES",
    title: "Built for real event operations",
    subtitle:
      "Simple tools for organisers, teachers, judges, students and the public.",
    malayalam:
      "ഓർഗനൈസർമാർക്കും അധ്യാപകർക്കും ജഡ്ജിമാർക്കും ഉപയോഗിക്കാൻ എളുപ്പമുള്ള സംവിധാനങ്ങൾ.",
  },
  {
    id: "comparison",
    label: "BEFORE & AFTER",
    title: "A faster and more professional way to run a fest",
    subtitle:
      "Reduce repeated work, improve accuracy and make every output consistent.",
    malayalam:
      "ആവർത്തിച്ചുള്ള ജോലികൾ കുറച്ച് കൂടുതൽ കൃത്യതയോടെയും പ്രൊഫഷണലായും ഫെസ്റ്റ് നടത്താം.",
  },
  {
    id: "demo",
    label: "LIVE PRACTICAL",
    title: "We will build a mini event together",
    subtitle:
      "Follow the complete workflow on screen and understand how every module is connected.",
    malayalam:
      "ഒരു ചെറിയ ഡെമോ ഇവന്റ് തയ്യാറാക്കി ഓരോ ഘട്ടവും പ്രായോഗികമായി പഠിക്കാം.",
  },
  {
    id: "outputs",
    label: "READY OUTPUTS",
    title: "Turn event data into useful documents instantly",
    subtitle:
      "Registration sheets, results, posters, certificates and reports are generated from the same data.",
    malayalam:
      "ഒരേ ഡാറ്റയിൽ നിന്ന് രജിസ്ട്രേഷൻ ഷീറ്റ്, റിസൾട്ട്, പോസ്റ്റർ, സർട്ടിഫിക്കറ്റ്, റിപ്പോർട്ട് എന്നിവ ലഭിക്കും.",
  },
  {
    id: "activity",
    label: "HANDS-ON ACTIVITY",
    title: "Now it is your turn",
    subtitle:
      "Complete one participant journey from student entry to published result.",
    malayalam:
      "വിദ്യാർത്ഥി എൻട്രിയിൽ നിന്ന് റിസൾട്ട് പ്രസിദ്ധീകരണം വരെ നിങ്ങൾ തന്നെ ചെയ്ത് നോക്കുക.",
  },
  {
    id: "closing",
    label: "THANK YOU",
    title: "Make Your Fest Easy",
    subtitle:
      "Plan better. Work faster. Publish professionally.",
    malayalam:
      "കൂടുതൽ എളുപ്പത്തിൽ പ്ലാൻ ചെയ്യാം, വേഗത്തിൽ പ്രവർത്തിക്കാം, പ്രൊഫഷണലായി പ്രസിദ്ധീകരിക്കാം.",
  },
];

const painPoints = [
  {
    title: "Repeated data entry",
    text: "The same student names are typed into lists, score sheets, posters and certificates.",
  },
  {
    title: "Slow result publishing",
    text: "Marks must be collected, verified, calculated and designed before the result can be shared.",
  },
  {
    title: "Scattered records",
    text: "Notebooks, spreadsheets, WhatsApp messages and printouts quickly become difficult to manage.",
  },
  {
    title: "Avoidable mistakes",
    text: "Duplicate entries, incorrect chest numbers and calculation mistakes create confusion.",
  },
];

const workflowSteps = [
  ["01", "Event Setup", "Name, logo, date and venue"],
  ["02", "Teams & Categories", "Academic and house structure"],
  ["03", "Students", "Manual entry or bulk import"],
  ["04", "Programmes", "Rules, type and eligibility"],
  ["05", "Participants", "Programme registration"],
  ["06", "Green Room", "Attendance and anonymous codes"],
  ["07", "Judging", "Secure mark entry"],
  ["08", "Results", "Publish, print and share"],
];

const featureCards = [
  {
    icon: Users,
    title: "Students & Teams",
    text: "Manage student profiles, classes, categories and team allocation.",
  },
  {
    icon: ListChecks,
    title: "Programmes",
    text: "Create individual, group, stage, off-stage and automatic General programmes.",
  },
  {
    icon: QrCode,
    title: "Chest & Green Room",
    text: "Generate chest numbers and anonymous code letters for fair valuation.",
  },
  {
    icon: ClipboardCheck,
    title: "Judges & Marks",
    text: "Assign judges, enter marks and keep score entry controlled.",
  },
  {
    icon: Trophy,
    title: "Results & Points",
    text: "Calculate positions, publish results and update team points.",
  },
  {
    icon: FileSpreadsheet,
    title: "Reports",
    text: "Print filtered registration sheets, chest lists and programme records.",
  },
  {
    icon: ImageIcon,
    title: "Posters",
    text: "Create branded result posters ready for WhatsApp and social media.",
  },
  {
    icon: Award,
    title: "Certificates",
    text: "Generate certificates using saved event, student and result information.",
  },
];

const comparisonRows = [
  ["Multiple notebooks and files", "One connected event workspace"],
  ["Manual chest-number preparation", "Automatic chest-number management"],
  ["Manual mark calculations", "Controlled digital mark entry"],
  ["Separate poster design work", "Instant branded result posters"],
  ["Repeated typing of the same details", "Information reused automatically"],
];

const demoSteps = [
  "Configure the event name, logo, date and venue",
  "Create teams, categories, classes and divisions",
  "Add students manually or through bulk import",
  "Create category-wise and automatic General programmes",
  "Register eligible participants",
  "Generate Green Room codes and attendance",
  "Assign judges and enter sample marks",
  "Publish a result and generate reports",
];

const activitySteps = [
  "Create one team",
  "Add one student",
  "Create one programme",
  "Register the student",
  "Generate a Green Room code",
  "Enter sample marks",
  "Publish the result",
];

const slideIcons = [
  Sparkles,
  CircleHelp,
  LayoutDashboard,
  ChevronRight,
  WandSparkles,
  BarChart3,
  MonitorPlay,
  FileText,
  GraduationCap,
  Trophy,
];

function clampSlide(index: number) {
  return Math.max(0, Math.min(slides.length - 1, index));
}

export default function PracticalClassPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const goTo = useCallback((index: number) => {
    setActiveSlide(clampSlide(index));
    setOverviewOpen(false);
  }, []);

  const next = useCallback(() => {
    setActiveSlide((current) => clampSlide(current + 1));
  }, []);

  const previous = useCallback(() => {
    setActiveSlide((current) => clampSlide(current - 1));
  }, []);

  const restart = useCallback(() => {
    setActiveSlide(0);
    setIsPlaying(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await stageRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Browser fullscreen may be blocked by device policy.
    }
  }, []);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setControlsVisible(false), 3500);
  }, []);

  useEffect(() => {
    revealControls();
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, [activeSlide, revealControls]);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setActiveSlide((current) => {
        if (current >= slides.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 9000);

    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        next();
      }

      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        previous();
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        void toggleFullscreen();
      }

      if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        setOverviewOpen((open) => !open);
      }

      if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      }

      if (event.key === "End") {
        event.preventDefault();
        goTo(slides.length - 1);
      }

      if (event.key === "?") {
        event.preventDefault();
        setHelpOpen((open) => !open);
      }

      if (event.key === "Escape") {
        setOverviewOpen(false);
        setHelpOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, next, previous, toggleFullscreen]);

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const distance = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(distance) < 60) return;
    if (distance < 0) next();
    else previous();
  };

  const progress = useMemo(
    () => ((activeSlide + 1) / slides.length) * 100,
    [activeSlide],
  );

  return (
    <main
      ref={stageRef}
      className={styles.presentation}
      onMouseMove={revealControls}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className={styles.ambientOne} />
      <div className={styles.ambientTwo} />
      <div className={styles.gridTexture} />

      <header
        className={`${styles.topBar} ${
          controlsVisible ? styles.controlsShown : styles.controlsHidden
        }`}
      >
        <div className={styles.brandLockup}>
          <Image
            src="/brand/festeazy-logo.png"
            alt="Festeazy"
            width={154}
            height={45}
            priority
            className={styles.brandLogo}
          />
          <span className={styles.brandDivider} />
          <span className={styles.eventName}>Practical Class 2026</span>
        </div>

        <div className={styles.topActions}>
          <Link
            href="/admin/dashboard"
            target="_blank"
            prefetch={false}
            className={styles.demoButton}
          >
            <Laptop size={17} />
            Open Live Demo
          </Link>

          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setOverviewOpen(true)}
            aria-label="Open slide overview"
            title="Overview (O)"
          >
            <Menu size={19} />
          </button>

          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setHelpOpen(true)}
            aria-label="Show keyboard controls"
            title="Keyboard help (?)"
          >
            <Keyboard size={19} />
          </button>

          <button
            type="button"
            className={styles.iconButton}
            onClick={() => void toggleFullscreen()}
            aria-label="Enter full screen"
            title="Full screen (F)"
          >
            <Fullscreen size={19} />
          </button>
        </div>
      </header>

      <section className={styles.viewport}>
        <div
          className={styles.track}
          style={{ transform: `translate3d(-${activeSlide * 100}%, 0, 0)` }}
        >
          <SlideShell active={activeSlide === 0}>
            <WelcomeSlide />
          </SlideShell>

          <SlideShell active={activeSlide === 1}>
            <ProblemSlide />
          </SlideShell>

          <SlideShell active={activeSlide === 2}>
            <PlatformSlide />
          </SlideShell>

          <SlideShell active={activeSlide === 3}>
            <WorkflowSlide />
          </SlideShell>

          <SlideShell active={activeSlide === 4}>
            <FeaturesSlide />
          </SlideShell>

          <SlideShell active={activeSlide === 5}>
            <ComparisonSlide />
          </SlideShell>

          <SlideShell active={activeSlide === 6}>
            <DemoSlide />
          </SlideShell>

          <SlideShell active={activeSlide === 7}>
            <OutputsSlide />
          </SlideShell>

          <SlideShell active={activeSlide === 8}>
            <ActivitySlide />
          </SlideShell>

          <SlideShell active={activeSlide === 9}>
            <ClosingSlide restart={restart} />
          </SlideShell>
        </div>
      </section>

      <footer
        className={`${styles.controlBar} ${
          controlsVisible ? styles.controlsShown : styles.controlsHidden
        }`}
      >
        <div className={styles.progressTrack} aria-hidden="true">
          <span
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>

        <button
          type="button"
          className={styles.controlButton}
          onClick={previous}
          disabled={activeSlide === 0}
          aria-label="Previous slide"
        >
          <ArrowLeft size={18} />
          <span>Previous</span>
        </button>

        <button
          type="button"
          className={styles.playButton}
          onClick={() => setIsPlaying((playing) => !playing)}
          aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>

        <div className={styles.slideStatus}>
          <span className={styles.currentNumber}>
            {String(activeSlide + 1).padStart(2, "0")}
          </span>
          <span className={styles.numberDivider}>/</span>
          <span>{String(slides.length).padStart(2, "0")}</span>
          <span className={styles.currentLabel}>{slides[activeSlide].label}</span>
        </div>

        <button
          type="button"
          className={styles.controlButton}
          onClick={next}
          disabled={activeSlide === slides.length - 1}
          aria-label="Next slide"
        >
          <span>Next</span>
          <ArrowRight size={18} />
        </button>
      </footer>

      {overviewOpen && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.overviewPanel}>
            <div className={styles.overlayHeader}>
              <div>
                <span className={styles.overlayEyebrow}>PRESENTATION</span>
                <h2>Slide overview</h2>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setOverviewOpen(false)}
                aria-label="Close overview"
              >
                <X size={21} />
              </button>
            </div>

            <div className={styles.overviewGrid}>
              {slides.map((slide, index) => {
                const Icon = slideIcons[index];
                return (
                  <button
                    key={slide.id}
                    type="button"
                    className={`${styles.overviewCard} ${
                      index === activeSlide ? styles.overviewCardActive : ""
                    }`}
                    onClick={() => goTo(index)}
                  >
                    <span className={styles.overviewNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Icon size={22} />
                    <strong>{slide.label}</strong>
                    <span>{slide.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {helpOpen && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.helpPanel}>
            <div className={styles.overlayHeader}>
              <div>
                <span className={styles.overlayEyebrow}>PRESENTER HELP</span>
                <h2>Keyboard controls</h2>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setHelpOpen(false)}
                aria-label="Close keyboard help"
              >
                <X size={21} />
              </button>
            </div>

            <div className={styles.keyGrid}>
              <KeyboardRow keys={["→", "Space"]} label="Next slide" />
              <KeyboardRow keys={["←"]} label="Previous slide" />
              <KeyboardRow keys={["F"]} label="Full screen" />
              <KeyboardRow keys={["O"]} label="Slide overview" />
              <KeyboardRow keys={["Home"]} label="First slide" />
              <KeyboardRow keys={["End"]} label="Last slide" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SlideShell({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <article
      className={`${styles.slide} ${active ? styles.activeSlide : ""}`}
      aria-hidden={!active}
    >
      {children}
    </article>
  );
}

function SlideHeading({
  index,
  align = "left",
}: {
  index: number;
  align?: "left" | "center";
}) {
  const slide = slides[index];

  return (
    <div
      className={`${styles.slideHeading} ${
        align === "center" ? styles.headingCenter : ""
      }`}
    >
      <span className={styles.eyebrow}>{slide.label}</span>
      <h2>{slide.title}</h2>
      <p className={styles.subtitle}>{slide.subtitle}</p>
      <p className={styles.malayalam}>{slide.malayalam}</p>
    </div>
  );
}

function WelcomeSlide() {
  return (
    <div className={styles.welcomeLayout}>
      <div className={styles.welcomeCopy}>
        <div className={styles.eventChip}>
          <Sparkles size={16} />
          NOORE MADEENA · MEELAD FEST & ANNUAL DAY 2026
        </div>

        <span className={styles.welcomeKicker}>MEELAD SOFTWARE</span>
        <h1>Practical Class</h1>

        <p className={styles.welcomeLead}>
          Learn how to manage an event from student registration to published
          results using one connected digital platform.
        </p>

        <p className={styles.welcomeMalayalam}>
          വിദ്യാർത്ഥി രജിസ്ട്രേഷൻ മുതൽ റിസൾട്ട് പ്രസിദ്ധീകരണം വരെ ഒരൊറ്റ
          ഡിജിറ്റൽ പ്ലാറ്റ്ഫോമിൽ നിയന്ത്രിക്കാം.
        </p>

        <div className={styles.eventMeta}>
          <div>
            <span>Date & Time</span>
            <strong>28 July 2026 · 10:45 AM</strong>
          </div>
          <div>
            <span>Session led by</span>
            <strong>Muhammad Huzaifa Kottakkunn</strong>
          </div>
        </div>

        <div className={styles.welcomeActions}>
          <span className={styles.startHint}>
            Press <kbd>Space</kbd> to begin
          </span>
          <Link
            href="/admin/dashboard"
            target="_blank"
            prefetch={false}
            className={styles.primaryLink}
          >
            Open Live Demo
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>

      <div className={styles.welcomeVisual}>
        <div className={styles.posterGlow} />
        <div className={styles.posterFrame}>
          <Image
            src="/practical-class/class-poster.png"
            alt="Noore Madeena Meelad Software Practical Class poster"
            fill
            priority
            sizes="(max-width: 900px) 75vw, 36vw"
            className={styles.posterImage}
          />
        </div>
        <div className={styles.floatingBadgeOne}>
          <ShieldCheck size={20} />
          One connected system
        </div>
        <div className={styles.floatingBadgeTwo}>
          <Trophy size={20} />
          Results in minutes
        </div>
      </div>
    </div>
  );
}

function ProblemSlide() {
  return (
    <div className={styles.contentFrame}>
      <SlideHeading index={1} />

      <div className={styles.problemGrid}>
        {painPoints.map((item, index) => (
          <div
            key={item.title}
            className={styles.problemCard}
            style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}
          >
            <span className={styles.problemNumber}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        ))}
      </div>

      <div className={styles.problemStatement}>
        <CircleHelp size={25} />
        <div>
          <strong>Think about your last event.</strong>
          <span>
            How much time was spent preparing lists, checking names,
            calculating marks and redesigning the same information?
          </span>
        </div>
      </div>
    </div>
  );
}

function PlatformSlide() {
  return (
    <div className={styles.splitLayout}>
      <div className={styles.platformCopy}>
        <SlideHeading index={2} />

        <div className={styles.platformPoints}>
          {[
            "One organization and event workspace",
            "Role-based administration and judging",
            "Information reused automatically",
            "Public results and ready-to-print outputs",
          ].map((point) => (
            <div key={point}>
              <CheckCircle2 size={20} />
              <span>{point}</span>
            </div>
          ))}
        </div>

        <div className={styles.definitionBox}>
          <Image
            src="/brand/festeazy-logo.png"
            alt="Festeazy"
            width={154}
            height={45}
          />
          <p>
            A digital event-management platform for Meelad festivals,
            Sahithyotsav, madrasas, schools and institutional competitions.
          </p>
        </div>
      </div>

      <div className={styles.browserVisual}>
        <div className={styles.browserTop}>
          <span />
          <span />
          <span />
          <div>festeazy.com/admin/programmes</div>
        </div>
        <div className={styles.browserImage}>
          <Image
            src="/practical-class/programmes-screen.png"
            alt="Festeazy programmes management screen"
            fill
            sizes="(max-width: 900px) 90vw, 52vw"
            className={styles.coverImage}
          />
        </div>
        <div className={styles.browserCaption}>
          <LayoutDashboard size={19} />
          <span>
            Real software modules connected to the same organization and event
            data.
          </span>
        </div>
      </div>
    </div>
  );
}

function WorkflowSlide() {
  return (
    <div className={styles.contentFrame}>
      <SlideHeading index={3} align="center" />

      <div className={styles.workflowRail}>
        {workflowSteps.map(([number, title, description], index) => (
          <div
            key={number}
            className={styles.workflowStep}
            style={{ "--delay": `${index * 100}ms` } as React.CSSProperties}
          >
            <span className={styles.workflowNumber}>{number}</span>
            <div>
              <strong>{title}</strong>
              <span>{description}</span>
            </div>
            {index < workflowSteps.length - 1 && (
              <ChevronRight className={styles.workflowArrow} size={18} />
            )}
          </div>
        ))}
      </div>

      <div className={styles.workflowMessage}>
        <ShieldCheck size={24} />
        <strong>Enter once. Use everywhere.</strong>
        <span>
          Student, programme and result information flows through the system
          without repeated manual preparation.
        </span>
      </div>
    </div>
  );
}

function FeaturesSlide() {
  return (
    <div className={styles.contentFrame}>
      <SlideHeading index={4} />

      <div className={styles.featureGrid}>
        {featureCards.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className={styles.featureCard}
              style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}
            >
              <div className={styles.featureIcon}>
                <Icon size={21} />
              </div>
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComparisonSlide() {
  return (
    <div className={styles.contentFrame}>
      <SlideHeading index={5} />

      <div className={styles.comparisonTable}>
        <div className={styles.comparisonHeader}>
          <div>
            <BookOpenCheck size={21} />
            Manual method
          </div>
          <div>
            <Sparkles size={21} />
            With Festeazy
          </div>
        </div>

        {comparisonRows.map(([before, after], index) => (
          <div
            key={before}
            className={styles.comparisonRow}
            style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}
          >
            <div>
              <X size={18} />
              <span>{before}</span>
            </div>
            <div>
              <CheckCircle2 size={18} />
              <span>{after}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.metricStrip}>
        <div>
          <strong>1</strong>
          <span>Connected workspace</span>
        </div>
        <div>
          <strong>10+</strong>
          <span>Operational modules</span>
        </div>
        <div>
          <strong>0</strong>
          <span>Repeated result design work</span>
        </div>
      </div>
    </div>
  );
}

function DemoSlide() {
  return (
    <div className={styles.demoLayout}>
      <div>
        <SlideHeading index={6} />

        <div className={styles.demoSteps}>
          {demoSteps.map((step, index) => (
            <div
              key={step}
              className={styles.demoStep}
              style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.demoVisual}>
        <div className={styles.demoScreen}>
          <div className={styles.demoScreenTop}>
            <span />
            <span />
            <span />
            <strong>Live Green Room</strong>
          </div>
          <div className={styles.demoImage}>
            <Image
              src="/practical-class/green-room-screen.png"
              alt="Festeazy Green Room page"
              fill
              sizes="(max-width: 900px) 90vw, 44vw"
              className={styles.coverImage}
            />
          </div>
        </div>

        <Link
          href="/admin/dashboard"
          target="_blank"
          prefetch={false}
          className={styles.liveDemoCard}
        >
          <div>
            <MonitorPlay size={24} />
            <span>Switch to the real software</span>
          </div>
          <ArrowRight size={20} />
        </Link>
      </div>
    </div>
  );
}

function OutputsSlide() {
  return (
    <div className={styles.outputsLayout}>
      <div className={styles.outputsVisual}>
        <div className={styles.outputBrowser}>
          <div className={styles.browserTop}>
            <span />
            <span />
            <span />
            <div>festeazy.com/admin/reports</div>
          </div>
          <div className={styles.outputImage}>
            <Image
              src="/practical-class/reports-screen.png"
              alt="Festeazy registration report"
              fill
              sizes="(max-width: 900px) 90vw, 50vw"
              className={styles.containImage}
            />
          </div>
        </div>
      </div>

      <div className={styles.outputsCopy}>
        <SlideHeading index={7} />

        <div className={styles.outputList}>
          {[
            [FileSpreadsheet, "Registration sheets", "Filter by category, class, gender and team."],
            [Trophy, "Results & points", "Publish rankings and update team standings."],
            [ImageIcon, "Result posters", "Share branded visuals immediately."],
            [Award, "Certificates", "Generate participant and merit certificates."],
            [FileText, "Operational reports", "Print programme, chest and attendance records."],
          ].map(([Icon, title, text]) => {
            const OutputIcon = Icon as typeof FileText;
            return (
              <div key={String(title)} className={styles.outputItem}>
                <OutputIcon size={21} />
                <div>
                  <strong>{String(title)}</strong>
                  <span>{String(text)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ActivitySlide() {
  return (
    <div className={styles.contentFrame}>
      <SlideHeading index={8} align="center" />

      <div className={styles.activityJourney}>
        {activitySteps.map((step, index) => (
          <div
            key={step}
            className={styles.activityStep}
            style={{ "--delay": `${index * 100}ms` } as React.CSSProperties}
          >
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </div>

      <div className={styles.activityGoal}>
        <Flag size={24} />
        <div>
          <strong>Goal</strong>
          <span>
            Complete the workflow without using a separate notebook,
            spreadsheet or manual result calculation.
          </span>
        </div>
      </div>
    </div>
  );
}

function ClosingSlide({ restart }: { restart: () => void }) {
  return (
    <div className={styles.closingLayout}>
      <div className={styles.closingGlow} />
      <Image
        src="/brand/festeazy-logo.png"
        alt="Festeazy"
        width={250}
        height={74}
        className={styles.closingLogo}
      />

      <span className={styles.closingEyebrow}>THANK YOU FOR PARTICIPATING</span>
      <h2>Make Your Fest Easy</h2>
      <p>Plan better. Work faster. Publish professionally.</p>
      <p className={styles.closingMalayalam}>
        കൂടുതൽ എളുപ്പത്തിൽ പ്ലാൻ ചെയ്യാം, വേഗത്തിൽ പ്രവർത്തിക്കാം,
        പ്രൊഫഷണലായി പ്രസിദ്ധീകരിക്കാം.
      </p>

      <div className={styles.contactRow}>
        <span>festeazy.com</span>
        <i />
        <span>+91 99611 18227</span>
      </div>

      <div className={styles.closingActions}>
        <button type="button" className={styles.secondaryButton} onClick={restart}>
          <RotateCcw size={18} />
          Restart Presentation
        </button>

        <Link
          href="/admin/dashboard"
          target="_blank"
          prefetch={false}
          className={styles.primaryLink}
        >
          Open Festeazy
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}

function KeyboardRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className={styles.keyboardRow}>
      <div>
        {keys.map((key) => (
          <kbd key={key}>{key}</kbd>
        ))}
      </div>
      <span>{label}</span>
    </div>
  );
}
