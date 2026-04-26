import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, BookOpen, Play, Sparkles, Trophy, Zap, Award, Flame, Target, Star, Type, Plus, Minus, Edit3, Trash2, Save, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { GAMES } from "@/lib/gamesCatalog";
import {
  ModuleDashboardSkeleton,
  LessonListSkeleton,
  LessonContentSkeleton,
  HeaderSkeleton,
  StatsCardSkeleton
} from "@/components/SkeletonLoaders";
import {
  loadProgress as loadLocalProgress,
  saveProgress as saveLocalProgress,
  checkAchievements,
  getUserAchievements,
  getProgressPercentage,
  UserProgress,
  Achievement
} from "@/lib/achievements";
import {
  AchievementToast,
  ProgressCircle,
  BadgeGrid
} from "@/components/AchievementBadges";

interface Module {
  id: string;
  title: string;
  description: string;
  progress: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  duration: string;
  points: number;
  content: string;
  quiz?: Quiz;
  completed?: boolean;
}

interface Quiz {
  questions: Question[];
}

interface Question {
  question: string;
  options: string[];
  correct: number;
}

const MODULE_GAME_MAP: Record<string, string[]> = {
  "ecosystem-theory": ["seaverse", "sorting-stories-game", "eco-word-spell"],
  "energy-resources": ["badgas-hunter", "eco-arrow-harmony", "eco-balance-grid"],
  "ocean": ["seaverse", "sorting-stories-game"],
  "climate": ["badgas-hunter", "eco-arrow-harmony", "tsunami-expedition"],
  "water": ["eco-balance-grid", "sorting-stories-game"],
  "forest": ["eco-hit", "eco-shoot"],
  "wildlife": ["eco-shoot", "seaverse", "mineral-expedition"],
  "renewable": ["eco-arrow-harmony", "badgas-hunter", "eco-balance-grid"],
  "pollution": ["badgas-hunter", "sorting-stories-game"],
  "agriculture": ["eco-balance-grid", "eco-hit"],
  "eco-literacy": ["eco-word-spell", "environment-word-explorer"],
  "earth-resilience": ["tsunami-expedition", "mineral-expedition"],
};

const LESSON_GAME_MAP: Record<string, string[]> = {
  "ecosystem-theory:3": ["sorting-stories-game", "badgas-hunter"],
  "ecosystem-theory:5": ["eco-word-spell", "environment-word-explorer"],
  "energy-resources:2": ["eco-arrow-harmony", "eco-balance-grid"],
  "energy-resources:3": ["badgas-hunter"],
  "energy-resources:6": ["badgas-hunter", "eco-arrow-harmony", "eco-balance-grid"],
};

type ManagedModuleApi = {
  id: string;
  title: string;
  description?: string;
  lessons?: Array<{
    id?: string;
    title?: string;
    duration?: string;
    points?: number;
    content?: string;
    quiz?: {
      questions?: Array<{
        question?: string;
        options?: string[];
        correct?: number;
      }>;
    };
  }>;
  deleted?: boolean;
};

const cloneQuiz = (quiz?: Quiz): Quiz | undefined => {
  if (!quiz) return undefined;
  return {
    questions: quiz.questions.map((q) => ({
      question: q.question,
      options: [...q.options],
      correct: q.correct,
    })),
  };
};

const cloneLesson = (lesson: Lesson): Lesson => ({
  id: lesson.id,
  title: lesson.title,
  duration: lesson.duration,
  points: lesson.points,
  content: lesson.content,
  quiz: cloneQuiz(lesson.quiz),
  completed: !!lesson.completed,
});

const cloneModule = (module: Module): Module => ({
  id: module.id,
  title: module.title,
  description: module.description,
  progress: Number(module.progress || 0),
  lessons: module.lessons.map(cloneLesson),
});

const normalizeManagedModule = (raw: ManagedModuleApi): Module | null => {
  const id = String(raw?.id || '').trim();
  const title = String(raw?.title || '').trim();
  if (!id || !title) return null;
  const lessons = Array.isArray(raw?.lessons)
    ? raw.lessons
        .map((lesson): Lesson | null => {
          const lessonId = String(lesson?.id || '').trim();
          const lessonTitle = String(lesson?.title || '').trim();
          if (!lessonId || !lessonTitle) return null;
          const points = Math.max(1, Math.floor(Number(lesson?.points) || 1));
          const quizQuestions = Array.isArray(lesson?.quiz?.questions)
            ? lesson.quiz.questions
                .map((q) => ({
                  question: String(q?.question || '').trim(),
                  options: Array.isArray(q?.options) ? q.options.map((opt) => String(opt)) : [],
                  correct: Math.max(0, Number(q?.correct || 0)),
                }))
                .filter((q) => q.question && q.options.length >= 2)
            : [];
          return {
            id: lessonId,
            title: lessonTitle,
            duration: String(lesson?.duration || '10 minutes').trim() || '10 minutes',
            points,
            content: String(lesson?.content || `<h2>${lessonTitle}</h2><p>Lesson content coming soon.</p>`),
            quiz: quizQuestions.length ? { questions: quizQuestions } : undefined,
            completed: false,
          };
        })
        .filter((item): item is Lesson => !!item)
    : [];
  return {
    id,
    title,
    description: String(raw?.description || '').trim(),
    progress: 0,
    lessons,
  };
};

const mergeModulesCatalog = (managedRaw: ManagedModuleApi[]) => {
  return managedRaw
    .filter((item) => !item?.deleted)
    .map((item) => normalizeManagedModule(item))
    .filter((item): item is Module => !!item)
    .map((item) => cloneModule(item));
};

const applyCompletionState = (catalog: Module[], previous: Module[]) => {
  const completedKeys = new Set<string>();
  previous.forEach((module) => {
    module.lessons.forEach((lesson) => {
      if (lesson.completed) completedKeys.add(`${module.id}:${lesson.id}`);
    });
  });

  return catalog.map((module) => {
    const lessons = module.lessons.map((lesson) => ({
      ...lesson,
      completed: completedKeys.has(`${module.id}:${lesson.id}`),
    }));
    const completedCount = lessons.filter((lesson) => lesson.completed).length;
    const progress = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
    return { ...module, lessons, progress };
  });
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderLessonHtml = (content?: string) => {
  const raw = String(content || "").trim();
  if (!raw) return "<p>Lesson content coming soon.</p>";
  const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(raw);
  let html = hasHtmlTags ? raw : raw
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");

  // Ensure all links open in new tabs
  html = html.replace(/<a\s+([^>]*?)href\s*=\s*["']([^"']*)["']([^>]*?)>/gi,
    '<a $1href="$2" target="_blank" rel="noopener noreferrer"$3>');

  return html;
};

export default function LearnPage() {
  const [location] = useLocation();
  const { username, role } = useAuth();
  const canManageLearn = role === 'admin' || role === 'teacher';
  const [modules, setModules] = useState<Module[]>([]);
  const [managedModulesApi, setManagedModulesApi] = useState<ManagedModuleApi[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isQuiz, setIsQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [lessonPoints, setLessonPoints] = useState(0);
  const [ecoPoints, setEcoPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showBurst, setShowBurst] = useState(false);
  const managedModulesLoadedRef = useRef(false);
  const progressLoadedFor = useRef<string | null>(null);
  const completingRef = useRef(false);
  
  // Achievement system state
  const [userProgress, setUserProgress] = useState<UserProgress>(loadLocalProgress());
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  
  // Font size control state
  const [fontSize, setFontSize] = useState(16); // Base font size in pixels
  const [managerOpen, setManagerOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [savingModule, setSavingModule] = useState(false);
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null);
  const [moduleDraft, setModuleDraft] = useState<Module>({
    id: '',
    title: '',
    description: '',
    progress: 0,
    lessons: [
      {
        id: '1',
        title: '',
        duration: '10 minutes',
        points: 10,
        content: '',
        completed: false,
      },
    ],
  });

  const selectedModule = modules.find(m => m.id === selectedModuleId) || null;
  const selectedLesson = selectedModule?.lessons.find(l => l.id === selectedLessonId) || null;

  const loadManagedModules = async () => {
    try {
      const response = await fetch('/api/modules');
      const json = await response.json();
      const rows = Array.isArray(json) ? (json as ManagedModuleApi[]) : [];
      setManagedModulesApi(rows);
      setModules((prev) => applyCompletionState(mergeModulesCatalog(rows), prev));
    } catch {
      setManagedModulesApi([]);
      setModules((prev) => applyCompletionState([], prev));
    }
  };

  const resetModuleDraft = () => {
    setEditingModuleId(null);
    setModuleDraft({
      id: '',
      title: '',
      description: '',
      progress: 0,
      lessons: [
        {
          id: '1',
          title: '',
          duration: '10 minutes',
          points: 10,
          content: '',
          completed: false,
        },
      ],
    });
  };

  const openCreateModule = () => {
    resetModuleDraft();
    setManagerOpen(true);
  };

  const openEditModule = (module: Module) => {
    setEditingModuleId(module.id);
    setModuleDraft(cloneModule(module));
    setManagerOpen(true);
  };

  const addDraftLesson = () => {
    setModuleDraft((prev) => ({
      ...prev,
      lessons: [
        ...prev.lessons,
        {
          id: `${prev.lessons.length + 1}`,
          title: '',
          duration: '10 minutes',
          points: 10,
          content: '',
          completed: false,
        },
      ],
    }));
  };

  const removeDraftLesson = (index: number) => {
    setModuleDraft((prev) => {
      const next = prev.lessons.filter((_, i) => i !== index);
      return { ...prev, lessons: next.length ? next : prev.lessons };
    });
  };

  const saveModuleDraft = async () => {
    if (!canManageLearn || !username) return;
    const title = moduleDraft.title.trim();
    if (!title) {
      setMessage('Module title is required.');
      return;
    }
    const validLessons = moduleDraft.lessons.filter((lesson) => lesson.title.trim());
    if (validLessons.length === 0) {
      setMessage('Add at least one lesson with a title.');
      return;
    }

    const payload = {
      id: editingModuleId || undefined,
      title,
      description: moduleDraft.description.trim(),
      lessons: validLessons.map((lesson) => ({
        id: (lesson.id || '').trim() || undefined,
        title: lesson.title.trim(),
        duration: lesson.duration.trim() || '10 minutes',
        points: Math.max(1, Math.floor(Number(lesson.points) || 1)),
        content: lesson.content || `<h2>${lesson.title.trim()}</h2><p>Lesson content coming soon.</p>`,
      })),
    };

    setSavingModule(true);
    try {
      const res = await fetch(editingModuleId ? `/api/admin/learning/modules/${encodeURIComponent(editingModuleId)}` : '/api/admin/learning/modules', {
        method: editingModuleId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Username': username,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setMessage(data?.error || 'Failed to save module.');
        return;
      }
      await loadManagedModules();
      setMessage(editingModuleId ? 'Module updated successfully.' : 'Module created successfully.');
      resetModuleDraft();
      setManagerOpen(false);
    } finally {
      setSavingModule(false);
      setTimeout(() => setMessage(null), 2200);
    }
  };

  const deleteManagedModule = async (moduleId: string, moduleTitle: string) => {
    if (!canManageLearn || !username) return;
    if (!confirm(`Delete module "${moduleTitle}"?`)) return;

    setDeletingModuleId(moduleId);
    try {
      const res = await fetch(`/api/admin/learning/modules/${encodeURIComponent(moduleId)}`, {
        method: 'DELETE',
        headers: { 'X-Username': username },
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setMessage(data?.error || 'Failed to delete module.');
        return;
      }
      await loadManagedModules();
      if (selectedModuleId === moduleId) {
        setSelectedModuleId(null);
        setSelectedLessonId(null);
        setIsQuiz(false);
      }
      setMessage('Module deleted successfully.');
    } finally {
      setDeletingModuleId(null);
      setTimeout(() => setMessage(null), 2200);
    }
  };

  const getRelatedGames = (moduleId?: string | null, lessonId?: string | null) => {
    if (!moduleId) return [];
    const lessonKeyRef = lessonId ? `${moduleId}:${lessonId}` : "";
    const lessonGames = lessonKeyRef ? (LESSON_GAME_MAP[lessonKeyRef] || []) : [];
    const moduleGames = MODULE_GAME_MAP[moduleId] || [];
    const combinedIds = Array.from(new Set([...lessonGames, ...moduleGames]));
    return GAMES.filter(game => combinedIds.includes(game.id));
  };

  const relatedGamesForModule = getRelatedGames(selectedModuleId, null);
  const relatedGamesForLesson = getRelatedGames(selectedModuleId, selectedLessonId);

  const lessonKey = (moduleId: string, lessonId: string) => `${moduleId}:${lessonId}`;

  const applyCompletions = (completions: Array<{ moduleId: string; lessonId: string }>) => {
    const completed = new Set(completions.map(c => lessonKey(c.moduleId, c.lessonId)));
    setModules(prev => {
      const updatedModules = prev.map(module => {
        const lessons = module.lessons.map(lesson => ({
          ...lesson,
          completed: completed.has(lessonKey(module.id, lesson.id)),
        }));
        const completedCount = lessons.filter(l => l.completed).length;
        const progress = Math.round((completedCount / lessons.length) * 100);
        return { ...module, lessons, progress };
      });
      
      // Update userProgress.completedModules based on updated modules
      const completedModules = updatedModules
        .filter(m => m.progress === 100)
        .map(m => m.id);
      
      setUserProgress(currentProgress => ({
        ...currentProgress,
        completedModules,
        lastUpdated: new Date().toISOString()
      }));
      
      return updatedModules;
    });
  };

  const markLessonCompletedLocal = (moduleId: string, lessonId: string) => {
    setModules(prev =>
      prev.map(module => {
        if (module.id !== moduleId) return module;
        const lessons = module.lessons.map(lesson =>
          lesson.id === lessonId ? { ...lesson, completed: true } : lesson
        );
        const completedCount = lessons.filter(l => l.completed).length;
        const progress = Math.round((completedCount / lessons.length) * 100);
        return { ...module, lessons, progress };
      })
    );
  };

  const markModuleCompletedLocal = (moduleId: string) => {
    setModules(prev =>
      prev.map(module => {
        if (module.id !== moduleId) return module;
        const lessons = module.lessons.map(lesson => ({ ...lesson, completed: true }));
        return { ...module, lessons, progress: 100 };
      })
    );
  };

  const loadProgress = async () => {
    if (!username) return;
    setLoading(true);
    try {
      const [progressRes, profileRes] = await Promise.all([
        fetch('/api/learning/progress', { headers: { 'X-Username': username } }),
        fetch('/api/student/profile', { headers: { 'X-Username': username } }),
      ]);
      const progressData = await progressRes.json();
      const profileData = await profileRes.json();
      applyCompletions(Array.isArray(progressData?.completions) ? progressData.completions : []);
      setLessonPoints(Number(progressData?.totalLessonPoints || 0));
      setEcoPoints(Number(profileData?.ecoPoints || 0));
      
      // Update local progress from server data
      const completions = Array.isArray(progressData?.completions) ? progressData.completions : [];
      const updatedProgress: UserProgress = {
        ...userProgress,
        completedLessons: completions.map((c: any) => `${c.moduleId}:${c.lessonId}`),
        totalPoints: Number(profileData?.ecoPoints || 0),
        lastUpdated: new Date().toISOString()
      };
      setUserProgress(updatedProgress);
      saveLocalProgress(updatedProgress);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (managedModulesLoadedRef.current) return;
    managedModulesLoadedRef.current = true;
    loadManagedModules();
  }, []);

  useEffect(() => {
    if (!username) return;
    if (progressLoadedFor.current === username) return;
    progressLoadedFor.current = username;
    loadProgress();
  }, [username]);

  useEffect(() => {
    // Prefer real browser search params because router location may exclude query string.
    const browserSearch = typeof window !== 'undefined' ? window.location.search : '';
    let params = new URLSearchParams(browserSearch);

    if (!params.get('module')) {
      const queryIndex = location.indexOf('?');
      if (queryIndex !== -1) {
        params = new URLSearchParams(location.slice(queryIndex + 1));
      }
    }

    const moduleId = params.get('module');
    if (!moduleId) return;

    const targetModule = modules.find(module => module.id === moduleId);
    if (!targetModule) return;

    setSelectedModuleId(targetModule.id);
    setIsQuiz(false);

    const lessonIds = (params.get('lessons') || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    const firstMatchingLesson = lessonIds.find(id =>
      targetModule.lessons.some(lesson => lesson.id === id)
    );

    setSelectedLessonId(firstMatchingLesson || targetModule.lessons[0]?.id || null);
  }, [location, modules]);

  const playChime = () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => undefined);
      }
      const now = ctx.currentTime + 0.02;

      const createTone = (freq: number, start: number, duration: number, gainValue: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration + 0.05);
      };

      createTone(523.25, now, 0.22, 0.12);
      createTone(659.25, now + 0.08, 0.2, 0.1);
      createTone(784.0, now + 0.14, 0.22, 0.08);

      setTimeout(() => {
        ctx.close().catch(() => undefined);
      }, 700);
    } catch {
      // ignore audio errors
    }
  };

  const handleModuleSelect = (module: Module) => {
    setSelectedModuleId(module.id);
    setSelectedLessonId(null);
    setIsQuiz(false);
  };

  const handleLessonSelect = async (lesson: Lesson) => {
    setLessonLoading(true);
    // Simulate a brief loading time for better UX
    setTimeout(async () => {
      setSelectedLessonId(lesson.id);
      setIsQuiz(false);
      setLessonLoading(false);

      // Track the last opened lesson
      if (selectedModule && username) {
        try {
          await fetch('/api/learning/last-lesson', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-username': username,
            },
            body: JSON.stringify({
              moduleId: selectedModule.id,
              moduleTitle: selectedModule.title,
              lessonId: lesson.id,
              lessonTitle: lesson.title,
            }),
          });
        } catch (error) {
          console.error('Failed to save last lesson:', error);
        }
      }
    }, 150);
  };

  const handleLessonComplete = async () => {
    if (!selectedLesson || !selectedModule || !username) return;
    if (selectedLesson.completed || completingRef.current) {
      if (selectedLesson.completed) setMessage('Lesson already completed.');
      return;
    }
    setCompleting(true);
    completingRef.current = true;
    try {
      const res = await fetch('/api/learning/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Username': username },
        body: JSON.stringify({
          moduleId: selectedModule.id,
          moduleTitle: selectedModule.title,
          lessonId: selectedLesson.id,
          lessonTitle: selectedLesson.title,
          points: selectedLesson.points || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || 'Failed to complete lesson');
        return;
      }
      if (data?.alreadyCompleted) {
        setMessage('Lesson already completed.');
      } else {
        // Update progress and points immediately
        markLessonCompletedLocal(selectedModule.id, selectedLesson.id);
        setEcoPoints(prev => prev + (selectedLesson.points || 0));
        setLessonPoints(prev => prev + (selectedLesson.points || 0));

        setMessage(`Lesson completed! +${selectedLesson.points} EcoPoints`);
        setShowBurst(true);
        playChime();
        setTimeout(() => setShowBurst(false), 900);

        // Update achievement progress
        const lessonKey = `${selectedModule.id}:${selectedLesson.id}`;
        if (!userProgress.completedLessons.includes(lessonKey)) {
          const updatedProgress: UserProgress = {
            ...userProgress,
            completedLessons: [...userProgress.completedLessons, lessonKey],
            totalPoints: userProgress.totalPoints + (selectedLesson.points || 0),
            lastUpdated: new Date().toISOString()
          };

          // Check for new achievements
          const newlyUnlocked = checkAchievements(updatedProgress);
          if (newlyUnlocked.length > 0) {
            setNewAchievement(newlyUnlocked[0]);
            setTimeout(() => setNewAchievement(null), 5000);
          }

          setUserProgress(updatedProgress);
          saveLocalProgress(updatedProgress);
        }

        // Still load progress in background to sync with server
        loadProgress();
      }
    } finally {
      setCompleting(false);
      completingRef.current = false;
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleBack = () => {
    if (isQuiz) {
      setIsQuiz(false);
    } else if (selectedLessonId) {
      setSelectedLessonId(null);
    } else if (selectedModuleId) {
      setSelectedModuleId(null);
    }
  };

  const handleTakeQuiz = () => {
    setIsQuiz(true);
    setQuizAnswers(new Array(selectedLesson?.quiz?.questions.length || 0).fill(-1));
    setQuizSubmitted(false);
  };

  const handleQuizSubmit = async () => {
    if (completingRef.current) return;
    setQuizSubmitted(true);
    setTimeout(() => {
      handleLessonComplete();
    }, 900);
  };

  const handleModuleComplete = async () => {
    if (!selectedModule || !username || completingRef.current) return;
    setCompleting(true);
    completingRef.current = true;
    try {
      for (const lesson of selectedModule.lessons) {
        if (lesson.completed) continue;
        await fetch('/api/learning/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Username': username },
          body: JSON.stringify({
            moduleId: selectedModule.id,
            moduleTitle: selectedModule.title,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            points: lesson.points || 0,
          }),
        });
      }
      markModuleCompletedLocal(selectedModule.id);
      await loadProgress();
      setMessage('Module completed!');
      setShowBurst(true);
      playChime();
      setTimeout(() => setShowBurst(false), 900);
      
      // Update achievement progress for module completion
      if (!userProgress.completedModules.includes(selectedModule.id)) {
        const updatedProgress: UserProgress = {
          ...userProgress,
          completedModules: [...userProgress.completedModules, selectedModule.id],
          lastUpdated: new Date().toISOString()
        };
        
        // Check for new achievements
        const newlyUnlocked = checkAchievements(updatedProgress);
        if (newlyUnlocked.length > 0) {
          setNewAchievement(newlyUnlocked[0]);
          setTimeout(() => setNewAchievement(null), 5000);
        }
        
        setUserProgress(updatedProgress);
        saveLocalProgress(updatedProgress);
      }
    } finally {
      setCompleting(false);
      completingRef.current = false;
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const totalModulesCompleted = modules.filter(m => m.progress === 100).length;
  const moduleOrderPriority: Record<string, number> = {
    "environmental-health": 0,
    "biosphere": 1,
    "pollution-silent-killer": 2,
    "ecolearn-environmental-education": 3,
    "earthpulse-environment-human": 4,
  };
  const sortedModules = [...modules].sort((a, b) => {
    const aPriority = moduleOrderPriority[a.id] ?? 999;
    const bPriority = moduleOrderPriority[b.id] ?? 999;
    return aPriority - bPriority;
  });
  const managedOverrideIds = new Set(
    managedModulesApi
      .filter((module) => !module.deleted)
      .map((module) => String(module.id || '').trim())
      .filter(Boolean)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-24 left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-24 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6 lg:p-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          {loading ? (
            <HeaderSkeleton />
          ) : (
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-300 bg-clip-text text-transparent">
                  Environmental Learning Hub
                </h1>
                <p className="text-white/70 mt-2">Short lessons, quick quizzes, real eco points.</p>
                {canManageLearn && (
                  <div className="mt-3">
                    <Button
                      onClick={() => setManagerOpen((prev) => !prev)}
                      className="bg-white/10 border border-white/25 hover:bg-white/20 text-white"
                    >
                      {managerOpen ? 'Close Learn Manager' : 'Manage Modules & Lessons'}
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-white/10 border border-white/20 rounded-xl p-3">
                  <p className="text-xs text-white/60">EcoPoints</p>
                  <p className="text-2xl font-bold text-white">{ecoPoints}</p>
                </div>
                <div className="bg-white/10 border border-white/20 rounded-xl p-3">
                  <p className="text-xs text-white/60">Lesson Points</p>
                  <p className="text-2xl font-bold text-white">{lessonPoints}</p>
                </div>
                <div className="bg-white/10 border border-white/20 rounded-xl p-3">
                  <p className="text-xs text-white/60">Modules Done</p>
                  <p className="text-2xl font-bold text-white">{totalModulesCompleted}/{modules.length}</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-4 py-3 text-emerald-200"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {message}
            </div>
          </motion.div>
        )}

        {showBurst && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-4 py-2 text-emerald-200"
          >
            <Zap className="h-4 w-4" />
            Lesson completion recorded
          </motion.div>
        )}

        {canManageLearn && managerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-5 md:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xl font-bold text-cyan-200">Learn Content Manager</h3>
                <p className="text-sm text-white/70">Admins and teachers can add, edit, or delete modules and lessons.</p>
              </div>
              <Button onClick={openCreateModule} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200 font-bold">
                <Plus className="h-4 w-4 mr-2" /> New Module
              </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="rounded-xl border border-white/20 bg-white/5 p-4 space-y-3 max-h-[34rem] overflow-y-auto">
                {sortedModules.map((module) => {
                  const isManagedOverride = managedOverrideIds.has(module.id);
                  return (
                    <div key={`manage-${module.id}`} className="rounded-lg border border-white/15 bg-black/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-white">{module.title}</div>
                          <div className="text-xs text-white/65 mt-0.5">{module.lessons.length} lessons</div>
                          <div className="text-[11px] text-white/55 mt-1">{isManagedOverride ? 'Managed override' : 'Built-in module'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            title="Edit module"
                            aria-label="Edit module"
                            onClick={() => openEditModule(module)}
                            className="h-8 w-8 rounded-full border border-emerald-400/60 bg-emerald-500/20 text-emerald-300 flex items-center justify-center hover:bg-emerald-500/35"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete module"
                            aria-label="Delete module"
                            onClick={() => deleteManagedModule(module.id, module.title)}
                            disabled={deletingModuleId === module.id}
                            className="h-8 w-8 rounded-full border border-red-400/60 bg-red-500/20 text-red-300 flex items-center justify-center hover:bg-red-500/35 disabled:opacity-60"
                          >
                            <Trash2 className={`h-3.5 w-3.5 ${deletingModuleId === module.id ? 'animate-pulse' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-white/20 bg-white/5 p-4 space-y-4 max-h-[34rem] overflow-y-auto">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-white">{editingModuleId ? 'Edit Module' : 'Create Module'}</h4>
                  <Button
                    variant="ghost"
                    onClick={resetModuleDraft}
                    className="text-white/80 hover:text-white hover:bg-white/10"
                  >
                    <X className="h-4 w-4 mr-1" /> Reset
                  </Button>
                </div>

                <div>
                  <label className="text-xs text-white/70">Module Title</label>
                  <input
                    value={moduleDraft.title}
                    onChange={(e) => setModuleDraft((prev) => ({ ...prev, title: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-white"
                    placeholder="Module title"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/70">Description</label>
                  <textarea
                    value={moduleDraft.description}
                    onChange={(e) => setModuleDraft((prev) => ({ ...prev, description: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-white"
                    rows={2}
                    placeholder="Short module description"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs text-white/70">Lessons</label>
                  <Button onClick={addDraftLesson} variant="secondary" className="bg-white/15 hover:bg-white/25 text-white">
                    <Plus className="h-4 w-4 mr-1" /> Add Lesson
                  </Button>
                </div>

                <div className="space-y-3">
                  {moduleDraft.lessons.map((lesson, index) => (
                    <div key={`draft-lesson-${index}`} className="rounded-lg border border-white/15 bg-black/20 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-white/70">Lesson {index + 1}</div>
                        {moduleDraft.lessons.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDraftLesson(index)}
                            className="text-red-300 hover:text-red-200"
                            title="Remove lesson"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        value={lesson.title}
                        onChange={(e) =>
                          setModuleDraft((prev) => ({
                            ...prev,
                            lessons: prev.lessons.map((item, i) => i === index ? { ...item, title: e.target.value } : item),
                          }))
                        }
                        className="w-full rounded-md border border-white/20 bg-black/20 px-2.5 py-2 text-sm text-white"
                        placeholder="Lesson title"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={lesson.duration}
                          onChange={(e) =>
                            setModuleDraft((prev) => ({
                              ...prev,
                              lessons: prev.lessons.map((item, i) => i === index ? { ...item, duration: e.target.value } : item),
                            }))
                          }
                          className="rounded-md border border-white/20 bg-black/20 px-2.5 py-2 text-sm text-white"
                          placeholder="Duration (e.g. 12 minutes)"
                        />
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={lesson.points}
                          onChange={(e) =>
                            setModuleDraft((prev) => ({
                              ...prev,
                              lessons: prev.lessons.map((item, i) => i === index ? { ...item, points: Math.max(1, Math.min(500, Number(e.target.value) || 1)) } : item),
                            }))
                          }
                          className="rounded-md border border-white/20 bg-black/20 px-2.5 py-2 text-sm text-white"
                          placeholder="Points"
                        />
                      </div>
                      <textarea
                        value={lesson.content}
                        onChange={(e) =>
                          setModuleDraft((prev) => ({
                            ...prev,
                            lessons: prev.lessons.map((item, i) => i === index ? { ...item, content: e.target.value } : item),
                          }))
                        }
                        className="w-full rounded-md border border-white/20 bg-black/20 px-2.5 py-2 text-sm text-white"
                        rows={3}
                        placeholder="Lesson content (HTML supported)"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveModuleDraft} disabled={savingModule} className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white">
                    <Save className="h-4 w-4 mr-2" /> {savingModule ? 'Saving...' : (editingModuleId ? 'Update Module' : 'Create Module')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setManagerOpen(false);
                      resetModuleDraft();
                    }}
                    className="bg-white/15 hover:bg-white/25 text-white"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Progress and Achievements Section */}
        {!loading && !selectedModule && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Progress Circle */}
              <div className="bg-white/10 border border-white/20 rounded-2xl p-6 flex flex-col items-center justify-center">
                <ProgressCircle 
                  percentage={getProgressPercentage(totalModulesCompleted, modules.length)} 
                  size={140}
                />
                <p className="text-white/70 text-sm mt-4">Course Progress</p>
              </div>

              {/* Quick Stats */}
              <div className="lg:col-span-2 bg-white/10 border border-white/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Award className="h-5 w-5 text-emerald-400" />
                    Your Achievements
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAchievements(!showAchievements)}
                    className="text-emerald-300 hover:text-emerald-200"
                  >
                    {showAchievements ? 'Hide' : 'View All'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-400">{userProgress.completedLessons.length}</p>
                    <p className="text-xs text-white/60 mt-1">Lessons Done</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-cyan-400">{userProgress.completedModules.length}</p>
                    <p className="text-xs text-white/60 mt-1">Modules Done</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-yellow-400">{userProgress.unlockedAchievements.length}</p>
                    <p className="text-xs text-white/60 mt-1">Badges</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-purple-400">{userProgress.totalPoints}</p>
                    <p className="text-xs text-white/60 mt-1">Total Points</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Achievement Badges Grid */}
            {showAchievements && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <BadgeGrid achievements={getUserAchievements(userProgress)} />
              </motion.div>
            )}
          </motion.div>
        )}

        {loading && (
          <AnimatePresence mode="wait">
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {!selectedModule && !selectedLesson && <ModuleDashboardSkeleton />}
              {selectedModule && !selectedLesson && <LessonListSkeleton />}
              {selectedLesson && <LessonContentSkeleton />}
            </motion.div>
          </AnimatePresence>
        )}

        {!loading && (
          <AnimatePresence mode="wait">
            {!selectedModule && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Module Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {sortedModules.map((module, idx) => {
                    const isCompleted = module.progress === 100;
                    const hasProgress = module.progress > 0;
                    const nextLesson = module.lessons.find(lesson => !lesson.completed);
                    
                    return (
                      <motion.div
                        key={module.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.08 }}
                        whileHover={{ y: -6, scale: 1.02 }}
                        className="group relative bg-gradient-to-br from-white/8 to-white/4 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:shadow-2xl hover:shadow-emerald-500/20 hover:border-emerald-400/50 transition-all duration-300 cursor-pointer overflow-hidden"
                      >
                        {/* Animated background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-cyan-500/0 to-blue-500/0 group-hover:from-emerald-500/8 group-hover:via-cyan-500/6 group-hover:to-blue-500/4 transition-all duration-500 pointer-events-none" />
                        
                        {/* Status indicator */}
                        <div className="absolute top-4 right-4">
                          {isCompleted ? (
                            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1 text-emerald-300 text-xs font-medium">
                              <Trophy className="h-3 w-3" />
                              Completed
                            </div>
                          ) : hasProgress ? (
                            <div className="flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/40 px-2.5 py-1 text-blue-300 text-xs font-medium">
                              <Target className="h-3 w-3" />
                              In Progress
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-2.5 py-1 text-white/60 text-xs font-medium">
                              <BookOpen className="h-3 w-3" />
                              New
                            </div>
                          )}
                        </div>

                        <div className="relative z-10">
                          {/* Module icon and title */}
                          <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl group-hover:from-emerald-500/30 group-hover:to-cyan-500/30 transition-all duration-300">
                              <BookOpen className="h-6 w-6 text-emerald-300 group-hover:text-emerald-200 transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-white group-hover:text-emerald-200 transition-colors leading-tight mb-1">
                                {module.title}
                              </h3>
                              <p className="text-white/60 text-sm flex items-center gap-1">
                                <Target className="h-3.5 w-3.5" />
                                {module.lessons.length} lessons
                              </p>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-white/70 text-sm leading-relaxed mb-5 group-hover:text-white/80 transition-colors overflow-hidden">
                            {module.description.length > 120 
                              ? `${module.description.substring(0, 120)}...` 
                              : module.description
                            }
                          </p>

                          {/* Progress section */}
                          <div className="space-y-3 mb-6">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/60 group-hover:text-white/70 transition-colors">Progress</span>
                              <span className="font-semibold text-white">{module.progress}%</span>
                            </div>
                            <div className="relative h-2.5 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${module.progress}%` }}
                                transition={{ duration: 0.8, delay: idx * 0.1, ease: "easeOut" }}
                                className={`h-full rounded-full ${
                                  hasProgress 
                                    ? 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-lg shadow-emerald-500/30' 
                                    : 'bg-white/20'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Continue button */}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleModuleSelect(module);
                            }}
                            className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/25 group-hover:scale-[1.02]"
                          >
                            {isCompleted ? (
                              <>
                                <Trophy className="h-4 w-4 mr-2" />
                                Review Module
                              </>
                            ) : hasProgress ? (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Continue Learning
                              </>
                            ) : (
                              <>
                                <BookOpen className="h-4 w-4 mr-2" />
                                Start Module
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Decorative bottom accent */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent group-hover:via-emerald-400/60 transition-all duration-300" />
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {selectedModule && !selectedLesson && (
              <motion.div
                key="module"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={handleBack} className="text-white hover:text-emerald-200 hover:bg-white/10">
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <div>
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent break-words [overflow-wrap:anywhere]">{selectedModule.title}</h2>
                      <p className="text-white/70 text-sm mt-1 break-words [overflow-wrap:anywhere] whitespace-pre-wrap">{selectedModule.description}</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleModuleComplete} 
                    disabled={completing}
                    className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-semibold"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Complete Module
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {selectedModule.lessons.map((lesson, idx) => {
                    const isCompleted = lesson.completed;
                    return (
                      <motion.div
                        key={lesson.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        whileHover={{ y: -3 }}
                        className="group relative bg-white/5 backdrop-blur-2xl border border-white/20 rounded-xl p-5 hover:bg-white/10 hover:border-emerald-400/40 transition-all cursor-pointer overflow-hidden"
                        onClick={() => handleLessonSelect(lesson)}
                      >
                        {/* Animated gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-cyan-500/0 group-hover:from-emerald-500/5 group-hover:to-cyan-500/5 transition-all duration-300 pointer-events-none" />
                        
                        <div className="relative z-10 flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-white font-semibold mb-2 group-hover:text-emerald-200 transition-colors flex items-start gap-2 break-words [overflow-wrap:anywhere]">
                              <span className="inline-block p-1.5 bg-emerald-500/20 rounded group-hover:bg-emerald-500/30 transition-all mt-0.5">
                                <Play className="h-3 w-3 text-emerald-300" />
                              </span>
                              <span>{lesson.title}</span>
                            </h3>
                            <p className="text-white/60 text-xs flex items-center gap-2 group-hover:text-white/70 transition-colors">
                              <span className="flex items-center gap-1">
                                ⏱️ {lesson.duration}
                              </span>
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-400" /> {lesson.points}
                              </span>
                            </p>
                          </div>
                          <div>
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/30 border border-emerald-400/50 px-2.5 py-1 text-emerald-300 text-xs font-semibold whitespace-nowrap">
                                <CheckCircle className="h-3 w-3" /> Done
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/30 border border-cyan-400/50 px-2.5 py-1 text-cyan-300 text-xs font-semibold">
                                New
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom accent line */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400/40 to-emerald-500/0 group-hover:via-emerald-400/100 transition-all" />
                      </motion.div>
                    );
                  })}
                </div>

                {relatedGamesForModule.length > 0 && (
                  <div className="mt-8 rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-5 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-cyan-200">Play Related Games</h3>
                        <p className="text-sm text-white/70">These games reinforce concepts from this module.</p>
                      </div>
                      <Link href="/games">
                        <Button className="bg-cyan-300 text-slate-950 font-bold border border-cyan-100 hover:bg-cyan-200 shadow-lg shadow-cyan-900/30">
                          View All Games
                        </Button>
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {relatedGamesForModule.map((game) => (
                        <div key={game.id} className="rounded-xl border border-white/20 bg-white/5 p-4">
                          <p className="text-white font-semibold">{game.icon ? `${game.icon} ` : ''}{game.name}</p>
                          <p className="text-xs text-white/70 mt-1 line-clamp-2">{game.description}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-emerald-300">+{game.points} pts</span>
                            <Link href={`/games/play/${game.id}`}>
                              <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white">Play</Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedModule.id === 'biosphere' && (
                  <div className="mt-8 rounded-3xl border border-cyan-300/20 bg-white/5 backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-cyan-950/20">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Read More</p>
                        <h3 className="mt-2 text-2xl font-bold text-white">Explore biodiversity in a more interactive way</h3>
                        <p className="mt-2 max-w-2xl text-sm text-white/70">
                          Continue learning with the companion site focused on biodiversity, ecosystems, and the living world.
                        </p>
                      </div>
                      <a
                        href="https://biodiversityenv.netlify.app/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition-transform hover:scale-[1.02]"
                      >
                        Read more
                      </a>
                    </div>
                  </div>
                )}

                {selectedModule.id === 'environmental-health' && (
                  <div className="mt-8 rounded-3xl border border-cyan-300/20 bg-white/5 backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-cyan-950/20">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Read More</p>
                        <h3 className="mt-2 text-2xl font-bold text-white">Explore a more interactive environmental health experience</h3>
                        <p className="mt-2 max-w-2xl text-sm text-white/70">
                          Continue learning with deeper sound, motion, and theory on the companion site.
                        </p>
                      </div>
                      <a
                        href="https://envhealthimmer.netlify.app/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition-transform hover:scale-[1.02]"
                      >
                        Read more
                      </a>
                    </div>
                  </div>
                )}

                {selectedModule.id === 'pollution-silent-killer' && (
                  <div className="mt-8 rounded-3xl border border-cyan-300/20 bg-white/5 backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-cyan-950/20">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Read More</p>
                        <h3 className="mt-2 text-2xl font-bold text-white">Experience Pollution: The Silent Killer interactively</h3>
                        <p className="mt-2 max-w-2xl text-sm text-white/70">
                          Explore the cinematic simulation with timeline, toxicity insights, and restoration pathways.
                        </p>
                      </div>
                      <a
                        href="https://pollutioneffectsenv.netlify.app/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition-transform hover:scale-[1.02]"
                      >
                        Read more
                      </a>
                    </div>
                  </div>
                )}

                {selectedModule.id === 'ecolearn-environmental-education' && (
                  <div className="mt-8 rounded-3xl border border-cyan-300/20 bg-white/5 backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-cyan-950/20">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Read More</p>
                        <h3 className="mt-2 text-2xl font-bold text-white">Explore EcoLearn's Environmental Education experience</h3>
                        <p className="mt-2 max-w-2xl text-sm text-white/70">
                          Dive deeper into UNESCO foundations, EE focus areas, trends, careers, and curriculum pathways.
                        </p>
                      </div>
                      <a
                        href="https://environmentedv.netlify.app/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition-transform hover:scale-[1.02]"
                      >
                        Read more
                      </a>
                    </div>
                  </div>
                )}

                {selectedModule.id === 'earthpulse-environment-human' && (
                  <div className="mt-8 rounded-3xl border border-cyan-300/20 bg-white/5 backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-cyan-950/20">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Read More</p>
                        <h3 className="mt-2 text-2xl font-bold text-white">Explore EarthPulse: environment and humanity</h3>
                        <p className="mt-2 max-w-2xl text-sm text-white/70">
                          Continue the chapter journey on population, climate pressure, and the path toward balance.
                        </p>
                      </div>
                      <a
                        href="https://envrionmentandhuman.netlify.app/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition-transform hover:scale-[1.02]"
                      >
                        Read more
                      </a>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {selectedLesson && !isQuiz && (
              <motion.div
                key="lesson"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={handleBack} className="text-white hover:text-emerald-200 hover:bg-white/10">
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <div>
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent break-words [overflow-wrap:anywhere]">{selectedLesson.title}</h2>
                      <p className="text-white/70 text-sm mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">⏱️ {selectedLesson.duration}</span>
                        <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-400" /> {selectedLesson.points} EcoPoints</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selectedLesson.quiz && (
                      <Button 
                        onClick={handleTakeQuiz} 
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold"
                      >
                        📝 Take Quiz
                      </Button>
                    )}
                    <Button 
                      onClick={handleLessonComplete} 
                      disabled={completing || !!selectedLesson.completed}
                      className={selectedLesson.completed ? 'bg-white/10 text-white/60' : 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-semibold'}
                    >
                      {selectedLesson.completed ? '✓ Completed' : '✓ Mark Complete'}
                    </Button>
                  </div>
                </div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-8 hover:border-emerald-400/40 transition-all"
                >
                  {/* Font Size Controls */}
                  <div className="flex items-center justify-end gap-2 mb-4 pb-4 border-b border-white/10">
                    <span className="text-white/70 text-sm flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      Font Size:
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFontSize(prev => Math.max(12, prev - 2))}
                      disabled={fontSize <= 12}
                      className="h-8 w-8 p-0 bg-white/5 border-white/20 hover:bg-white/10 hover:border-emerald-400/40 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Decrease font size"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-white/90 text-sm font-medium min-w-[3rem] text-center">
                      {fontSize}px
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFontSize(prev => Math.min(24, prev + 2))}
                      disabled={fontSize >= 24}
                      className="h-8 w-8 p-0 bg-white/5 border-white/20 hover:bg-white/10 hover:border-emerald-400/40 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Increase font size"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div 
                    className="prose prose-invert max-w-none break-words [overflow-wrap:anywhere] prose-h2:font-bold prose-h2:text-emerald-300 prose-strong:text-emerald-300 prose-a:text-cyan-400 hover:prose-a:text-cyan-300" 
                    style={{ fontSize: `${fontSize}px` }}
                    dangerouslySetInnerHTML={{ __html: renderLessonHtml(selectedLesson.content) }} 
                  />
                </motion.div>

                {relatedGamesForLesson.length > 0 && (
                  <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-5 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-emerald-200">Related Games for This Lesson</h3>
                        <p className="text-sm text-white/70">Apply what you learned through interactive play.</p>
                      </div>
                      <Link href="/games">
                        <Button className="bg-emerald-300 text-slate-950 font-bold border border-emerald-100 hover:bg-emerald-200 shadow-lg shadow-emerald-900/30">
                          Browse Games
                        </Button>
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {relatedGamesForLesson.map((game) => (
                        <div key={game.id} className="rounded-xl border border-white/20 bg-white/5 p-4">
                          <p className="text-white font-semibold">{game.icon ? `${game.icon} ` : ''}{game.name}</p>
                          <p className="text-xs text-white/70 mt-1 line-clamp-2">{game.description}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-cyan-300">+{game.points} pts</span>
                            <Link href={`/games/play/${game.id}`}>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">Play</Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {isQuiz && selectedLesson && (
              <motion.div
                key="quiz"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-8">
                  <Button variant="ghost" onClick={handleBack} className="text-white hover:text-emerald-200 hover:bg-white/10">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">📝 {selectedLesson.title} Quiz</h2>
                </div>

                <motion.div className="bg-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-8">
                  <div className="space-y-8">
                    {selectedLesson.quiz?.questions.map((q, index) => {
                      const isAnswered = quizAnswers[index] !== -1;
                      const isCorrect = quizAnswers[index] === q.correct;
                      
                      return (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-emerald-400/40 transition-all"
                        >
                          <div className="flex items-start gap-3 mb-4">
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-bold flex-shrink-0 mt-0.5">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-white font-semibold mb-1">{q.question}</h3>
                              {quizSubmitted && isAnswered && (
                                <p className={`text-xs font-semibold flex items-center gap-1 ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {isCorrect ? (
                                    <>
                                      <CheckCircle className="h-3 w-3" /> Correct!
                                    </>
                                  ) : (
                                    <>
                                      ✗ Incorrect
                                    </>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2 ml-11">
                            {q.options.map((option, optIndex) => {
                              const isSelected = quizAnswers[index] === optIndex;
                              const showCorrect = quizSubmitted && optIndex === q.correct;
                              const showIncorrect = quizSubmitted && isSelected && optIndex !== q.correct;

                              return (
                                <label
                                  key={optIndex}
                                  className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                    showCorrect
                                      ? 'bg-emerald-500/20 border-emerald-400/50'
                                      : showIncorrect
                                      ? 'bg-red-500/20 border-red-400/50'
                                      : isSelected
                                      ? 'bg-cyan-500/20 border-cyan-400/50'
                                      : 'bg-white/5 border-white/10 hover:border-white/20'
                                  } ${quizSubmitted ? 'cursor-default' : ''}`}
                                >
                                  <input
                                    type="radio"
                                    name={`question-${index}`}
                                    value={optIndex}
                                    checked={isSelected}
                                    onChange={() => {
                                      if (!quizSubmitted) {
                                        const newAnswers = [...quizAnswers];
                                        newAnswers[index] = optIndex;
                                        setQuizAnswers(newAnswers);
                                      }
                                    }}
                                    disabled={quizSubmitted}
                                    className="w-4 h-4"
                                  />
                                  <span className={`text-sm font-medium ${
                                    showCorrect ? 'text-emerald-200' : showIncorrect ? 'text-red-200' : 'text-white'
                                  }`}>
                                    {option}
                                  </span>
                                  {showCorrect && <CheckCircle className="h-4 w-4 text-emerald-400 ml-auto" />}
                                  {showIncorrect && <span className="text-red-400 ml-auto text-lg">✗</span>}
                                </label>
                              );
                            })}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {!quizSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 pt-8 border-t border-white/10"
                    >
                      <Button 
                        onClick={handleQuizSubmit}
                        className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-bold py-3"
                      >
                        🚀 Submit Quiz
                      </Button>
                    </motion.div>
                  )}

                  {quizSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 pt-8 border-t border-white/10 text-center"
                    >
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/50 px-4 py-2 text-emerald-300 font-semibold">
                        <Trophy className="h-4 w-4" />
                        Quiz Completed!
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Achievement Toast Notification */}
      <AnimatePresence>
        {newAchievement && (
          <AchievementToast 
            achievement={newAchievement} 
            onClose={() => setNewAchievement(null)} 
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        .animate-in {
          animation: fadeInUp 0.6s ease-out forwards;
        }

        .animate-slide-in {
          animation: slideInLeft 0.5s ease-out forwards;
        }

        .group:hover .prose {
          color: rgba(255, 255, 255, 0.9);
        }
      `}</style>
    </div>
  );
}
