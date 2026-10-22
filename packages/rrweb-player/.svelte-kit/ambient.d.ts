
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://kit.svelte.dev/docs/modules#$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://kit.svelte.dev/docs/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://kit.svelte.dev/docs/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://kit.svelte.dev/docs/modules#$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```bash
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const TERM_SESSION_ID: string;
	export const __MISE_ORIG_PATH: string;
	export const npm_package_scripts_test_cross_platform_build: string;
	export const npm_package_devDependencies_rollup: string;
	export const npm_package_devDependencies__types_node: string;
	export const npm_package_devDependencies_vitest: string;
	export const LANGUAGE: string;
	export const LC_TIME: string;
	export const USER: string;
	export const npm_package_bin_svelte_kit: string;
	export const npm_package_dependencies_sirv: string;
	export const npm_package_dependencies_sade: string;
	export const npm_package_dependencies_mrmime: string;
	export const npm_package_dependencies_magic_string: string;
	export const npm_config_version_commit_hooks: string;
	export const npm_config_user_agent: string;
	export const __MISE_SESSION: string;
	export const npm_package_scripts_generate_version: string;
	export const npm_package_dependencies__types_cookie: string;
	export const npm_config_bin_links: string;
	export const XDG_SESSION_TYPE: string;
	export const npm_node_execpath: string;
	export const npm_package_devDependencies_vite: string;
	export const npm_package_devDependencies__sveltejs_vite_plugin_svelte: string;
	export const npm_config_init_version: string;
	export const SHLVL: string;
	export const TOOLBOX_VERSION: string;
	export const npm_package_exports___node_types: string;
	export const npm_package_files_0: string;
	export const HOME: string;
	export const npm_package_files_1: string;
	export const npm_package_repository_directory: string;
	export const DESKTOP_SESSION: string;
	export const npm_package_files_2: string;
	export const GIO_LAUNCHED_DESKTOP_FILE: string;
	export const TERMINAL_EMULATOR: string;
	export const npm_package_engines_node: string;
	export const npm_package_exports___vite_import: string;
	export const npm_package_files_3: string;
	export const npm_package_devDependencies_svelte_preprocess: string;
	export const npm_config_init_license: string;
	export const GTK_MODULES: string;
	export const __MISE_DIFF: string;
	export const npm_package_files_4: string;
	export const npm_config_version_tag_prefix: string;
	export const LC_MONETARY: string;
	export const MANAGERPID: string;
	export const npm_package_scripts_check: string;
	export const npm_package_files_5: string;
	export const npm_package_dependencies_tiny_glob: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const GSM_SKIP_SSH_AGENT_WORKAROUND: string;
	export const SYSTEMD_EXEC_PID: string;
	export const npm_package_scripts_postinstall: string;
	export const npm_package_files_6: string;
	export const GIO_LAUNCHED_DESKTOP_FILE_PID: string;
	export const npm_package_devDependencies_typescript: string;
	export const npm_package_devDependencies__types_connect: string;
	export const npm_package_description: string;
	export const VOLTA_HOME: string;
	export const _VOLTA_TOOL_RECURSION: string;
	export const npm_package_readmeFilename: string;
	export const npm_package_types: string;
	export const npm_package_homepage: string;
	export const WAYLAND_DISPLAY: string;
	export const npm_package_exports___hooks_types: string;
	export const npm_package_devDependencies__playwright_test: string;
	export const LOGNAME: string;
	export const npm_package_type: string;
	export const DESKTOP_AUTOSTART_ID: string;
	export const JOURNAL_STREAM: string;
	export const MISE_SHELL: string;
	export const MEMORY_PRESSURE_WATCH: string;
	export const XDG_SESSION_CLASS: string;
	export const npm_package_scripts_lint: string;
	export const npm_config_registry: string;
	export const TERM: string;
	export const USERNAME: string;
	export const GNOME_DESKTOP_SESSION_ID: string;
	export const npm_package_exports___import: string;
	export const npm_package_devDependencies_dts_buddy: string;
	export const npm_package_dependencies_kleur: string;
	export const npm_package_dependencies_devalue: string;
	export const npm_config_ignore_scripts: string;
	export const npm_package_exports___package_json: string;
	export const npm_package_peerDependencies_svelte: string;
	export const PATH: string;
	export const NODE: string;
	export const INVOCATION_ID: string;
	export const PAPERSIZE: string;
	export const SESSION_MANAGER: string;
	export const npm_package_repository_type: string;
	export const npm_package_name: string;
	export const GNOME_SETUP_DISPLAY: string;
	export const LC_ADDRESS: string;
	export const XDG_MENU_PREFIX: string;
	export const XDG_RUNTIME_DIR: string;
	export const npm_package_scripts_test_integration: string;
	export const npm_package_exports___node_polyfills_import: string;
	export const npm_package_devDependencies__types_set_cookie_parser: string;
	export const DISPLAY: string;
	export const npm_package_scripts_test_unit: string;
	export const npm_package_exports___vite_types: string;
	export const npm_config_ignore_path: string;
	export const LANG: string;
	export const LC_TELEPHONE: string;
	export const XDG_CURRENT_DESKTOP: string;
	export const XAUTHORITY: string;
	export const XDG_SESSION_DESKTOP: string;
	export const XMODIFIERS: string;
	export const npm_lifecycle_script: string;
	export const npm_package_scripts_test_cross_platform_dev: string;
	export const SSH_AUTH_SOCK: string;
	export const npm_package_scripts_test: string;
	export const npm_package_dependencies_esm_env: string;
	export const npm_config_version_git_message: string;
	export const LC_NAME: string;
	export const SHELL: string;
	export const npm_lifecycle_event: string;
	export const npm_package_repository_url: string;
	export const npm_package_version: string;
	export const GDMSESSION: string;
	export const QT_ACCESSIBILITY: string;
	export const npm_config_argv: string;
	export const npm_package_scripts_generate_types: string;
	export const npm_package_scripts_check_all: string;
	export const npm_package_devDependencies_svelte: string;
	export const npm_package_dependencies_cookie: string;
	export const YARN_IGNORE_PATH: string;
	export const npm_package_exports___node_import: string;
	export const LC_MEASUREMENT: string;
	export const npm_package_devDependencies__types_sade: string;
	export const npm_config_version_git_tag: string;
	export const npm_config_version_git_sign: string;
	export const LC_IDENTIFICATION: string;
	export const npm_package_license: string;
	export const npm_config_strict_ssl: string;
	export const QT_IM_MODULE: string;
	export const npm_package_scripts_format: string;
	export const PWD: string;
	export const npm_execpath: string;
	export const npm_package_dependencies_set_cookie_parser: string;
	export const XDG_DATA_DIRS: string;
	export const npm_package_exports___types: string;
	export const LC_NUMERIC: string;
	export const npm_package_peerDependencies_vite: string;
	export const npm_package_peerDependencies__sveltejs_vite_plugin_svelte: string;
	export const npm_config_save_prefix: string;
	export const npm_config_ignore_optional: string;
	export const LC_PAPER: string;
	export const MEMORY_PRESSURE_WRITE: string;
	export const npm_package_exports___node_polyfills_types: string;
	export const INIT_CWD: string;
	export const npm_package_exports___hooks_import: string;
	export const npm_package_dependencies_import_meta_resolve: string;
}

/**
 * Similar to [`$env/static/private`](https://kit.svelte.dev/docs/modules#$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://kit.svelte.dev/docs/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://kit.svelte.dev/docs/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://kit.svelte.dev/docs/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://kit.svelte.dev/docs/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		TERM_SESSION_ID: string;
		__MISE_ORIG_PATH: string;
		npm_package_scripts_test_cross_platform_build: string;
		npm_package_devDependencies_rollup: string;
		npm_package_devDependencies__types_node: string;
		npm_package_devDependencies_vitest: string;
		LANGUAGE: string;
		LC_TIME: string;
		USER: string;
		npm_package_bin_svelte_kit: string;
		npm_package_dependencies_sirv: string;
		npm_package_dependencies_sade: string;
		npm_package_dependencies_mrmime: string;
		npm_package_dependencies_magic_string: string;
		npm_config_version_commit_hooks: string;
		npm_config_user_agent: string;
		__MISE_SESSION: string;
		npm_package_scripts_generate_version: string;
		npm_package_dependencies__types_cookie: string;
		npm_config_bin_links: string;
		XDG_SESSION_TYPE: string;
		npm_node_execpath: string;
		npm_package_devDependencies_vite: string;
		npm_package_devDependencies__sveltejs_vite_plugin_svelte: string;
		npm_config_init_version: string;
		SHLVL: string;
		TOOLBOX_VERSION: string;
		npm_package_exports___node_types: string;
		npm_package_files_0: string;
		HOME: string;
		npm_package_files_1: string;
		npm_package_repository_directory: string;
		DESKTOP_SESSION: string;
		npm_package_files_2: string;
		GIO_LAUNCHED_DESKTOP_FILE: string;
		TERMINAL_EMULATOR: string;
		npm_package_engines_node: string;
		npm_package_exports___vite_import: string;
		npm_package_files_3: string;
		npm_package_devDependencies_svelte_preprocess: string;
		npm_config_init_license: string;
		GTK_MODULES: string;
		__MISE_DIFF: string;
		npm_package_files_4: string;
		npm_config_version_tag_prefix: string;
		LC_MONETARY: string;
		MANAGERPID: string;
		npm_package_scripts_check: string;
		npm_package_files_5: string;
		npm_package_dependencies_tiny_glob: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		GSM_SKIP_SSH_AGENT_WORKAROUND: string;
		SYSTEMD_EXEC_PID: string;
		npm_package_scripts_postinstall: string;
		npm_package_files_6: string;
		GIO_LAUNCHED_DESKTOP_FILE_PID: string;
		npm_package_devDependencies_typescript: string;
		npm_package_devDependencies__types_connect: string;
		npm_package_description: string;
		VOLTA_HOME: string;
		_VOLTA_TOOL_RECURSION: string;
		npm_package_readmeFilename: string;
		npm_package_types: string;
		npm_package_homepage: string;
		WAYLAND_DISPLAY: string;
		npm_package_exports___hooks_types: string;
		npm_package_devDependencies__playwright_test: string;
		LOGNAME: string;
		npm_package_type: string;
		DESKTOP_AUTOSTART_ID: string;
		JOURNAL_STREAM: string;
		MISE_SHELL: string;
		MEMORY_PRESSURE_WATCH: string;
		XDG_SESSION_CLASS: string;
		npm_package_scripts_lint: string;
		npm_config_registry: string;
		TERM: string;
		USERNAME: string;
		GNOME_DESKTOP_SESSION_ID: string;
		npm_package_exports___import: string;
		npm_package_devDependencies_dts_buddy: string;
		npm_package_dependencies_kleur: string;
		npm_package_dependencies_devalue: string;
		npm_config_ignore_scripts: string;
		npm_package_exports___package_json: string;
		npm_package_peerDependencies_svelte: string;
		PATH: string;
		NODE: string;
		INVOCATION_ID: string;
		PAPERSIZE: string;
		SESSION_MANAGER: string;
		npm_package_repository_type: string;
		npm_package_name: string;
		GNOME_SETUP_DISPLAY: string;
		LC_ADDRESS: string;
		XDG_MENU_PREFIX: string;
		XDG_RUNTIME_DIR: string;
		npm_package_scripts_test_integration: string;
		npm_package_exports___node_polyfills_import: string;
		npm_package_devDependencies__types_set_cookie_parser: string;
		DISPLAY: string;
		npm_package_scripts_test_unit: string;
		npm_package_exports___vite_types: string;
		npm_config_ignore_path: string;
		LANG: string;
		LC_TELEPHONE: string;
		XDG_CURRENT_DESKTOP: string;
		XAUTHORITY: string;
		XDG_SESSION_DESKTOP: string;
		XMODIFIERS: string;
		npm_lifecycle_script: string;
		npm_package_scripts_test_cross_platform_dev: string;
		SSH_AUTH_SOCK: string;
		npm_package_scripts_test: string;
		npm_package_dependencies_esm_env: string;
		npm_config_version_git_message: string;
		LC_NAME: string;
		SHELL: string;
		npm_lifecycle_event: string;
		npm_package_repository_url: string;
		npm_package_version: string;
		GDMSESSION: string;
		QT_ACCESSIBILITY: string;
		npm_config_argv: string;
		npm_package_scripts_generate_types: string;
		npm_package_scripts_check_all: string;
		npm_package_devDependencies_svelte: string;
		npm_package_dependencies_cookie: string;
		YARN_IGNORE_PATH: string;
		npm_package_exports___node_import: string;
		LC_MEASUREMENT: string;
		npm_package_devDependencies__types_sade: string;
		npm_config_version_git_tag: string;
		npm_config_version_git_sign: string;
		LC_IDENTIFICATION: string;
		npm_package_license: string;
		npm_config_strict_ssl: string;
		QT_IM_MODULE: string;
		npm_package_scripts_format: string;
		PWD: string;
		npm_execpath: string;
		npm_package_dependencies_set_cookie_parser: string;
		XDG_DATA_DIRS: string;
		npm_package_exports___types: string;
		LC_NUMERIC: string;
		npm_package_peerDependencies_vite: string;
		npm_package_peerDependencies__sveltejs_vite_plugin_svelte: string;
		npm_config_save_prefix: string;
		npm_config_ignore_optional: string;
		LC_PAPER: string;
		MEMORY_PRESSURE_WRITE: string;
		npm_package_exports___node_polyfills_types: string;
		INIT_CWD: string;
		npm_package_exports___hooks_import: string;
		npm_package_dependencies_import_meta_resolve: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://kit.svelte.dev/docs/modules#$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://kit.svelte.dev/docs/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
