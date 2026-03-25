/**
 * ChatMarkdown — Lightweight markdown renderer for chat bubbles.
 *
 * Parses a subset of markdown commonly found in AI responses and renders
 * them as styled React Native <Text> components. Designed specifically
 * for chat contexts — not a full markdown engine.
 *
 * Supported syntax:
 *   **bold**         → bold text
 *   *italic*         → italic text
 *   ***bold italic***→ bold + italic text
 *   - bullet item    → • bulleted list item
 *   1. numbered item → numbered list item
 *   `inline code`    → monospace highlighted text
 *   --- or ***       → horizontal divider
 *
 * Unsupported (intentionally — not useful in chat):
 *   # headings, images, links, code blocks, tables
 */
import React, { useMemo } from 'react';
import { Text, View, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { FontSize, FontFamily, Spacing, Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface ChatMarkdownProps {
  /** The raw markdown string from the AI */
  children: string;
  /** Base text style (fontSize, lineHeight, color, etc.) — accepts arrays like StyleSheet */
  style?: TextStyle | TextStyle[];
  /** Whether the text is selectable (for long-press copy) */
  selectable?: boolean;
}

/** A single parsed segment within a line of text */
type InlineSegment =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'boldItalic'; content: string }
  | { type: 'code'; content: string };

/** A parsed block (line or group of lines) */
type Block =
  | { type: 'paragraph'; segments: InlineSegment[] }
  | { type: 'bullet'; segments: InlineSegment[] }
  | { type: 'numbered'; number: number; segments: InlineSegment[] }
  | { type: 'divider' };

/**
 * Parse inline markdown (bold, italic, code) within a single line of text.
 * Processes in order: code → bold+italic → bold → italic
 */
function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  // Regex matches in priority order:
  // 1. `code`
  // 2. ***bold italic***
  // 3. **bold**
  // 4. *italic* (but not ** which is bold)
  const regex = /`([^`]+)`|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*([^*]+?)\*/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      segments.push({ type: 'code', content: match[1] });
    } else if (match[2] !== undefined) {
      segments.push({ type: 'boldItalic', content: match[2] });
    } else if (match[3] !== undefined) {
      segments.push({ type: 'bold', content: match[3] });
    } else if (match[4] !== undefined) {
      segments.push({ type: 'italic', content: match[4] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  // If nothing was parsed, return the whole string as text
  if (segments.length === 0) {
    segments.push({ type: 'text', content: text });
  }

  return segments;
}

/**
 * Parse a full markdown string into blocks (paragraphs, lists, dividers).
 */
function parseMarkdown(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Divider: --- or *** or ___ (at least 3 chars on the line)
    if (/^\s*[-]{3,}\s*$/.test(line) || /^\s*[*]{3,}\s*$/.test(line) || /^\s*[_]{3,}\s*$/.test(line)) {
      blocks.push({ type: 'divider' });
      continue;
    }

    // Bullet list: starts with - or • or * followed by space
    const bulletMatch = line.match(/^\s*[-•*]\s+(.+)/);
    if (bulletMatch) {
      blocks.push({ type: 'bullet', segments: parseInline(bulletMatch[1]) });
      continue;
    }

    // Numbered list: starts with digit(s). followed by space
    const numberedMatch = line.match(/^\s*(\d+)[.)]\s+(.+)/);
    if (numberedMatch) {
      blocks.push({
        type: 'numbered',
        number: parseInt(numberedMatch[1], 10),
        segments: parseInline(numberedMatch[2]),
      });
      continue;
    }

    // Empty line → skip (creates spacing between paragraphs naturally)
    if (line.trim() === '') {
      continue;
    }

    // Regular paragraph line
    // Merge consecutive paragraph lines into one block
    const lastBlock = blocks[blocks.length - 1];
    if (lastBlock?.type === 'paragraph' && i > 0 && lines[i - 1].trim() !== '') {
      // Continue the previous paragraph (soft line break)
      lastBlock.segments.push({ type: 'text', content: ' ' });
      lastBlock.segments.push(...parseInline(line));
    } else {
      blocks.push({ type: 'paragraph', segments: parseInline(line) });
    }
  }

  return blocks;
}

export function ChatMarkdown({ children, style, selectable }: ChatMarkdownProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const blocks = useMemo(() => parseMarkdown(children), [children]);

  // Determine base text color from the passed style (handles arrays)
  const flatStyle = Array.isArray(style)
    ? Object.assign({}, ...style) as TextStyle
    : style;
  const baseColor = (flatStyle?.color as string) ?? colors.foreground;

  const renderSegments = (segments: InlineSegment[], key: string) => (
    <Text key={key} selectable={selectable} style={[styles.baseText, style]}>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case 'bold':
            return (
              <Text key={i} style={styles.bold}>
                {seg.content}
              </Text>
            );
          case 'italic':
            return (
              <Text key={i} style={styles.italic}>
                {seg.content}
              </Text>
            );
          case 'boldItalic':
            return (
              <Text key={i} style={[styles.bold, styles.italic]}>
                {seg.content}
              </Text>
            );
          case 'code':
            return (
              <Text key={i} style={[styles.code, { backgroundColor: `${baseColor}10` }]}>
                {seg.content}
              </Text>
            );
          case 'text':
          default:
            return <Text key={i}>{seg.content}</Text>;
        }
      })}
    </Text>
  );

  return (
    <View style={styles.container}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'divider':
            return (
              <View
                key={i}
                style={[styles.divider, { backgroundColor: `${baseColor}20` }]}
              />
            );

          case 'bullet':
            return (
              <View key={i} style={styles.listItem}>
                <Text selectable={selectable} style={[styles.baseText, style, styles.bullet]}>
                  •
                </Text>
                <View style={styles.listItemContent}>
                  {renderSegments(block.segments, `b-${i}`)}
                </View>
              </View>
            );

          case 'numbered':
            return (
              <View key={i} style={styles.listItem}>
                <Text selectable={selectable} style={[styles.baseText, style, styles.numberedBullet]}>
                  {block.number}.
                </Text>
                <View style={styles.listItemContent}>
                  {renderSegments(block.segments, `n-${i}`)}
                </View>
              </View>
            );

          case 'paragraph':
          default:
            return renderSegments(block.segments, `p-${i}`);
        }
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      gap: Spacing.sm,
    },
    baseText: {
      fontSize: FontSize.sm,
      lineHeight: 19,
      fontFamily: FontFamily.regular,
      color: colors.foreground,
    },
    bold: {
      fontFamily: FontFamily.semibold,
    },
    italic: {
      fontStyle: 'italic',
    },
    code: {
      fontFamily: 'Menlo',
      fontSize: FontSize.xs,
      borderRadius: Radius.sm,
      paddingHorizontal: 3,
      overflow: 'hidden',
    },
    divider: {
      height: 1,
      marginVertical: Spacing.xs,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    bullet: {
      width: 16,
      textAlign: 'center',
      marginTop: 0,
    },
    numberedBullet: {
      width: 20,
      textAlign: 'right',
      marginRight: 4,
    },
    listItemContent: {
      flex: 1,
    },
  });
