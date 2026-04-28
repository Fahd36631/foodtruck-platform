/**
 * Design System — shared UI primitives.
 *
 * Everything in @/ui is app-agnostic and safe to use from any screen or feature.
 * Feature-specific composite components live under features/<feature>/components/.
 */
export { AppButton } from "./app-button";
export type { BaseButtonProps, ButtonSize, ButtonVariant } from "./button.types";

export { AppContainer } from "./app-container";
export { EmptyState } from "./empty-state";
export { ErrorState } from "./error-state";
export { LoadingSkeleton } from "./loading-skeleton";
export { RatingStars } from "./rating-stars";
export { SearchBar } from "./search-bar";
export { SectionHeader } from "./section-header";
export { StatusBadge } from "./status-badge";
export { CustomerMapView, Marker } from "./map-view";
export type { CustomerMapViewProps } from "./map-view";
