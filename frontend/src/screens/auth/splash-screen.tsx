import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";

type SplashScreenProps = {
  onContinue: () => void;
};

const DEBUG_SPLASH_STAGE = "E" as const;

console.log("SPLASH MODULE LOADED");

export const SplashScreen = ({ onContinue }: SplashScreenProps) => {
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const backgroundTranslateY = useRef(new Animated.Value(30)).current;
  const backgroundScale = useRef(new Animated.Value(1.03)).current;

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(80)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    console.log(`SPLASH STEP ${DEBUG_SPLASH_STAGE}`);
    const backgroundAnimation = Animated.parallel([
      Animated.timing(backgroundOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(backgroundTranslateY, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(backgroundScale, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]);

    const logoAnimation = Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(logoTranslateY, {
        toValue: -40,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]);

    backgroundAnimation.start();
    const logoStartTimer = setTimeout(() => {
      logoAnimation.start();
    }, 450);

    // 1100ms animation total (450 delay + 650 motion) + 700ms hold
    const navigationTimer = setTimeout(() => {
      onContinue();
    }, 1800);

    return () => {
      clearTimeout(logoStartTimer);
      clearTimeout(navigationTimer);
      backgroundAnimation.stop();
      logoAnimation.stop();
    };
  }, [onContinue]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.backgroundLayer,
          {
            opacity: backgroundOpacity,
            transform: [{ translateY: backgroundTranslateY }, { scale: backgroundScale }]
          }
        ]}
      >
        <Image
          source={require("../../assets/images/Background.jpg")}
          resizeMode="cover"
          style={styles.backgroundImage}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.logoLayer,
          {
            opacity: logoOpacity,
            transform: [{ translateY: logoTranslateY }, { scale: logoScale }]
          }
        ]}
      >
        <Image
          source={require("../../assets/images/truck_logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1220",
    overflow: "hidden"
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject
  },
  backgroundImage: {
    width: "100%",
    height: "100%"
  },
  logoLayer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  logoImage: {
    width: 240,
    height: 240
  }
});
