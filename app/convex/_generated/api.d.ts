/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as assignees from "../assignees.js";
import type * as auth_helpers from "../auth_helpers.js";
import type * as boards from "../boards.js";
import type * as cards from "../cards.js";
import type * as comments from "../comments.js";
import type * as constants from "../constants.js";
import type * as cron from "../cron.js";
import type * as labels from "../labels.js";
import type * as lists from "../lists.js";
import type * as members from "../members.js";
import type * as presence from "../presence.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  assignees: typeof assignees;
  auth_helpers: typeof auth_helpers;
  boards: typeof boards;
  cards: typeof cards;
  comments: typeof comments;
  constants: typeof constants;
  cron: typeof cron;
  labels: typeof labels;
  lists: typeof lists;
  members: typeof members;
  presence: typeof presence;
  users: typeof users;
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
