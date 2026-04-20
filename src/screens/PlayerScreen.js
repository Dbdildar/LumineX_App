// src/screens/PlayerScreen.js
import React, { useEffect } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { useApp } from '../context/AppContext';
import VideoPlayer from '../components/player/VideoPlayer';
import { videoAPI } from '../lib/supabase';

export default function PlayerScreen({ navigation, route }) {
  const { theme } = useApp();
  const video = route.params?.video;
  const [related, setRelated] = React.useState([]);

  useEffect(() => {
    if (!video) return;
    videoAPI.getFeed({ limit: 10 })
      .then(data => setRelated(data.filter(v => v.id !== video.id)))
      .catch(() => {});
  }, [video?.id]);

  useEffect(() => {
    const onBack = () => { navigation.goBack(); return true; };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);

  if (!video) { navigation.goBack(); return null; }

  return (
    <VideoPlayer
      video={video}
      related={related}
      onClose={() => navigation.goBack()}
    />
  );
}
