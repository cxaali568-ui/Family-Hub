import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  Camera,
  Upload,
  Cake,
  Palette,
  Heart,
  Crown,
  Star,
  Send,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Child } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { useToast } from '../../context/ToastContext';
import { chatService } from '../../services/chatService';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export interface BirthdayCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedChild?: Child | null;
  allChildren?: Child[];
}

export type CardThemeId = 'pastel_balloons' | 'royal_gold' | 'galaxy_stars' | 'superhero_sky' | 'candy_party';

interface CardThemeConfig {
  id: CardThemeId;
  name: string;
  badge: string;
  bgGradient: string;
  cardBorder: string;
  textColor: string;
  accentColor: string;
  subtextColor: string;
  cakeEmoji: string;
  stickers: string[];
  bannerBg: string;
}

const CARD_THEMES: CardThemeConfig[] = [
  {
    id: 'pastel_balloons',
    name: '🎈 Balloons & Confetti',
    badge: 'Popular',
    bgGradient: 'from-amber-100 via-rose-100 to-indigo-100 dark:from-slate-900 dark:via-rose-950/40 dark:to-indigo-950/40',
    cardBorder: 'border-rose-200 dark:border-rose-800/60',
    textColor: 'text-slate-900 dark:text-slate-100',
    accentColor: 'text-rose-600 dark:text-rose-400',
    subtextColor: 'text-slate-600 dark:text-slate-300',
    cakeEmoji: '🎂',
    stickers: ['🎈', '🎉', '✨', '🎁', '💖'],
    bannerBg: 'bg-rose-500 text-white',
  },
  {
    id: 'royal_gold',
    name: '👑 Royal Gold & Shimmer',
    badge: 'Luxury',
    bgGradient: 'from-amber-50 via-yellow-100 to-amber-200 dark:from-amber-950/40 dark:via-slate-900 dark:to-yellow-950/30',
    cardBorder: 'border-amber-300 dark:border-amber-700/60',
    textColor: 'text-amber-950 dark:text-amber-100',
    accentColor: 'text-amber-600 dark:text-amber-400',
    subtextColor: 'text-amber-900/80 dark:text-amber-200/80',
    cakeEmoji: '🍰',
    stickers: ['👑', '⭐', '✨', '💛', '🎉'],
    bannerBg: 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white',
  },
  {
    id: 'galaxy_stars',
    name: '🌟 Cosmic Galaxy',
    badge: 'Magical',
    bgGradient: 'from-slate-900 via-indigo-950 to-purple-950 text-white',
    cardBorder: 'border-indigo-500/50',
    textColor: 'text-white',
    accentColor: 'text-cyan-400',
    subtextColor: 'text-indigo-200',
    cakeEmoji: '🎂',
    stickers: ['🚀', '🌟', '✨', '🪐', '💫'],
    bannerBg: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white',
  },
  {
    id: 'superhero_sky',
    name: '⚡ Adventure & Sparks',
    badge: 'Dynamic',
    bgGradient: 'from-sky-100 via-blue-100 to-indigo-200 dark:from-slate-900 dark:via-sky-950/40 dark:to-blue-950/40',
    cardBorder: 'border-sky-300 dark:border-sky-700/60',
    textColor: 'text-slate-900 dark:text-slate-100',
    accentColor: 'text-sky-600 dark:text-sky-400',
    subtextColor: 'text-slate-600 dark:text-slate-300',
    cakeEmoji: '🧁',
    stickers: ['⚡', '🔥', '🏆', '⭐', '🎉'],
    bannerBg: 'bg-gradient-to-r from-sky-500 to-blue-600 text-white',
  },
  {
    id: 'candy_party',
    name: '🧁 Candyland Sweets',
    badge: 'Sweet',
    bgGradient: 'from-pink-100 via-fuchsia-50 to-purple-100 dark:from-pink-950/40 dark:via-slate-900 dark:to-purple-950/40',
    cardBorder: 'border-pink-300 dark:border-pink-700/60',
    textColor: 'text-pink-950 dark:text-pink-100',
    accentColor: 'text-pink-600 dark:text-pink-400',
    subtextColor: 'text-pink-900/80 dark:text-pink-200/80',
    cakeEmoji: '🍭',
    stickers: ['🧁', '🍬', '🎈', '💖', '✨'],
    bannerBg: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white',
  },
];

const PRESET_WISHES = [
  'Wishing you a day filled with laughter, sweet surprises, and big adventures! May all your brightest dreams take flight. 🎂✨',
  'Happy Birthday to our little superstar! You bring so much sunshine and joy into our family every single day! 🌟💖',
  'Salgirah Mubarak! May Allah bless you with good health, immense happiness, wisdom, and success in everything you do! 🤲🎈',
  'May your year ahead be as wonderful, playful, and adventurous as you are! Keep shining bright! 🚀🎉',
];

export const BirthdayCardModal: React.FC<BirthdayCardModalProps> = ({
  isOpen,
  onClose,
  selectedChild,
  allChildren = [],
}) => {
  const { user } = useAuth();
  const { currentFamily } = useFamily();
  const { showSuccess, showError } = useToast();

  const [activeChildId, setActiveChildId] = useState<string>(selectedChild?.id || (allChildren[0]?.id || 'custom'));
  const [customName, setCustomName] = useState<string>('');
  const [headline, setHeadline] = useState<string>('Happy Birthday!');
  const [ageText, setAgeText] = useState<string>('');
  const [customWish, setCustomWish] = useState<string>(PRESET_WISHES[0]);
  const [signature, setSignature] = useState<string>('With all our love, Family 💙');
  const [selectedThemeId, setSelectedThemeId] = useState<CardThemeId>('pastel_balloons');
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>('');
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [copiedWish, setCopiedWish] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCardRef = useRef<HTMLDivElement>(null);

  // Sync when selectedChild changes
  useEffect(() => {
    if (selectedChild) {
      setActiveChildId(selectedChild.id);
      populateFromChild(selectedChild);
    } else if (allChildren.length > 0) {
      setActiveChildId(allChildren[0].id);
      populateFromChild(allChildren[0]);
    }
  }, [selectedChild, allChildren]);

  const populateFromChild = (c: Child) => {
    setUploadedPhotoUrl(c.photo || '');
    let calculatedAge = '';
    if (c.dateOfBirth) {
      const birthYear = new Date(c.dateOfBirth).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      if (age > 0) {
        calculatedAge = `Turning ${age} Years Old! 🎉`;
      }
    }
    setAgeText(calculatedAge || 'Special Birthday Milestone!');
    setHeadline(`Happy Birthday, ${c.nickname || c.fullName.split(' ')[0]}! 🎂`);
  };

  const handleChildSelectChange = (id: string) => {
    setActiveChildId(id);
    if (id === 'custom') {
      setCustomName('Little Star');
      setAgeText('Happy Milestone! 🌟');
      setUploadedPhotoUrl('');
    } else {
      const found = allChildren.find((ch) => ch.id === id);
      if (found) populateFromChild(found);
    }
  };

  const activeChild = allChildren.find((c) => c.id === activeChildId);
  const displayName = activeChild ? activeChild.fullName : (customName.trim() || 'Little Star');
  const displayPhoto = uploadedPhotoUrl || activeChild?.photo || '';
  const currentTheme = CARD_THEMES.find((t) => t.id === selectedThemeId) || CARD_THEMES[0];

  // Handle custom image upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showError('Please upload an image smaller than 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedPhotoUrl(reader.result as string);
      showSuccess('Custom photo applied to card!');
    };
    reader.readAsDataURL(file);
  };

  // HTML5 Canvas Card Renderer
  const renderCardToCanvas = async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    const width = 1000;
    const height = 1250;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not initialize canvas context');

    // 1. Theme Background Gradients
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    if (selectedThemeId === 'galaxy_stars') {
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(0.5, '#1e1b4b');
      gradient.addColorStop(1, '#3b0764');
    } else if (selectedThemeId === 'royal_gold') {
      gradient.addColorStop(0, '#fffbeb');
      gradient.addColorStop(0.5, '#fef3c7');
      gradient.addColorStop(1, '#fde68a');
    } else if (selectedThemeId === 'superhero_sky') {
      gradient.addColorStop(0, '#e0f2fe');
      gradient.addColorStop(0.5, '#dbeafe');
      gradient.addColorStop(1, '#c7d2fe');
    } else if (selectedThemeId === 'candy_party') {
      gradient.addColorStop(0, '#fdf2f8');
      gradient.addColorStop(0.5, '#fce7f3');
      gradient.addColorStop(1, '#f3e8ff');
    } else {
      // pastel_balloons
      gradient.addColorStop(0, '#fef3c7');
      gradient.addColorStop(0.5, '#ffe4e6');
      gradient.addColorStop(1, '#e0e7ff');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Decorative Outer Border
    ctx.strokeStyle = selectedThemeId === 'galaxy_stars' ? '#818cf8' : selectedThemeId === 'royal_gold' ? '#d97706' : '#f43f5e';
    ctx.lineWidth = 14;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // Inner thin border
    ctx.strokeStyle = selectedThemeId === 'galaxy_stars' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 3;
    ctx.strokeRect(45, 45, width - 90, height - 90);

    // 3. Decorative Confetti & Sparkles
    const isDark = selectedThemeId === 'galaxy_stars';
    ctx.fillStyle = isDark ? '#ffffff' : '#f59e0b';
    const points = [
      [100, 100], [900, 100], [80, 400], [920, 420],
      [120, 800], [880, 820], [200, 1150], [800, 1150],
      [500, 90], [150, 600], [850, 600]
    ];
    points.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Header Badge (e.g. "FAMILY CELEBRATION")
    ctx.textAlign = 'center';
    ctx.fillStyle = isDark ? '#c084fc' : '#4338ca';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText('✨ FAMILY CELEBRATION MOMENT ✨', width / 2, 110);

    // 5. Headline Text
    ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
    ctx.font = '900 52px system-ui, -apple-system, sans-serif';
    ctx.fillText(headline.toUpperCase(), width / 2, 180);

    // 6. Child Photo / Avatar (Circle with glow)
    const photoY = 410;
    const photoRadius = 160;

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(width / 2, photoY, photoRadius + 12, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#6366f1' : '#fb7185';
    ctx.fill();

    // White ring
    ctx.beginPath();
    ctx.arc(width / 2, photoY, photoRadius + 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    if (displayPhoto) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = displayPhoto;
        });

        ctx.save();
        ctx.beginPath();
        ctx.arc(width / 2, photoY, photoRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, (width / 2) - photoRadius, photoY - photoRadius, photoRadius * 2, photoRadius * 2);
        ctx.restore();
      } catch {
        // Fallback initials
        ctx.beginPath();
        ctx.arc(width / 2, photoY, photoRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#6366f1';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px sans-serif';
        ctx.fillText(displayName.slice(0, 2).toUpperCase(), width / 2, photoY + 28);
      }
    } else {
      // Default festive placeholder
      ctx.beginPath();
      ctx.arc(width / 2, photoY, photoRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#818cf8';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 90px sans-serif';
      ctx.fillText(displayName.slice(0, 2).toUpperCase(), width / 2, photoY + 30);
    }

    // 7. Child Name Text
    ctx.fillStyle = isDark ? '#38bdf8' : '#e11d48';
    ctx.font = '900 64px system-ui, -apple-system, sans-serif';
    ctx.fillText(displayName, width / 2, 650);

    // 8. Age Badge Ribbon
    if (ageText) {
      ctx.fillStyle = isDark ? '#a855f7' : '#f59e0b';
      const badgeText = ageText.trim();
      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
      const textWidth = ctx.measureText(badgeText).width;
      const bPadding = 24;
      const bHeight = 48;
      const bX = (width / 2) - (textWidth / 2) - bPadding;
      const bY = 690;

      // Rounded pill for age
      ctx.beginPath();
      ctx.roundRect(bX, bY, textWidth + (bPadding * 2), bHeight, 24);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(badgeText, width / 2, bY + 33);
    }

    // 9. Custom Wish Box
    const boxX = 100;
    const boxY = 780;
    const boxWidth = 800;
    const boxHeight = 260;

    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 28);
    ctx.fill();

    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Wrap wish text inside box
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = '500 28px system-ui, -apple-system, sans-serif';
    const words = customWish.split(' ');
    let line = '';
    let curY = boxY + 60;
    const maxWidth = 720;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, width / 2, curY);
        line = words[n] + ' ';
        curY += 40;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, width / 2, curY);

    // 10. Signature
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = 'italic 600 26px system-ui, -apple-system, sans-serif';
    ctx.fillText(signature, width / 2, 1120);

    // 11. FamilyHub Watermark
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('FamilyHub Celebration Card', width / 2, 1170);

    return canvas;
  };

  // Download high-resolution PNG
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const canvas = await renderCardToCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      const safeName = displayName.replace(/[^a-zA-Z0-9]/g, '_');
      a.href = dataUrl;
      a.download = `Birthday_Card_${safeName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showSuccess(`Birthday card for ${displayName} downloaded!`);
    } catch (err: any) {
      showError(err?.message || 'Could not generate card download.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Share directly to Family Group Chat
  const handleShareToChat = async () => {
    if (!currentFamily?.id || !user) {
      showError('Unable to share: family space or user session missing.');
      return;
    }

    setIsSharing(true);
    try {
      const canvas = await renderCardToCanvas();
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Could not convert card to image blob');

      const safeName = displayName.replace(/[^a-zA-Z0-9]/g, '_');
      const file = new File([blob], `Birthday_Card_${safeName}.png`, { type: 'image/png' });
      const chatRoomId = `${currentFamily.id}_general`;

      const attachment = await chatService.uploadAttachment({
        familyId: currentFamily.id,
        chatRoomId,
        file,
      });

      const messageText = `🎂🎉 Special Birthday Celebration for ${displayName}! ${ageText ? `(${ageText})` : ''}\n\n"${customWish}"\n\n— ${signature}`;

      await chatService.sendMessage({
        chatRoomId,
        familyId: currentFamily.id,
        sender: user,
        text: messageText,
        attachments: [attachment],
        type: 'image',
      });

      showSuccess(`Birthday card for ${displayName} shared to Family Chat!`);
      onClose();
    } catch (err: any) {
      showError(err?.message || 'Failed to share card to Family Chat.');
    } finally {
      setIsSharing(false);
    }
  };

  // Copy greeting wish to clipboard
  const handleCopyWish = () => {
    const textToCopy = `🎂 Happy Birthday ${displayName}! 🎉\n\n"${customWish}"\n\n${signature}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedWish(true);
    showSuccess('Birthday wish copied to clipboard!');
    setTimeout(() => setCopiedWish(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🎨 Birthday Card Studio"
      subtitle="Design, personalize, and share a stunning birthday card for any family child."
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Child Selector & Image Upload Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Select Child:
            </label>
            <select
              value={activeChildId}
              onChange={(e) => handleChildSelectChange(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
            >
              {allChildren.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.fullName} ({ch.classGrade || 'Child'})
                </option>
              ))}
              <option value="custom">+ Other / Custom Name</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Custom Photo / Image:
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                icon={<Upload className="w-3.5 h-3.5 text-indigo-600" />}
                className="text-xs font-bold flex-1"
              >
                {uploadedPhotoUrl ? 'Change Photo' : 'Upload Image'}
              </Button>
              {uploadedPhotoUrl && (
                <button
                  onClick={() => setUploadedPhotoUrl('')}
                  className="px-2 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                  title="Remove custom photo"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Custom Name input if 'custom' selected */}
        {activeChildId === 'custom' && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 rounded-xl">
            <label className="text-xs font-bold text-amber-900 dark:text-amber-200 block mb-1">
              Child's Name:
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Aryan, Fatima, Zayn"
              className="w-full text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-2 font-bold"
            />
          </div>
        )}

        {/* Theme Selector Carousel */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
            <Palette className="w-4 h-4 text-indigo-600" />
            <span>Select Design Theme:</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {CARD_THEMES.map((theme) => {
              const isSelected = selectedThemeId === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setSelectedThemeId(theme.id)}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/60 font-black'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                  }`}
                >
                  <span className="text-xs block truncate text-slate-900 dark:text-slate-100">
                    {theme.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                    {theme.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Text Customization & Presets */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Headline / Title:
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Happy Birthday, Aryan!"
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Milestone / Age Badge:
              </label>
              <input
                type="text"
                value={ageText}
                onChange={(e) => setAgeText(e.target.value)}
                placeholder="e.g. Turning 8 Years Old! 🎂"
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-semibold"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Birthday Wish / Message:
              </label>
              <div className="flex items-center gap-1">
                {PRESET_WISHES.map((pw, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCustomWish(pw)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-100"
                    title={`Wish Preset ${idx + 1}`}
                  >
                    Preset {idx + 1}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={3}
              value={customWish}
              onChange={(e) => setCustomWish(e.target.value)}
              placeholder="Write a sweet personal message or prayer..."
              className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium leading-relaxed"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Signature / From:
            </label>
            <input
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="e.g. With all our love, Mom & Dad 💖"
              className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-medium"
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* LIVE CARD PREVIEW                                         */}
        {/* ========================================================= */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
              <span>Real-Time Live Card Preview:</span>
            </span>
            <span className="text-[10px] text-slate-400">High-Resolution Canvas Ready</span>
          </div>

          <div
            ref={previewCardRef}
            className={`p-6 sm:p-8 rounded-3xl bg-gradient-to-br ${currentTheme.bgGradient} border-4 ${currentTheme.cardBorder} shadow-xl relative overflow-hidden text-center transition-all duration-300 select-none`}
          >
            {/* Top decorative badge */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-lg">🎈</span>
              <span className="text-[11px] font-black tracking-widest uppercase px-3 py-1 rounded-full bg-white/70 dark:bg-black/40 backdrop-blur-xs text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50 shadow-2xs">
                FamilyHub Celebration
              </span>
              <span className="text-lg">🎉</span>
            </div>

            {/* Headline */}
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-4 drop-shadow-xs">
              {headline}
            </h2>

            {/* Child Photo / Avatar Frame */}
            <div className="relative inline-block mx-auto mb-4">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-900 shadow-2xl mx-auto bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
                {displayPhoto ? (
                  <img
                    src={displayPhoto}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-black text-white">
                    {displayName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 text-2xl filter drop-shadow-md">
                {currentTheme.cakeEmoji}
              </span>
            </div>

            {/* Name & Age */}
            <div className="space-y-1 mb-4">
              <h3 className={`text-xl sm:text-2xl font-black ${currentTheme.accentColor}`}>
                {displayName}
              </h3>
              {ageText && (
                <div className="inline-block px-3 py-1 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs text-xs font-extrabold text-amber-600 dark:text-amber-400 shadow-2xs border border-amber-200/50 dark:border-amber-800/50">
                  {ageText}
                </div>
              )}
            </div>

            {/* Wish Text Box */}
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800 shadow-sm text-xs sm:text-sm font-medium leading-relaxed mb-4">
              "{customWish}"
            </div>

            {/* Signature */}
            <p className="text-xs font-semibold italic text-slate-500 dark:text-slate-400">
              {signature}
            </p>

            {/* Stickers floating */}
            <div className="absolute top-3 left-4 text-xl opacity-70">✨</div>
            <div className="absolute top-3 right-4 text-xl opacity-70">⭐</div>
            <div className="absolute bottom-3 left-4 text-xl opacity-70">💖</div>
            <div className="absolute bottom-3 right-4 text-xl opacity-70">🎁</div>
          </div>
        </div>

        {/* Action Buttons: Download, Share to Chat, Copy */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyWish}
            icon={copiedWish ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            className="text-xs font-bold"
          >
            {copiedWish ? 'Wish Copied!' : 'Copy Text'}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              icon={isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-indigo-600" />}
              className="text-xs font-bold"
            >
              {isDownloading ? 'Rendering...' : 'Download Card (PNG)'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleShareToChat}
              disabled={isSharing}
              icon={isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              className="text-xs font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md"
            >
              {isSharing ? 'Sharing...' : 'Share to Family Chat 💬'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
