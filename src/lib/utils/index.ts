export function formatDate(date: string) {
	return new Date(date).toLocaleDateString('hu-HU', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});
}

export function fromHtmlEntities(string: string) {
	// First: numeric HTML entities.
	let ret = (string + '').replace(/&#\d+;/gm, function (s) {
		const m = s.match(/\d+/gm);
		return m ? String.fromCharCode(Number(m[0])) : s;
	});

	// Second: replace Hungarian accent patterns.
	const hungarianMap: { [key: string]: string } = {
		"a'": 'á',
		"A'": 'Á',
		"e'": 'é',
		"E'": 'É',
		"i'": 'í',
		"I'": 'Í',
		"o'": 'ó',
		"O'": 'Ó',
		'o"': 'ö',
		'O"': 'Ö',
		'o:': 'ő',
		'O:': 'Ő',
		"u'": 'ú',
		"U'": 'Ú',
		'u"': 'ü',
		'U"': 'Ü',
		'u:': 'ű',
		'U:': 'Ű'
	};

	ret = ret.replace(/([aAeEiIoOuU]['":])/g, (match) => {
		return hungarianMap[match] || match;
	});

	return ret;
}
