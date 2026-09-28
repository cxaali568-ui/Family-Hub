/**
 * FamilyHub - Modern, Mobile-First Family + Personal Management System
 * @license Apache-2.0
 */

import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FamilyProvider, useFamily } from './context/FamilyContext';
import { PersonalProvider } from './context/PersonalContext';
import { NotificationProvider } from './context/NotificationContext';

import { AppShell } from './components/layout/AppShell';
import { AuthView } from './components/auth/AuthView';
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

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <FamilyProvider>
      <PersonalProvider>
        <NotificationProvider>
          <AppShell>
            <MainContent />
          </AppShell>
        </NotificationProvider>
      </PersonalProvider>
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
