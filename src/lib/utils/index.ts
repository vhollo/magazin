export function formatDate(date: string) {
	return new Date(date).toLocaleDateString('hu-HU', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});
}
