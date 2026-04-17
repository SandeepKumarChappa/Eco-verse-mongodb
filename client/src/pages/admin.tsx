import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LogOut, Settings, Users, CheckCircle, AlertCircle, Zap, Plus, Trash2, 
  Edit3, Eye, Shield, BarChart3, Gamepad2, BookOpen, Video, Globe, 
  Megaphone, Clipboard, Youtube, Upload
} from "lucide-react";

export default function AdminPortal() {
  const { role, clear } = useAuth();
  const [pending, setPending] = useState<{ students: any[]; teachers: any[] }>({ students: [], teachers: [] });
  const [users, setUsers] = useState<Array<{ username: string; role: string }>>([]);
  const [resetting, setResetting] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [tab, setTab] = useState(0);
  
  const tabNames = [
    { name: 'Approval List', icon: CheckCircle },
    { name: 'Admin Accounts', icon: Shield },
    { name: 'All Accounts', icon: Users },
    { name: 'Challenges & Games', icon: Gamepad2 },
    { name: 'Quizzes', icon: BookOpen },
    { name: 'Videos', icon: Video },
    { name: 'Schools', icon: Globe },
    { name: 'Global Quizzes', icon: BarChart3 },
    { name: 'Announcements', icon: Megaphone },
    { name: 'Assignments', icon: Clipboard },
  ];

  const load = async () => {
    const data = await fetch('/api/admin/pending').then(r => r.json());
    setPending(data);
  };

  const loadUsers = async () => {
    try {
      const data = await fetch('/api/admin/users').then(r => r.json());
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    if (role === 'admin') {
      load();
      loadUsers();
    }
  }, [role]);

  const approve = async (type: 'student' | 'teacher', id: string) => {
    await fetch(`/api/admin/approve/${type}/${id}`, { method: 'POST' });
    await load();
    await loadUsers();
  };

  const approveAll = async () => {
    if (!confirm('Approve all pending applications?')) return;
    await fetch('/api/admin/approve-all', { method: 'POST' });
    await load();
    await loadUsers();
  };

  const resetPassword = async (username: string, password?: string) => {
    const pwd = password ?? prompt(`Set new password for @${username}`, '') ?? '';
    const finalPwd = pwd.trim();
    if (!finalPwd) return;
    setResetting(username);
    await fetch('/api/admin/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: finalPwd }) });
    setResetting(null);
  };

  const unapprove = async (username: string) => {
    if (!confirm(`Move @${username} back to pending?`)) return;
    try {
      const res = await fetch('/api/admin/unapprove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        alert(err?.error || 'Failed to move to pending');
        return;
      }
      const json = await res.json().catch(() => ({} as any));
      if (!json?.ok) {
        alert('Failed to move to pending');
        return;
      }
      await load();
      await loadUsers();
      alert(`@${username} moved to pending.`);
    } catch (e) {
      alert('Network error while moving to pending');
    }
  };

  const openDetails = async (username: string) => {
    setLoadingDetails(true);
    try {
      const d = await fetch(`/api/admin/user/${encodeURIComponent(username)}`).then(r => r.json());
      setSelectedUser(d);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-white flex items-center justify-center p-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
          <p className="text-white/70 mb-6">You don't have permission to access the admin portal.</p>
          <Button onClick={clear} className="bg-white/20 hover:bg-white/30 text-white border border-white/30">
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-lg border border-emerald-400/30">
                  <Shield className="w-6 h-6 text-emerald-300" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Admin Portal</h1>
              </div>
              <p className="text-white/60 ml-15">Manage users, content, and system settings</p>
            </div>
            <Button 
              onClick={clear}
              className="bg-gradient-to-r from-red-500/20 to-pink-500/20 hover:from-red-500/30 hover:to-pink-500/30 border border-red-400/30 text-red-300 hover:text-red-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {tabNames.map((tab_item, i) => {
              const Icon = tab_item.icon;
              return (
                <button
                  key={tab_item.name}
                  onClick={() => setTab(i)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
                    tab === i
                      ? "bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 border border-emerald-400/50 text-white"
                      : "bg-white/10 hover:bg-white/20 border border-white/10 text-white/70 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab_item.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 md:p-8">
          {/* Approval List Tab */}
          {tab === 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Application Approvals</h2>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                  {pending.students.length + pending.teachers.length} Pending
                </Badge>
              </div>
              
              <Button 
                onClick={approveAll}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve All Pending
              </Button>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Students Section */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Pending Students
                    <Badge className="bg-blue-500/20 text-blue-300">{pending.students.length}</Badge>
                  </h3>
                  <div className="space-y-2">
                    {pending.students.length === 0 ? (
                      <p className="text-white/50 text-center py-3">No pending students</p>
                    ) : (
                      pending.students.map((s) => (
                        <div key={s.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-200">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-white">{s.name}</p>
                              <p className="text-sm text-white/60">@{s.username}</p>
                              <p className="text-xs text-white/40 mt-1">{s.email}</p>
                            </div>
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">Student</Badge>
                          </div>
                          <div className="text-xs text-white/40 mb-3 space-y-1">
                            <p>ID: {s.studentId} | Roll: {s.rollNumber || '-'} | Class: {s.className || '-'}</p>
                            <p>School: {s.schoolId}</p>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => approve('student', s.id)}
                            className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Teachers Section */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-400" />
                    Pending Teachers
                    <Badge className="bg-orange-500/20 text-orange-300">{pending.teachers.length}</Badge>
                  </h3>
                  <div className="space-y-2">
                    {pending.teachers.length === 0 ? (
                      <p className="text-white/50 text-center py-3">No pending teachers</p>
                    ) : (
                      pending.teachers.map((t) => (
                        <div key={t.id} className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-all duration-200">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-white text-sm">{t.name}</p>
                              <p className="text-xs text-white/60">@{t.username}</p>
                              <p className="text-xs text-white/40 mt-0.5">{t.email}</p>
                            </div>
                            <Badge className="bg-orange-500/20 text-orange-300 border-orange-400/30">Teacher</Badge>
                          </div>
                          <div className="text-xs text-white/40 mb-2 space-y-0.5">
                            <p>Teacher ID: {t.teacherId} | Subject: {t.subject || '-'}</p>
                            <p>School: {t.schoolId}</p>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => approve('teacher', t.id)}
                            className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Manage All Accounts Tab */}
          {tab === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">All Accounts</h2>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                  {users.length} Total
                </Badge>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/50">No users found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {users.map(u => (
                    <div key={u.username} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-200">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                          <p className="font-semibold text-white">@{u.username}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge className={`${
                              u.role === 'admin' ? 'bg-red-500/20 text-red-300 border-red-400/30' :
                              u.role === 'teacher' ? 'bg-orange-500/20 text-orange-300 border-orange-400/30' :
                              'bg-blue-500/20 text-blue-300 border-blue-400/30'
                            }`}>
                              {u.role}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <Button 
                            size="sm"
                            onClick={() => openDetails(u.username)}
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => navigator.clipboard?.writeText(u.username)}
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                          >
                            Copy
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => resetPassword(u.username)}
                            disabled={resetting === u.username}
                            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30"
                          >
                            {resetting === u.username ? 'Saving…' : 'Reset Password'}
                          </Button>
                          {u.role !== 'admin' && (
                            <Button 
                              size="sm"
                              onClick={() => unapprove(u.username)}
                              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-400/30"
                            >
                              To Pending
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User Details Modal */}
          {selectedUser && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedUser(null)}>
              <div className="bg-gradient-to-br from-emerald-900/40 to-cyan-900/40 border border-white/20 rounded-xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">@{selectedUser.username || selectedUser.name || 'User'}</h3>
                  <Button variant="ghost" onClick={() => setSelectedUser(null)} className="text-white/60 hover:text-white">✕</Button>
                </div>
                
                {loadingDetails ? (
                  <p className="text-white/50">Loading…</p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {selectedUser.photoDataUrl && (
                      <img src={selectedUser.photoDataUrl} alt="Profile" className="h-24 w-24 object-cover rounded-full border-2 border-white/20 mb-4" />
                    )}
                    <p><span className="text-white/60">Status:</span> <Badge className="ml-2 bg-emerald-500/20 text-emerald-300">{selectedUser.status}</Badge></p>
                    {selectedUser.name && <p><span className="text-white/60">Name:</span> <span className="text-white ml-2">{selectedUser.name}</span></p>}
                    {selectedUser.email && <p><span className="text-white/60">Email:</span> <span className="text-white ml-2">{selectedUser.email}</span></p>}
                    {selectedUser.role && <p><span className="text-white/60">Role:</span> <span className="text-white ml-2">{selectedUser.role}</span></p>}
                    {selectedUser.studentId && <p><span className="text-white/60">Student ID:</span> <span className="text-white ml-2">{selectedUser.studentId}</span></p>}
                    {selectedUser.teacherId && <p><span className="text-white/60">Teacher ID:</span> <span className="text-white ml-2">{selectedUser.teacherId}</span></p>}
                    {selectedUser.schoolId && <p><span className="text-white/60">School:</span> <span className="text-white ml-2">{selectedUser.schoolId}</span></p>}
                    {selectedUser.subject && <p><span className="text-white/60">Subject:</span> <span className="text-white ml-2">{selectedUser.subject}</span></p>}
                    {selectedUser.rollNumber && <p><span className="text-white/60">Roll No:</span> <span className="text-white ml-2">{selectedUser.rollNumber}</span></p>}
                    {selectedUser.className && <p><span className="text-white/60">Class:</span> <span className="text-white ml-2">{selectedUser.className}</span></p>}
                    {selectedUser.section && <p><span className="text-white/60">Section:</span> <span className="text-white ml-2">{selectedUser.section}</span></p>}
                  </div>
                )}
                
                <Button onClick={() => setSelectedUser(null)} className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white border border-white/20">
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Manager Tabs */}
          {tab === 1 && <AdminAccounts />}
          {tab === 3 && <AdminGamesManager />}
          {tab === 4 && <AdminQuizManager />}
          {tab === 5 && <AdminVideosManager />}
          {tab === 6 && <SchoolsManager />}
          {tab === 7 && <GlobalQuizzes />}
          {tab === 8 && <GlobalAnnouncements />}
          {tab === 9 && <GlobalAssignments />}
        </div>
      </div>
    </div>
  );
}

function AdminGamesManager() {
  const { username } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ id?: string; name: string; category: string; description?: string; difficulty?: 'Easy'|'Medium'|'Hard'|''; points: number; icon?: string }>({ name: '', category: '', description: '', difficulty: 'Easy', points: 5, icon: '' });

  const load = async () => {
    const data = await fetch('/api/admin/games', { headers: { 'X-Username': username || '' } }).then(r => r.json());
    setList(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setEditingId(null); setForm({ name: '', category: '', description: '', difficulty: 'Easy', points: 5, icon: '' }); };
  const startEdit = (g: any) => { setEditingId(g.id); setForm({ id: g.id, name: g.name||'', category: g.category||'', description: g.description||'', difficulty: g.difficulty||'Easy', points: g.points||5, icon: g.icon||'' }); };
  const create = async () => {
    if (!form.name.trim() || !form.category.trim()) return alert('Name and category required');
    const res = await fetch('/api/admin/games', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Username': username || '' }, body: JSON.stringify(form) });
    if (!res.ok) { const e = await res.json().catch(()=>({} as any)); return alert(e?.error || 'Failed to create'); }
    reset(); await load();
  };
  const save = async () => {
    if (!editingId) return;
    const { id, ...updates } = form as any;
    const res = await fetch(`/api/admin/games/${encodeURIComponent(editingId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Username': username || '' }, body: JSON.stringify(updates) });
    if (!res.ok) { const e = await res.json().catch(()=>({} as any)); return alert(e?.error || 'Failed to update'); }
    reset(); await load();
  };
  const del = async (id: string) => {
    if (!confirm('Delete this game?')) return;
    const res = await fetch(`/api/admin/games/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'X-Username': username || '' } });
    if (!res.ok) { const e = await res.json().catch(()=>({} as any)); return alert(e?.error || 'Failed to delete'); }
    if (editingId === id) reset();
    await load();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Challenges & Games</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">{editingId ? 'Edit Game' : 'Create Game'}</h3>
          <div className="space-y-2 text-sm">
            <input className="w-full rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Name" value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} />
            <input className="w-full rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Category (e.g., recycling, habits)" value={form.category} onChange={e=>setForm({ ...form, category: e.target.value })} />
            <textarea className="w-full rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Description (optional)" value={form.description} onChange={e=>setForm({ ...form, description: e.target.value })} />
            <div className="flex items-center gap-2">
              <span className="text-earth-muted">Points (1–50)</span>
              <input className="w-24 rounded-lg px-3 py-2 text-[var(--foreground)]" type="number" min={1} max={50} value={form.points} onChange={e=>setForm({ ...form, points: Number(e.target.value)||0 })} />
              <span className="text-earth-muted">Difficulty</span>
              <select className="rounded-lg px-3 py-2 text-[var(--foreground)]" value={form.difficulty||''} onChange={e=>setForm({ ...form, difficulty: (e.target.value as any) })}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <input className="w-full rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Icon (emoji or name)" value={form.icon} onChange={e=>setForm({ ...form, icon: e.target.value })} />
            <div className="flex gap-2">
              {editingId ? (
                <>
                  <Button className="bg-earth-orange hover:bg-earth-orange-hover" onClick={save}>Save Changes</Button>
                  <Button variant="secondary" onClick={reset}>Cancel</Button>
                </>
              ) : (
                <Button className="bg-earth-orange hover:bg-earth-orange-hover" onClick={create}>Create Game</Button>
              )}
            </div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">All Games</h3>
          <div className="space-y-2">
            {list.length === 0 && <p className="text-sm text-earth-muted">No games yet.</p>}
            {list.map(g => (
              <div key={g.id} className="p-3 rounded-lg bg-[var(--earth-card)] border border-[var(--earth-border)]">
                <div className="font-medium flex items-center justify-between">
                  <span>{g.icon ? `${g.icon} ` : ''}{g.name} <span className="text-xs text-earth-muted">• {g.points} pts{g.difficulty ? ` • ${g.difficulty}` : ''} • {g.category}</span></span>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={()=>startEdit(g)}>Edit</Button>
                    <Button className="bg-red-600 hover:bg-red-700" onClick={()=>del(g.id)}>Delete</Button>
                  </div>
                </div>
                {g.description && <div className="text-sm text-earth-muted whitespace-pre-wrap">{g.description}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SchoolsManager() {
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const load = async () => {
    const data = await fetch('/api/schools').then(r => r.json());
    setSchools(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await fetch('/api/admin/schools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    setName("");
    setLoading(false);
    await load();
  };
  const remove = async (id: string) => {
    if (!confirm('Delete this school?')) return;
    await fetch(`/api/admin/schools/${id}`, { method: 'DELETE' });
    await load();
  };
  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Schools & Colleges</h2>
      <div className="flex gap-2 mb-4">
        <input className="rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Add a school/college name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button className="bg-earth-orange hover:bg-earth-orange-hover" onClick={add} disabled={loading || !name.trim()}>
          {loading ? 'Adding…' : 'Add'}
        </Button>
      </div>
      <div className="space-y-2">
        {schools.length === 0 && <p className="text-earth-muted">No schools yet.</p>}
        {schools.map(s => (
          <div key={s.id} className="p-3 rounded-lg bg-[var(--earth-card)] border border-[var(--earth-border)] flex items-center justify-between">
            <span>{s.name}</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(s.name)}>Copy</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => remove(s.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminAccounts() {
  const { username } = useAuth();
  const [admins, setAdmins] = useState<Array<{ username: string; name?: string; email?: string }>>([]);
  const [form, setForm] = useState({ username: '', password: '', name: '', email: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ username: string; name?: string; email?: string }>({ username: '' });

  const load = async () => {
    const data = await fetch('/api/admin/admins').then(r => r.json());
    setAdmins(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.username.trim() || !form.password.trim()) return alert('Username and password required');
    const res = await fetch('/api/admin/admins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) {
      const e = await res.json().catch(() => ({} as any));
      return alert(e?.error || 'Failed to create admin');
    }
    setForm({ username: '', password: '', name: '', email: '' });
    await load();
  };

  const startEdit = (a: { username: string; name?: string; email?: string }) => {
    setEditing(a.username);
    setEditData({ username: a.username, name: a.name, email: a.email });
  };
  const saveEdit = async () => {
    if (!editing) return;
    const res = await fetch(`/api/admin/admins/${encodeURIComponent(editing)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Username': username || '' }, body: JSON.stringify({ username: editData.username, name: editData.name, email: editData.email }) });
    if (!res.ok) {
      const e = await res.json().catch(() => ({} as any));
      return alert(e?.error || 'Failed to update admin');
    }
    setEditing(null);
    await load();
  };
  const del = async (username: string) => {
    if (!confirm(`Delete admin @${username}?`)) return;
    const res = await fetch(`/api/admin/admins/${encodeURIComponent(username)}`, { method: 'DELETE' });
    if (!res.ok) {
      const e = await res.json().catch(() => ({} as any));
      return alert(e?.error || 'Failed to delete admin');
    }
    await load();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Manage Admin Accounts</h2>
      <div className="p-3 rounded-lg bg-[var(--earth-card)] border border-[var(--earth-border)] mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input className="rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input className="rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Name (optional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="mt-3">
          <Button className="bg-earth-orange hover:bg-earth-orange-hover" onClick={create}>Create Admin</Button>
        </div>
  <p className="text-xs text-earth-muted mt-2">Note: Main admin @admin123 can only edit its own profile (name/email) and cannot be deleted. Username cannot be changed. Password can be changed from Manage All Accounts.</p>
      </div>

      <div className="space-y-2">
        {admins.map(a => (
          <div key={a.username} className="p-3 rounded-lg bg-[var(--earth-card)] border border-[var(--earth-border)]">
            {editing === a.username ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                <div>
                  <div className="text-xs text-earth-muted mb-1">Username</div>
                  <input className="rounded-lg px-3 py-2 text-[var(--foreground)] w-full" value={editData.username} onChange={(e) => setEditData({ ...editData, username: e.target.value })} disabled={a.username === 'admin123'} />
                </div>
                <div>
                  <div className="text-xs text-earth-muted mb-1">Name</div>
                  <input className="rounded-lg px-3 py-2 text-[var(--foreground)] w-full" value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                </div>
                <div>
                  <div className="text-xs text-earth-muted mb-1">Email</div>
                  <input className="rounded-lg px-3 py-2 text-[var(--foreground)] w-full" value={editData.email || ''} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
                  <Button className="bg-earth-orange hover:bg-earth-orange-hover" onClick={saveEdit}>Save</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">@{a.username}{a.username === 'admin123' && ' (main)'}</div>
                  <div className="text-xs text-earth-muted">{a.name || '-'}{a.email ? ` • ${a.email}` : ''}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => startEdit(a)} disabled={a.username === 'admin123' && username !== 'admin123'}>Edit</Button>
                  <Button className="bg-red-600 hover:bg-red-700" onClick={() => del(a.username)} disabled={a.username === 'admin123'}>Delete</Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function GlobalQuizzes() {
  const { username } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(3);
  const [questions, setQuestions] = useState<Array<{ text: string; options: string[]; answerIndex: number }>>([
    { text: '', options: ['', ''], answerIndex: 0 },
  ]);
  const load = async () => {
    const data = await fetch('/api/admin/quizzes', { headers: { 'X-Username': username || '' } }).then(r => r.json());
    setList(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load(); }, []);

  const addQuestion = () => setQuestions(qs => [...qs, { text: '', options: ['', ''], answerIndex: 0 }]);
  const addOption = (qi: number) => setQuestions(qs => qs.map((q,i)=> i===qi ? { ...q, options: q.options.length < 4 ? [...q.options, ''] : q.options } : q));
  const updateQ = (qi: number, patch: Partial<{ text: string; options: string[]; answerIndex: number }>) => setQuestions(qs => qs.map((q,i)=> i===qi ? { ...q, ...patch } : q));
  const updateOpt = (qi: number, oi: number, val: string) => setQuestions(qs => qs.map((q,i)=> i===qi ? { ...q, options: q.options.map((o,j)=> j===oi ? val : o) } : q));

  const create = async () => {
    if (!title.trim()) return;
    const body = { title, description, points, questions };
    const res = await fetch('/api/admin/quizzes', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Username': username || '' }, body: JSON.stringify(body) });
    if (!res.ok) {
      const e = await res.json().catch(()=>({} as any));
      return alert(e?.error || 'Failed to create quiz');
    }
    setTitle(''); setDescription(''); setPoints(3); setQuestions([{ text: '', options: ['', ''], answerIndex: 0 }]);
    await load();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Global Quizzes</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Create Global Quiz</h3>
          <div className="space-y-2 text-sm">
            <input className="w-full rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
            <textarea className="w-full rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Description (optional)" value={description} onChange={e=>setDescription(e.target.value)} />
            <div className="flex items-center gap-2">
              <span className="text-earth-muted">Points (1–3)</span>
              <input className="w-24 rounded-lg px-3 py-2 text-[var(--foreground)]" type="number" min={1} max={3} value={points} onChange={e=>setPoints(Number(e.target.value))} />
            </div>
            <div className="space-y-3">
              {questions.map((q, qi) => (
                <div key={qi} className="p-3 rounded-lg bg-[var(--earth-card)] border border-[var(--earth-border)]">
                  <input className="w-full rounded-lg px-3 py-2 text-[var(--foreground)] mb-2" placeholder={`Question ${qi+1}`} value={q.text} onChange={e=>updateQ(qi, { text: e.target.value })} />
                  {q.options.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2 mb-2">
                      <input className="flex-1 rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder={`Option ${oi+1}`} value={o} onChange={e=>updateOpt(qi, oi, e.target.value)} />
                      <label className="text-xs text-earth-muted flex items-center gap-1">
                        <input type="radio" name={`ans-admin-${qi}`} checked={q.answerIndex === oi} onChange={()=>updateQ(qi, { answerIndex: oi })} /> Correct
                      </label>
                    </div>
                  ))}
                  {q.options.length < 4 && (
                    <Button variant="secondary" onClick={()=>addOption(qi)}>Add Option</Button>
                  )}
                </div>
              ))}
              <Button variant="secondary" onClick={addQuestion}>Add Question</Button>
            </div>
            <Button className="bg-earth-orange hover:bg-earth-orange-hover" onClick={create}>Create Global Quiz</Button>
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">All Global Quizzes</h3>
          <div className="space-y-2">
            {list.length === 0 && <p className="text-sm text-earth-muted">No global quizzes yet.</p>}
            {list.map(q => (
              <div key={q.id} className="p-3 rounded-lg bg-[var(--earth-card)] border border-[var(--earth-border)]">
                <div className="font-medium">{q.title} <span className="text-xs text-earth-muted">• {q.points} pts • {q.questions?.length||0} Qs</span></div>
                {q.description && <div className="text-sm text-earth-muted">{q.description}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminQuizManager() {
  const { username } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(3);
  const [questions, setQuestions] = useState<Array<{ id?: string; text: string; options: string[]; answerIndex: number }>>([
    { text: '', options: ['', ''], answerIndex: 0 },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const data = await fetch('/api/admin/quizzes', { headers: { 'X-Username': username || '' } }).then(r => r.json());
    setList(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load(); }, []);

  const addQuestion = () => setQuestions(qs => [...qs, { text: '', options: ['', ''], answerIndex: 0 }]);
  const addOption = (qi: number) => setQuestions(qs => qs.map((q,i)=> i===qi ? { ...q, options: q.options.length < 4 ? [...q.options, ''] : q.options } : q));
  const updateQ = (qi: number, patch: Partial<{ text: string; options: string[]; answerIndex: number }>) => setQuestions(qs => qs.map((q,i)=> i===qi ? { ...q, ...patch } : q));
  const updateOpt = (qi: number, oi: number, val: string) => setQuestions(qs => qs.map((q,i)=> i===qi ? { ...q, options: q.options.map((o,j)=> j===oi ? val : o) } : q));

  const resetForm = () => {
    setTitle(''); setDescription(''); setPoints(3); setQuestions([{ text: '', options: ['', ''], answerIndex: 0 }]); setEditingId(null);
  };

  const create = async () => {
    if (!title.trim()) return;
    const body = { title, description, points, questions };
    const res = await fetch('/api/admin/quizzes', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Username': username || '' }, body: JSON.stringify(body) });
    if (!res.ok) {
      const e = await res.json().catch(()=>({} as any));
      return alert(e?.error || 'Failed to create quiz');
    }
    resetForm();
    await load();
  };

  const startEdit = (q: any) => {
    setEditingId(q.id);
    setTitle(q.title || '');
    setDescription(q.description || '');
    setPoints(q.points || 3);
    setQuestions((q.questions || []).map((qq: any) => ({ id: qq.id, text: qq.text, options: qq.options || [], answerIndex: qq.answerIndex || 0 })));
  };
  const saveEdit = async () => {
    if (!editingId) return;
    const body = { title, description, points, questions };
    const res = await fetch(`/api/admin/quizzes/${encodeURIComponent(editingId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Username': username || '' }, body: JSON.stringify(body) });
    if (!res.ok) {
      const e = await res.json().catch(()=>({} as any));
      return alert(e?.error || 'Failed to update quiz');
    }
    resetForm();
    await load();
  };
  const del = async (id: string) => {
    if (!confirm('Delete this quiz?')) return;
    const res = await fetch(`/api/admin/quizzes/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'X-Username': username || '' } });
    if (!res.ok) {
      const e = await res.json().catch(()=>({} as any));
      return alert(e?.error || 'Failed to delete quiz');
    }
    if (editingId === id) resetForm();
    await load();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Quizzes Management</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">{editingId ? 'Edit Global Quiz' : 'Create Global Quiz'}</h3>
          <div className="space-y-2 text-sm">
            <input className="w-full rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
            <textarea className="w-full rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Description (optional)" value={description} onChange={e=>setDescription(e.target.value)} />
            <div className="flex items-center gap-2">
              <span className="text-earth-muted">Points (1–3)</span>
              <input className="w-24 rounded-lg px-3 py-2 text-[var(--foreground)]" type="number" min={1} max={3} value={points} onChange={e=>setPoints(Number(e.target.value))} />
            </div>
            <div className="space-y-3">
              {questions.map((q, qi) => (
                <div key={qi} className="p-3 rounded-lg bg-[var(--earth-card)] border border-[var(--earth-border)]">
                  <input className="w-full rounded-lg px-3 py-2 text-[var(--foreground)] mb-2" placeholder={`Question ${qi+1}`} value={q.text} onChange={e=>updateQ(qi, { text: e.target.value })} />
                  {q.options.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2 mb-2">
                      <input className="flex-1 rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder={`Option ${oi+1}`} value={o} onChange={e=>updateOpt(qi, oi, e.target.value)} />
                      <label className="text-xs text-earth-muted flex items-center gap-1">
                        <input type="radio" name={`ans-admin-mgr-${qi}`} checked={q.answerIndex === oi} onChange={()=>updateQ(qi, { answerIndex: oi })} /> Correct
                      </label>
                    </div>
                  ))}
                  {q.options.length < 4 && (
                    <Button variant="secondary" onClick={()=>addOption(qi)}>Add Option</Button>
                  )}
                </div>
              ))}
              <Button variant="secondary" onClick={addQuestion}>Add Question</Button>
            </div>
            <div className="flex gap-2">
              {editingId ? (
                <>
                  <Button className="bg-earth-orange hover:bg-earth-orange-hover" onClick={saveEdit}>Save Changes</Button>
                  <Button variant="secondary" onClick={resetForm}>Cancel</Button>
                </>
              ) : (
                <Button className="bg-earth-orange hover:bg-earth-orange-hover" onClick={create}>Create Global Quiz</Button>
              )}
            </div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">All Global Quizzes</h3>
          <div className="space-y-2">
            {list.length === 0 && <p className="text-sm text-earth-muted">No global quizzes yet.</p>}
            {list.map(q => (
              <div key={q.id} className="p-3 rounded-lg bg-[var(--earth-card)] border border-[var(--earth-border)]">
                <div className="font-medium flex items-center justify-between">
                  <span>{q.title} <span className="text-xs text-earth-muted">• {q.points} pts • {q.questions?.length||0} Qs</span></span>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={()=>startEdit(q)}>Edit</Button>
                    <Button className="bg-red-600 hover:bg-red-700" onClick={()=>del(q.id)}>Delete</Button>
                  </div>
                </div>
                {q.description && <div className="text-sm text-earth-muted">{q.description}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobalAnnouncements() {
  const { username } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const load = async () => {
    const data = await fetch('/api/admin/announcements', { headers: { 'X-Username': username || '' } }).then(r => r.json());
    setList(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load(); }, []);
  const create = async () => {
    if (!title.trim()) return;
    const res = await fetch('/api/admin/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Username': username || '' }, body: JSON.stringify({ title, body }) });
    if (!res.ok) {
      const e = await res.json().catch(()=>({} as any));
      return alert(e?.error || 'Failed to post announcement');
    }
    setTitle(''); setBody('');
    await load();
  };
  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Global Announcements</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Post Global Announcement</h3>
          <div className="space-y-2">
            <input className="w-full rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
            <textarea className="w-full rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Write something…" value={body} onChange={e=>setBody(e.target.value)} />
            <Button className="bg-earth-orange hover:bg-earth-orange-hover" onClick={create}>Post</Button>
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">All Global Announcements</h3>
          <div className="space-y-2">
            {list.length === 0 && <p className="text-sm text-earth-muted">No announcements yet.</p>}
            {list.map(a => (
              <div key={a.id} className="p-3 rounded-lg bg-[var(--earth-card)] border border-[var(--earth-border)]">
                <div className="font-medium">{a.title}</div>
                {a.body && <div className="text-sm text-earth-muted whitespace-pre-wrap">{a.body}</div>}
                <div className="text-xs text-earth-muted mt-1">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobalAssignments() {
  const { username } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [maxPoints, setMaxPoints] = useState(10);
  const load = async () => {
    const data = await fetch('/api/admin/assignments', { headers: { 'X-Username': username || '' } }).then(r => r.json());
    setList(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load(); }, []);
  const create = async () => {
    if (!title.trim()) return;
    const res = await fetch('/api/admin/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Username': username || '' }, body: JSON.stringify({ title, description, deadline, maxPoints }) });
    if (!res.ok) {
      const e = await res.json().catch(()=>({} as any));
      return alert(e?.error || 'Failed to create assignment');
    }
    setTitle(''); setDescription(''); setDeadline(''); setMaxPoints(10);
    await load();
  };
  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Global Assignments</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Create Global Assignment</h3>
          <div className="space-y-2">
            <input className="w-full rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
            <textarea className="w-full rounded-lg px-3 py-2 text-[var(--foreground)]" placeholder="Description (optional)" value={description} onChange={e=>setDescription(e.target.value)} />
            <input className="w-full rounded-lg px-3 py-2 text-[var(--foreground)]" type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} />
            <div className="flex items-center gap-2">
              <span className="text-earth-muted text-sm">Max Points (1–10)</span>
              <input className="w-24 rounded-lg px-3 py-2 text-[var(--foreground)]" type="number" min={1} max={10} value={maxPoints} onChange={e=>setMaxPoints(Number(e.target.value))} />
            </div>
            <Button className="bg-earth-orange hover:bg-earth-orange-hover" onClick={create}>Create Global Assignment</Button>
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">All Global Assignments</h3>
          <div className="space-y-2">
            {list.length === 0 && <p className="text-sm text-earth-muted">No assignments yet.</p>}
            {list.map(a => (
              <div key={a.id} className="p-3 rounded-lg bg-[var(--earth-card)] border border-[var(--earth-border)]">
                <div className="font-medium">{a.title} <span className="text-xs text-earth-muted">• Max {a.maxPoints} pts</span></div>
                {a.description && <div className="text-sm text-earth-muted">{a.description}</div>}
                {a.deadline && <div className="text-xs text-earth-muted">Deadline: {a.deadline}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminVideosManager() {
  const { username } = useAuth();
  const [videos, setVideos] = useState<any[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'youtube' | 'file'>('youtube');
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Climate Change',
    difficulty: 'Beginner',
    credits: 1,
    youtubeUrl: '',
    thumbnailUrl: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const categories = [
    'Climate Change', 'Renewable Energy', 'Ocean Conservation', 
    'Agriculture', 'Wildlife', 'Green Technology', 'Waste Management', 
    'Water Conservation', 'Air Quality', 'Biodiversity'
  ];

  const loadVideos = async () => {
    try {
      const response = await fetch('/api/admin/videos', {
        headers: { 'X-Username': username || '' }
      });
      if (response.ok) {
        const data = await response.json();
        setVideos(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    }
  };

  useEffect(() => {
    loadVideos();
  }, [username]);

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      category: 'Climate Change',
      difficulty: 'Beginner',
      credits: 1,
      youtubeUrl: '',
      thumbnailUrl: ''
    });
    setVideoFile(null);
    setThumbnailFile(null);
  };

  const extractYouTubeVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const generateYouTubeEmbedUrl = (url: string) => {
    const videoId = extractYouTubeVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  };

  const generateYouTubeThumbnail = (url: string) => {
    const videoId = extractYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';
  };

  const handleYouTubeUpload = async () => {
    if (!form.title.trim() || !form.youtubeUrl.trim()) {
      alert('Title and YouTube URL are required');
      return;
    }

    const videoId = extractYouTubeVideoId(form.youtubeUrl);
    if (!videoId) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    setIsUploading(true);
    try {
      const videoData = {
        title: form.title,
        description: form.description,
        category: form.category,
        difficulty: form.difficulty,
        credits: form.credits,
        embedUrl: generateYouTubeEmbedUrl(form.youtubeUrl),
        thumbnail: form.thumbnailUrl || generateYouTubeThumbnail(form.youtubeUrl),
        uploadedBy: username,
        type: 'youtube'
      };

      const response = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Username': username || ''
        },
        body: JSON.stringify(videoData)
      });

      if (response.ok) {
        alert('YouTube video added successfully!');
        resetForm();
        setIsUploadModalOpen(false);
        loadVideos();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add YouTube video');
      }
    } catch (error) {
      console.error('Error uploading YouTube video:', error);
      alert('Failed to add YouTube video');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!form.title.trim() || !videoFile) {
      alert('Title and video file are required');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('difficulty', form.difficulty);
      formData.append('credits', form.credits.toString());
      formData.append('uploadedBy', username || '');
      formData.append('type', 'file');
      formData.append('video', videoFile);
      
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }

      const response = await fetch('/api/admin/videos/upload', {
        method: 'POST',
        headers: {
          'X-Username': username || ''
        },
        body: formData
      });

      if (response.ok) {
        alert('Video file uploaded successfully!');
        resetForm();
        setIsUploadModalOpen(false);
        loadVideos();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to upload video file');
      }
    } catch (error) {
      console.error('Error uploading video file:', error);
      alert('Failed to upload video file');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const response = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'DELETE',
        headers: { 'X-Username': username || '' }
      });

      if (response.ok) {
        alert('Video deleted successfully!');
        loadVideos();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete video');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video');
    }
  };

  return (
    <div className="space-y-6 relative z-10">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white/90 flex items-center gap-2">
              <Video className="h-6 w-6 text-blue-400" />
              Videos Management
            </h2>
            <p className="text-white/70 mt-1">Manage educational videos for students and teachers</p>
          </div>
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Video
          </Button>
        </div>

        {/* Videos List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white/90">All Videos ({videos.length})</h3>
          {videos.length === 0 ? (
            <div className="text-center py-8 text-white/70">
              <Video className="h-12 w-12 mx-auto mb-4 text-white/50" />
              <p>No videos uploaded yet. Add your first video!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => (
                <div key={video.id} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg overflow-hidden">
                  <div className="aspect-video bg-cover bg-center relative" style={{ backgroundImage: `url(${video.thumbnail})` }}>
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        {video.type === 'youtube' ? (
                          <Youtube className="h-6 w-6 text-white" />
                        ) : (
                          <Video className="h-6 w-6 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-500/80 to-orange-500/80 text-white text-xs px-2 py-1 rounded-full">
                      {video.credits} credits
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-white/90 text-sm mb-1 line-clamp-2">{video.title}</h4>
                    <p className="text-white/60 text-xs mb-2 line-clamp-2">{video.description}</p>
                    <div className="flex items-center justify-between text-xs text-white/60 mb-3">
                      <span>{video.category}</span>
                      <span>{video.difficulty}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">By {video.uploadedBy}</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => deleteVideo(video.id)}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-400/30"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4">
          <div 
            className="fixed inset-0 bg-transparent" 
            onClick={() => setIsUploadModalOpen(false)}
          ></div>
          <div className="bg-gray-900/95 backdrop-blur-xl border border-white/30 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative z-[10000]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white/90">Add New Video</h3>
              <Button
                variant="secondary"
                onClick={() => setIsUploadModalOpen(false)}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                ✕
              </Button>
            </div>

            {/* Upload Type Selection */}
            <div className="mb-6">
              <div className="flex gap-2">
                <Button
                  variant={uploadType === 'youtube' ? 'default' : 'secondary'}
                  onClick={() => setUploadType('youtube')}
                  className={uploadType === 'youtube' 
                    ? "bg-red-500/80 hover:bg-red-600/80 text-white"
                    : "bg-white/20 hover:bg-white/30 text-white border-white/30"
                  }
                >
                  <Youtube className="h-4 w-4 mr-2" />
                  YouTube Link
                </Button>
                <Button
                  variant={uploadType === 'file' ? 'default' : 'secondary'}
                  onClick={() => setUploadType('file')}
                  className={uploadType === 'file' 
                    ? "bg-blue-500/80 hover:bg-blue-600/80 text-white"
                    : "bg-white/20 hover:bg-white/30 text-white border-white/30"
                  }
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-white/90 text-sm mb-2">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 bg-white/10 border border-white/20 text-white placeholder-white/50"
                  placeholder="Enter video title"
                />
              </div>

              <div>
                <label className="block text-white/90 text-sm mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 bg-white/10 border border-white/20 text-white placeholder-white/50"
                  placeholder="Enter video description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-white/90 text-sm mb-2">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 bg-white/10 border border-white/20 text-white"
                  >
                    {categories.map(category => (
                      <option key={category} value={category} className="bg-gray-800 text-white">
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white/90 text-sm mb-2">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 bg-white/10 border border-white/20 text-white"
                  >
                    <option value="Beginner" className="bg-gray-800 text-white">Beginner</option>
                    <option value="Intermediate" className="bg-gray-800 text-white">Intermediate</option>
                    <option value="Advanced" className="bg-gray-800 text-white">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/90 text-sm mb-2">Credits</label>
                  <select
                    value={form.credits}
                    onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })}
                    className="w-full rounded-lg px-3 py-2 bg-white/10 border border-white/20 text-white"
                  >
                    <option value={1} className="bg-gray-800 text-white">1 Credit</option>
                    <option value={2} className="bg-gray-800 text-white">2 Credits</option>
                  </select>
                </div>
              </div>

              {uploadType === 'youtube' ? (
                <>
                  <div>
                    <label className="block text-white/90 text-sm mb-2">YouTube URL *</label>
                    <input
                      type="url"
                      value={form.youtubeUrl}
                      onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 bg-white/10 border border-white/20 text-white placeholder-white/50"
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>

                  <div>
                    <label className="block text-white/90 text-sm mb-2">Custom Thumbnail URL (optional)</label>
                    <input
                      type="url"
                      value={form.thumbnailUrl}
                      onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 bg-white/10 border border-white/20 text-white placeholder-white/50"
                      placeholder="Leave empty to use YouTube thumbnail"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-white/90 text-sm mb-2">Video File *</label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                      className="w-full rounded-lg px-3 py-2 bg-white/10 border border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-white/90 text-sm mb-2">Thumbnail Image (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                      className="w-full rounded-lg px-3 py-2 bg-white/10 border border-white/20 text-white"
                    />
                    <p className="text-white/50 text-xs mt-1">If not provided, a frame from the video will be used</p>
                  </div>
                </>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex gap-2 mt-6">
              <Button
                onClick={uploadType === 'youtube' ? handleYouTubeUpload : handleFileUpload}
                disabled={isUploading}
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    {uploadType === 'youtube' ? <Youtube className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                    {uploadType === 'youtube' ? 'Add YouTube Video' : 'Upload Video File'}
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsUploadModalOpen(false)}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
