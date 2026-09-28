import { defineCollection, z } from "astro:content";

const postCollection = defineCollection({
	type: "content",
	schema: z.object({
		title: z.string(),
		// Omit for an upcoming post; it has no publish date yet.
		dateFormatted: z.string().optional(),
		// Shows the post as a non-clickable teaser and skips building its page.
		upcoming: z.boolean().optional(),
		// For a post published elsewhere: a key from collections/platforms.json
		// plus the URL it lives at. The card then links out and shows a badge.
		platform: z.string().optional(),
		externalUrl: z.string().url().optional(),
	}),
});

export const collections = {
	post: postCollection,
};
