import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { useToast } from '../../context/ToastContext';
import { chatService } from '../../services/chatService';
import { personalChatService } from '../../services/personalChatService';
import { PersonalChat } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import {
  Camera,
  Video,
  Square,
  RefreshCw,
  Upload,
  Send,
  X,
  Users,
  FileText,
  Check,
  Loader2,
  RotateCcw,
} from 'lucide-react';

interface CameraShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  personalChats: PersonalChat[];
  chatRoomId: string;
  onSharedSuccess?: (destinationCount: number) => void;
  onCaptureDirect?: (file: File, captionText: string) => Promise<void>;
  directTargetLabel?: string;
}

interface ShareTarget {
  key: string;
  kind: 'family' | 'personal' | 'member';
  label: string;
  subtitle: string;
  avatar?: string;
  isGroup?: boolean;
  chat?: PersonalChat;
  member?: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
    role?: string;
  };
}

export const CameraShareModal: React.FC<CameraShareModalProps> = ({
  isOpen,
  onClose,
  personalChats,
  chatRoomId,
  onSharedSuccess,
  onCaptureDirect,
  directTargetLabel,
}) => {
  const { user } = useAuth();
  const { family, members } = useFamily();
  const { showError, showSuccess } = useToast();

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const filePickerRef = useRef<HTMLInputElement>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Captured / selected media state
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedTargetKeys, setSelectedTargetKeys] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);

  const stopCameraStream = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setIsRecordingVideo(false);
  };

  const startCameraStream = async (facing: 'environment' | 'user') => {
    stopCameraStream();
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live camera preview is unavailable on this browser. Choose an image, video, or file below.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: true,
        });
      } catch {
        // Fallback to video-only if mic permission is denied
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true;
        await videoPreviewRef.current.play().catch(() => {});
      }
      setCameraReady(true);
    } catch (err: any) {
      setCameraError('Camera access blocked or unavailable. You can still upload a photo, video, or file below.');
    }
  };

  useEffect(() => {
    if (isOpen && !capturedFile) {
      startCameraStream(facingMode);
    }
    if (!isOpen) {
      stopCameraStream();
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
      setCapturedFile(null);
      setPreviewObjectUrl(null);
      setCaption('');
      setSelectedTargetKeys({});
      setRecordSeconds(0);
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, facingMode]);

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  const handleCapturePhoto = () => {
    const videoEl = videoPreviewRef.current;
    if (!videoEl || !cameraReady) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth || 1280;
    canvas.height = videoEl.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `Photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        setCapturedFile(file);
        setPreviewObjectUrl(URL.createObjectURL(file));
        stopCameraStream();
      },
      'image/jpeg',
      0.9
    );
  };

  const handleToggleVideoRecord = () => {
    if (!streamRef.current) return;

    if (isRecordingVideo && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecordingVideo(false);
      return;
    }

    try {
      recordedChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'video/webm' });
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([blob], `Video_${Date.now()}.${ext}`, {
          type: blob.type || 'video/webm',
        });
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        setCapturedFile(file);
        setPreviewObjectUrl(URL.createObjectURL(file));
        stopCameraStream();
      };

      recorder.start();
      setIsRecordingVideo(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      showError('Video recording is not supported on this device/browser.');
    }
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      showError('File size exceeds 25MB limit.');
      return;
    }
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    setCapturedFile(file);
    setPreviewObjectUrl(
      file.type.startsWith('image/') || file.type.startsWith('video/')
        ? URL.createObjectURL(file)
        : null
    );
    stopCameraStream();
    if (filePickerRef.current) filePickerRef.current.value = '';
  };

  const handleRetake = () => {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    setCapturedFile(null);
    setPreviewObjectUrl(null);
    setRecordSeconds(0);
    startCameraStream(facingMode);
  };

  // Build list of available Family Group + Private Groups + Direct Chats + Members
  const shareTargets = useMemo<ShareTarget[]>(() => {
    const list: ShareTarget[] = [];
    if (family) {
      list.push({
        key: 'family_group',
        kind: 'family',
        label: family.name || 'Family Group',
        subtitle: `Family Group • ${members.length} members`,
        avatar: family.photo || family.avatar,
        isGroup: true,
      });
    }

    const coveredMemberIds = new Set<string>();
    personalChats.forEach((c) => {
      const otherId = c.isGroup ? '' : c.participantIds.find((id) => id !== user?.id) || '';
      if (otherId) coveredMemberIds.add(otherId);
      const other = otherId ? c.participantDetails?.[otherId] : undefined;
      list.push({
        key: `pchat_${c.id}`,
        kind: 'personal',
        label: c.isGroup ? c.groupName || 'Private Group' : other?.name || 'Direct Chat',
        subtitle: c.isGroup ? `Group • ${c.participantIds.length} members` : 'Direct 1:1 chat',
        avatar: c.isGroup ? undefined : other?.avatar,
        isGroup: Boolean(c.isGroup),
        chat: c,
      });
    });

    members.forEach((m) => {
      const mId = m.userId || m.id;
      if (!mId || mId === user?.id || m.status === 'removed' || coveredMemberIds.has(mId)) return;
      list.push({
        key: `member_${mId}`,
        kind: 'member',
        label: m.userName || 'Family Member',
        subtitle: m.role || 'Member',
        avatar: m.userPhoto,
        member: {
          id: mId,
          name: m.userName || 'Family Member',
          avatar: m.userPhoto,
          email: m.userEmail,
          role: m.role,
        },
      });
    });

    return list;
  }, [family, members, personalChats, user?.id]);

  const selectedList = useMemo(
    () => shareTargets.filter((t) => selectedTargetKeys[t.key]),
    [shareTargets, selectedTargetKeys]
  );

  const toggleTarget = (key: string) => {
    setSelectedTargetKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSendToSelected = async () => {
    if (!capturedFile) return;
    if (onCaptureDirect) {
      setSending(true);
      try {
        await onCaptureDirect(capturedFile, caption.trim());
        onClose();
      } catch (err: any) {
        showError(err?.message || 'Could not send captured media.');
      } finally {
        setSending(false);
      }
      return;
    }

    if (!user || !family || selectedList.length === 0) return;
    setSending(true);
    try {
      for (const target of selectedList) {
        if (target.kind === 'family' && chatRoomId) {
          const att = await chatService.uploadAttachment({
            familyId: family.id,
            chatRoomId,
            file: capturedFile,
          });
          await chatService.sendMessage({
            chatRoomId,
            familyId: family.id,
            sender: user,
            text: caption.trim(),
            attachments: [att],
          });
        } else if (target.kind === 'personal' && target.chat) {
          const chat = target.chat;
          const att = await personalChatService.uploadPersonalFile({
            familyId: chat.familyId || family.id,
            chatId: chat.id,
            file: capturedFile,
          });
          const otherId = chat.isGroup
            ? 'group'
            : chat.participantIds.find((id) => id !== user.id) || '';
          await personalChatService.sendPersonalMessage({
            chatId: chat.id,
            familyId: chat.familyId || family.id,
            sender: user,
            recipient: {
              id: otherId,
              name: target.label,
            },
            participantIds: chat.participantIds,
            text: caption.trim(),
            attachments: [att],
            type: att.fileType === 'image' ? 'image' : 'file',
          });
        } else if (target.kind === 'member' && target.member) {
          const ensuredChat = await personalChatService.ensurePersonalChatExists({
            familyId: family.id,
            currentUser: user,
            otherMember: target.member,
          });
          const att = await personalChatService.uploadPersonalFile({
            familyId: family.id,
            chatId: ensuredChat.id,
            file: capturedFile,
          });
          await personalChatService.sendPersonalMessage({
            chatId: ensuredChat.id,
            familyId: family.id,
            sender: user,
            recipient: {
              id: target.member.id,
              name: target.member.name,
            },
            participantIds: ensuredChat.participantIds,
            text: caption.trim(),
            attachments: [att],
            type: att.fileType === 'image' ? 'image' : 'file',
          });
        }
      }

      showSuccess(
        `Shared with ${selectedList.length} ${selectedList.length === 1 ? 'chat' : 'chats'}!`
      );
      if (onSharedSuccess) onSharedSuccess(selectedList.length);
      onClose();
    } catch (err: any) {
      showError(err?.message || 'Could not send media.');
    } finally {
      setSending(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !sending && onClose()} title="Camera & Share Media" maxWidth="md">
      <div className="space-y-4">
        <input
          ref={filePickerRef}
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx,*"
          onChange={handleFilePicked}
          className="hidden"
        />

        {!capturedFile ? (
          <div className="space-y-3">
            {/* Live Camera Stage */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800">
              {cameraError ? (
                <div className="p-6 text-center space-y-3">
                  <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                    {cameraError}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => filePickerRef.current?.click()}
                    icon={<Upload className="w-4 h-4" />}
                  >
                    Select Photo, Video or File
                  </Button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoPreviewRef}
                    playsInline
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
                      <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                    </div>
                  )}
                  {isRecordingVideo && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shadow">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span>REC {formatTimer(recordSeconds)}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))
                    }
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
                    title="Switch Camera"
                    aria-label="Switch Camera"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Capture Controls Row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => filePickerRef.current?.click()}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Photo / Video / File</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!cameraReady || isRecordingVideo}
                  onClick={handleCapturePhoto}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-40 cursor-pointer shadow-xs"
                >
                  <Camera className="w-4 h-4" />
                  <span>Take Photo</span>
                </button>

                <button
                  type="button"
                  disabled={!cameraReady}
                  onClick={handleToggleVideoRecord}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-white text-xs font-bold disabled:opacity-40 cursor-pointer shadow-xs ${
                    isRecordingVideo
                      ? 'bg-rose-600 hover:bg-rose-700 animate-pulse'
                      : 'bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700'
                  }`}
                >
                  {isRecordingVideo ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop ({formatTimer(recordSeconds)})</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      <span>Record Video</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ==================== MEDIA PREVIEW + SHARE DESTINATION ==================== */
          <div className="space-y-3.5">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center max-h-56">
              {capturedFile.type.startsWith('image/') && previewObjectUrl ? (
                <img
                  src={previewObjectUrl}
                  alt={capturedFile.name}
                  className="max-h-56 w-auto object-contain"
                />
              ) : capturedFile.type.startsWith('video/') && previewObjectUrl ? (
                <video
                  src={previewObjectUrl}
                  controls
                  playsInline
                  className="max-h-56 w-full bg-black"
                />
              ) : (
                <div className="p-5 flex items-center gap-3 text-white">
                  <FileText className="w-8 h-8 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{capturedFile.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {(capturedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleRetake}
                disabled={sending}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/70 hover:bg-black/90 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Change
              </button>
            </div>

            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption (optional)..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {onCaptureDirect ? (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                <span>Sending to: <strong>{directTargetLabel || 'Current Chat'}</strong></span>
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Share with Member or Group ({selectedList.length} selected)
                </p>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
                  {shareTargets.map((target) => {
                    const checked = Boolean(selectedTargetKeys[target.key]);
                    return (
                      <div
                        key={target.key}
                        onClick={() => toggleTarget(target.key)}
                        className={`p-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                          checked
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {target.isGroup && !target.avatar ? (
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                              <Users className="w-4 h-4" />
                            </div>
                          ) : (
                            <Avatar src={target.avatar} name={target.label} size="sm" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {target.label}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">{target.subtitle}</p>
                          </div>
                        </div>

                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                            checked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" />}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={onClose} disabled={sending}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                loading={sending}
                disabled={!onCaptureDirect && selectedList.length === 0}
                onClick={handleSendToSelected}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                {onCaptureDirect ? 'Send Now' : `Send to ${selectedList.length || ''}`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
