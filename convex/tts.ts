"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Text-to-Speech via OpenAI's TTS API.
 * Returns base64-encoded mp3 audio.
 *
 * Uses the "tts-1" model with the "nova" voice (warm, natural female voice).
 * Cost: ~$0.015 per 1K characters.
 */
export const synthesize = action({
  args: {
    text: v.string(),
    voice: v.optional(
      v.union(
        v.literal("alloy"),
        v.literal("echo"),
        v.literal("fable"),
        v.literal("onyx"),
        v.literal("nova"),
        v.literal("shimmer"),
      )
    ),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("OPENAI_API_KEY not set — TTS unavailable");
      return null;
    }

    // Trim text to avoid huge audio files (max ~500 chars for voice responses)
    const text = args.text.slice(0, 1000);
    const voice = args.voice ?? "nova";

    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice,
          response_format: "mp3",
          speed: 1.0,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("[TTS] OpenAI error:", response.status, err);
        return null;
      }

      // Convert audio buffer to base64
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } catch (error) {
      console.error("[TTS] Failed:", error);
      return null;
    }
  },
});
