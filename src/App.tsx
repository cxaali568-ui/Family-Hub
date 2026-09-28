/**
 * FamilyHub - Modern, Mobile-First Family + Personal Management System
 * Real Firebase Backend & Multi-Family Architecture
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FamilyProvider, useFamily } from './context/FamilyContext';
import { PersonalProvider } from './context/PersonalContext';
import { NotificationProvider } from './context/NotificationContext';

import { AppShell } from './components/layout/AppShell';
import { AuthView } from './components/auth/AuthView';
import { OnboardingView } from './components/family/OnboardingView';
import { FamilyChatView } from './components/chat/FamilyChatView';
import { FamilyMembersView } from './components/family/FamilyMembersView';
import { FamilyMoneyView } from './components/family/FamilyMoneyView';
import { FamilyMedicalView } from './components/family/FamilyMedicalView';
import { FamilyPlansView } from './components/family/FamilyPlansView';
import { FamilyNotesView } from './components/family/FamilyNotesView';
import { FamilyUrgentView } from './components/family/FamilyUrgentView';
import { FamilyPhotosDocsView } from './components/family/FamilyPhotosDocsView';
import { PersonalSpaceView } from './components/personal/PersonalSpaceView';
import { SettingsView } from './components/settings/SettingsView';
import { LoadingState } from './components/ui/LoadingState';

const MainContent: React.FC = () => {
  const { currentRoute } = useFamily();

  switch (currentRoute) {
    case 'chat':
      // PRIMARY USER EXPERIENCE REQUIREMENT: Chat is first and default!
      return <FamilyChatView />;
    case 'family':
      return <FamilyMembersView />;
    case 'money':
      return <FamilyMoneyView />;
    case 'medical':
      return <FamilyMedicalView />;
    case 'plans':
      return <FamilyPlansView />;
    case 'photos':
      return <FamilyPhotosDocsView mode="photos" />;
    case 'documents':
      return <FamilyPhotosDocsView mode="documents" />;
    case 'notes':
      return <FamilyNotesView />;
    case 'urgent':
      return <FamilyUrgentView />;
    case 'personal':
      return <PersonalSpaceView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <FamilyChatView />;
  }
};

const AuthenticatedFamilyRouter: React.FC = () => {
  const { loadingFamilies, hasNoFamily, currentFamily } = useFamily();
  const [forceOnboarding, setForceOnboarding] = useState(false);

  if (loadingFamilies) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingState message="Connecting to your Family Space..." />
      </div>
    );
  }

  // If user has zero active family memberships or requested to join/create another family
  if (hasNoFamily || forceOnboarding || !currentFamily) {
    return <OnboardingView />;
  }

  return (
    <PersonalProvider>
      <NotificationProvider>
        <AppShell onOpenOnboarding={() => setForceOnboarding(true)}>
          <MainContent />
        </AppShell>
      </NotificationProvider>
    </PersonalProvider>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingState message="Loading FamilyHub..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <FamilyProvider>
      <AuthenticatedFamilyRouter />
    </FamilyProvider>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
