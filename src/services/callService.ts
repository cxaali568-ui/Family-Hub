import {
  collection,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  query,
  where,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  CallSession,
  CallType,
  CallStatus,
  CallParticipantInfo,
  CallReaction,
  CallCaption,
} from '../types';

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

function sanitize<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
        out[k] = sanitize(v);
      } else {
        out[k] = v;
      }
    }
  }
  return out as T;
}

export function getPeerPairId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('__');
}

// ============================================================
// Web Audio API Synthesized Ringtone & Fun Call Chimes
// ============================================================
let sharedAudioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function playToneNote(freq: number, durationSec: number, delaySec = 0, gainVal = 0.08, type: OscillatorType = 'sine') {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const start = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainVal, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + durationSec + 0.03);
  } catch {}
}

export function playRingtonePulse(isIncoming: boolean) {
  if (isIncoming) {
    // Pleasant warm double chime for incoming call
    playToneNote(587.33, 0.22, 0, 0.09, 'triangle');
    playToneNote(880.0, 0.28, 0.14, 0.09, 'triangle');
    playToneNote(587.33, 0.22, 0.48, 0.08, 'triangle');
    playToneNote(880.0, 0.3, 0.62, 0.08, 'triangle');
  } else {
    // Soft outgoing ringback tone
    playToneNote(440, 0.45, 0, 0.04, 'sine');
    playToneNote(480, 0.45, 0.05, 0.03, 'sine');
  }
}

export function playCallConnectedChime() {
  playToneNote(523.25, 0.14, 0, 0.07, 'sine');
  playToneNote(659.25, 0.18, 0.09, 0.07, 'sine');
  playToneNote(783.99, 0.24, 0.18, 0.08, 'sine');
}

export function playCallEndedChime() {
  playToneNote(493.88, 0.15, 0, 0.06, 'sine');
  playToneNote(392.0, 0.25, 0.12, 0.06, 'sine');
}

export function playSoundboardChime(emoji: string) {
  switch (emoji) {
    case '❤️':
      playToneNote(659.25, 0.18, 0, 0.07, 'sine');
      playToneNote(880.0, 0.24, 0.1, 0.07, 'sine');
      break;
    case '😂':
      playToneNote(523.25, 0.1, 0, 0.06, 'triangle');
      playToneNote(659.25, 0.1, 0.08, 0.06, 'triangle');
      playToneNote(783.99, 0.12, 0.16, 0.07, 'triangle');
      break;
    case '👏':
      playToneNote(440, 0.08, 0, 0.06, 'square');
      playToneNote(554.37, 0.08, 0.09, 0.06, 'square');
      playToneNote(659.25, 0.12, 0.18, 0.06, 'triangle');
      break;
    case '🎉':
    case '🥳':
      playToneNote(523.25, 0.12, 0, 0.07, 'triangle');
      playToneNote(659.25, 0.12, 0.08, 0.07, 'triangle');
      playToneNote(783.99, 0.12, 0.16, 0.07, 'triangle');
      playToneNote(1046.5, 0.26, 0.24, 0.08, 'triangle');
      break;
    default:
      playToneNote(740, 0.16, 0, 0.06, 'sine');
      break;
  }
}

// ============================================================
// Firestore Call Signaling API
// ============================================================
export const callService = {
  async createCall(params: {
    familyId: string;
    chatId: string;
    chatName: string;
    isGroup: boolean;
    type: CallType;
    caller: { id: string; name: string; avatar?: string };
    calleeIds: string[];
    participantDetails: Record<string, CallParticipantInfo>;
    offer?: { type: string; sdp: string };
  }): Promise<CallSession> {
    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const session: CallSession = sanitize({
      id: callId,
      familyId: params.familyId,
      chatId: params.chatId,
      chatName: params.chatName,
      isGroup: params.isGroup,
      type: params.type,
      callerId: params.caller.id,
      callerName: params.caller.name,
      callerAvatar: params.caller.avatar || '',
      calleeIds: params.calleeIds.slice(0, 50),
      activeParticipantIds: [params.caller.id],
      participantDetails: params.participantDetails,
      status: 'ringing',
      ...(params.offer ? { offer: params.offer } : {}),
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, 'calls', callId), session);
    return session;
  },

  async setOffer(callId: string, offer: { type: string; sdp: string }): Promise<void> {
    await updateDoc(doc(db, 'calls', callId), {
      offer: { type: offer.type, sdp: offer.sdp },
      updatedAt: new Date().toISOString(),
    });
  },

  async answerCall(
    callId: string,
    userId: string,
    participantInfo: CallParticipantInfo,
    answer?: { type: string; sdp: string }
  ): Promise<void> {
    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      status: 'active',
      startedAt: now,
      updatedAt: now,
      activeParticipantIds: arrayUnion(userId),
      [`participantDetails.${userId}`]: sanitize({ ...participantInfo, joinedAt: now }),
    };
    if (answer) {
      updates.answer = { type: answer.type, sdp: answer.sdp };
    }
    await updateDoc(doc(db, 'calls', callId), updates);
  },

  async updateParticipantMedia(
    callId: string,
    userId: string,
    updates: Partial<CallParticipantInfo>
  ): Promise<void> {
    const patch: Record<string, any> = { updatedAt: new Date().toISOString() };
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) {
        patch[`participantDetails.${userId}.${k}`] = v;
      }
    }
    await updateDoc(doc(db, 'calls', callId), patch).catch(() => {});
  },

  async leaveGroupCall(callId: string, userId: string): Promise<void> {
    await updateDoc(doc(db, 'calls', callId), {
      activeParticipantIds: arrayRemove(userId),
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  },

  async endCall(callId: string, status: CallStatus = 'ended'): Promise<void> {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'calls', callId), {
      status,
      endedAt: now,
      updatedAt: now,
    }).catch(() => {});
  },

  async addCandidate(
    callId: string,
    senderId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    await addDoc(collection(db, 'calls', callId, 'candidates'), {
      senderId,
      candidate: JSON.parse(JSON.stringify(candidate)),
      createdAt: Date.now(),
    });
  },

  subscribeCandidates(
    callId: string,
    currentUserId: string,
    onRemoteCandidate: (cand: RTCIceCandidateInit) => void
  ) {
    const seenIds = new Set<string>();
    return onSnapshot(
      collection(db, 'calls', callId, 'candidates'),
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added' && !seenIds.has(change.doc.id)) {
            seenIds.add(change.doc.id);
            const data = change.doc.data();
            if (data.senderId !== currentUserId && data.candidate) {
              onRemoteCandidate(data.candidate);
            }
          }
        });
      },
      (err) => console.warn('ICE candidate subscription notice:', err)
    );
  },

  // Peer-to-peer mesh signaling for multi-participant Group Calls
  async setPeerOffer(callId: string, pairId: string, offer: { type: string; sdp: string }) {
    await setDoc(
      doc(db, 'calls', callId, 'peers', pairId),
      { offer: { type: offer.type, sdp: offer.sdp }, updatedAt: Date.now() },
      { merge: true }
    );
  },

  async setPeerAnswer(callId: string, pairId: string, answer: { type: string; sdp: string }) {
    await setDoc(
      doc(db, 'calls', callId, 'peers', pairId),
      { answer: { type: answer.type, sdp: answer.sdp }, updatedAt: Date.now() },
      { merge: true }
    );
  },

  subscribePeerDoc(
    callId: string,
    pairId: string,
    onData: (data: { offer?: RTCSessionDescriptionInit; answer?: RTCSessionDescriptionInit }) => void
  ) {
    return onSnapshot(
      doc(db, 'calls', callId, 'peers', pairId),
      (snap) => {
        if (snap.exists()) {
          onData(snap.data() as any);
        }
      },
      (err) => console.warn('Peer signaling error:', err)
    );
  },

  async addPeerCandidate(
    callId: string,
    pairId: string,
    senderId: string,
    candidate: RTCIceCandidateInit
  ) {
    await addDoc(collection(db, 'calls', callId, 'peers', pairId, 'candidates'), {
      senderId,
      candidate: JSON.parse(JSON.stringify(candidate)),
      createdAt: Date.now(),
    });
  },

  subscribePeerCandidates(
    callId: string,
    pairId: string,
    currentUserId: string,
    onRemoteCandidate: (cand: RTCIceCandidateInit) => void
  ) {
    const seenIds = new Set<string>();
    return onSnapshot(
      collection(db, 'calls', callId, 'peers', pairId, 'candidates'),
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added' && !seenIds.has(change.doc.id)) {
            seenIds.add(change.doc.id);
            const data = change.doc.data();
            if (data.senderId !== currentUserId && data.candidate) {
              onRemoteCandidate(data.candidate);
            }
          }
        });
      },
      (err) => console.warn('Peer ICE subscription notice:', err)
    );
  },

  async sendReaction(callId: string, reaction: CallReaction): Promise<void> {
    await updateDoc(doc(db, 'calls', callId), {
      latestReaction: sanitize(reaction),
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  },

  async sendCaption(callId: string, caption: CallCaption): Promise<void> {
    await updateDoc(doc(db, 'calls', callId), {
      latestCaption: sanitize(caption),
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  },

  subscribeCall(callId: string, onUpdate: (call: CallSession | null) => void) {
    return onSnapshot(
      doc(db, 'calls', callId),
      (snap) => {
        if (!snap.exists()) {
          onUpdate(null);
        } else {
          onUpdate(snap.data() as CallSession);
        }
      },
      (err) => console.warn('Call doc subscription error:', err)
    );
  },

  subscribeIncomingCalls(userId: string, onIncoming: (calls: CallSession[]) => void) {
    const q = query(
      collection(db, 'calls'),
      where('calleeIds', 'array-contains', userId),
      where('status', '==', 'ringing')
    );

    return onSnapshot(
      q,
      (snap) => {
        const nowMs = Date.now();
        const activeRinging = snap.docs
          .map((d) => d.data() as CallSession)
          .filter((c) => {
            if (c.callerId === userId) return false;
            const createdMs = new Date(c.createdAt).getTime();
            // Ignore stale ringing calls older than 90 seconds
            return !isNaN(createdMs) && nowMs - createdMs < 90_000;
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        onIncoming(activeRinging);
      },
      (err) => {
        console.warn('Incoming calls listener notice:', err);
      }
    );
  },
};
