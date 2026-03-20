/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accountDeletion from "../accountDeletion.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as chatAction from "../chatAction.js";
import type * as coaching from "../coaching.js";
import type * as companions from "../companions.js";
import type * as crons from "../crons.js";
import type * as goalAI from "../goalAI.js";
import type * as goals from "../goals.js";
import type * as habits from "../habits.js";
import type * as http from "../http.js";
import type * as journal from "../journal.js";
import type * as medicines from "../medicines.js";
import type * as memoryExtraction from "../memoryExtraction.js";
import type * as memoryMaintenance from "../memoryMaintenance.js";
import type * as notifications from "../notifications.js";
import type * as oracle from "../oracle.js";
import type * as progress from "../progress.js";
import type * as quests from "../quests.js";
import type * as timeCapsules from "../timeCapsules.js";
import type * as tts from "../tts.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accountDeletion: typeof accountDeletion;
  auth: typeof auth;
  chat: typeof chat;
  chatAction: typeof chatAction;
  coaching: typeof coaching;
  companions: typeof companions;
  crons: typeof crons;
  goalAI: typeof goalAI;
  goals: typeof goals;
  habits: typeof habits;
  http: typeof http;
  journal: typeof journal;
  medicines: typeof medicines;
  memoryExtraction: typeof memoryExtraction;
  memoryMaintenance: typeof memoryMaintenance;
  notifications: typeof notifications;
  oracle: typeof oracle;
  progress: typeof progress;
  quests: typeof quests;
  timeCapsules: typeof timeCapsules;
  tts: typeof tts;
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
