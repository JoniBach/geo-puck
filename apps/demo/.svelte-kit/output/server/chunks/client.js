import { r as index_server_exports } from "./internal2.js";
import "./exports.js";
import { _ as noop } from "./shared.js";
import "./internal.js";
import { Bt as noop$1 } from "./server.js";
import "@sveltejs/kit/internal";
import "@sveltejs/kit/internal/server";
import "devalue";
var PRELOAD_PRIORITIES = {
	tap: 1,
	hover: 2,
	viewport: 3,
	eager: 4,
	off: -1,
	false: -1
};
({ ...PRELOAD_PRIORITIES }), PRELOAD_PRIORITIES.hover;
var updated_listener = { v: noop };
// ../../node_modules/@sveltejs/kit/src/runtime/client/state.svelte.js
var page;
var navigating;
var updated;
var is_legacy = noop$1.toString().includes("$$") || /function \w+\(\) \{\}/.test(noop$1.toString());
var placeholder_url = "a:";
if (is_legacy) {
	page = {
		data: {},
		form: null,
		error: null,
		params: {},
		route: { id: null },
		state: {},
		status: -1,
		url: new URL(placeholder_url)
	};
	navigating = { current: null };
	updated = { current: false };
} else {
	page = new class Page {
		data = {};
		form = null;
		error = null;
		params = {};
		route = { id: null };
		state = {};
		status = -1;
		url = new URL(placeholder_url);
	}();
	navigating = new class Navigating {
		current = null;
	}();
	updated = new class Updated {
		current = false;
	}();
	updated_listener.v = () => updated.current = true;
}
// ../../node_modules/@sveltejs/kit/src/runtime/client/client.js
/** @import { RemoteFunctionDataNode, ServerNodesResponse, ServerRedirectNode } from 'types' */
/** @import { CacheEntry } from './remote-functions/cache.svelte.js' */
/** @import { Query } from './remote-functions/query/instance.svelte.js' */
/** @import { LiveQuery } from './remote-functions/query-live/instance.svelte.js' */
var { onMount, tick } = index_server_exports;
/**
* Programmatically replace the current history entry with the given `page.state`. To use the current URL, you can pass `''` as the first argument. Used for [shallow routing](https://svelte.dev/docs/kit/shallow-routing).
*
* @param {string | URL} url
* @param {App.PageState} state
* @returns {void}
*/
function replaceState(url, state) {
	throw new Error("Cannot call replaceState(...) on the server");
}
export { navigating as n, page as r, replaceState as t };
