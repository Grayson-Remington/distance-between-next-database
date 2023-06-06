import type { User } from "@clerk/nextjs/dist/api";
import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import { Ratelimit } from "@upstash/ratelimit"; // for deno: see above
import { Redis } from "@upstash/redis";

// Create a new ratelimiter, that allows 10 requests per 10 seconds
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "1 m"),
  analytics: true,
  /**
   * Optional prefix for the keys used in redis. This is useful if you want to share a redis
   * instance with other applications and want to avoid key collisions. The default prefix is
   * "@upstash/ratelimit"
   */
  prefix: "@upstash/ratelimit",
});

export const saved_locationsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;

    const saved_locations = await ctx.prisma.saved_Location.findMany({
      where: {
        userId: {
          equals: userId!,
        },
      },
      take: 100,
      orderBy: [{ createdAt: "desc" }],
    });

    return saved_locations.map((saved_location) => {
      return {
        saved_location,
      };
    });
  }),
  create: privateProcedure
    .input(
      z.object({
        content: z.object({
          name: z.string().min(1).max(280),
          description: z.string().min(1).max(280),
          main_text: z.string().min(1).max(280),
          secondary_text: z.string().min(1).max(280),
          lat: z.number(),
          lng: z.number(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const { success } = await ratelimit.limit(userId);

      if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
      const saved_location = await ctx.prisma.saved_Location.create({
        data: {
          userId: userId,
          name: input.content.name,
          description: input.content.description,
          main_text: input.content.main_text,
          secondary_text: input.content.secondary_text,
          lat: input.content.lat,
          lng: input.content.lng,
        },
      });
      return saved_location;
    }),
  delete: privateProcedure
    .input(
      z.object({
        id: z.string().min(1).max(280),
      })
    )
    .mutation(({ ctx, input }) => {
      const validatedInput = input.id;
      return ctx.prisma.saved_Location.delete({
        where: {
          id: validatedInput,
        },
      });
    }),
});
