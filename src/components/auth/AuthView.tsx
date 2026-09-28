import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Heart, Users, Shield, ArrowRight, Check, Sparkles } from 'lucide-react';
import { Role } from '../../types';

export const AuthView: React.FC = () => {
  const { login, register, demoUsers, switchUser } = useAuth();
  const { t, isRtl } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'family_choice'>('login');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<any>(null);

  // Family Setup
  const [familyChoice, setFamilyChoice] = useState<'create' | 'join'>('create');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!emailOrPhone.trim() || !password) {
      setError('Please fill in both email/phone and password.');
      return;
    }

    setLoading(true);
    try {
      await login(emailOrPhone.trim(), password);
    } catch (err: any) {
      setError(err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !emailOrPhone.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const u = await register({
        fullName: fullName.trim(),
        emailOrPhone: emailOrPhone.trim(),
        password,
        role,
      });
      setRegisteredUser(u);
      setMode('family_choice');
    } catch (err: any) {
      setError(err?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFamilySetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, persists family or links membership
    // User is already authenticated in context
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/30 text-white mb-1">
            <Heart className="w-7 h-7 fill-current" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            FamilyHub
          </h1>
          <p className="text-xs text-indigo-200/80">
            A peaceful, connected home for your family and personal space.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10">
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {t.auth.loginTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.auth.loginSubtitle}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}

              <Input
                label={t.auth.emailOrPhone}
                placeholder="e.g. tariq.khan@familyhub.local"
                value={emailOrPhone}
                onChange={e => setEmailOrPhone(e.target.value)}
                required
                autoFocus
              />

              <Input
                label={t.auth.password}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  {t.auth.forgotPassword}
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full text-sm font-bold"
              >
                {t.auth.loginBtn}
              </Button>

              <div className="pt-2 text-center text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setMode('register');
                  }}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t.auth.createAccount}
                </button>
              </div>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {t.auth.registerTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.auth.registerSubtitle}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}

              <Input
                label={t.auth.fullName}
                placeholder="e.g. Ayesha Khan"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                autoFocus
              />

              <Input
                label={t.auth.emailOrPhone}
                placeholder="email@example.com or phone"
                value={emailOrPhone}
                onChange={e => setEmailOrPhone(e.target.value)}
                required
              />

              <Input
                label={t.auth.password}
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />

              <Input
                label={t.auth.confirmPassword}
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full text-sm font-bold"
              >
                {t.auth.registerBtn}
              </Button>

              <div className="pt-2 text-center text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setMode('login');
                  }}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t.auth.haveAccount}
                </button>
              </div>
            </form>
          )}

          {mode === 'family_choice' && (
            <form onSubmit={handleFamilySetupSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Join or Create Family
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect with your household in FamilyHub.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFamilyChoice('create')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    familyChoice === 'create'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600'
                  }`}
                >
                  Create New Family
                </button>
                <button
                  type="button"
                  onClick={() => setFamilyChoice('join')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    familyChoice === 'join'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600'
                  }`}
                >
                  Join With Code
                </button>
              </div>

              {familyChoice === 'create' ? (
                <Input
                  label={t.auth.familyName}
                  placeholder="e.g. Khan Household"
                  value={familyName}
                  onChange={e => setFamilyName(e.target.value)}
                  required
                />
              ) : (
                <Input
                  label={t.auth.inviteCode}
                  placeholder="e.g. KHAN77"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  required
                />
              )}

              <Button type="submit" variant="primary" className="w-full text-sm font-bold">
                Finish & Enter Family Space
              </Button>
            </form>
          )}

          {mode === 'forgot' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Password Recovery
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your registered email to receive reset instructions.
                </p>
              </div>

              <Input
                label="Email Address"
                placeholder="your.email@example.com"
                value={emailOrPhone}
                onChange={e => setEmailOrPhone(e.target.value)}
                required
              />

              <Button
                variant="primary"
                className="w-full text-sm font-bold"
                onClick={() => {
                  alert('Password recovery link sent if email is found.');
                  setMode('login');
                }}
              >
                Send Reset Link
              </Button>

              <div className="pt-2 text-center text-xs">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-semibold text-indigo-600 hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Demo Switcher Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-white space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">
            Quick Demo Login (Select Any Member):
          </p>
          <div className="grid grid-cols-2 gap-2">
            {demoUsers.map(u => (
              <button
                key={u.id}
                onClick={() => switchUser(u.id)}
                className="flex items-center gap-2 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-left text-xs cursor-pointer"
              >
                <img
                  src={u.avatar}
                  alt={u.name}
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
                <div className="overflow-hidden">
                  <p className="font-bold truncate leading-tight">{u.name}</p>
                  <p className="text-[10px] text-indigo-200 capitalize">{u.roleInFamily}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
