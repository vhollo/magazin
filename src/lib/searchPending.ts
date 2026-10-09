import { writable } from 'svelte/store'

/**
 * True from submitting the search form until the /keres page has its results
 * (or failed to load the search index). Lives in a store because the form is
 * re-created on /keres, so a local flag would be lost during the navigation.
 */
export const searchPending = writable(false)
