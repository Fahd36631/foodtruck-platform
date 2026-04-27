import { Router } from "express";

import { asyncHandler } from "../../core/http/async-handler";
import { authenticate } from "../../core/http/middleware/authenticate";
import { authorize } from "../../core/http/middleware/authorize";
import { ROLE_CODES } from "../shared/roles";
import { menusController } from "./menus.controller";

const menusRouter = Router();

menusRouter.use(authenticate);
menusRouter.use(authorize(ROLE_CODES.TRUCK_OWNER, ROLE_CODES.ADMIN));

menusRouter.get("/categories", asyncHandler(menusController.listCategories));
menusRouter.get("/", asyncHandler(menusController.listByTruck));
menusRouter.post("/", asyncHandler(menusController.create));
menusRouter.patch("/:menuItemId", asyncHandler(menusController.update));
menusRouter.delete("/:menuItemId", asyncHandler(menusController.remove));

export { menusRouter };
