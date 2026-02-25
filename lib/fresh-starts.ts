/**
 * Fresh Start Detection — Milkman et al. (2014)
 *
 * "The Fresh Start Effect" shows people are more motivated to pursue
 * goals at temporal landmarks — new weeks, months, birthdays, seasons,
 * or after significant life events.
 *
 * We detect upcoming landmarks and surface them as recommitment opportunities.
 */

import { differenceInDays, startOfWeek, startOfMonth, format, addDays, getDay } from 'date-fns';

export interface FreshStart {
  type: 'new_week' | 'new_month' | 'new_year' | 'new_season' | 'milestone_day';
  label: string;
  /** Motivational message */
  message: string;
  /** Days until this fresh start (0 = today) */
  daysAway: number;
  /** Encouragement for the banner */
  cta: string;
}

const SEASON_STARTS: Record<number, string> = {
  0: 'New Year',    // Jan 1
  2: 'Spring',      // Mar 20
  5: 'Summer',      // Jun 21
  8: 'Autumn',      // Sep 22
  11: 'Winter',     // Dec 21
};

const SEASON_DATES: [number, number][] = [
  [2, 20],  // Spring: Mar 20
  [5, 21],  // Summer: Jun 21
  [8, 22],  // Autumn: Sep 22
  [11, 21], // Winter: Dec 21
];

const NEW_WEEK_MESSAGES = [
  'A new week is a clean slate. What will you commit to?',
  'Monday resets — the perfect time to recommit to your habits.',
  'Research shows Mondays are when people are most motivated to start fresh.',
  'New week, new momentum. Your habits are ready when you are.',
];

const NEW_MONTH_MESSAGES = [
  'A new month brings new energy. This is your moment to level up.',
  'First of the month — studies show this is one of the strongest motivational resets.',
  'New month, fresh start. What version of yourself will you build this month?',
];

const MILESTONE_MESSAGES: Record<number, string> = {
  7: 'One week in! The first week is the hardest — and you made it.',
  14: 'Two weeks strong! You\'re past the danger zone for most habit dropoffs.',
  21: 'Three weeks! The "21 days" myth aside, you\'re building real neural pathways.',
  30: 'One month! Research shows 30-day consistency is where real habits start to form.',
  60: 'Two months in! You\'re approaching the automaticity threshold.',
  90: 'Three months! Most habits are deeply ingrained by now.',
  100: '100 days — a centurion of consistency!',
  180: 'Half a year of growth. That\'s remarkable.',
  365: 'ONE YEAR. You\'ve proven this isn\'t a phase — it\'s who you are.',
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Detect fresh starts relevant to today.
 * Returns at most 1-2 most relevant fresh starts.
 */
export function detectFreshStarts(
  today: Date,
  /** Earliest habit creation date, to compute milestone days */
  habitJourneyStartDate?: string,
): FreshStart[] {
  const results: FreshStart[] = [];
  const dayOfWeek = getDay(today); // 0=Sun, 1=Mon

  // ── New Week (Monday) ──
  if (dayOfWeek === 1) {
    results.push({
      type: 'new_week',
      label: 'New Week',
      message: pickRandom(NEW_WEEK_MESSAGES),
      daysAway: 0,
      cta: 'Set your intentions',
    });
  } else {
    // Show "Monday is coming" on Sunday
    if (dayOfWeek === 0) {
      results.push({
        type: 'new_week',
        label: 'Monday Tomorrow',
        message: 'Tomorrow is a natural reset point. Plan your habits tonight for a strong Monday.',
        daysAway: 1,
        cta: 'Plan for Monday',
      });
    }
  }

  // ── New Month (1st) ──
  if (today.getDate() === 1) {
    results.push({
      type: 'new_month',
      label: `Welcome to ${format(today, 'MMMM')}`,
      message: pickRandom(NEW_MONTH_MESSAGES),
      daysAway: 0,
      cta: 'Start strong',
    });
  }

  // ── New Year (Jan 1) ──
  if (today.getMonth() === 0 && today.getDate() === 1) {
    results.push({
      type: 'new_year',
      label: `Happy ${today.getFullYear()}!`,
      message: 'A brand new year — the strongest fresh start there is. What will you build?',
      daysAway: 0,
      cta: 'Set your vision',
    });
  }

  // ── Season Change (within 2 days) ──
  for (const [month, day] of SEASON_DATES) {
    const seasonDate = new Date(today.getFullYear(), month, day);
    const diff = differenceInDays(seasonDate, today);
    if (diff >= 0 && diff <= 1) {
      const seasonName = month === 2 ? 'Spring' : month === 5 ? 'Summer' : month === 8 ? 'Autumn' : 'Winter';
      results.push({
        type: 'new_season',
        label: `${seasonName} Begins`,
        message: `A new season is a natural time for renewal. What habits fit your ${seasonName.toLowerCase()} self?`,
        daysAway: diff,
        cta: 'Refresh your habits',
      });
    }
  }

  // ── Milestone Days (7, 14, 21, 30, 60, 90, 100, 180, 365) ──
  if (habitJourneyStartDate) {
    const startDate = new Date(habitJourneyStartDate);
    const daysSinceStart = differenceInDays(today, startDate);

    for (const [milestone, message] of Object.entries(MILESTONE_MESSAGES)) {
      const m = Number(milestone);
      if (daysSinceStart === m) {
        results.push({
          type: 'milestone_day',
          label: `Day ${m}`,
          message,
          daysAway: 0,
          cta: 'Keep going',
        });
        break; // Only one milestone at a time
      }
    }
  }

  // Return most relevant (prioritize today, then tomorrow)
  return results
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, 2);
}
