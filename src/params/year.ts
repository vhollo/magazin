import type { ParamMatcher } from '@sveltejs/kit'

/** Booklet / recipe publication year (4-digit). */
export const match = ((param) => /^\d{4}$/.test(param)) satisfies ParamMatcher
