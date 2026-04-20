# LumineX React Native App — Setup Guide

## Folder Structure
```
LumineXApp/
├── App.js                          ← Root entry: global modals, navigation
├── index.js                        ← AppRegistry entry
├── app.json                        ← App name config
├── babel.config.js
├── metro.config.js
├── package.json
└── src/
    ├── context/
    │   └── AppContext.js            ← Global state (session, player, theme, toasts)
    ├── data/
    │   └── theme.js                ← Colors, DEMO_VIDEOS, helpers (fmtNum, timeAgo, etc.)
    ├── hooks/
    │   └── index.js                ← useVideoLike, useFollow, useDebounce, useScreenDimensions
    ├── lib/
    │   └── supabase.js             ← ALL API calls: auth, video, profile, follow, like, notif
    ├── navigation/
    │   └── AppNavigator.js         ← Stack + Tab navigator with custom tab bar
    ├── components/
    │   ├── ui/
    │   │   └── index.js            ← Avatar, Btn, Input, Toast, Skeleton, FilterChip, EmptyState
    │   ├── cards/
    │   │   └── VideoCard.js        ← Video card with LONG-PRESS preview (plays video inline)
    │   └── player/
    │       └── VideoPlayer.js      ← Full Netflix-style player: ads, controls, seek, comments
    └── screens/
        ├── HomeScreen.js           ← Hero banner, categories, creators, trending, video grid
        ├── TrendingScreen.js       ← Trending videos grid
        ├── SearchScreen.js         ← Search videos + creators
        ├── ProfileScreen.js        ← User profile with videos, stats, follow button
        ├── AuthScreen.js           ← Login / Signup / Forgot password
        ├── PlayerScreen.js         ← Wrapper that opens VideoPlayer from navigation
        ├── OtherScreens.js         ← CategoriesScreen, ChannelsScreen, VIPScreen,
        │                              SavedScreen, HistoryScreen, UploadScreen,
        │                              NotificationsScreen, SettingsScreen
        ├── CategoriesScreen.js     ← Re-exports from OtherScreens
        ├── ChannelsScreen.js       ← Re-exports from OtherScreens
        ├── VIPScreen.js            ← Re-exports from OtherScreens
        ├── SavedScreen.js          ← Re-exports from OtherScreens
        ├── HistoryScreen.js        ← Re-exports from OtherScreens
        ├── UploadScreen.js         ← Re-exports from OtherScreens
        ├── NotificationsScreen.js  ← Re-exports from OtherScreens
        └── SettingsScreen.js       ← Re-exports from OtherScreens
```

---

## Step 1 — Create the React Native project

```bash
npx react-native@0.73.6 init LumineXApp
cd LumineXApp
```

## Step 2 — Install all dependencies

```bash
npm install \
  @react-native-async-storage/async-storage \
  @react-native-community/slider \
  @react-navigation/bottom-tabs \
  @react-navigation/native \
  @react-navigation/native-stack \
  @supabase/supabase-js \
  base-64 \
  react-native-fast-image \
  react-native-gesture-handler \
  react-native-linear-gradient \
  react-native-reanimated \
  react-native-safe-area-context \
  react-native-screens \
  react-native-url-polyfill \
  react-native-vector-icons \
  react-native-video
```

## Step 3 — Android Setup

### android/app/src/main/AndroidManifest.xml
Add inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### android/app/build.gradle
```groovy
android {
    compileSdkVersion 34
    defaultConfig {
        minSdkVersion 24
        targetSdkVersion 34
    }
}
```

### android/settings.gradle — add vector icons
```groovy
include ':react-native-vector-icons'
project(':react-native-vector-icons').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-vector-icons/android')
```

### android/app/build.gradle — add fonts
```groovy
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

## Step 4 — Configure Supabase credentials

Open `src/lib/supabase.js` and replace:
```js
const SUPABASE_URL  = 'YOUR_SUPABASE_URL';   // e.g. https://xxxx.supabase.co
const SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY';
```

## Step 5 — Copy source files

Replace the files inside `LumineXApp/` with all files from this archive, maintaining the same folder structure.

## Step 6 — Run on Android

```bash
npx react-native run-android
```

---

## Key Features

| Feature | Implementation |
|---|---|
| Video player | `react-native-video` with custom Netflix-style controls |
| Long-press video preview | 600ms hold on VideoCard starts inline preview |
| Ad system | Pre-roll ads with countdown + skip logic |
| Double-tap seek | Double tap left/right to seek ±10s |
| Auth | Supabase email/password, session persisted via AsyncStorage |
| Theme | Dark/Light toggle, persisted to AsyncStorage |
| Infinite scroll | FlatList `onEndReached` with page-based pagination |
| VIP flow | Plan selection → payment form → upgrade via Supabase |
| Notifications | Real-time via Supabase channel subscriptions |

---

## Supabase SQL Required

Make sure these RPC functions exist in your Supabase project:

```sql
-- Increment video views
create or replace function increment_views(vid uuid)
returns bigint language plpgsql as $$
declare new_count bigint;
begin
  update videos set views = views + 1 where id = vid returning views into new_count;
  return new_count;
end; $$;

-- Get unique categories
create or replace function get_unique_categories()
returns table(category text) language sql as $$
  select distinct unnest(categories) as category from videos
  where categories is not null order by 1;
$$;
```
