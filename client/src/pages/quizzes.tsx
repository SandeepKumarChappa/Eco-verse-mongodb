import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default function QuizzesPage() {
  const { username, role } = useAuth();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [resultDetails, setResultDetails] = useState<Array<{ index:number; correctIndex:number; selected:number; isCorrect:boolean }> | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const list = await fetch('/api/student/quizzes', { headers: { 'X-Username': username || '' } }).then(r => r.json());
        if (!mounted) return;
        if (Array.isArray(list) && list.length > 0) {
          setQuizzes(list);
        } else {
          // Dev convenience: attempt to seed demo quizzes then refetch
          try {
            await fetch('/api/dev/seed-quizzes', { method: 'POST' });
            const list2 = await fetch('/api/student/quizzes', { headers: { 'X-Username': username || '' } }).then(r => r.json());
            if (!mounted) return;
            setQuizzes(Array.isArray(list2) ? list2 : []);
          } catch {
            setQuizzes([]);
          }
        }
      } catch {}
    };
    if (role === 'student') load();
    return () => { mounted = false; };
  }, [username, role]);

  const globalQuizzes = useMemo(() => quizzes.filter(q => q.visibility === 'global'), [quizzes]);
  const schoolQuizzes = useMemo(() => quizzes.filter(q => q.visibility !== 'global'), [quizzes]);

  const start = async (q: any) => {
    // Check if already attempted
    const attempt = await fetch(`/api/student/quizzes/${q.id}/attempt`, { headers: { 'X-Username': username || '' } }).then(r=>r.json());
    if (attempt && attempt.scorePercent != null) {
      // open review-only view
      setActive(q);
      const ans: number[] = Array.isArray(attempt.answers) ? attempt.answers : new Array((q.questions?.length||0)).fill(-1);
      setAnswers(ans);
      setScore(attempt.scorePercent);
      setLocked(true);
      try {
        const r = await fetch(`/api/quizzes/${q.id}/score`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Username': username || '' }, body: JSON.stringify({ answers: ans }) });
        const data = await r.json();
        if (Array.isArray(data?.details)) setResultDetails(data.details);
      } catch {}
      setReviewOpen(true);
      setIdx(0);
      return;
    }
    setActive(q);
    setIdx(0);
    setAnswers(new Array((q.questions?.length||0)).fill(-1));
    setScore(null);
  setLocked(false);
  setResultDetails(null);
  setReviewOpen(false);
  };
  const select = (choice: number) => {
    if (locked) return;
    setAnswers(a => a.map((v,i)=> i===idx ? choice : v));
  };
  const next = () => setIdx(i => Math.min(i + 1, (active?.questions?.length || 1) - 1));
  const prev = () => setIdx(i => Math.max(0, i - 1));
  const submit = async () => {
    if (!active) return;
    // Ask server to score securely
    let pct = 0;
    try {
      const r = await fetch(`/api/quizzes/${active.id}/score`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Username': username || '' }, body: JSON.stringify({ answers }) });
      const data = await r.json();
      pct = Number(data?.percent) || 0;
      setScore(pct);
      if (Array.isArray(data?.details)) setResultDetails(data.details);
      setLocked(true);
  setReviewOpen(false);
    } catch {
      const total = active.questions.length || 0;
      const answered = answers.filter(a => a >= 0).length;
      pct = Math.round((answered / Math.max(1,total)) * 100);
      setScore(pct);
      setLocked(true);
  setReviewOpen(false);
    }
    try {
  await fetch('/api/student/quiz-attempts', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Username': username || '' }, body: JSON.stringify({ quizId: active.id, scorePercent: pct, answers }) });
    } catch {}
  };

  return (
    <div 
      className="min-h-screen text-white p-6 relative overflow-hidden"
      style={{
        backgroundImage: 'url(/api/image/pngtree-abstract-cloudy-background-beautiful-natural-streaks-of-sky-and-clouds-red-image_15684333.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/50 to-black/60"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      
      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-2xl p-8 mb-8 hover:bg-white/10 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white/95 group-hover:text-white transition-colors">🎯 Quizzes</h1>
              <p className="mt-2 text-white/70 group-hover:text-white/80 transition-colors">Test your environmental knowledge</p>
            </div>
            {role !== 'student' && <div className="text-sm text-white/70 bg-white/10 px-4 py-2 rounded-lg">Sign in as a student to attempt quizzes.</div>}
          </div>
        </div>

      {!active ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="🌍 Global Quizzes">
            <QuizGrid list={globalQuizzes} onStart={start} />
          </Section>
          <Section title="🏫 Your School Quizzes">
            <QuizGrid list={schoolQuizzes} onStart={start} />
          </Section>
        </div>
      ) : (
        <Section title={active.title}>
            <QuizRunner
            quiz={active}
            idx={idx}
            answers={answers}
            onSelect={select}
            onNext={next}
            onPrev={prev}
            onExit={()=> setActive(null)}
            onSubmit={submit}
            score={score}
            locked={locked}
            results={resultDetails}
              reviewOpen={reviewOpen}
              onToggleReview={()=> setReviewOpen(v=>!v)}
          />
        </Section>
      )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold mb-4 text-white/95 flex items-center gap-2">{title}</h2>
      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/20 shadow-2xl hover:shadow-2xl hover:bg-white/10 transition-all duration-300">{children}</div>
    </section>
  );
}

function QuizGrid({ list, onStart }: { list: any[]; onStart: (q:any)=>void }) {
  if (!list || list.length === 0) return <p className="text-sm text-white/60 text-center py-8">No quizzes yet.</p>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {list.map((q, idx) => (
        <div 
          key={q.id} 
          className="group relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl hover:from-white/20 hover:to-white/10 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 cursor-pointer"
          style={{
            animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full blur-xl"></div>
          
          <div className="p-6 relative z-10">
            <div className="flex items-start justify-between mb-2">
              <div className="text-lg font-bold text-white/95 group-hover:text-white transition-colors">{q.title}</div>
              {q._attempt && <span className="text-xs bg-emerald-500/30 text-emerald-200 px-3 py-1 rounded-full border border-emerald-400/50">Attempted</span>}
            </div>
            {q.description && <div className="text-sm text-white/70 line-clamp-2 mb-3 group-hover:text-white/80 transition-colors">{q.description}</div>}
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-4 text-xs text-white/60">
                <span className="flex items-center gap-1">⭐ {q.points} pts</span>
                <span className="flex items-center gap-1">📝 {(q.questions?.length||0)} questions</span>
              </div>
            </div>
            
            {q._attempt && (
              <div className="mb-3 p-2 bg-emerald-500/10 border border-emerald-400/30 rounded-lg">
                <div className="text-xs text-emerald-200">Score: <span className="font-bold">{q._attempt.scorePercent}%</span></div>
              </div>
            )}
            
            <div className="mt-4">
              {q._attempt ? (
                <Button 
                  variant="secondary" 
                  onClick={()=>onStart(q)}
                  className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30 rounded-lg transition-all duration-300 group-hover:bg-white/40"
                >
                  📖 Review
                </Button>
              ) : (
                <Button 
                  className="w-full bg-blue-500/80 hover:bg-blue-600/80 text-white border border-blue-400/50 transition-all duration-300 group-hover:bg-blue-600" 
                  onClick={()=>onStart(q)}
                >
                  🚀 Start Quiz
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuizRunner({ quiz, idx, answers, onSelect, onNext, onPrev, onExit, onSubmit, score, locked, results, reviewOpen, onToggleReview }: {
  quiz: any; idx: number; answers: number[]; onSelect: (choice:number)=>void; onNext: ()=>void; onPrev: ()=>void; onExit: ()=>void; onSubmit: ()=>void; score: number | null; locked: boolean; results: Array<{ index:number; correctIndex:number; selected:number; isCorrect:boolean }> | null; reviewOpen: boolean; onToggleReview: ()=>void;
}) {
  const total = Array.isArray(quiz?.questions) ? quiz.questions.length : 0;
  const safeIdx = Math.max(0, Math.min(idx, Math.max(0, total - 1)));
  const q = total > 0 ? quiz.questions[safeIdx] : undefined;
  const progressPercent = (safeIdx + 1) / total * 100;
  
  return (
    <div className="relative">
      {/* Animated background effects */}
      <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-3xl animate-pulse"></div>
      <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-white/70 font-medium">Question {safeIdx+1} of {total}</div>
          <div className="mt-2 w-48 h-2 bg-white/10 rounded-full overflow-hidden border border-white/20">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
        <button 
          className="text-sm text-white/60 hover:text-white/90 transition-colors px-4 py-2 rounded-lg hover:bg-white/10"
          onClick={onExit}
        >
          ✕ Exit
        </button>
      </div>
      
      <div className="p-6 rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl shadow-2xl transition-all duration-300">
        {!q ? (
          <div className="text-sm text-red-300 bg-red-500/10 p-4 rounded-lg border border-red-400/30">No questions available.</div>
        ) : (
        <>
        <div className="text-2xl font-bold mb-6 animate-fade-in text-white/95">{q.text}</div>
        
        <div className="grid gap-3 mb-6">
          {q.options.map((opt: string, i: number) => {
            const selected = answers[safeIdx] === i;
            const rd = results?.find(r => r.index === safeIdx);
            const isAnswer = !!rd && i === rd.correctIndex;
            const isWrongSelected = !!rd && rd.selected === i && !rd.isCorrect;
            const normalSelected = selected && !locked;
            
            return (
              <button 
                key={i} 
                disabled={locked} 
                onClick={()=>onSelect(i)} 
                className={`text-left rounded-xl px-6 py-4 border-2 transition-all duration-300 group relative overflow-hidden ${
                  normalSelected 
                    ? 'bg-emerald-600/40 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-105' 
                    : 'border-white/30 hover:border-white/50 hover:bg-white/15'
                } ${
                  (locked && reviewOpen && isAnswer) 
                    ? 'bg-emerald-600/30 border-emerald-400 shadow-lg shadow-emerald-500/20' 
                    : ''
                } ${
                  (locked && reviewOpen && isWrongSelected) 
                    ? 'bg-red-600/20 border-red-400 shadow-lg shadow-red-500/20' 
                    : ''
                } text-white/95 hover:text-white disabled:cursor-default`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="flex items-center gap-4 relative z-10">
                  <span className={`h-8 w-8 rounded-full grid place-items-center text-sm font-bold flex-shrink-0 transition-all duration-300 ${
                    normalSelected 
                      ? 'bg-emerald-400 text-black scale-110' 
                      : (locked && reviewOpen && isAnswer) 
                        ? 'bg-emerald-400 text-black' 
                        : (locked && reviewOpen && isWrongSelected) 
                          ? 'bg-red-400 text-black' 
                          : 'bg-white/20 text-white group-hover:bg-white/30'
                  }`}>
                    {i+1}
                  </span>
                  <span className="text-lg">{opt}</span>
                </div>
              </button>
            );
          })}
        </div>
        
        <div className="flex items-center justify-between gap-4 mb-6">
          <Button 
            variant="secondary" 
            onClick={onPrev} 
            disabled={safeIdx===0}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            ← Prev
          </Button>
          
          {locked ? (
            <Button 
              className="bg-blue-500/80 hover:bg-blue-600/80 text-white border border-blue-400/50 rounded-lg transition-all" 
              onClick={onNext} 
              disabled={safeIdx >= total - 1}
            >
              Next →
            </Button>
          ) : (
            safeIdx < total - 1 ? (
              <Button 
                className="bg-blue-500/80 hover:bg-blue-600/80 text-white border border-blue-400/50 rounded-lg transition-all" 
                onClick={onNext}
              >
                Next →
              </Button>
            ) : (
              <Button 
                className="bg-emerald-500/80 hover:bg-emerald-600/80 text-white border border-emerald-400/50 rounded-lg transition-all shadow-lg shadow-emerald-500/20" 
                onClick={onSubmit}
              >
                🎯 Submit Quiz
              </Button>
            )
          )}
        </div>
        
        {score != null && (
          <div className="mt-6 p-6 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-white/20 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-4">
              <div className="text-sm text-white/60 mb-2">Your Score</div>
              <div className="text-5xl font-bold text-white/95 mb-2">
                {score}<span className="text-3xl">%</span>
              </div>
              <div className="h-1 w-32 mx-auto bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                  style={{ width: `${score}%` }}
                ></div>
              </div>
            </div>
            
            {locked && results && (
              <Button 
                variant="secondary" 
                onClick={onToggleReview}
                className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30 rounded-lg transition-all"
              >
                {reviewOpen ? '👁️ Hide Review' : '👁️ Review Answers'}
              </Button>
            )}
          </div>
        )}
        
        {locked && reviewOpen && results && (
          <div className="mt-6 p-6 bg-white/5 border border-white/20 rounded-2xl">
            <h3 className="text-lg font-bold text-white/95 mb-4">Answer Review</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.map((r) => {
                const inRange = r.index >= 0 && r.index < total;
                const options = inRange ? quiz.questions[r.index].options : [];
                const answerText = (options && r.correctIndex >= 0 && r.correctIndex < options.length) ? options[r.correctIndex] : 'N/A';
                return (
                  <div 
                    key={r.index}
                    className={`p-3 rounded-lg border ${
                      r.isCorrect 
                        ? 'bg-emerald-500/10 border-emerald-400/50 text-emerald-200' 
                        : 'bg-red-500/10 border-red-400/50 text-red-200'
                    }`}
                  >
                    <span className="font-semibold">Q{r.index + 1}:</span> {r.isCorrect ? '✓ Correct' : `✗ Wrong (Answer: ${answerText})`}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </>
        )}
      </div>
      
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
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
