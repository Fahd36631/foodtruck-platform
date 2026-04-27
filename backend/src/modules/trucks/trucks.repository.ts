import { db } from "../../core/db/connection";

type CreateTruckInput = {
  ownerUserId: number;
  categoryId: number;
  displayName: string;
  slug: string;
  description?: string;
  workingHours: string;
  contactPhone: string;
  coverImageUrl?: string;
  latitude: number;
  longitude: number;
  neighborhood: string;
  city: string;
  licenseNumber: string;
  licenseDocumentUrl: string;
  licenseExpiresAt: string;
};

type UpdateTruckProfileInput = {
  displayName?: string;
  description?: string;
  coverImageUrl?: string;
  workingHours?: string;
};

type AdminDashboardStats = {
  pendingRequests: number;
  approvedTrucks: number;
  rejectedTrucks: number;
  todayRequests: number;
};

const createTruckWithLicenseAndLocation = async (payload: CreateTruckInput): Promise<number> => {
  return db.transaction(async (trx) => {
    const [truckIdRaw] = await trx("food_trucks").insert({
      owner_user_id: payload.ownerUserId,
      category_id: payload.categoryId,
      display_name: payload.displayName,
      slug: payload.slug,
      description: payload.description ?? null,
      working_hours: payload.workingHours,
      contact_phone: payload.contactPhone,
      cover_image_url: payload.coverImageUrl ?? null
    });

    const truckId = Number(truckIdRaw);

    await trx("truck_locations").insert({
      truck_id: truckId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      neighborhood: payload.neighborhood,
      city: payload.city,
      is_current: 1
    });

    await trx("municipal_licenses").insert({
      truck_id: truckId,
      license_number: payload.licenseNumber,
      document_url: payload.licenseDocumentUrl,
      expires_at: payload.licenseExpiresAt
    });

    return truckId;
  });
};

const resubmitRejectedTruck = async (truckId: number, payload: CreateTruckInput): Promise<number> => {
  return db.transaction(async (trx) => {
    await trx("food_trucks").where({ id: truckId }).update({
      category_id: payload.categoryId,
      display_name: payload.displayName,
      slug: payload.slug,
      description: payload.description ?? null,
      working_hours: payload.workingHours,
      contact_phone: payload.contactPhone,
      cover_image_url: payload.coverImageUrl ?? null,
      approval_status: "pending",
      updated_at: trx.fn.now()
    });

    await trx("truck_locations").where({ truck_id: truckId, is_current: 1 }).update({ is_current: 0 });
    await trx("truck_locations").insert({
      truck_id: truckId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      neighborhood: payload.neighborhood,
      city: payload.city,
      is_current: 1
    });

    const latestLicense = await trx("municipal_licenses").where({ truck_id: truckId }).orderBy("id", "desc").first("id");
    if (latestLicense) {
      await trx("municipal_licenses").where({ id: latestLicense.id }).update({
        license_number: payload.licenseNumber,
        document_url: payload.licenseDocumentUrl,
        expires_at: payload.licenseExpiresAt,
        review_status: "pending",
        reviewed_by: null,
        reviewed_at: null,
        review_note: null,
        updated_at: trx.fn.now()
      });
    } else {
      await trx("municipal_licenses").insert({
        truck_id: truckId,
        license_number: payload.licenseNumber,
        document_url: payload.licenseDocumentUrl,
        expires_at: payload.licenseExpiresAt,
        review_status: "pending"
      });
    }

    return truckId;
  });
};

const findCategoryByName = async (name: string) => {
  return db("categories")
    .select("id", "name", "slug")
    .whereRaw("LOWER(name) = ?", [name.toLowerCase()])
    .first();
};

const createCategory = async (payload: { name: string; slug: string }) => {
  const [categoryIdRaw] = await db("categories").insert({
    name: payload.name,
    slug: payload.slug
  });
  return Number(categoryIdRaw);
};

const findTruckById = async (truckId: number) => {
  return db("food_trucks").where({ id: truckId }).whereNull("deleted_at").first();
};

const listOwnerTrucks = async (ownerUserId: number) => {
  return db("food_trucks as ft")
    .leftJoin("municipal_licenses as ml", function joinLatestLicense() {
      this.on("ml.truck_id", "=", "ft.id").andOn(
        "ml.id",
        "=",
        db.raw("(SELECT MAX(id) FROM municipal_licenses WHERE truck_id = ft.id)")
      );
    })
    .select(
      "ft.id",
      "ft.display_name",
      "ft.approval_status",
      "ft.operational_status",
      "ft.created_at",
      "ml.review_note",
      "ml.reviewed_at"
    )
    .where({ "ft.owner_user_id": ownerUserId })
    .whereNull("ft.deleted_at")
    .orderBy("ft.created_at", "desc");
};

const getLatestOwnerTruckDraft = async (ownerUserId: number) => {
  return db("food_trucks as ft")
    .leftJoin("truck_locations as tl", function joinCurrentLocation() {
      this.on("tl.truck_id", "=", "ft.id").andOn("tl.is_current", "=", db.raw("1"));
    })
    .leftJoin("municipal_licenses as ml", function joinLatestLicense() {
      this.on("ml.truck_id", "=", "ft.id").andOn(
        "ml.id",
        "=",
        db.raw("(SELECT MAX(id) FROM municipal_licenses WHERE truck_id = ft.id)")
      );
    })
    .leftJoin("categories as c", "c.id", "ft.category_id")
    .select(
      "ft.id",
      "ft.display_name",
      "ft.description",
      "ft.cover_image_url",
      "ft.working_hours",
      "ft.contact_phone",
      "ft.approval_status",
      "tl.city",
      "tl.neighborhood",
      "tl.latitude",
      "tl.longitude",
      "ml.license_number",
      "ml.document_url",
      "ml.expires_at",
      "c.name as category_name"
    )
    .where({ "ft.owner_user_id": ownerUserId })
    .whereNull("ft.deleted_at")
    .orderBy("ft.created_at", "desc")
    .first();
};

const getLatestOwnerTruck = async (ownerUserId: number) => {
  return db("food_trucks")
    .select("id", "approval_status", "display_name")
    .where({ owner_user_id: ownerUserId })
    .whereNull("deleted_at")
    .orderBy("created_at", "desc")
    .first();
};

const updateTruckProfile = async (truckId: number, payload: UpdateTruckProfileInput): Promise<void> => {
  const updatePayload: Record<string, unknown> = {};

  if (payload.displayName !== undefined) {
    updatePayload.display_name = payload.displayName;
  }
  if (payload.description !== undefined) {
    updatePayload.description = payload.description;
  }
  if (payload.coverImageUrl !== undefined) {
    updatePayload.cover_image_url = payload.coverImageUrl;
  }
  if (payload.workingHours !== undefined) {
    updatePayload.working_hours = payload.workingHours;
  }

  if (Object.keys(updatePayload).length > 0) {
    await db("food_trucks").where({ id: truckId }).update(updatePayload);
  }
};

const replaceCurrentLocation = async (
  truckId: number,
  payload: { latitude: number; longitude: number; neighborhood: string; city: string }
): Promise<void> => {
  await db.transaction(async (trx) => {
    await trx("truck_locations").where({ truck_id: truckId, is_current: 1 }).update({ is_current: 0 });

    await trx("truck_locations").insert({
      truck_id: truckId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      neighborhood: payload.neighborhood,
      city: payload.city,
      is_current: 1
    });
  });
};

const updateOperationalStatus = async (
  truckId: number,
  status: string,
  changedByUserId: number,
  note?: string
): Promise<void> => {
  await db.transaction(async (trx) => {
    await trx("food_trucks").where({ id: truckId }).update({ operational_status: status });

    await trx("truck_status_history").insert({
      truck_id: truckId,
      status,
      changed_by_user_id: changedByUserId,
      note: note ?? null
    });
  });
};

const reviewTruckLicense = async (
  truckId: number,
  reviewStatus: string,
  reviewedBy: number,
  reviewNote?: string
): Promise<void> => {
  await db.transaction(async (trx) => {
    const truck = await trx("food_trucks").where({ id: truckId }).first("id", "owner_user_id", "display_name");
    if (!truck) {
      return;
    }

    await trx("food_trucks").where({ id: truckId }).update({ approval_status: reviewStatus });

    const latestLicense = await trx("municipal_licenses")
      .where({ truck_id: truckId })
      .orderBy("id", "desc")
      .first("id");

    if (!latestLicense) {
      return;
    }

    await trx("municipal_licenses").where({ id: latestLicense.id }).update({
      review_status: reviewStatus,
      reviewed_by: reviewedBy,
      reviewed_at: trx.fn.now(),
      review_note: reviewNote ?? null
    });

    const isApproved = reviewStatus === "approved";
    const title = isApproved ? "تم قبول طلب تسجيل الفود ترك" : "تم رفض طلب تسجيل الفود ترك";
    const body = isApproved
      ? `تم قبول طلب "${truck.display_name}". يمكنك الآن البدء في تشغيل تركك واستقبال الطلبات.`
      : `تم رفض طلب "${truck.display_name}". السبب: ${reviewNote ?? "لم يتم تحديد سبب."}`;

    await trx("notifications").insert({
      user_id: truck.owner_user_id,
      type: "admin_action",
      title,
      body,
      metadata_json: JSON.stringify({
        truckId,
        decision: reviewStatus,
        reviewNote: reviewNote ?? null
      }),
      is_read: 0
    });
  });
};

const listOwnerNotifications = async (ownerUserId: number, limit = 20) => {
  return db("notifications")
    .select("id", "title", "body", "type", "is_read", "metadata_json", "created_at")
    .where({ user_id: ownerUserId })
    .where("type", "admin_action")
    .orderBy("created_at", "desc")
    .limit(limit);
};

const listPendingTrucks = async () => {
  return db("food_trucks as ft")
    .leftJoin("users as u", "u.id", "ft.owner_user_id")
    .leftJoin("truck_locations as tl", function joinCurrentLocation() {
      this.on("tl.truck_id", "=", "ft.id").andOn("tl.is_current", "=", db.raw("1"));
    })
    .leftJoin("municipal_licenses as ml", function joinLatestLicense() {
      this.on("ml.truck_id", "=", "ft.id").andOn(
        "ml.id",
        "=",
        db.raw("(SELECT MAX(id) FROM municipal_licenses WHERE truck_id = ft.id)")
      );
    })
    .leftJoin("categories as c", "c.id", "ft.category_id")
    .select(
      "ft.id",
      "ft.display_name",
      "ft.description",
      "ft.cover_image_url",
      "ft.working_hours",
      "ft.contact_phone",
      "c.name as category_name",
      "ft.approval_status",
      "ft.created_at",
      "u.full_name as owner_full_name",
      "u.email as owner_email",
      "u.phone as owner_phone",
      "tl.city",
      "tl.neighborhood",
      "tl.latitude",
      "tl.longitude",
      "tl.captured_at",
      "ml.license_number",
      "ml.document_url",
      "ml.expires_at",
      "ml.review_status"
    )
    .where("ft.approval_status", "pending")
    .whereNull("ft.deleted_at")
    .orderBy("ft.created_at", "desc");
};

const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
  const row = await db("food_trucks as ft")
    .whereNull("ft.deleted_at")
    .select(
      db.raw("SUM(CASE WHEN ft.approval_status = 'pending' THEN 1 ELSE 0 END) AS pending_requests"),
      db.raw("SUM(CASE WHEN ft.approval_status = 'approved' THEN 1 ELSE 0 END) AS approved_trucks"),
      db.raw("SUM(CASE WHEN ft.approval_status = 'rejected' THEN 1 ELSE 0 END) AS rejected_trucks"),
      db.raw("SUM(CASE WHEN DATE(ft.created_at) = CURDATE() THEN 1 ELSE 0 END) AS today_requests")
    )
    .first();

  return {
    pendingRequests: Number(row?.pending_requests ?? 0),
    approvedTrucks: Number(row?.approved_trucks ?? 0),
    rejectedTrucks: Number(row?.rejected_trucks ?? 0),
    todayRequests: Number(row?.today_requests ?? 0)
  };
};

const listDiscoveryTrucks = async (filters: { city?: string; neighborhood?: string; categoryId?: number }) => {
  const query = db("food_trucks as ft")
    .join("truck_locations as tl", function joinCurrentLocation() {
      this.on("tl.truck_id", "=", "ft.id").andOn("tl.is_current", "=", db.raw("1"));
    })
    .leftJoin("categories as c", "c.id", "ft.category_id")
    .select(
      "ft.id",
      "ft.display_name",
      "ft.slug",
      "ft.description",
      "ft.cover_image_url",
      "ft.working_hours",
      "ft.avg_rating",
      "ft.rating_count",
      "ft.operational_status",
      "tl.latitude",
      "tl.longitude",
      "tl.neighborhood",
      "tl.city",
      "c.name as category_name"
    )
    .where("ft.approval_status", "approved")
    .whereNull("ft.deleted_at");

  if (filters.city) {
    query.andWhere("tl.city", filters.city);
  }

  if (filters.neighborhood) {
    query.andWhere("tl.neighborhood", filters.neighborhood);
  }

  if (filters.categoryId !== undefined && filters.categoryId !== null) {
    query.whereExists(function whereHasMenuInCategory() {
      this.select(db.raw("1"))
        .from("menu_items as mi")
        .whereRaw("mi.truck_id = ft.id")
        .where("mi.category_id", filters.categoryId)
        .whereNull("mi.deleted_at")
        .where("mi.is_available", 1);
    });
  }

  return query.orderBy("ft.updated_at", "desc");
};

const getTruckDetailsForCustomer = async (truckId: number) => {
  const truck = await db("food_trucks as ft")
    .join("truck_locations as tl", function joinCurrentLocation() {
      this.on("tl.truck_id", "=", "ft.id").andOn("tl.is_current", "=", db.raw("1"));
    })
    .select(
      "ft.id",
      "ft.display_name",
      "ft.slug",
      "ft.description",
      "ft.cover_image_url",
      "ft.avg_rating",
      "ft.rating_count",
      "ft.operational_status",
      "tl.latitude",
      "tl.longitude",
      "tl.neighborhood",
      "tl.city"
    )
    .where("ft.id", truckId)
    .where("ft.approval_status", "approved")
    .whereNull("ft.deleted_at")
    .first();

  if (!truck) {
    return null;
  }

  const menuItems = await db("menu_items")
    .select("id", "name", "description", "price", "image_url", "is_available", "category_id")
    .where({ truck_id: truckId, is_available: 1 })
    .whereNull("deleted_at")
    .orderBy("name", "asc");

  return {
    ...truck,
    menuItems
  };
};

const softDeleteTruck = async (truckId: number): Promise<void> => {
  await db("food_trucks").where({ id: truckId }).update({ deleted_at: db.fn.now() });
};

export const trucksRepository = {
  createTruckWithLicenseAndLocation,
  resubmitRejectedTruck,
  findCategoryByName,
  createCategory,
  findTruckById,
  getLatestOwnerTruck,
  listOwnerTrucks,
  getLatestOwnerTruckDraft,
  updateTruckProfile,
  replaceCurrentLocation,
  updateOperationalStatus,
  reviewTruckLicense,
  listOwnerNotifications,
  listPendingTrucks,
  getAdminDashboardStats,
  listDiscoveryTrucks,
  getTruckDetailsForCustomer,
  softDeleteTruck
};
