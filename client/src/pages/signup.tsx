import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useState } from "react";
import { signInWithGoogle } from "@/lib/supabase";

export default function SignUpPage() {
  const { setRole, clear } = useAuth();
  const [, navigate] = useLocation();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = (r: "student" | "teacher" | "admin") => {
    if (r === "admin") {
      // Clear any existing role before navigating to admin signin
      clear();
      navigate("/signin?role=admin");
      return;
    }
    // For student/teacher signup, set the role temporarily
    // setRole(r);
    if (r === "student") navigate("/student/signup");
    else navigate("/teacher/signup");
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e?.message || "Google sign-up failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1617634667039-8e4cb277ab46?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwxfHxuYXR1cmUlMjBsYW5kc2NhcGV8ZW58MHx8fHwxNzYwNTA4MjczfDA&ixlib=rb-4.1.0&q=85')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-green-900/50 to-emerald-900/60"></div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Floating decorative elements */}
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-blue-400 rounded-full blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-green-400 rounded-full blur-3xl opacity-40 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 -right-20 w-20 h-20 bg-yellow-300 rounded-full blur-2xl opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>

        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-10 border-4 border-white/20 transform hover:scale-[1.01] transition-all duration-300">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-block bg-gradient-to-r from-blue-400 via-green-400 to-emerald-500 p-4 rounded-full mb-4 shadow-lg animate-bounce" style={{animationDuration: '3s'}}>
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-3">Join EcoVerse!</h1>
            <p className="text-gray-700 text-xl font-medium">Choose your role to create an account</p>
          </div>

          {/* Role Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Student Card */}
            <button
              onClick={() => choose("student")}
              className="group relative p-6 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 border-3 border-green-300 hover:border-green-400 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300"
              data-testid="role-student-button"
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="p-4 bg-green-500 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800">I'm a Student</h3>
                <p className="text-sm text-gray-600 text-center">Join our learning community</p>
              </div>
            </button>

            {/* Teacher Card */}
            <button
              onClick={() => choose("teacher")}
              className="group relative p-6 rounded-2xl bg-gradient-to-br from-blue-100 to-sky-100 hover:from-blue-200 hover:to-sky-200 border-3 border-blue-300 hover:border-blue-400 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300"
              data-testid="role-teacher-button"
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="p-4 bg-blue-500 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800">I'm a Teacher</h3>
                <p className="text-sm text-gray-600 text-center">Guide the next generation</p>
              </div>
            </button>

            {/* Admin Card */}
            <button
              onClick={() => choose("admin")}
              className="group relative p-6 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 hover:from-orange-200 hover:to-amber-200 border-3 border-orange-300 hover:border-orange-400 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300"
              data-testid="role-admin-button"
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="p-4 bg-orange-500 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Admin</h3>
                <p className="text-sm text-gray-600 text-center">Manage the platform</p>
              </div>
            </button>
          </div>

          {/* Google Sign Up Section */}
          <div className="mt-8 pt-6 border-t-2 border-gray-200">
            <div className="relative flex items-center gap-4 mb-6">
              <div className="flex-1 border-t-2 border-gray-300"></div>
              <span className="text-gray-500 text-sm font-semibold">OR</span>
              <div className="flex-1 border-t-2 border-gray-300"></div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border-2 border-red-400 rounded-xl">
                <p className="text-red-700 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Google Sign Up Button */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={googleLoading}
              className="w-full py-3 px-4 border-2 border-gray-300 hover:border-blue-400 bg-white hover:bg-blue-50 text-gray-700 font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mb-6"
            >
              {googleLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Sign up with Google</span>
                </>
              )}
            </button>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-gray-600 text-base">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/signin')}
                  className="text-blue-600 hover:text-blue-700 font-bold underline transition-colors"
                  data-testid="goto-signin-link"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
