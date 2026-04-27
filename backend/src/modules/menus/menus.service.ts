import { AppError } from "../../core/errors";
import type { AuthUser } from "../../core/types/auth";
import { ROLE_CODES } from "../shared/roles";
import { trucksRepository } from "../trucks/trucks.repository";
import { menusRepository } from "./menus.repository";

const assertManageTruckAccess = async (truckId: number, authUser: AuthUser) => {
  const truck = await trucksRepository.findTruckById(truckId);
  if (!truck) {
    throw new AppError("TRUCK_NOT_FOUND");
  }

  if (authUser.roleCode === ROLE_CODES.ADMIN) {
    return truck;
  }

  if (authUser.roleCode !== ROLE_CODES.TRUCK_OWNER || truck.owner_user_id !== authUser.userId) {
    throw new AppError("MENU_OWNERSHIP_REQUIRED");
  }

  return truck;
};

const listByTruck = async (truckId: number, authUser: AuthUser) => {
  await assertManageTruckAccess(truckId, authUser);
  const items = await menusRepository.listByTruck(truckId);
  return { items };
};

const listCategories = async () => {
  const items = await menusRepository.listCategories();
  return { items };
};

const create = async (
  payload: {
    truckId: number;
    categoryId: number;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    isAvailable: boolean;
  },
  authUser: AuthUser
) => {
  await assertManageTruckAccess(payload.truckId, authUser);
  const menuItemId = await menusRepository.create(payload);
  return { menuItemId };
};

const update = async (
  menuItemId: number,
  payload: {
    categoryId?: number;
    name?: string;
    description?: string;
    price?: number;
    imageUrl?: string;
    isAvailable?: boolean;
  },
  authUser: AuthUser
) => {
  const menuItem = await menusRepository.findById(menuItemId);
  if (!menuItem) {
    throw new AppError("MENU_ITEM_NOT_FOUND");
  }

  await assertManageTruckAccess(Number(menuItem.truck_id), authUser);
  await menusRepository.update(menuItemId, payload);
  return { menuItemId };
};

const remove = async (menuItemId: number, authUser: AuthUser) => {
  const menuItem = await menusRepository.findById(menuItemId);
  if (!menuItem) {
    throw new AppError("MENU_ITEM_NOT_FOUND");
  }

  await assertManageTruckAccess(Number(menuItem.truck_id), authUser);
  await menusRepository.softDelete(menuItemId);
  return { menuItemId };
};

export const menusService = {
  listCategories,
  listByTruck,
  create,
  update,
  remove
};
