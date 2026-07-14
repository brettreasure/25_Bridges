/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminActions from "../adminActions.js";
import type * as adminGuard from "../adminGuard.js";
import type * as adminUsers from "../adminUsers.js";
import type * as attendanceRecords from "../attendanceRecords.js";
import type * as auth from "../auth.js";
import type * as classSessions from "../classSessions.js";
import type * as dashboard from "../dashboard.js";
import type * as duolingo from "../duolingo.js";
import type * as historicalImport from "../historicalImport.js";
import type * as http from "../http.js";
import type * as importSession from "../importSession.js";
import type * as lib_csv from "../lib/csv.js";
import type * as lib_historicalNames from "../lib/historicalNames.js";
import type * as lib_matching from "../lib/matching.js";
import type * as lib_passwordRule from "../lib/passwordRule.js";
import type * as people from "../people.js";
import type * as portal from "../portal.js";
import type * as portalGuard from "../portalGuard.js";
import type * as reviewQueue from "../reviewQueue.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminActions: typeof adminActions;
  adminGuard: typeof adminGuard;
  adminUsers: typeof adminUsers;
  attendanceRecords: typeof attendanceRecords;
  auth: typeof auth;
  classSessions: typeof classSessions;
  dashboard: typeof dashboard;
  duolingo: typeof duolingo;
  historicalImport: typeof historicalImport;
  http: typeof http;
  importSession: typeof importSession;
  "lib/csv": typeof lib_csv;
  "lib/historicalNames": typeof lib_historicalNames;
  "lib/matching": typeof lib_matching;
  "lib/passwordRule": typeof lib_passwordRule;
  people: typeof people;
  portal: typeof portal;
  portalGuard: typeof portalGuard;
  reviewQueue: typeof reviewQueue;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
