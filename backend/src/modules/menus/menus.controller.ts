import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { ok } from "../../core/http/api-response";
import { requireAuth } from "../../core/http/require-auth";
import { menusService } from "./menus.service";
import { createMenuItemSchema, listMenuItemsQuerySchema, updateMenuItemSchema } from "./menus.validator";

const listByTruck = async (req: Request, res: Response) => {
  const authUser = requireAuth(req);
  const query = listMenuItemsQuerySchema.parse(req.query);
  const result = await menusService.listByTruck(query.truckId, authUser);
  res.status(StatusCodes.OK).json(ok("Menu items fetched", result));
};

const listCategories = async (_req: Request, res: Response) => {
  const result = await menusService.listCategories();
  res.status(StatusCodes.OK).json(ok("Menu categories fetched", result));
};

const create = async (req: Request, res: Response) => {
  const authUser = requireAuth(req);
  const payload = createMenuItemSchema.parse(req.body);
  const result = await menusService.create(payload, authUser);
  res.status(StatusCodes.CREATED).json(ok("Menu item created", result));
};

const update = async (req: Request, res: Response) => {
  const authUser = requireAuth(req);
  const menuItemId = Number(req.params.menuItemId);
  const payload = updateMenuItemSchema.parse(req.body);
  const result = await menusService.update(menuItemId, payload, authUser);
  res.status(StatusCodes.OK).json(ok("Menu item updated", result));
};

const remove = async (req: Request, res: Response) => {
  const authUser = requireAuth(req);
  const menuItemId = Number(req.params.menuItemId);
  const result = await menusService.remove(menuItemId, authUser);
  res.status(StatusCodes.OK).json(ok("Menu item deleted", result));
};

export const menusController = {
  listCategories,
  listByTruck,
  create,
  update,
  remove
};
