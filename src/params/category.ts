import type { ParamMatcher } from '@sveltejs/kit'

/** Category slug; must not be a bare 4-digit year (those map to `/receptsarok/{year}/…`). */
export const match = ((param) => !/^\d{4}$/.test(param)) satisfies ParamMatcher
