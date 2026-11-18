import React, { useState, useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useBackButtonClose } from '../../hooks/useOverlayDismiss';
import { Avatar } from '../ui/Avatar';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  SwitchCamera,
  Minimize2,
  Maximize2,
  Sparkles,
  Captions,
  Camera,
  Volume2,
  VolumeX,
  Languages,
  FlipHorizontal2,
  Users,
  SmilePlus,
  AlertCircle,
} from 'lucide-react';

type VideoFilterId = 'normal' | 'warm' | 'cool' | 'vintage' | 'neon';

const VIDEO_FILTERS: Array<{ id: VideoFilterId; label: string; css: string }> = [
  { id: 'normal', label: 'Natural', css: '' },
  { id: 'warm', label: 'Warm Glow', css: 'brightness(1.06) saturate(1.28) sepia(0.18)' },
  { id: 'cool', label: 'Cool Cinema', css: 'contrast(1.08) saturate(0.92) hue-rotate(12deg)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.55) contrast(0.96) brightness(1.02)' },
  { id: 'neon', label: 'Pop Color', css: 'saturate(1.55) contrast(1.12)' },
];

const SOUNDBOARD_ITEMS = [
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Haha' },
  { emoji: '👏', label: 'Shabash' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🥳', label: 'Mubarak' },
];

function formatDuration(sec: number): string {
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const rem = sec % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
}

const StreamVideoPlayer: React.FC<{
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
  filterCss?: string;
  className?: string;
  videoRefExternal?: React.RefObject<HTMLVideoElement | null>;
}> = ({ stream, muted = false, mirrored = false, filterCss = '', className = '', videoRefExternal }) => {
  const internalRef = useRef<HTMLVideoElement>(null);
  const ref = videoRefExternal || internalRef;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream || null;
    }
    if (stream) {
      el.play().catch(() => {});
    }
  }, [stream, ref]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      style={{
        transform: mirrored ? 'scaleX(-1)' : undefined,
        filter: filterCss || undefined,
      }}
      className={className}
    />
  );
};

export const CallOverlay: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const {
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
    acceptIncomingCall,
    declineIncomingCall,
    hangUp,
    toggleMute,
    toggleVideo,
    flipCamera,
    toggleScreenShare,
    sendReaction,
  } = useCall();

  const [activeFilter, setActiveFilter] = useState<VideoFilterId>('normal');
  const [mirrorLocal, setMirrorLocal] = useState(true);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showSoundboard, setShowSoundboard] = useState(false);

  const primaryRemoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Mobile/browser Back minimizes expanded call cleanly instead of disconnecting
  useBackButtonClose(
    Boolean(activeCall && !isMinimized),
    () => setIsMinimized(true),
    'active-call'
  );

  // Back declines incoming call overlay if dismissed
  useBackButtonClose(
    Boolean(incomingCall && !activeCall),
    () => {
      if (incomingCall) declineIncomingCall(incomingCall);
    },
    'incoming-call'
  );

  const remoteEntries = Object.entries(remoteStreams);
  const filterCss = VIDEO_FILTERS.find((f) => f.id === activeFilter)?.css || '';

  const handleCaptureSnapshot = () => {
    const videoEl = primaryRemoteVideoRef.current?.srcObject
      ? primaryRemoteVideoRef.current
      : localVideoRef.current;

    if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) {
      showError('Turn on video first to capture a call snapshot.');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (filterCss) {
        ctx.filter = filterCss;
      }
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';

      // Subtle watermark pill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(16, canvas.height - 46, 260, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`FamilyHub Call • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 26, canvas.height - 26);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `familyhub-call-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess('Call snapshot saved!');
    } catch {
      showError('Could not capture snapshot right now.');
    }
  };

  // ============================================================
  // 1. Incoming Call Ringing Card (when not already in a call)
  // ============================================================
  if (incomingCall && !activeCall) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 shadow-2xl p-6 text-center text-white space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
            {incomingCall.type === 'video' ? (
              <Video className="w-3.5 h-3.5 animate-pulse" />
            ) : (
              <Phone className="w-3.5 h-3.5 animate-pulse" />
            )}
            <span>
              Incoming {incomingCall.isGroup ? 'Group ' : ''}
              {incomingCall.type === 'video' ? 'HD Video Call' : 'Voice Call'}
            </span>
          </div>

          <div className="relative flex flex-col items-center">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
              <Avatar
                src={incomingCall.callerAvatar}
                name={incomingCall.callerName}
                size="lg"
                className="w-24 h-24 ring-4 ring-emerald-400/50 relative z-10 text-2xl"
              />
            </div>

            <h2 className="mt-4 text-xl font-extrabold tracking-tight">
              {incomingCall.isGroup ? incomingCall.chatName : incomingCall.callerName}
            </h2>
            {incomingCall.isGroup && (
              <p className="text-xs text-slate-400 mt-0.5">
                {incomingCall.callerName} invited you to join
              </p>
            )}
            <p className="text-xs text-emerald-400 font-semibold mt-1 animate-pulse">
              Ringing...
            </p>
          </div>

          <div className="flex items-center justify-center gap-8 pt-2">
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => declineIncomingCall(incomingCall)}
                className="w-15 h-15 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-950/60 active:scale-95 transition-all cursor-pointer"
                aria-label="Decline call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <span className="text-xs font-semibold text-slate-300">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => acceptIncomingCall(incomingCall)}
                className="w-15 h-15 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-950/60 active:scale-95 transition-all cursor-pointer animate-bounce"
                aria-label="Accept call"
              >
                {incomingCall.type === 'video' ? (
                  <Video className="w-6 h-6" />
                ) : (
                  <Phone className="w-6 h-6" />
                )}
              </button>
              <span className="text-xs font-semibold text-emerald-300">Accept</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activeCall) return null;

  // Determine counterpart display info for 1:1
  const otherParticipant = Object.values(activeCall.participantDetails || {}).find(
    (p) => p.id !== user?.id
  );
  const callTitle = activeCall.isGroup
    ? activeCall.chatName
    : otherParticipant?.name || activeCall.chatName || 'Family Call';
  const callAvatar = activeCall.isGroup ? undefined : otherParticipant?.avatar || activeCall.callerAvatar;

  // ============================================================
  // 2. Minimized Floating Pill Bar (Browse App While On Call!)
  // ============================================================
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[80] flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-slate-900/95 text-white border border-slate-700 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200 max-w-[92vw]">
        <div
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 cursor-pointer min-w-0"
          title="Tap to expand call"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold truncate max-w-[130px]">{callTitle}</p>
            <p className="text-[10px] font-mono text-emerald-300 tabular-nums">
              {activeCall.status === 'active' ? formatDuration(callDurationSec) : 'Ringing...'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleMute}
          className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
            isMuted ? 'bg-rose-600/80 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
          title="Expand Call Studio"
          aria-label="Expand call"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={hangUp}
          className="w-8 h-8 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center cursor-pointer"
          title="End Call"
          aria-label="End call"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ============================================================
  // 3. Full Call Studio Overlay (Video / Audio / Screen Share / Fun)
  // ============================================================
  const hasRemoteVideo = remoteEntries.some(([, st]) => st.getVideoTracks().length > 0);
  const hasLocalVideo = Boolean(localStream && localStream.getVideoTracks().length > 0 && !isVideoOff);

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950 text-white flex flex-col overflow-hidden select-none animate-in fade-in duration-150">
      {/* Top Bar */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer shrink-0"
            title="Minimize call & keep talking while browsing app"
            aria-label="Minimize call"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold truncate">{callTitle}</h2>
              {activeCall.isGroup && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold">
                  <Users className="w-3 h-3" /> {activeCall.activeParticipantIds?.length || 1}
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-emerald-300">
              {activeCall.status === 'active'
                ? formatDuration(callDurationSec)
                : activeCall.status === 'ringing'
                ? 'Calling...'
                : 'Connecting...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setSoundEffectsEnabled(!soundEffectsEnabled)}
            className={`px-2.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
              soundEffectsEnabled ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-400'
            }`}
            title={soundEffectsEnabled ? 'Mute soundboard chimes' : 'Enable soundboard chimes'}
          >
            {soundEffectsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">SFX</span>
          </button>

          <button
            type="button"
            onClick={handleCaptureSnapshot}
            className="px-2.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            title="Save a Call Photo Moment"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Snap</span>
          </button>
        </div>
      </div>

      {/* Warning Banner if mic/cam restricted */}
      {mediaWarning && (
        <div className="mx-4 mt-1 px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs flex items-center gap-2 z-20 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{mediaWarning}</span>
        </div>
      )}

      {/* Main Stage (Remote Participants / Audio Avatar Stage) */}
      <div className="flex-1 relative flex items-center justify-center p-3 sm:p-5 overflow-hidden">
        {remoteEntries.length > 0 && hasRemoteVideo ? (
          <div
            className={`w-full h-full grid gap-3 ${
              remoteEntries.length === 1
                ? 'grid-cols-1'
                : remoteEntries.length === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-2'
            }`}
          >
            {remoteEntries.map(([peerId, stream], idx) => {
              const info = activeCall.participantDetails?.[peerId];
              const hasTrackVideo = stream.getVideoTracks().some((t) => t.enabled);
              return (
                <div
                  key={peerId}
                  className="relative w-full h-full rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center"
                >
                  {hasTrackVideo ? (
                    <StreamVideoPlayer
                      stream={stream}
                      muted={false}
                      videoRefExternal={idx === 0 ? primaryRemoteVideoRef : undefined}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Avatar src={info?.avatar} name={info?.name || 'Member'} size="lg" className="w-24 h-24 ring-4 ring-emerald-500/40" />
                      <p className="text-sm font-bold">{info?.name || 'Connected'}</p>
                      <StreamVideoPlayer stream={stream} muted={false} className="hidden" />
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold flex items-center gap-1.5">
                    <span>{info?.name || 'Family Member'}</span>
                    {info?.muted && <MicOff className="w-3 h-3 text-rose-400" />}
                    {info?.screenSharing && <MonitorUp className="w-3 h-3 text-emerald-400" />}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Audio / Waiting / Ringing Centerpiece */
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            {/* Hidden audio renderers for remote audio-only streams */}
            {remoteEntries.map(([peerId, stream]) => (
              <StreamVideoPlayer key={peerId} stream={stream} muted={false} className="hidden" />
            ))}

            <div className="relative">
              <span className="absolute -inset-3 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-emerald-500 to-indigo-500 shadow-2xl">
                {activeCall.isGroup ? (
                  <div className="w-28 h-28 rounded-full bg-slate-900 flex items-center justify-center">
                    <Users className="w-12 h-12 text-emerald-400" />
                  </div>
                ) : (
                  <Avatar
                    src={callAvatar}
                    name={callTitle}
                    size="lg"
                    className="w-28 h-28 text-3xl"
                  />
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-extrabold">{callTitle}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {activeCall.status === 'ringing'
                  ? 'Waiting for family member to answer...'
                  : remoteEntries.length > 0
                  ? 'Audio connected • Clear HD voice'
                  : 'Connected to FamilyHub Call Studio'}
              </p>
            </div>

            {isScreenSharing && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <MonitorUp className="w-3.5 h-3.5" /> Sharing your screen live
              </span>
            )}
          </div>
        )}

        {/* Self Preview PiP Card (draggable-feel corner preview) */}
        {(hasLocalVideo || isScreenSharing) && (
          <div className="absolute bottom-4 right-4 w-28 sm:w-36 aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border-2 border-white/25 shadow-2xl z-20">
            <StreamVideoPlayer
              stream={localStream}
              muted={true}
              mirrored={mirrorLocal && !isScreenSharing}
              filterCss={isScreenSharing ? '' : filterCss}
              videoRefExternal={localVideoRef}
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold">
              You
            </span>
          </div>
        )}

        {/* Floating Live Emoji & Soundboard Reactions Layer */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-30">
          {floatingReactions.map((r) => (
            <div
              key={r.id}
              style={{ left: `${r.xPercent}%`, bottom: '18%' }}
              className="absolute flex flex-col items-center animate-bounce"
            >
              <span className="text-4xl sm:text-5xl drop-shadow-xl">{r.emoji}</span>
              <span className="mt-1 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-bold whitespace-nowrap">
                {r.senderName.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>

        {/* Live Translated Captions Overlay */}
        {(captionsEnabled || activeCaption) && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[92%] max-w-lg z-30">
            <div className="px-3.5 py-2.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 text-center space-y-1 shadow-xl">
              {activeCaption ? (
                <>
                  <p className="text-xs font-bold text-white">
                    <span className="text-emerald-400 mr-1.5">{activeCaption.senderName}:</span>
                    {activeCaption.text}
                  </p>
                  {activeCaption.translatedText && (
                    <p className="text-xs font-semibold text-amber-300 flex items-center justify-center gap-1">
                      <Languages className="w-3 h-3 shrink-0" />
                      <span>{activeCaption.translatedText}</span>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-slate-300">
                  Live AI Captions listening... speak clearly
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expandable Fun Soundboard & Video Filters Strip */}
      {(showSoundboard || showFiltersPanel) && (
        <div className="px-4 pb-2 z-20 shrink-0">
          {showSoundboard && (
            <div className="max-w-lg mx-auto p-2 rounded-2xl bg-slate-900/95 border border-slate-700/80 flex items-center justify-around gap-1 shadow-xl animate-in slide-in-from-bottom-2">
              {SOUNDBOARD_ITEMS.map((item) => (
                <button
                  key={item.emoji}
                  type="button"
                  onClick={() => sendReaction(item.emoji, item.label)}
                  className="flex flex-col items-center px-2.5 py-1.5 rounded-xl hover:bg-white/10 active:scale-125 transition-all cursor-pointer"
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-[10px] font-bold text-slate-300">{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {showFiltersPanel && (
            <div className="max-w-lg mx-auto p-2 rounded-2xl bg-slate-900/95 border border-slate-700/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-xl animate-in slide-in-from-bottom-2">
              {VIDEO_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    activeFilter === f.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMirrorLocal((m) => !m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                  mirrorLocal ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                <FlipHorizontal2 className="w-3.5 h-3.5" /> Mirror
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom Controls Dock */}
      <div className="px-3 sm:px-6 pb-5 pt-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-20 shrink-0 space-y-3">
        {/* Secondary Modern Features Row (Screen Share, Reactions, Filters, Live Captions + AI Translate) */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isScreenSharing
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
            title="Share Screen (great for homework, bills, tech help)"
          >
            <MonitorUp className="w-3.5 h-3.5" />
            <span>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowSoundboard((v) => !v);
              setShowFiltersPanel(false);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              showSoundboard
                ? 'bg-pink-500 text-white'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
            title="Live Emoji Bursts & Soundboard"
          >
            <SmilePlus className="w-3.5 h-3.5" />
            <span>Reactions</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowFiltersPanel((v) => !v);
              setShowSoundboard(false);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              showFiltersPanel || activeFilter !== 'normal'
                ? 'bg-violet-500 text-white'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
            title="Video Studio Filters & Mirror"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>

          <button
            type="button"
            onClick={toggleCaptions}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              captionsEnabled
                ? 'bg-amber-500 text-slate-950'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
            title="Live Voice Captions & Translation"
          >
            <Captions className="w-3.5 h-3.5" />
            <span>{captionsEnabled ? 'Captions On' : 'Captions'}</span>
          </button>

          {captionsEnabled && (
            <button
              type="button"
              onClick={() => setAutoTranslateCaptions(!autoTranslateCaptions)}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                autoTranslateCaptions ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-300'
              }`}
              title="Auto-translate captions between Urdu & English"
            >
              <Languages className="w-3 h-3" />
              <span>AI Translate</span>
            </button>
          )}
        </div>

        {/* Main Hardware Controls Row */}
        <div className="flex items-center justify-center gap-4 sm:gap-5">
          <button
            type="button"
            onClick={toggleMute}
            className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              isMuted
                ? 'bg-white text-slate-900 shadow-lg'
                : 'bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={toggleVideo}
            className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              isVideoOff
                ? 'bg-white text-slate-900 shadow-lg'
                : 'bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700'
            }`}
            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            aria-label={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={flipCamera}
            className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="Switch Front / Back Camera"
            aria-label="Flip camera"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={hangUp}
            className="w-14 h-12 sm:w-16 sm:h-13 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-950/60 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="End Call"
            aria-label="End call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
