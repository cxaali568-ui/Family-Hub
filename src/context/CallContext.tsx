import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import {
  CallSession,
  CallType,
  CallParticipantInfo,
  CallReaction,
  CallCaption,
} from '../types';
import {
  callService,
  ICE_SERVERS,
  getPeerPairId,
  playRingtonePulse,
  playCallConnectedChime,
  playCallEndedChime,
  playSoundboardChime,
} from '../services/callService';
import { aiService } from '../services/aiService';

export interface FloatingCallReaction extends CallReaction {
  xPercent: number;
}

interface StartCallInput {
  familyId: string;
  chatId: string;
  chatName: string;
  isGroup: boolean;
  type: CallType;
  calleeIds: string[];
  participantDetails: Record<string, CallParticipantInfo>;
}

interface CallContextValue {
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
  soundEffectsEnabled: boolean;
  setSoundEffectsEnabled: (val: boolean) => void;
  callDurationSec: number;
  mediaWarning: string | null;
  floatingReactions: FloatingCallReaction[];
  captionsEnabled: boolean;
  toggleCaptions: () => void;
  autoTranslateCaptions: boolean;
  setAutoTranslateCaptions: (val: boolean) => void;
  activeCaption: CallCaption | null;
  startCall: (input: StartCallInput) => Promise<void>;
  acceptIncomingCall: (call: CallSession) => Promise<void>;
  declineIncomingCall: (call: CallSession) => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => Promise<void>;
  flipCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  sendReaction: (emoji: string, label?: string) => Promise<void>;
}

const CallContext = createContext<CallContextValue | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMinimized, setIsMinimized] = useState(false);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [mediaWarning, setMediaWarning] = useState<string | null>(null);

  const [floatingReactions, setFloatingReactions] = useState<FloatingCallReaction[]>([]);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [autoTranslateCaptions, setAutoTranslateCaptions] = useState(true);
  const [activeCaption, setActiveCaption] = useState<CallCaption | null>(null);

  // Refs for WebRTC & cleanup
  const activeCallRef = useRef<CallSession | null>(null);
  activeCallRef.current = activeCall;
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pcMapRef = useRef<Record<string, RTCPeerConnection>>({});
  const unsubCallRef = useRef<(() => void) | null>(null);
  const unsubSubListenersRef = useRef<Array<() => void>>([]);
  const handledPeerPairsRef = useRef<Set<string>>(new Set());
  const remoteDescSetRef = useRef<Record<string, boolean>>({});
  const pendingIceRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const lastSeenReactionIdRef = useRef<string | null>(null);
  const lastSeenCaptionIdRef = useRef<string | null>(null);
  const speechRecRef = useRef<any>(null);
  const prevStatusRef = useRef<string | null>(null);

  const cleanupCallResources = useCallback(() => {
    if (unsubCallRef.current) {
      unsubCallRef.current();
      unsubCallRef.current = null;
    }
    unsubSubListenersRef.current.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    unsubSubListenersRef.current = [];
    handledPeerPairsRef.current.clear();
    remoteDescSetRef.current = {};
    pendingIceRef.current = {};

    Object.values(pcMapRef.current).forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    pcMapRef.current = {};

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {}
      speechRecRef.current = null;
    }

    setLocalStream(null);
    setRemoteStreams({});
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setIsMinimized(false);
    setCallDurationSec(0);
    setMediaWarning(null);
    setCaptionsEnabled(false);
    setActiveCaption(null);
    prevStatusRef.current = null;
    lastSeenReactionIdRef.current = null;
    lastSeenCaptionIdRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCallResources();
    };
  }, [cleanupCallResources]);

  // Subscribe to incoming calls globally
  useEffect(() => {
    if (!user?.id) {
      setIncomingCall(null);
      return;
    }

    const unsub = callService.subscribeIncomingCalls(user.id, (calls) => {
      const currentActive = activeCallRef.current;
      const next = calls.find((c) => !currentActive || c.id !== currentActive.id) || null;
      setIncomingCall(next);
    });

    return () => unsub();
  }, [user?.id]);

  // Play gentle incoming or outgoing ringtone pulses while ringing
  useEffect(() => {
    const isIncomingRinging = Boolean(incomingCall && !activeCall);
    const isOutgoingRinging = Boolean(
      activeCall &&
        activeCall.status === 'ringing' &&
        activeCall.callerId === user?.id
    );

    if (!isIncomingRinging && !isOutgoingRinging) return;

    playRingtonePulse(isIncomingRinging);
    const timer = setInterval(() => {
      playRingtonePulse(isIncomingRinging);
    }, 2600);

    return () => clearInterval(timer);
  }, [incomingCall?.id, activeCall?.id, activeCall?.status, activeCall?.callerId, user?.id]);

  // Call duration timer while active
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'active') {
      setCallDurationSec(0);
      return;
    }
    const baseMs = activeCall.startedAt ? new Date(activeCall.startedAt).getTime() : Date.now();
    const tick = () => {
      setCallDurationSec(Math.max(0, Math.floor((Date.now() - baseMs) / 1000)));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [activeCall?.id, activeCall?.status, activeCall?.startedAt]);

  // Acquire local camera/mic safely with graceful fallback
  const acquireLocalMedia = async (type: CallType, facing: 'user' | 'environment' = 'user'): Promise<MediaStream | null> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMediaWarning('Camera/microphone unavailable in this browser — connected in Listen/Studio mode.');
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: type === 'video' ? { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });
      setMediaWarning(null);
      return stream;
    } catch (err: any) {
      // Fallback: if video failed, try audio only
      if (type === 'video') {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setIsVideoOff(true);
          setMediaWarning('Camera unavailable — joined with Audio only.');
          return audioOnly;
        } catch {}
      }
      setIsMuted(true);
      setIsVideoOff(true);
      setMediaWarning('Mic/Camera permission denied or no device found — Studio Listen mode active.');
      return null;
    }
  };

  // Helper to attach remote tracks cleanly
  const attachPeerHandlers = useCallback(
    (
      pcKey: string,
      remoteUid: string,
      pc: RTCPeerConnection,
      onIce: (cand: RTCIceCandidateInit) => void
    ) => {
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          onIce(e.candidate.toJSON());
        }
      };

      const inboundStream = new MediaStream();
      pc.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          setRemoteStreams((prev) => ({ ...prev, [remoteUid]: e.streams[0] }));
        } else if (e.track) {
          inboundStream.addTrack(e.track);
          setRemoteStreams((prev) => ({ ...prev, [remoteUid]: inboundStream }));
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          setRemoteStreams((prev) => {
            if (!prev[remoteUid]) return prev;
            const copy = { ...prev };
            delete copy[remoteUid];
            return copy;
          });
        }
      };

      pcMapRef.current[pcKey] = pc;
    },
    []
  );

  // Sync live call document updates (answer, group peers, reactions, captions, end)
  const attachCallDocWatcher = useCallback(
    (callId: string, myUserId: string, isGroupCall: boolean, isCaller: boolean) => {
      if (unsubCallRef.current) unsubCallRef.current();

      const unsub = callService.subscribeCall(callId, async (updated) => {
        if (!updated) {
          cleanupCallResources();
          setActiveCall(null);
          return;
        }

        setActiveCall(updated);

        // Chime on transition to active
        if (prevStatusRef.current === 'ringing' && updated.status === 'active') {
          playCallConnectedChime();
        }
        prevStatusRef.current = updated.status;

        // Handle Call Ended / Declined / Missed
        if (updated.status === 'ended' || updated.status === 'declined' || updated.status === 'missed') {
          playCallEndedChime();
          const label =
            updated.status === 'declined'
              ? 'Call declined'
              : updated.status === 'missed'
              ? 'No answer'
              : 'Call ended';
          showSuccess(label);
          setTimeout(() => {
            cleanupCallResources();
            setActiveCall(null);
          }, 500);
          return;
        }

        // 1:1 Caller handles remote answer
        if (!isGroupCall && isCaller && updated.answer) {
          const pc = pcMapRef.current['direct'];
          if (pc && !pc.currentRemoteDescription) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(updated.answer as any));
              remoteDescSetRef.current['direct'] = true;
              const queued = pendingIceRef.current['direct'] || [];
              pendingIceRef.current['direct'] = [];
              for (const c of queued) {
                await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
              }
            } catch (err) {
              console.warn('Error setting remote answer:', err);
            }
          }
        }

        // Group Mesh Peer Discovery for each active participant
        if (isGroupCall && updated.activeParticipantIds?.length > 1) {
          updated.activeParticipantIds.forEach(async (otherUid) => {
            if (otherUid === myUserId) return;
            const pairId = getPeerPairId(myUserId, otherUid);
            if (handledPeerPairsRef.current.has(pairId)) return;
            handledPeerPairsRef.current.add(pairId);

            const amOfferer = myUserId < otherUid;
            const pc = new RTCPeerConnection(ICE_SERVERS);

            if (localStreamRef.current) {
              localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
              });
            }

            attachPeerHandlers(pairId, otherUid, pc, (cand) => {
              callService.addPeerCandidate(callId, pairId, myUserId, cand).catch(() => {});
            });

            const unsubPeerIce = callService.subscribePeerCandidates(
              callId,
              pairId,
              myUserId,
              async (cand) => {
                if (remoteDescSetRef.current[pairId]) {
                  await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                } else {
                  pendingIceRef.current[pairId] = [...(pendingIceRef.current[pairId] || []), cand];
                }
              }
            );
            unsubSubListenersRef.current.push(unsubPeerIce);

            const unsubPeerDoc = callService.subscribePeerDoc(callId, pairId, async (data) => {
              if (amOfferer && data.answer && !pc.currentRemoteDescription) {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                  remoteDescSetRef.current[pairId] = true;
                  for (const c of pendingIceRef.current[pairId] || []) {
                    await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                  }
                  pendingIceRef.current[pairId] = [];
                } catch {}
              } else if (!amOfferer && data.offer && !pc.currentRemoteDescription) {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                  remoteDescSetRef.current[pairId] = true;
                  const ans = await pc.createAnswer();
                  await pc.setLocalDescription(ans);
                  await callService.setPeerAnswer(callId, pairId, {
                    type: ans.type,
                    sdp: ans.sdp || '',
                  });
                  for (const c of pendingIceRef.current[pairId] || []) {
                    await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                  }
                  pendingIceRef.current[pairId] = [];
                } catch {}
              }
            });
            unsubSubListenersRef.current.push(unsubPeerDoc);

            if (amOfferer) {
              try {
                const offer = await pc.createOffer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: true,
                });
                await pc.setLocalDescription(offer);
                await callService.setPeerOffer(callId, pairId, {
                  type: offer.type,
                  sdp: offer.sdp || '',
                });
              } catch {}
            }
          });
        }

        // Live Reaction Burst Sync
        if (updated.latestReaction && updated.latestReaction.id !== lastSeenReactionIdRef.current) {
          lastSeenReactionIdRef.current = updated.latestReaction.id;
          const reactionItem: FloatingCallReaction = {
            ...updated.latestReaction,
            xPercent: 18 + Math.floor(Math.random() * 64),
          };
          setFloatingReactions((prev) => [...prev.slice(-12), reactionItem]);
          if (soundEffectsEnabled) {
            playSoundboardChime(reactionItem.emoji);
          }
          setTimeout(() => {
            setFloatingReactions((prev) => prev.filter((r) => r.id !== reactionItem.id));
          }, 2600);
        }

        // Live Translated Captions Sync
        if (updated.latestCaption && updated.latestCaption.id !== lastSeenCaptionIdRef.current) {
          lastSeenCaptionIdRef.current = updated.latestCaption.id;
          setActiveCaption(updated.latestCaption);
        }
      });

      unsubCallRef.current = unsub;
    },
    [attachPeerHandlers, cleanupCallResources, showSuccess, soundEffectsEnabled]
  );

  // ============================================================
  // Start Outgoing 1:1 or Group Call
  // ============================================================
  const startCall = async (input: StartCallInput) => {
    if (!user?.id) return;
    if (activeCallRef.current) {
      showError('You are already on an active call.');
      return;
    }

    const filteredCalleeIds = Array.from(new Set(input.calleeIds.filter((id) => id && id !== user.id)));
    if (filteredCalleeIds.length === 0) {
      showError('No other family members available to call right now.');
      return;
    }

    cleanupCallResources();
    setFacingMode('user');
    setIsVideoOff(input.type === 'audio');

    const stream = await acquireLocalMedia(input.type, 'user');
    if (stream) {
      localStreamRef.current = stream;
      setLocalStream(stream);
    }

    try {
      let directPc: RTCPeerConnection | null = null;
      let offerPayload: { type: string; sdp: string } | undefined;

      if (!input.isGroup) {
        directPc = new RTCPeerConnection(ICE_SERVERS);
        if (stream) {
          stream.getTracks().forEach((track) => directPc!.addTrack(track, stream));
        }
        const offer = await directPc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: input.type === 'video',
        });
        await directPc.setLocalDescription(offer);
        offerPayload = { type: offer.type, sdp: offer.sdp || '' };
      }

      const callerInfo: CallParticipantInfo = {
        id: user.id,
        name: user.name || user.fullName || 'You',
        avatar: user.avatar || user.profileImage || '',
        muted: !stream,
        videoOff: input.type === 'audio' || !stream,
        joinedAt: new Date().toISOString(),
      };

      const session = await callService.createCall({
        familyId: input.familyId,
        chatId: input.chatId,
        chatName: input.chatName,
        isGroup: input.isGroup,
        type: input.type,
        caller: {
          id: user.id,
          name: user.name || user.fullName || 'Family Member',
          avatar: user.avatar || user.profileImage || '',
        },
        calleeIds: filteredCalleeIds,
        participantDetails: {
          ...input.participantDetails,
          [user.id]: callerInfo,
        },
        offer: offerPayload,
      });

      prevStatusRef.current = session.status;
      setActiveCall(session);

      if (!input.isGroup && directPc) {
        const targetId = filteredCalleeIds[0];
        attachPeerHandlers('direct', targetId, directPc, (cand) => {
          callService.addCandidate(session.id, user.id, cand).catch(() => {});
        });

        const unsubCand = callService.subscribeCandidates(session.id, user.id, async (cand) => {
          if (remoteDescSetRef.current['direct']) {
            await directPc!.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          } else {
            pendingIceRef.current['direct'] = [...(pendingIceRef.current['direct'] || []), cand];
          }
        });
        unsubSubListenersRef.current.push(unsubCand);
      }

      attachCallDocWatcher(session.id, user.id, input.isGroup, true);
    } catch (err: any) {
      console.error('Failed to start call:', err);
      cleanupCallResources();
      showError(err?.message || 'Unable to start call right now.');
    }
  };

  // ============================================================
  // Accept Incoming Call
  // ============================================================
  const acceptIncomingCall = async (call: CallSession) => {
    if (!user?.id) return;
    cleanupCallResources();
    setIncomingCall(null);
    setFacingMode('user');
    setIsVideoOff(call.type === 'audio');

    const stream = await acquireLocalMedia(call.type, 'user');
    if (stream) {
      localStreamRef.current = stream;
      setLocalStream(stream);
    }

    const myInfo: CallParticipantInfo = {
      id: user.id,
      name: user.name || user.fullName || 'Member',
      avatar: user.avatar || user.profileImage || '',
      muted: !stream,
      videoOff: call.type === 'audio' || !stream,
    };

    try {
      if (!call.isGroup) {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        if (stream) {
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        }

        attachPeerHandlers('direct', call.callerId, pc, (cand) => {
          callService.addCandidate(call.id, user.id, cand).catch(() => {});
        });

        const unsubCand = callService.subscribeCandidates(call.id, user.id, async (cand) => {
          if (remoteDescSetRef.current['direct']) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          } else {
            pendingIceRef.current['direct'] = [...(pendingIceRef.current['direct'] || []), cand];
          }
        });
        unsubSubListenersRef.current.push(unsubCand);

        if (call.offer) {
          await pc.setRemoteDescription(new RTCSessionDescription(call.offer as any));
          remoteDescSetRef.current['direct'] = true;
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          for (const c of pendingIceRef.current['direct'] || []) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }
          pendingIceRef.current['direct'] = [];

          await callService.answerCall(call.id, user.id, myInfo, {
            type: answer.type,
            sdp: answer.sdp || '',
          });
        } else {
          await callService.answerCall(call.id, user.id, myInfo);
        }
      } else {
        await callService.answerCall(call.id, user.id, myInfo);
      }

      prevStatusRef.current = 'active';
      playCallConnectedChime();
      setActiveCall({ ...call, status: 'active' });
      attachCallDocWatcher(call.id, user.id, call.isGroup, false);
    } catch (err: any) {
      console.error('Accept call failed:', err);
      cleanupCallResources();
      showError(err?.message || 'Could not join call.');
    }
  };

  // ============================================================
  // Decline / Hang Up
  // ============================================================
  const declineIncomingCall = async (call: CallSession) => {
    setIncomingCall(null);
    playCallEndedChime();
    if (!call.isGroup) {
      await callService.endCall(call.id, 'declined');
    }
  };

  const hangUp = async () => {
    const current = activeCallRef.current;
    playCallEndedChime();
    if (current && user?.id) {
      if (current.isGroup && current.activeParticipantIds.length > 2) {
        await callService.leaveGroupCall(current.id, user.id);
      } else {
        const endStatus = current.status === 'ringing' && current.callerId === user.id ? 'missed' : 'ended';
        await callService.endCall(current.id, endStatus);
      }
    }
    cleanupCallResources();
    setActiveCall(null);
  };

  // ============================================================
  // Live Media Controls (Mute, Video, Flip Camera, Screen Share)
  // ============================================================
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !next;
      });
    }
    if (activeCallRef.current && user?.id) {
      callService.updateParticipantMedia(activeCallRef.current.id, user.id, { muted: next });
    }
  };

  const replaceVideoTrackOnPeers = async (newVideoTrack: MediaStreamTrack | null) => {
    const pcs = Object.values(pcMapRef.current);
    for (const pc of pcs) {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && newVideoTrack) {
        await sender.replaceTrack(newVideoTrack).catch(() => {});
      }
    }
  };

  const toggleVideo = async () => {
    const nextOff = !isVideoOff;
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks.forEach((t) => {
          t.enabled = !nextOff;
        });
        setIsVideoOff(nextOff);
      } else if (!nextOff && navigator.mediaDevices?.getUserMedia) {
        try {
          const camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
          const camTrack = camStream.getVideoTracks()[0];
          if (camTrack) {
            localStreamRef.current.addTrack(camTrack);
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            await replaceVideoTrackOnPeers(camTrack);
            setIsVideoOff(false);
          }
        } catch {
          showError('Camera permission unavailable.');
        }
      }
    } else {
      setIsVideoOff(nextOff);
    }

    if (activeCallRef.current && user?.id) {
      callService.updateParticipantMedia(activeCallRef.current.id, user.id, { videoOff: nextOff });
    }
  };

  const flipCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    try {
      const newCam = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing },
      });
      const newTrack = newCam.getVideoTracks()[0];
      if (!newTrack) return;

      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((old) => {
          old.stop();
          localStreamRef.current!.removeTrack(old);
        });
        localStreamRef.current.addTrack(newTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
      await replaceVideoTrackOnPeers(newTrack);
      setFacingMode(nextFacing);
      setIsVideoOff(false);
    } catch {
      showError('Could not switch camera on this device.');
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      // Restore camera track if available
      const camTrack = localStreamRef.current?.getVideoTracks()[0] || null;
      if (camTrack) {
        await replaceVideoTrackOnPeers(camTrack);
      }
      if (activeCallRef.current && user?.id) {
        callService.updateParticipantMedia(activeCallRef.current.id, user.id, { screenSharing: false });
      }
      return;
    }

    if (!navigator.mediaDevices || !('getDisplayMedia' in navigator.mediaDevices)) {
      showError('Screen sharing is not supported on this mobile browser.');
      return;
    }

    try {
      const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
        audio: false,
      });
      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) return;

      screenStreamRef.current = displayStream;
      setIsScreenSharing(true);
      await replaceVideoTrackOnPeers(screenTrack);

      if (activeCallRef.current && user?.id) {
        callService.updateParticipantMedia(activeCallRef.current.id, user.id, { screenSharing: true });
      }

      screenTrack.onended = () => {
        setIsScreenSharing(false);
        const camTrack = localStreamRef.current?.getVideoTracks()[0] || null;
        if (camTrack) replaceVideoTrackOnPeers(camTrack);
        if (activeCallRef.current && user?.id) {
          callService.updateParticipantMedia(activeCallRef.current.id, user.id, { screenSharing: false });
        }
      };
    } catch {
      // User cancelled screen picker
    }
  };

  // ============================================================
  // Live Call Interactive Reactions & Translated Captions
  // ============================================================
  const sendReaction = async (emoji: string, label?: string) => {
    const current = activeCallRef.current;
    if (!current || !user?.id) return;

    const reaction: CallReaction = {
      id: `rx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      emoji,
      label,
      senderId: user.id,
      senderName: user.name || user.fullName || 'Member',
      createdAt: Date.now(),
    };

    lastSeenReactionIdRef.current = reaction.id;
    const item: FloatingCallReaction = {
      ...reaction,
      xPercent: 18 + Math.floor(Math.random() * 64),
    };
    setFloatingReactions((prev) => [...prev.slice(-12), item]);
    if (soundEffectsEnabled) playSoundboardChime(emoji);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== item.id));
    }, 2600);

    await callService.sendReaction(current.id, reaction);
  };

  const toggleCaptions = () => {
    const SpeechRec =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRec) {
      showError('Live speech captions require Chrome, Edge, or Safari speech support.');
      return;
    }

    if (captionsEnabled) {
      if (speechRecRef.current) {
        try {
          speechRecRef.current.stop();
        } catch {}
        speechRecRef.current = null;
      }
      setCaptionsEnabled(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onresult = async (event: any) => {
        const lastIdx = event.results.length - 1;
        const transcript = event.results?.[lastIdx]?.[0]?.transcript?.trim();
        const current = activeCallRef.current;
        if (!transcript || !current || !user?.id) return;

        let translatedText: string | undefined;
        if (autoTranslateCaptions) {
          try {
            const res = await aiService.sendMessage(
              [],
              `Translate concisely between English and Urdu (if English -> natural Roman Urdu, else English): "${transcript}"`,
              { systemInstruction: 'Return only the short translation.' }
            );
            translatedText = res.reply?.trim();
          } catch {}
        }

        const cap: CallCaption = {
          id: `cap_${Date.now()}`,
          senderId: user.id,
          senderName: user.name || user.fullName || 'Speaker',
          text: transcript,
          translatedText,
          createdAt: Date.now(),
        };
        lastSeenCaptionIdRef.current = cap.id;
        setActiveCaption(cap);
        callService.sendCaption(current.id, cap);
      };
      rec.onerror = () => {};
      rec.onend = () => {
        if (speechRecRef.current === rec && activeCallRef.current) {
          try {
            rec.start();
          } catch {}
        }
      };
      speechRecRef.current = rec;
      rec.start();
      setCaptionsEnabled(true);
    } catch {
      setCaptionsEnabled(false);
    }
  };

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        localStream,
        remoteStreams,
        isMuted,
        isVideoOff,
        isScreenSharing,
        isMinimized,
        setIsMinimized,
        soundEffectsEnabled,
        setSoundEffectsEnabled,
        callDurationSec,
        mediaWarning,
        floatingReactions,
        captionsEnabled,
        toggleCaptions,
        autoTranslateCaptions,
        setAutoTranslateCaptions,
        activeCaption,
        startCall,
        acceptIncomingCall,
        declineIncomingCall,
        hangUp,
        toggleMute,
        toggleVideo,
        flipCamera,
        toggleScreenShare,
        sendReaction,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
};
