import { Citation } from './types';

// ============================================
// Scientific Citation Database
// Peer-reviewed studies and evidence-based books
// ============================================

export const CITATIONS: Citation[] = [
  // ============================================
  // HABIT FORMATION RESEARCH
  // ============================================
  {
    id: 'lally-2010',
    author: 'Lally, P., van Jaarsveld, C. H., Potts, H. W., & Wardle, J.',
    year: 2010,
    title:
      'How are habits formed: Modelling habit formation in the real world',
    source: 'European Journal of Social Psychology, 40(6), 998-1009',
    type: 'journal',
    keyFindings: [
      'Habit automaticity takes 66 days on average (range: 18-254 days)',
      'Missing a single day does not significantly derail habit formation',
      'More complex behaviors take longer to become automatic',
      'Early repetitions have the greatest impact on automaticity gains',
    ],
    doi: '10.1002/ejsp.674',
  },
  {
    id: 'wood-2016',
    author: 'Wood, W., & Runger, D.',
    year: 2016,
    title: 'Psychology of Habit',
    source: 'Annual Review of Psychology, 67, 289-314',
    type: 'journal',
    keyFindings: [
      '43% of daily behaviors are performed habitually',
      'Context stability is crucial for habit formation',
      'Habits persist even when motivation and intentions change',
      'Disrupting context cues is key to breaking unwanted habits',
    ],
    doi: '10.1146/annurev-psych-122414-033417',
  },
  {
    id: 'gardner-2012',
    author: 'Gardner, B., Lally, P., & Wardle, J.',
    year: 2012,
    title:
      'Making health habitual: the psychology of habit-formation and general practice',
    source: 'British Journal of General Practice, 62(605), 664-666',
    type: 'journal',
    keyFindings: [
      'Habit formation requires consistent context (same time, place, preceding action)',
      'Implementation intentions ("if-then" plans) accelerate habit formation',
      'Intrinsic motivation supports habit persistence better than extrinsic rewards',
    ],
    doi: '10.3399/bjgp12X659466',
  },

  // ============================================
  // IMPLEMENTATION INTENTIONS
  // ============================================
  {
    id: 'gollwitzer-2006',
    author: 'Gollwitzer, P. M., & Sheeran, P.',
    year: 2006,
    title:
      'Implementation intentions and goal achievement: A meta-analysis of effects and processes',
    source: 'Advances in Experimental Social Psychology, 38, 69-119',
    type: 'meta-analysis',
    keyFindings: [
      'Implementation intentions have a medium-to-large effect on goal achievement (d = 0.65)',
      '"If-then" planning doubles the success rate for many goals',
      'Specifying when, where, and how to act reduces the need for conscious decision-making',
      'Most effective when the goal is difficult or when obstacles are anticipated',
    ],
    doi: '10.1016/S0065-2601(06)38002-1',
  },

  // ============================================
  // WILLPOWER & SELF-CONTROL
  // ============================================
  {
    id: 'baumeister-2007',
    author: 'Baumeister, R. F., Vohs, K. D., & Tice, D. M.',
    year: 2007,
    title: 'The Strength Model of Self-Control',
    source: 'Current Directions in Psychological Science, 16(6), 351-355',
    type: 'journal',
    keyFindings: [
      'Self-control operates like a muscle that can be fatigued',
      'Willpower is a limited resource that depletes with use',
      'Rest and positive emotions replenish self-control',
      'Regular exercise of self-control can strengthen it over time',
    ],
    doi: '10.1111/j.1467-8721.2007.00534.x',
  },
  {
    id: 'job-2010',
    author: 'Job, V., Dweck, C. S., & Walton, G. M.',
    year: 2010,
    title:
      'Ego depletion—Is it all in your head? Implicit theories about willpower affect self-regulation',
    source: 'Psychological Science, 21(11), 1686-1693',
    type: 'journal',
    keyFindings: [
      'Beliefs about willpower affect actual self-control performance',
      'Those who believe willpower is unlimited show less depletion',
      'Mindset about willpower can be changed through intervention',
    ],
    doi: '10.1177/0956797610384745',
  },

  // ============================================
  // MINDSET & MOTIVATION
  // ============================================
  {
    id: 'dweck-2006',
    author: 'Dweck, C. S.',
    year: 2006,
    title: 'Mindset: The New Psychology of Success',
    source: 'Random House',
    type: 'book',
    keyFindings: [
      'Growth mindset (believing abilities can be developed) leads to greater achievement',
      'Fixed mindset leads to avoiding challenges and giving up after setbacks',
      'How we interpret failure determines whether we persist or quit',
      'Praising effort over talent encourages growth mindset',
    ],
  },
  {
    id: 'deci-2000',
    author: 'Deci, E. L., & Ryan, R. M.',
    year: 2000,
    title:
      'The "what" and "why" of goal pursuits: Human needs and the self-determination of behavior',
    source: 'Psychological Inquiry, 11(4), 227-268',
    type: 'journal',
    keyFindings: [
      'Intrinsic motivation outperforms extrinsic motivation for sustained behavior',
      'Three basic psychological needs: autonomy, competence, relatedness',
      'Goals aligned with personal values are more likely to be achieved',
      'External rewards can undermine intrinsic motivation (overjustification effect)',
    ],
    doi: '10.1207/S15327965PLI1104_01',
  },

  // ============================================
  // POSITIVE PSYCHOLOGY
  // ============================================
  {
    id: 'fredrickson-2001',
    author: 'Fredrickson, B. L.',
    year: 2001,
    title:
      'The role of positive emotions in positive psychology: The broaden-and-build theory',
    source: 'American Psychologist, 56(3), 218-226',
    type: 'journal',
    keyFindings: [
      'Positive emotions broaden thought-action repertoires',
      'Positive emotions build lasting personal resources',
      'Positive emotions undo lingering negative emotions',
      'Cultivating positive emotions leads to upward spirals of wellbeing',
    ],
    doi: '10.1037/0003-066X.56.3.218',
  },
  {
    id: 'emmons-2003',
    author: 'Emmons, R. A., & McCullough, M. E.',
    year: 2003,
    title:
      'Counting blessings versus burdens: An experimental investigation of gratitude and subjective well-being',
    source: 'Journal of Personality and Social Psychology, 84(2), 377-389',
    type: 'journal',
    keyFindings: [
      'Regular gratitude practice increases well-being and life satisfaction',
      'Gratitude journaling leads to more optimism about the upcoming week',
      'Grateful people exercise more and have fewer physical symptoms',
      'Gratitude is associated with higher levels of positive emotions',
    ],
    doi: '10.1037/0022-3514.84.2.377',
  },

  // ============================================
  // BEHAVIOR CHANGE BOOKS
  // ============================================
  {
    id: 'clear-2018',
    author: 'Clear, J.',
    year: 2018,
    title:
      'Atomic Habits: An Easy & Proven Way to Build Good Habits & Break Bad Ones',
    source: 'Avery Publishing',
    type: 'book',
    keyFindings: [
      'The Four Laws of Behavior Change: Make it obvious, attractive, easy, satisfying',
      '1% improvements compound to remarkable results over time',
      'Habit stacking: link new habits to existing routines',
      'Environment design is more reliable than willpower',
      'Identity-based habits are more durable than outcome-based habits',
      'The Two-Minute Rule: scale habits down to take two minutes or less',
    ],
  },
  {
    id: 'duhigg-2012',
    author: 'Duhigg, C.',
    year: 2012,
    title:
      'The Power of Habit: Why We Do What We Do in Life and Business',
    source: 'Random House',
    type: 'book',
    keyFindings: [
      'The Habit Loop: Cue → Routine → Reward',
      'Keystone habits trigger positive cascades in other areas of life',
      'The Golden Rule of Habit Change: keep the cue, keep the reward, change the routine',
      'Belief is essential for lasting habit change',
      'Small wins create momentum for larger changes',
    ],
  },
  {
    id: 'fogg-2019',
    author: 'Fogg, B. J.',
    year: 2019,
    title: 'Tiny Habits: The Small Changes That Change Everything',
    source: 'Houghton Mifflin Harcourt',
    type: 'book',
    keyFindings: [
      'Behavior = Motivation × Ability × Prompt (B=MAP)',
      'Start with habits so tiny they require almost no motivation',
      'Anchor new habits to existing behaviors (after I do X, I will do Y)',
      'Celebrate immediately after completing a habit to wire in the behavior',
      'Design for the days when motivation is low',
    ],
  },

  // ============================================
  // SELF-MONITORING & TRACKING
  // ============================================
  {
    id: 'harkin-2016',
    author: 'Harkin, B., Webb, T. L., Chang, B. P., et al.',
    year: 2016,
    title:
      'Does monitoring goal progress promote goal attainment? A meta-analysis of the experimental evidence',
    source: 'Psychological Bulletin, 142(2), 198-229',
    type: 'meta-analysis',
    keyFindings: [
      'Monitoring goal progress is effective for goal attainment',
      'Physical recording (writing/tracking) is more effective than mental monitoring',
      'Public reporting of progress enhances the effect',
      'More frequent monitoring leads to better outcomes',
    ],
    doi: '10.1037/bul0000025',
  },

  // ============================================
  // STRESS & PERFORMANCE
  // ============================================
  {
    id: 'mcgonigal-2015',
    author: 'McGonigal, K.',
    year: 2015,
    title:
      'The Upside of Stress: Why Stress Is Good for You, and How to Get Good at It',
    source: 'Avery Publishing',
    type: 'book',
    keyFindings: [
      'Stress mindset (viewing stress as enhancing vs debilitating) affects outcomes',
      'Reframing stress as a challenge response improves performance',
      'Stress can enhance focus, energy, and motivation when viewed positively',
      'Social connection buffers the negative effects of stress',
    ],
  },

  // ============================================
  // SLEEP & PERFORMANCE
  // ============================================
  {
    id: 'walker-2017',
    author: 'Walker, M.',
    year: 2017,
    title: 'Why We Sleep: Unlocking the Power of Sleep and Dreams',
    source: 'Scribner',
    type: 'book',
    keyFindings: [
      'Sleep deprivation impairs decision-making and self-control',
      'Sleep is essential for memory consolidation and learning',
      'Even mild sleep deprivation accumulates as "sleep debt"',
      'Consistent sleep schedule is more important than total hours',
    ],
  },

  // ============================================
  // JOURNALING & REFLECTION
  // ============================================
  {
    id: 'pennebaker-1997',
    author: 'Pennebaker, J. W.',
    year: 1997,
    title: 'Writing about emotional experiences as a therapeutic process',
    source: 'Psychological Science, 8(3), 162-166',
    type: 'journal',
    keyFindings: [
      'Expressive writing improves physical and psychological health',
      'Writing about emotions helps process and make sense of experiences',
      'Even brief writing sessions (15-20 min) produce measurable benefits',
      'The act of translating experiences into language creates insight',
    ],
    doi: '10.1111/j.1467-9280.1997.tb00403.x',
  },
];

// ============================================
// Helper Functions
// ============================================

export function getCitationById(id: string): Citation | undefined {
  return CITATIONS.find((c) => c.id === id);
}

export function getCitationsByType(type: Citation['type']): Citation[] {
  return CITATIONS.filter((c) => c.type === type);
}

export function formatCitationAPA(citation: Citation): string {
  if (citation.type === 'book') {
    return `${citation.author} (${citation.year}). ${citation.title}. ${citation.source}.`;
  }
  return `${citation.author} (${citation.year}). ${citation.title}. ${citation.source}.${citation.doi ? ` https://doi.org/${citation.doi}` : ''}`;
}

export function formatCitationShort(citation: Citation): string {
  // Extract first author's last name
  const firstAuthor = citation.author.split(',')[0].split(' ').pop();
  const hasMultipleAuthors =
    citation.author.includes('&') || citation.author.includes('et al');
  return `${firstAuthor}${hasMultipleAuthors ? ' et al.' : ''} (${citation.year})`;
}

// Get a random finding from a citation for variety
export function getRandomFinding(citation: Citation): string {
  const randomIndex = Math.floor(Math.random() * citation.keyFindings.length);
  return citation.keyFindings[randomIndex];
}

// Export as formatted string for system prompt
export function getCitationsForPrompt(): string {
  return CITATIONS.map((c) => {
    return `
### ${formatCitationShort(c)}
- Source: ${c.source}
- Type: ${c.type}
- Key findings:
${c.keyFindings.map((f) => `  - ${f}`).join('\n')}
`;
  }).join('\n');
}
