/** Firestore doc id for a magazine article path (no leading slash). */
export function encodeDocPathId(pathValue: string): string {
	return String(pathValue ?? '')
		.trim()
		.replace(/^\/+/, '')
		.replace(/\//g, '~');
}

/** Decode a Firestore doc id back to a site path (no leading slash). */
export function decodeDocPathId(docId: string): string {
	return String(docId ?? '').replace(/~/g, '/');
}
