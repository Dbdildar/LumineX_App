import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

export default function AnimatedSplashScreen({ onFinish }) {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('../../assets/animations/luminex_reveal.json')} 
        autoPlay
        loop={false}
        speed={1}
        onAnimationFinish={onFinish}
        style={styles.lottie}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030308', // Production dark theme
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: width * 0.8,
    height: width * 0.8,
  },
});
