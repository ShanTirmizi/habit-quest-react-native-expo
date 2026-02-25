import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.weekly(
  "decay memories",
  { dayOfWeek: "sunday", hourUTC: 4, minuteUTC: 0 },
  internal.memoryMaintenance.decayMemories
);

export default crons;
