import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { ok } from "../../core/http/api-response";
import { requireAuth } from "../../core/http/require-auth";
import { ordersService } from "./orders.service";
import {
  createOrderPaymentSchema,
  createOrderReviewSchema,
  createOrderSchema,
  updateOrderStatusSchema
} from "./orders.validator";

const create = async (req: Request, res: Response) => {
  const authUser = requireAuth(req);
  const payload = createOrderSchema.parse(req.body);
  const result = await ordersService.createOrder(authUser, payload);
  res.status(StatusCodes.CREATED).json(ok("Pickup order placed", result));
};

const listMyOrders = async (req: Request, res: Response) => {
  const authUser = requireAuth(req);
  const result = await ordersService.listMyOrders(authUser);
  res.status(StatusCodes.OK).json(ok("Customer pickup orders fetched", result));
};

const listMyNotifications = async (req: Request, res: Response) => {
  const authUser = requireAuth(req);
  const result = await ordersService.listMyNotifications(authUser);
  res.status(StatusCodes.OK).json(ok("Customer order notifications fetched", result));
};

const listIncoming = async (req: Request, res: Response) => {
  const authUser = requireAuth(req);
  const result = await ordersService.listIncomingOrders(authUser);
  res.status(StatusCodes.OK).json(ok("Incoming pickup orders fetched", result));
};

const updateStatus = async (req: Request, res: Response) => {
  const authUser = requireAuth(req);
  const orderId = Number(req.params.orderId);
  const payload = updateOrderStatusSchema.parse(req.body);
  const result = await ordersService.updateOrderStatus(orderId, payload.status, authUser);
  res.status(StatusCodes.OK).json(ok("Order status updated", result));
};

const submitReview = async (req: Request, res: Response) => {
  const authUser = requireAuth(req);
  const orderId = Number(req.params.orderId);
  const payload = createOrderReviewSchema.parse(req.body);
  const result = await ordersService.createOrderReview(authUser, orderId, payload);
  res.status(StatusCodes.CREATED).json(ok("Order review submitted", result));
};

const payOrder = async (req: Request, res: Response) => {
  const authUser = requireAuth(req);
  const orderId = Number(req.params.orderId);
  const payload = createOrderPaymentSchema.parse(req.body);
  const result = await ordersService.createOrderPayment(authUser, orderId, payload);
  res.status(StatusCodes.OK).json(ok("Order payment processed", result));
};

export const ordersController = {
  create,
  listMyOrders,
  listMyNotifications,
  listIncoming,
  updateStatus,
  submitReview,
  payOrder
};
