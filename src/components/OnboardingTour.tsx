import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  NotebookPen,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";

type OnboardingGuideProps = {
  onComplete: () => void;
};

type GuideStep = {
  title: string;
  description: string;
  eyebrow: string;
  icon: LucideIcon;
  iconClassName: string;
};

const steps: GuideStep[] = [
  {
    eyebrow: "Capture it",
    title: "Add a note",
    description:
      "Drop in a thought, paste your class notes, or start from a blank page. Messy ideas are welcome.",
    icon: NotebookPen,
    iconClassName: "bg-guide-blue",
  },
  {
    eyebrow: "Make it click",
    title: "Ask the AI",
    description:
      "Turn confusing passages into clear explanations and get helpful answers grounded in your notes.",
    icon: BrainCircuit,
    iconClassName: "bg-guide-pink",
  },
  {
    eyebrow: "Lock it in",
    title: "Take a quiz",
    description:
      "Create quick questions from what you learned, test your recall, and spot the topics worth revisiting.",
    icon: Trophy,
    iconClassName: "bg-guide-mint",
  },
  {
    eyebrow: "You're ready",
    title: "Make learning yours",
    description:
      "Capture, understand, and practice—all in one focused flow. Your next bright idea starts now.",
    icon: Sparkles,
    iconClassName: "bg-guide-peach",
  },
];

const contentVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 72 : -72, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -72 : 72, opacity: 0 }),
};

export default function OnboardingTour({ onComplete }: OnboardingGuideProps) {
  const [[stepIndex, direction], setStep] = useState([0, 1]);
  const step = steps[stepIndex] ?? steps[0];
  const isFinalStep = stepIndex === steps.length - 1;

  const goToStep = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    setStep([nextIndex, nextIndex > stepIndex ? 1 : -1]);
  };

  if (!step) return null;

  const Icon = step.icon;

  return (
    <motion.div
      className="guide-backdrop fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4 sm:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        aria-describedby="guide-description"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border-[3px] border-guide-ink bg-guide-cream shadow-guide"
        initial={{ opacity: 0, scale: 0.72, y: 28 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.5, duration: 0.7 }}
      >
        <div className="flex items-center justify-between border-b-[3px] border-guide-ink bg-guide-lavender px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
            {steps.map((item, index) => (
              <span
                key={item.title}
                className={`h-3 w-3 rounded-full border-2 border-guide-ink transition-colors ${
                  index <= stepIndex ? "bg-guide-ink" : "bg-guide-cream"
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-guide-ink">
            Quick guide · {stepIndex + 1}/{steps.length}
          </span>
        </div>

        <div className="overflow-hidden px-6 pb-6 pt-8 sm:px-10 sm:pb-9 sm:pt-10">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={stepIndex}
              custom={direction}
              variants={contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="flex min-h-[330px] flex-col items-center text-center sm:min-h-[350px]"
            >
              <div
                className={`grid h-36 w-36 rotate-3 place-items-center rounded-[2.2rem] border-[3px] border-guide-ink shadow-guide-sm ${step.iconClassName}`}
              >
                <Icon className="h-20 w-20 -rotate-3 text-guide-ink" strokeWidth={2.4} aria-hidden="true" />
              </div>

              <p className="mt-8 text-[10px] font-black uppercase tracking-widest text-guide-ink">
                {step.eyebrow}
              </p>
              <h2 id="guide-title" className="mt-2 text-4xl font-black leading-tight text-guide-ink sm:text-5xl">
                {step.title}
              </h2>
              <p id="guide-description" className="mt-4 max-w-sm text-base font-bold leading-relaxed text-guide-ink/80">
                {step.description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-1 flex items-center gap-3">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => goToStep(stepIndex - 1)}
                aria-label="Previous step"
                className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-[3px] border-guide-ink bg-guide-cream text-guide-ink shadow-guide-button transition-all hover:bg-guide-lavender active:translate-y-1 active:shadow-none"
              >
                <ArrowLeft className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              onClick={() => (isFinalStep ? onComplete() : goToStep(stepIndex + 1))}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border-[3px] border-guide-ink bg-guide-blue px-5 text-base font-black text-guide-ink shadow-guide-button transition-all hover:bg-guide-mint active:translate-y-1 active:shadow-none"
            >
              {isFinalStep ? (
                <>
                  Let's Go! <Check className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
