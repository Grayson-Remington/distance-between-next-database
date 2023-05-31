import { createTRPCRouter } from "~/server/api/trpc";
import { saved_locationsRouter } from "./routers/saved_location";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  saved_locations: saved_locationsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
