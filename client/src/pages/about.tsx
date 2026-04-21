import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type AboutFocus = "mission" | "impact" | "learning";

const FALLBACK_STATS = {
  activeStudents: 155,
  dedicatedTeachers: 4,
  partnerSchools: 28,
  ecoPointsEarned: 18,
  interactiveGames: 15,
  tasksCompleted: 5,
};

const focusCopy: Record<AboutFocus, { badge: string; title: string; description: string; bullets: string[] }> = {
  mission: {
    badge: "Why we exist",
    title: "Environmental learning that feels alive.",
    description: "We turn climate education into a daily habit through games, quests, and real-world actions that students can finish, share, and celebrate.",
    bullets: ["Game loops that reinforce healthy habits", "Teacher-friendly tracking and feedback", "Learning that connects to action, not just memorization"],
  },
  impact: {
    badge: "What changes",
    title: "Small actions compound into visible impact.",
    description: "Eco-points, tasks, and badges make progress tangible, while the platform highlights the momentum of the whole community.",
    bullets: ["Visible progress signals for every learner", "Shared school-wide milestones", "Better participation through lightweight rewards"],
  },
  learning: {
    badge: "How it works",
    title: "Interactive paths built for momentum.",
    description: "Students move between lessons, mini-games, and tasks in a flow that feels modern and easy to return to.",
    bullets: ["Short sessions with strong visual feedback", "Clear next steps after each activity", "A smooth experience on desktop and mobile"],
  },
};

const missionCards = [
  {
    icon: "🌱",
    title: "Educate",
    text: "Interactive games and quizzes make environmental learning engaging and memorable.",
    accent: "from-emerald-400/25 to-lime-300/10",
  },
  {
    icon: "🎯",
    title: "Action",
    text: "Real-world tasks encourage students to make a positive environmental impact outside the app.",
    accent: "from-cyan-400/25 to-sky-300/10",
  },
  {
    icon: "🤝",
    title: "Connect",
    text: "We bring students, teachers, and schools into one community with shared goals.",
    accent: "from-amber-400/25 to-orange-300/10",
  },
];

const featureCards = [
  {
    icon: "🎮",
    title: "Interactive Games",
    text: "Mini-games cover recycling, climate action, sustainable habits, and wildlife conservation.",
  },
  {
    icon: "📚",
    title: "Smart Quizzes",
    text: "Server-side scored quizzes give students fast feedback and age-appropriate challenges.",
  },
  {
    icon: "📋",
    title: "Real-World Tasks",
    text: "Photo-proof assignments encourage actual environmental action in students' communities.",
  },
];

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{display}{suffix}</>;
}

export default function AboutPage() {
  const [activeFocus, setActiveFocus] = useState<AboutFocus>("mission");
  const [hoverPoint, setHoverPoint] = useState({ x: 50, y: 40 });
  const [stats, setStats] = useState({
    activeStudents: 0,
    dedicatedTeachers: 0,
    partnerSchools: 0,
    ecoPointsEarned: 0,
    interactiveGames: 0,
    tasksCompleted: 0
  });

  useEffect(() => {
    // Fetch live statistics from API
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          // Fallback to demo data if API fails
          setStats(FALLBACK_STATS);
        }
      } catch (error) {
        // Demo data for display
        setStats(FALLBACK_STATS);
      }
    };

    fetchStats();
    // Refresh stats every 30 seconds for live updates
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => [
    { label: "Active Students", value: stats.activeStudents, icon: "👥" },
    { label: "Dedicated Teachers", value: stats.dedicatedTeachers, icon: "👨‍🏫" },
    { label: "Partner Schools", value: stats.partnerSchools, icon: "🏫" },
    { label: "Eco-Points Earned", value: stats.ecoPointsEarned, icon: "⭐", suffix: "+" },
    { label: "Interactive Games", value: stats.interactiveGames, icon: "🎮" },
    { label: "Tasks Completed", value: stats.tasksCompleted, icon: "✅", suffix: "+" },
  ], [stats]);

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white"
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width) * 100;
        const y = ((event.clientY - bounds.top) / bounds.height) * 100;
        setHoverPoint({ x, y });
      }}
      style={{
        backgroundImage: `radial-gradient(circle at ${hoverPoint.x}% ${hoverPoint.y}%, rgba(34, 197, 94, 0.14), transparent 22%), radial-gradient(circle at 20% 20%, rgba(14, 165, 233, 0.18), transparent 26%), radial-gradient(circle at 80% 0%, rgba(251, 191, 36, 0.12), transparent 22%), linear-gradient(180deg, #07131a 0%, #0a1e22 45%, #03080b 100%)`,
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-[-6rem] top-12 h-72 w-72 rounded-full bg-emerald-300/12 blur-3xl animate-pulse" />
        <div className="absolute right-[-5rem] top-20 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl animate-pulse" style={{ animationDelay: "900ms" }} />
        <div className="absolute bottom-[-7rem] left-1/3 h-80 w-80 rounded-full bg-amber-300/8 blur-3xl animate-pulse" style={{ animationDelay: "1800ms" }} />
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="overflow-hidden rounded-[2rem] border border-white/12 bg-white/8 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-2xl"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-300" />

          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="relative overflow-hidden p-6 md:p-10 lg:p-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/25 bg-emerald-200/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">
                <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                About the platform
              </div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.55 }}
                className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl"
              >
                A smooth, gamified way to learn, act, and grow greener habits.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.5 }}
                className="mt-5 max-w-2xl text-base leading-7 text-white/72 md:text-lg"
              >
                We blend interactive challenges with meaningful environmental outcomes so students stay engaged while schools see real participation.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.5 }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <Button asChild className="rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-600 px-6 py-6 text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-emerald-500/30">
                  <Link href="/games">Explore games</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full border-white/15 bg-white/8 px-6 py-6 text-sm font-semibold text-white hover:bg-white/12 hover:text-white">
                  <Link href="/learn">Start learning</Link>
                </Button>
              </motion.div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {metrics.map((metric, index) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.06, duration: 0.45 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="rounded-2xl border border-white/10 bg-white/8 p-4 shadow-lg transition-transform duration-300"
                  >
                    <div className="text-2xl">{metric.icon}</div>
                    <div className="mt-3 text-3xl font-black text-white">
                      <AnimatedNumber value={metric.value} suffix={metric.suffix} />
                    </div>
                    <div className="mt-1 text-sm text-white/65">{metric.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 lg:border-l lg:border-t-0">
              <div className="p-6 md:p-8 lg:p-10">
                <div className="rounded-[1.75rem] border border-white/10 bg-[#091820]/80 p-5 shadow-inner shadow-black/20">
                  <div className="flex flex-wrap gap-2">
                    {(["mission", "impact", "learning"] as AboutFocus[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setActiveFocus(item)}
                        className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ${activeFocus === item ? "bg-white text-slate-900 shadow-lg" : "bg-white/8 text-white/65 hover:bg-white/12 hover:text-white"}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeFocus}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.35 }}
                      className="mt-6"
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/70">{focusCopy[activeFocus].badge}</div>
                      <h2 className="mt-3 text-2xl font-black tracking-tight text-white md:text-3xl">{focusCopy[activeFocus].title}</h2>
                      <p className="mt-3 text-sm leading-7 text-white/68 md:text-base">{focusCopy[activeFocus].description}</p>

                      <div className="mt-6 space-y-3">
                        {focusCopy[activeFocus].bullets.map((bullet, index) => (
                          <motion.div
                            key={bullet}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.08 * index }}
                            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3"
                          >
                            <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
                            <span className="text-sm text-white/80">{bullet}</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/8 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/70">Community pulse</div>
                      <div className="mt-1 text-lg font-semibold text-white/95">Growing with every completed challenge</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/65">Live stats refresh every 30s</div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Progress from lessons to action", value: "Fast loops" },
                      { label: "Designed for classrooms and home use", value: "Flexible" },
                    ].map((item) => (
                      <div key={item.value} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/45">{item.label}</div>
                        <div className="mt-2 text-base font-semibold text-white">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {missionCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              whileHover={{ y: -6, scale: 1.01 }}
              className={`rounded-3xl border border-white/10 bg-gradient-to-br ${card.accent} from-white/10 to-white/6 p-6 shadow-xl backdrop-blur-xl`}
            >
              <div className="text-4xl">{card.icon}</div>
              <h3 className="mt-4 text-xl font-bold text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/70">{card.text}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {featureCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.09 }}
              whileHover={{ y: -5 }}
              className="rounded-3xl border border-white/10 bg-white/8 p-6 backdrop-blur-2xl shadow-xl"
            >
              <div className="text-4xl">{card.icon}</div>
              <h3 className="mt-4 text-xl font-bold text-white/95">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/70">{card.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
