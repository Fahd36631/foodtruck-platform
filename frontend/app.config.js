/**
 * Dynamic Expo config: merges app.json and injects Google Maps API keys from env.
 * Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in frontend/.env (then rebuild native apps).
 */
const appJson = require("./app.json");

module.exports = () => {
  const googleKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  return {
    expo: {
      ...appJson.expo,
      splash: {
        ...(appJson.expo.splash || {}),
        backgroundColor: "#F4F8FC"
      },
      ios: {
        ...(appJson.expo.ios || {}),
        config: {
          ...((appJson.expo.ios && appJson.expo.ios.config) || {}),
          googleMapsApiKey: googleKey
        }
      },
      android: {
        ...(appJson.expo.android || {}),
        config: {
          ...((appJson.expo.android && appJson.expo.android.config) || {}),
          googleMaps: {
            apiKey: googleKey
          }
        }
      }
    }
  };
};
