import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface LastLessonOpened {
  moduleId?: string;
  moduleTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  openedAt?: string;
}

export function ContinueLearningCard() {
  const { username } = useAuth();
  const [lastLesson, setLastLesson] = useState<LastLessonOpened | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }

    const fetchLastLesson = async () => {
      try {
        const response = await fetch('/api/learning/last-lesson', {
          headers: {
            'x-username': username,
          },
        });
        const data = await response.json();
        if (data.ok && data.lastLessonOpened) {
          setLastLesson(data.lastLessonOpened);
        }
      } catch (error) {
        console.error('Failed to fetch last lesson:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLastLesson();
  }, [username]);

  // Don't show if no last lesson or still loading
  if (loading || !lastLesson?.moduleId || !lastLesson.lessonId) {
    return null;
  }

  const continueHref = `/learn?module=${encodeURIComponent(lastLesson.moduleId)}&lessons=${encodeURIComponent(lastLesson.lessonId)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl blur-xl" />
      
      <Link href={continueHref} className="block relative group">
        <div className="relative bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 hover:border-emerald-400/60 rounded-2xl p-8 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 rounded-2xl" />

          {/* Content */}
          <div className="relative z-10 flex items-start justify-between gap-6">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <BookOpen className="w-5 h-5 text-emerald-400" />
                  </motion.div>
                  <h3 className="text-sm font-mono uppercase tracking-wider text-emerald-400">
                    Continue Learning
                  </h3>
                </div>

                <div className="space-y-1">
                  <p className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {lastLesson.moduleTitle || 'Untitled Module'}
                  </p>
                  <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                    Lesson: {lastLesson.lessonTitle || 'Untitled Lesson'}
                  </p>
                </div>

                {lastLesson.openedAt && (
                  <p className="text-xs text-white/40">
                    Last opened: {new Date(lastLesson.openedAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Resume Button */}
              <motion.div
                whileHover={{ x: 4 }}
                transition={{ duration: 0.3 }}
                className="flex-shrink-0"
              >
                <div className="flex items-center gap-2 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-full px-4 py-3 group-hover:shadow-lg group-hover:shadow-emerald-500/50 transition-all duration-300">
                  <span className="text-sm font-semibold text-black">Resume</span>
                  <ArrowRight className="w-5 h-5 text-black" />
                </div>
              </motion.div>
            </div>

            {/* Border animation */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <motion.div
                className="absolute inset-0 border-2 border-emerald-400/0 group-hover:border-emerald-400/50 rounded-2xl transition-colors duration-300"
                animate={{
                  borderColor: ['rgba(16, 185, 129, 0)', 'rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0)'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
              />
            </div>
          </div>
        </Link>
    </motion.div>
  );
}
