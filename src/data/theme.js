// src/data/theme.js

export const APP_NAME = 'LumineX';
export const APP_LOGO = 'Lumine';
export const APP_LOGO2 = 'X';

// ── Dark Theme (default for mobile) ──────────────────────────────────────────
export const DARK_THEME = {
  bg: '#030308',
  bg2: '#08080f',
  bg3: '#0f0f1c',
  bg4: '#161628',
  card: '#0d0d1a',
  cardH: '#141426',
  accent: '#c084fc',
  accent2: '#818cf8',
  accent3: '#f472b6',
  gold: '#fbbf24',
  green: '#34d399',
  red: '#f87171',
  text: '#f0f0f8',
  textSub: '#b0b0c8',
  muted: '#6b6b8a',
  border: '#1a1a2e',
  shadow: 'rgba(0,0,0,0.6)',
};

// ── Light Theme ──────────────────────────────────────────────────────────────
export const LIGHT_THEME = {
  bg: '#f8f8ff',
  bg2: '#ededf8',
  bg3: '#e4e4f4',
  bg4: '#d8d8ee',
  card: '#ffffff',
  cardH: '#f0f0fc',
  accent: '#9333ea',
  accent2: '#6366f1',
  accent3: '#db2777',
  gold: '#d97706',
  green: '#059669',
  red: '#dc2626',
  text: '#1a1a2e',
  textSub: '#4a4a6a',
  muted: '#8888aa',
  border: '#d0d0e8',
  shadow: 'rgba(0,0,0,0.15)',
};

export const AVATARS = [
  { id: 'a1',  emoji: '🦁', bg: ['#f97316', '#fbbf24'], label: 'Lion' },
  { id: 'a2',  emoji: '🐺', bg: ['#6366f1', '#8b5cf6'], label: 'Wolf' },
  { id: 'a3',  emoji: '🦊', bg: ['#ef4444', '#f97316'], label: 'Fox' },
  { id: 'a4',  emoji: '🐉', bg: ['#10b981', '#06b6d4'], label: 'Dragon' },
  { id: 'a5',  emoji: '🦅', bg: ['#3b82f6', '#6366f1'], label: 'Eagle' },
  { id: 'a6',  emoji: '🐯', bg: ['#f59e0b', '#ef4444'], label: 'Tiger' },
  { id: 'a7',  emoji: '🦄', bg: ['#ec4899', '#a855f7'], label: 'Unicorn' },
  { id: 'a8',  emoji: '🐼', bg: ['#1e293b', '#475569'], label: 'Panda' },
  { id: 'a9',  emoji: '🦋', bg: ['#c084fc', '#818cf8'], label: 'Butterfly' },
  { id: 'a10', emoji: '🦈', bg: ['#0ea5e9', '#2563eb'], label: 'Shark' },
];

export const CATEGORIES = [
  { icon: '🎬', name: 'Cinematic',   color: '#ef4444' },
  { icon: '🌊', name: 'Nature',      color: '#3b82f6' },
  { icon: '🏋️', name: 'Fitness',    color: '#10b981' },
  { icon: '🍜', name: 'Food',        color: '#f59e0b' },
  { icon: '🎵', name: 'Music',       color: '#ec4899' },
  { icon: '✈️', name: 'Travel',     color: '#06b6d4' },
  { icon: '🔬', name: 'Science',     color: '#84cc16' },
  { icon: '🎮', name: 'Gaming',      color: '#f97316' },
  { icon: '🏎️', name: 'Autos',      color: '#64748b' },
  { icon: '🏄', name: 'Sports',      color: '#0ea5e9' },
  { icon: '💡', name: 'Tech',        color: '#a78bfa' },
  { icon: '🎨', name: 'Art',         color: '#fb7185' },
];

export const DEMO_VIDEOS = [
  {
    id: 'dv1',
    title: 'Big Buck Bunny — Official 4K',
    channel: 'Blender Foundation',
    profiles: { id: 'p1', username: 'blender', display_name: 'Blender Foundation', is_verified: true, followers_count: 891000, avatar_url: null },
    category: 'Cinematic',
    views: 12400000,
    likes_count: 94200,
    is_vip: false,
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail_url: 'https://picsum.photos/640/360?random=1',
    tags: ['animation', '4k'],
    duration: '9:56',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'dv2',
    title: 'Elephants Dream — Sci-Fi Short',
    channel: 'Blender Institute',
    profiles: { id: 'p2', username: 'blenderinst', display_name: 'Blender Institute', is_verified: true, followers_count: 156000, avatar_url: null },
    category: 'Cinematic',
    views: 8100000,
    likes_count: 61000,
    is_vip: false,
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail_url: 'https://picsum.photos/640/360?random=2',
    tags: ['scifi', 'short'],
    duration: '10:54',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'dv3',
    title: 'For Bigger Blazes — Action Reel',
    channel: 'NovaCinema',
    profiles: { id: 'p3', username: 'novacinema', display_name: 'NovaCinema', is_verified: false, followers_count: 42000, avatar_url: null },
    category: 'Sports',
    views: 4200000,
    likes_count: 32100,
    is_vip: true,
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail_url: 'https://picsum.photos/640/360?random=3',
    tags: ['action', 'fire'],
    duration: '0:15',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'dv4',
    title: 'Sintel — Award Winning Dragon Short',
    channel: 'Blender Foundation',
    profiles: { id: 'p1', username: 'blender', display_name: 'Blender Foundation', is_verified: true, followers_count: 891000, avatar_url: null },
    category: 'Cinematic',
    views: 21800000,
    likes_count: 187000,
    is_vip: true,
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnail_url: 'https://picsum.photos/640/360?random=8',
    tags: ['fantasy', 'dragon'],
    duration: '14:48',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'dv5',
    title: 'Tears of Steel — Sci-Fi VFX Showcase',
    channel: 'Blender VFX',
    profiles: { id: 'p8', username: 'blendervfx', display_name: 'Blender VFX', is_verified: true, followers_count: 312000, avatar_url: null },
    category: 'Science',
    views: 9400000,
    likes_count: 71200,
    is_vip: true,
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnail_url: 'https://picsum.photos/640/360?random=10',
    tags: ['scifi', 'vfx'],
    duration: '12:14',
    created_at: new Date(Date.now() - 86400000 * 9).toISOString(),
  },
  {
    id: 'dv6',
    title: 'For Bigger Joyrides — Supercar Edition',
    channel: 'AutoVault',
    profiles: { id: 'p6', username: 'autovault', display_name: 'AutoVault', is_verified: true, followers_count: 423000, avatar_url: null },
    category: 'Autos',
    views: 7300000,
    likes_count: 58200,
    is_vip: true,
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnail_url: 'https://picsum.photos/640/360?random=6',
    tags: ['cars', 'speed'],
    duration: '0:15',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

export const CAT_ICONS = {
  music: '🎵', gaming: '🎮', sports: '⚽', news: '📰',
  comedy: '😂', education: '📚', technology: '💻', travel: '✈️',
  food: '🍕', fitness: '💪', fashion: '👗', beauty: '💄',
  science: '🔬', movies: '🎬', art: '🎨', business: '💼',
  health: '❤️', nature: '🌿', animals: '🐾', cooking: '👨‍🍳',
  cinematic: '🎬', autos: '🏎️',
};

export const catIcon = name => CAT_ICONS[name?.toLowerCase()] || '📂';

export const catColor = name => {
  const palette = ['#7c6bfa','#f472b6','#34d399','#60a5fa','#fbbf24','#fb7185','#a78bfa','#2dd4bf'];
  let h = 0;
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return palette[h % palette.length];
};

export const fmtNum = num => {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
};

export const fmtTime = s => {
  const m = Math.floor((s || 0) / 60);
  const sec = Math.floor((s || 0) % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

export const timeAgo = ts => {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
};
