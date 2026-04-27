import { AppError } from "../../core/errors";
import type { AuthUser } from "../../core/types/auth";
import { ROLE_CODES } from "../shared/roles";
import { TRUCK_APPROVAL_STATUS } from "../shared/truck-status";
import { trucksRepository } from "./trucks.repository";

const toSlug = (displayName: string): string => {
  const suffix = Math.floor(Date.now() / 1000);
  return `${displayName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${suffix}`;
};

const toCategorySlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

const assertTruckOwner = async (truckId: number, authUser: AuthUser) => {
  const truck = await trucksRepository.findTruckById(truckId);

  if (!truck) {
    throw new AppError("TRUCK_NOT_FOUND");
  }

  if (authUser.roleCode === ROLE_CODES.ADMIN) {
    return truck;
  }

  if (truck.owner_user_id !== authUser.userId) {
    throw new AppError("TRUCK_OWNERSHIP_REQUIRED");
  }

  return truck;
};

const registerTruck = async (
  authUser: AuthUser,
  payload: {
    displayName: string;
    categoryName: string;
    description?: string;
    workingHours: string;
    contactPhone: string;
    coverImageUrl?: string;
    location: { latitude: number; longitude: number; neighborhood: string; city: string };
    license: { licenseNumber: string; documentUrl: string; expiresAt: string };
  }
) => {
  if (authUser.roleCode !== ROLE_CODES.TRUCK_OWNER) {
    throw new AppError("TRUCK_OWNER_ROLE_REQUIRED", { message: "Only truck owners can register trucks" });
  }

  const latestTruck = await trucksRepository.getLatestOwnerTruck(authUser.userId);
  if (latestTruck && latestTruck.approval_status === TRUCK_APPROVAL_STATUS.PENDING) {
    throw new AppError("TRUCK_PENDING_REQUEST_EXISTS");
  }

  const existingCategory = await trucksRepository.findCategoryByName(payload.categoryName);
  const categoryId =
    existingCategory?.id ??
    (await trucksRepository.createCategory({
      name: payload.categoryName.trim(),
      slug: `${toCategorySlug(payload.categoryName)}-${Date.now()}`
    }));

  const truckPayload = {
    ownerUserId: authUser.userId,
    categoryId: Number(categoryId),
    displayName: payload.displayName,
    slug: toSlug(payload.displayName),
    description: payload.description,
    workingHours: payload.workingHours,
    contactPhone: payload.contactPhone,
    coverImageUrl: payload.coverImageUrl,
    latitude: payload.location.latitude,
    longitude: payload.location.longitude,
    neighborhood: payload.location.neighborhood,
    city: payload.location.city,
    licenseNumber: payload.license.licenseNumber,
    licenseDocumentUrl: payload.license.documentUrl,
    licenseExpiresAt: payload.license.expiresAt
  };

  const truckId =
    latestTruck && latestTruck.approval_status !== TRUCK_APPROVAL_STATUS.PENDING
      ? await trucksRepository.resubmitRejectedTruck(latestTruck.id, truckPayload)
      : await trucksRepository.createTruckWithLicenseAndLocation(truckPayload);

  return {
    truckId,
    approvalStatus: TRUCK_APPROVAL_STATUS.PENDING
  };
};

const updateProfile = async (
  truckId: number,
  authUser: AuthUser,
  payload: { displayName?: string; description?: string; coverImageUrl?: string; workingHours?: string }
) => {
  await assertTruckOwner(truckId, authUser);
  await trucksRepository.updateTruckProfile(truckId, payload);
  return { truckId };
};

const updateLocation = async (
  truckId: number,
  authUser: AuthUser,
  payload: { latitude: number; longitude: number; neighborhood: string; city: string }
) => {
  const truck = await assertTruckOwner(truckId, authUser);

  if (truck.approval_status !== TRUCK_APPROVAL_STATUS.APPROVED) {
    throw new AppError("TRUCK_NOT_APPROVED", { message: "Truck location cannot be updated before approval" });
  }

  await trucksRepository.replaceCurrentLocation(truckId, payload);
  return { truckId };
};

const updateStatus = async (truckId: number, authUser: AuthUser, status: string) => {
  const truck = await assertTruckOwner(truckId, authUser);

  if (truck.approval_status !== TRUCK_APPROVAL_STATUS.APPROVED) {
    throw new AppError("TRUCK_NOT_APPROVED", { message: "Truck status cannot be changed before approval" });
  }

  await trucksRepository.updateOperationalStatus(truckId, status, authUser.userId);
  return { truckId, status };
};

const reviewTruck = async (
  truckId: number,
  authUser: AuthUser,
  payload: { decision: "approved" | "rejected"; reviewNote?: string }
) => {
  if (authUser.roleCode !== ROLE_CODES.ADMIN) {
    throw new AppError("TRUCK_ADMIN_ROLE_REQUIRED", { message: "Only admins can review truck approvals" });
  }

  const truck = await trucksRepository.findTruckById(truckId);
  if (!truck) {
    throw new AppError("TRUCK_NOT_FOUND");
  }

  if (truck.approval_status !== TRUCK_APPROVAL_STATUS.PENDING) {
    throw new AppError("TRUCK_ALREADY_REVIEWED");
  }

  if (payload.decision === TRUCK_APPROVAL_STATUS.REJECTED && !payload.reviewNote?.trim()) {
    throw new AppError("TRUCK_REJECTION_REASON_REQUIRED");
  }

  await trucksRepository.reviewTruckLicense(truckId, payload.decision, authUser.userId, payload.reviewNote?.trim());
  return { truckId, approvalStatus: payload.decision };
};

const listPending = async (authUser: AuthUser) => {
  if (authUser.roleCode !== ROLE_CODES.ADMIN) {
    throw new AppError("TRUCK_ADMIN_ROLE_REQUIRED", { message: "Only admins can access pending trucks" });
  }

  const items = await trucksRepository.listPendingTrucks();
  return { items };
};

const getAdminStats = async (authUser: AuthUser) => {
  if (authUser.roleCode !== ROLE_CODES.ADMIN) {
    throw new AppError("TRUCK_ADMIN_ROLE_REQUIRED", { message: "Only admins can access admin stats" });
  }

  return trucksRepository.getAdminDashboardStats();
};

const discover = async (filters: { city?: string; neighborhood?: string; categoryId?: number }) => {
  const items = await trucksRepository.listDiscoveryTrucks(filters);
  return { items };
};

const getDetails = async (truckId: number) => {
  const details = await trucksRepository.getTruckDetailsForCustomer(truckId);
  if (!details) {
    throw new AppError("TRUCK_NOT_FOUND");
  }
  return details;
};

const listMine = async (authUser: AuthUser) => {
  if (authUser.roleCode !== ROLE_CODES.TRUCK_OWNER && authUser.roleCode !== ROLE_CODES.ADMIN) {
    throw new AppError("AUTH_FORBIDDEN", { message: "Only truck owners and admins can access this resource" });
  }

  const items =
    authUser.roleCode === ROLE_CODES.ADMIN
      ? await trucksRepository.listDiscoveryTrucks({})
      : await trucksRepository.listOwnerTrucks(authUser.userId);

  return { items };
};

const listMyNotifications = async (authUser: AuthUser) => {
  if (authUser.roleCode !== ROLE_CODES.TRUCK_OWNER) {
    throw new AppError("TRUCK_OWNER_ROLE_REQUIRED", { message: "Only truck owners can access notifications" });
  }

  const items = await trucksRepository.listOwnerNotifications(authUser.userId);
  return { items };
};

const getMyLatestDraft = async (authUser: AuthUser) => {
  if (authUser.roleCode !== ROLE_CODES.TRUCK_OWNER) {
    throw new AppError("TRUCK_OWNER_ROLE_REQUIRED", { message: "Only truck owners can access this resource" });
  }

  const item = await trucksRepository.getLatestOwnerTruckDraft(authUser.userId);
  return { item: item ?? null };
};

const removeTruck = async (truckId: number, authUser: AuthUser) => {
  await assertTruckOwner(truckId, authUser);
  await trucksRepository.softDeleteTruck(truckId);
  return { truckId };
};

export const trucksService = {
  registerTruck,
  updateProfile,
  updateLocation,
  updateStatus,
  reviewTruck,
  listPending,
  getAdminStats,
  discover,
  getDetails,
  listMine,
  listMyNotifications,
  getMyLatestDraft,
  removeTruck
};
