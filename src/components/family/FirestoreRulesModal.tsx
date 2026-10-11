import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Copy, Check, ShieldAlert, ExternalLink } from 'lucide-react';

interface FirestoreRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FIRESTORE_RULES_TEXT = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isFamilyMember(familyId) {
      return isAuthenticated() && (
        (exists(/databases/$(database)/documents/familyMembers/$(familyId + '_' + request.auth.uid)) &&
         get(/databases/$(database)/documents/familyMembers/$(familyId + '_' + request.auth.uid)).data.status == 'active') ||
        (exists(/databases/$(database)/documents/families/$(familyId)) &&
         get(/databases/$(database)/documents/families/$(familyId)).data.createdBy == request.auth.uid)
      );
    }

    function isFamilyAdminOrOwner(familyId) {
      return isAuthenticated() && (
        (exists(/databases/$(database)/documents/familyMembers/$(familyId + '_' + request.auth.uid)) &&
         get(/databases/$(database)/documents/familyMembers/$(familyId + '_' + request.auth.uid)).data.role in ['owner', 'admin'] &&
         get(/databases/$(database)/documents/familyMembers/$(familyId + '_' + request.auth.uid)).data.status == 'active') ||
        (exists(/databases/$(database)/documents/families/$(familyId)) &&
         get(/databases/$(database)/documents/families/$(familyId)).data.createdBy == request.auth.uid)
      );
    }

    function isFamilyOwner(familyId) {
      return isAuthenticated() && (
        (exists(/databases/$(database)/documents/familyMembers/$(familyId + '_' + request.auth.uid)) &&
         get(/databases/$(database)/documents/familyMembers/$(familyId + '_' + request.auth.uid)).data.role == 'owner' &&
         get(/databases/$(database)/documents/familyMembers/$(familyId + '_' + request.auth.uid)).data.status == 'active') ||
        (exists(/databases/$(database)/documents/families/$(familyId)) &&
         get(/databases/$(database)/documents/families/$(familyId)).data.createdBy == request.auth.uid)
      );
    }

    // --- Users Collection ---
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated() && request.auth.uid == userId;
      allow delete: if false;
    }

    // --- Families Collection ---
    match /families/{familyId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.resource.data.createdBy == request.auth.uid;
      allow update: if isAuthenticated() && isFamilyAdminOrOwner(familyId) &&
        request.resource.data.createdBy == resource.data.createdBy &&
        request.resource.data.id == resource.data.id;
      allow delete: if isAuthenticated() && isFamilyOwner(familyId);

      // Subcollections under families
      match /{allChildren=**} {
        allow read, write: if isAuthenticated() && isFamilyMember(familyId);
      }
    }

    // --- Family Memberships Collection ---
    match /familyMembers/{membershipId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && (
        request.resource.data.userId == request.auth.uid ||
        isFamilyAdminOrOwner(request.resource.data.familyId)
      );
      allow update: if isAuthenticated() &&
        request.resource.data.familyId == resource.data.familyId &&
        request.resource.data.userId == resource.data.userId &&
        (
          (
            resource.data.userId == request.auth.uid &&
            request.resource.data.role == resource.data.role &&
            request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt', 'userName', 'userPhoto'])
          ) ||
          (
            isFamilyAdminOrOwner(resource.data.familyId) &&
            (request.resource.data.role != 'owner' || isFamilyOwner(resource.data.familyId))
          )
        );
      allow delete: if isAuthenticated() && (
        resource.data.userId == request.auth.uid ||
        isFamilyAdminOrOwner(resource.data.familyId)
      );
    }

    // --- Family Invitations ---
    match /familyInvites/{inviteId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() &&
        request.resource.data.invitedBy == request.auth.uid;
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated() && isFamilyAdminOrOwner(resource.data.familyId);
    }

    // --- Chat Rooms ---
    match /chatRooms/{chatRoomId} {
      allow read: if isAuthenticated() && (
        resource.data.createdBy == request.auth.uid ||
        isFamilyMember(resource.data.familyId)
      );
      allow create: if isAuthenticated() && (
        request.resource.data.createdBy == request.auth.uid ||
        isFamilyMember(request.resource.data.familyId)
      );
      allow update, delete: if isAuthenticated() && isFamilyAdminOrOwner(resource.data.familyId);

      match /messages/{messageId} {
        allow read, write: if isAuthenticated();
      }
      match /typing/{userId} {
        allow read, write: if isAuthenticated();
      }
    }

    // --- Chat Members ---
    match /chatMembers/{chatMemberId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // --- Chat Read States ---
    match /chatReadStates/{readStateId} {
      allow read, write: if isAuthenticated();
    }

    // --- Notifications ---
    match /notifications/{notificationId} {
      allow read, write: if isAuthenticated();
    }

    // --- Activity Logs ---
    match /activityLogs/{activityId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.resource.data.actorUserId == request.auth.uid;
      allow update, delete: if false;
    }

    // --- Strictly Private Personal Records (ownerId partitioned) ---
    match /personalExpenses/{expenseId} {
      allow read, write: if isAuthenticated() && (resource == null || resource.data.ownerId == request.auth.uid);
    }
    match /personalNotes/{noteId} {
      allow read, write: if isAuthenticated() && (resource == null || resource.data.ownerId == request.auth.uid);
    }
    match /personalTasks/{taskId} {
      allow read, write: if isAuthenticated() && (resource == null || resource.data.ownerId == request.auth.uid);
    }
    match /personalSchoolWork/{itemId} {
      allow read, write: if isAuthenticated() && (resource == null || resource.data.ownerId == request.auth.uid);
    }
    match /personalNeeds/{needId} {
      allow read, write: if isAuthenticated() && (resource == null || resource.data.ownerId == request.auth.uid);
    }
    match /personalPlans/{planId} {
      allow read, write: if isAuthenticated() && (resource == null || resource.data.ownerId == request.auth.uid);
    }
    match /personalReminders/{reminderId} {
      allow read, write: if isAuthenticated() && (resource == null || resource.data.ownerId == request.auth.uid);
    }
    match /personalFiles/{fileId} {
      allow read, write: if isAuthenticated() && (resource == null || resource.data.ownerId == request.auth.uid);
    }
    match /personalPhotos/{photoId} {
      allow read, write: if isAuthenticated() && (resource == null || resource.data.ownerId == request.auth.uid);
    }
    match /personalAlbums/{albumId} {
      allow read, write: if isAuthenticated() && (resource == null || resource.data.ownerId == request.auth.uid);
    }
    match /personalAIConversations/{convId} {
      allow read, write: if isAuthenticated() && (resource == null || resource.data.ownerId == request.auth.uid);
    }

    match /test/{docId} {
      allow read: if isAuthenticated();
      allow write: if false;
    }
  }
}`;

export const FirestoreRulesModal: React.FC<FirestoreRulesModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Firestore Security Rules" maxWidth="xl">
      <div className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Why do I see "Missing or insufficient permissions"?</p>
            <p className="leading-relaxed">
              When creating a new database in Firebase Console, it defaults to locked rules (<code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">allow read, write: if false;</code>).
              To enable FamilyHub's secure family workspaces, copy these security rules into your Firebase Console.
            </p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
          <p className="font-bold">Follow these 3 quick steps in your Firebase Console:</p>
          <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
            <li>
              Open <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-semibold underline inline-flex items-center gap-1">Firebase Console <ExternalLink className="w-3 h-3" /></a> and select project <strong className="text-indigo-600 dark:text-indigo-400">family-hub-ad470</strong>.
            </li>
            <li>In the left sidebar, click <strong>Build</strong> &gt; <strong>Firestore Database</strong>, then click the <strong>Rules</strong> tab at the top.</li>
            <li>Delete the existing rules, paste the rules below, and click <strong>Publish</strong>.</li>
          </ol>
        </div>

        <div className="relative">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Firestore Security Rules</span>
            <Button size="sm" variant="primary" onClick={handleCopy} icon={copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}>
              {copied ? 'Copied to Clipboard!' : 'Copy Rules'}
            </Button>
          </div>
          <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] max-h-56 overflow-y-auto leading-relaxed border border-slate-800">
            {FIRESTORE_RULES_TEXT}
          </pre>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Done / Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
