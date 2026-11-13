export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "geo-puck/_app",
	assets: new Set(["favicon.svg"]),
	mimeTypes: {".svg":"image/svg+xml"},
	_: {
		client: {start:"_app/immutable/entry/start.DTOP_NZB.js",app:"_app/immutable/entry/app.fdSQBblY.js",imports:["_app/immutable/entry/start.DTOP_NZB.js","_app/immutable/chunks/DflJtYQh.js","_app/immutable/chunks/DuLqbDZX.js","_app/immutable/entry/app.fdSQBblY.js","_app/immutable/chunks/DuLqbDZX.js","_app/immutable/chunks/xihTtKlq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js'))
		],
		remotes: {
			
		},
		routes: [
			
		],
		prerendered_routes: new Set(["/geo-puck/"]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
