import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getAmmOrders = baseProcedure
  .input(
    z.object({
      status: z.enum(["ALL", "ACTIVE", "FILLED", "CANCELLED"]).default("ALL"),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().max(100).default(20),
      marketId: z.string().optional(),
    }),
  )
  .query(async ({ input }) => {
    const { status, page, pageSize, marketId } = input;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (status !== "ALL") {
      where.status = status;
    }

    if (marketId) {
      where.marketId = marketId;
    }

    const totalCount = await db.ammOrder.count({ where });

    const orders = await db.ammOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    });

    const marketIds = [...new Set(orders.map((o) => o.marketId))];
    const markets =
      marketIds.length === 0
        ? []
        : await db.market.findMany({
            where: { id: { in: marketIds } },
            select: { id: true, event: true, sport: true, league: true },
          });
    const marketById = new Map(markets.map((m) => [m.id, m]));

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      orders: orders.map((order) => {
        const m = marketById.get(order.marketId);
        return {
          id: order.id,
          marketId: order.marketId,
          marketName: m?.event ?? "Unknown Market",
          sport: m?.sport,
          league: m?.league,
          side: order.side,
          price: order.price,
          size: order.size,
          type: order.type,
          status: order.status,
          azuroFairValue: order.azuroFairValue,
          spreadApplied: order.spreadApplied,
          createdAt: order.createdAt,
          filledAt: order.filledAt,
        };
      }),
      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  });
