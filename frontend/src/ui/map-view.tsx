import { forwardRef } from "react";
import type { ComponentProps } from "react";
import { Platform, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

export { Marker };

export type CustomerMapViewProps = ComponentProps<typeof MapView>;

/** Google Maps on iOS/Android; default provider on web. */
export const CustomerMapView = forwardRef<MapView, CustomerMapViewProps>(function CustomerMapView({ style, ...rest }, ref) {
  return (
    <MapView
      ref={ref}
      provider={Platform.OS === "web" ? undefined : PROVIDER_GOOGLE}
      style={[styles.fill, style]}
      showsCompass
      rotateEnabled
      pitchEnabled
      {...rest}
    />
  );
});

const styles = StyleSheet.create({
  fill: {
    width: "100%",
    height: "100%"
  }
});
