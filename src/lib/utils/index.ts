export function formatDate(date: string) {
	return new Date(date).toLocaleDateString('hu-HU', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});
}

function applyHungarianAsciiAccents(ret: string) {
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

	return ret.replace(/([aAeEiIoOuU]['":])/g, (match) => {
		return hungarianMap[match] || match;
	});
}

export function fromHtmlEntities(string: string) {
	// First: numeric HTML entities.
	let ret = (string + '').replace(/&#\d+;/gm, function (s) {
		const m = s.match(/\d+/gm);
		return m ? String.fromCharCode(Number(m[0])) : s;
	});

	// Hungarian letter + quote/colon shortcuts (e.g. o" -> ö) must not run inside tag
	// markup: e.g. href="https://www.example.hu" ends with u" which would become ü
	// and swallow the closing quote.
	ret = ret.split(/(<[^>]*>)/).map((segment) => {
		if (segment.startsWith('<') && segment.endsWith('>')) {
			return segment;
		}
		return applyHungarianAsciiAccents(segment);
	}).join('');

	return ret;
}
