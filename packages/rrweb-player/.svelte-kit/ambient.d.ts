
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
	export const NVM_INC: string;
	export const VAULT_AMPLITUDE_DATAIO_API_KEY: string;
	export const npm_package_exports___node_polyfills_types: string;
	export const DD_INSTRUMENTATION_TELEMETRY_ENABLED: string;
	export const VAULT_AMPLITUDE_API_KEY_NOVA_QUERY_PERF: string;
	export const VAULT_UNISEARCH_OPENSEARCH_PASSWORD: string;
	export const VAULT_REDIS_STARGATE: string;
	export const VAULT_REDIS_SESSION_REPLAY_TRANSIENT: string;
	export const VAULT_REDIS_METRICS: string;
	export const npm_package_scripts_test_cross_platform_build: string;
	export const TERM_PROGRAM: string;
	export const npm_package_exports___vite_import: string;
	export const npm_package_exports___hooks_import: string;
	export const NODE: string;
	export const VAULT_REDIS_EXPORT_HEARTBEAT: string;
	export const VAULT_REDIS_AMPID: string;
	export const npm_package_dependencies_sade: string;
	export const INIT_CWD: string;
	export const NVM_CD_FLAGS: string;
	export const PYENV_ROOT: string;
	export const VAULT_REDIS_ORBIT: string;
	export const npm_package_devDependencies_typescript: string;
	export const npm_package_homepage: string;
	export const npm_config_version_git_tag: string;
	export const VAULT_REDIS_NOVA_STATUS: string;
	export const VAULT_PROPERTIES_DB_MASTER: string;
	export const TERM: string;
	export const SHELL: string;
	export const npm_package_devDependencies_vite: string;
	export const VAULT_USERDATA_DB: string;
	export const VAULT_REDIS_UNISEARCH: string;
	export const npm_package_dependencies_devalue: string;
	export const DD_TRACE_ENABLED: string;
	export const HOMEBREW_REPOSITORY: string;
	export const VAULT_REDIS_PROPS_CACHE: string;
	export const VAULT_PROPERTIES_DB_REPLICA: string;
	export const VAULT_GOOGLE_ADS_CLIENT_SECRET: string;
	export const TMPDIR: string;
	export const npm_package_scripts_lint: string;
	export const npm_config_init_license: string;
	export const VAULT_VACUTRON_DB: string;
	export const TERM_PROGRAM_VERSION: string;
	export const npm_package_dependencies_set_cookie_parser: string;
	export const VAULT_ENGAGE_DB: string;
	export const npm_package_dependencies_cookie: string;
	export const ORIGINAL_XDG_CURRENT_DESKTOP: string;
	export const MallocNanoZone: string;
	export const VAULT_RECOMMEND_API_KEY: string;
	export const VAULT_ITERABLE_AUTH_KEY: string;
	export const npm_package_devDependencies_svelte_preprocess: string;
	export const npm_config_registry: string;
	export const ZSH: string;
	export const VAULT_TEST_SKYLAB_API_KEY: string;
	export const npm_package_dependencies_import_meta_resolve: string;
	export const npm_package_repository_url: string;
	export const VAULT_REDIS_INCREMENTAL_QUERY: string;
	export const VAULT_ACCOUNTS_DB: string;
	export const npm_package_readmeFilename: string;
	export const NVM_DIR: string;
	export const VAULT_PAGERDUTY_API_KEY: string;
	export const VAULT_FABULIST_SEGMENT_WRITE_KEY: string;
	export const USER: string;
	export const npm_package_exports___node_import: string;
	export const npm_package_description: string;
	export const LS_COLORS: string;
	export const VAULT_INGESTION_ROUTER_DB: string;
	export const VAULT_TEST_VACUUM_API_KEY: string;
	export const VAULT_SALESFORCE_CLIENT_SECRET_V2: string;
	export const VAULT_HUBSPOT_CLIENT_ID: string;
	export const npm_package_exports___package_json: string;
	export const npm_package_dependencies_esm_env: string;
	export const npm_package_license: string;
	export const VAULT_COREDATA_DB: string;
	export const COMMAND_MODE: string;
	export const AMP_REPO_ROOT: string;
	export const npm_package_exports___import: string;
	export const VAULT_REDIS_NOVA: string;
	export const VAULT_AMPLITUDE_API_KEY_NOVA_BATCH: string;
	export const npm_package_repository_directory: string;
	export const VAULT_EXPORT_DB: string;
	export const SSH_AUTH_SOCK: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const npm_package_bin_svelte_kit: string;
	export const VAULT_SKYLAB_DB: string;
	export const VAULT_SALESFORCE_TEST_ACCOUNT_CRED: string;
	export const VAULT_VACUUM_EXTERNAL_ID: string;
	export const npm_execpath: string;
	export const npm_package_devDependencies__types_sade: string;
	export const VIRTUAL_ENV_DISABLE_PROMPT: string;
	export const PAGER: string;
	export const VAULT_HUBSPOT_CLIENT_SECRET: string;
	export const VAULT_FALCON_API_KEY: string;
	export const npm_package_peerDependencies__sveltejs_vite_plugin_svelte: string;
	export const npm_package_devDependencies_svelte: string;
	export const LSCOLORS: string;
	export const YARN_IGNORE_PATH: string;
	export const VAULT_FACEBOOK_ADS_APP_ID: string;
	export const VAULT_ACCOUNTS_ETL_LOGINS_AES_KEY: string;
	export const VAULT_REDIS_TRANSIENT_COMMON: string;
	export const PATH: string;
	export const npm_config_argv: string;
	export const npm_package_scripts_postinstall: string;
	export const npm_package_devDependencies_rollup: string;
	export const npm_package_dependencies_magic_string: string;
	export const _: string;
	export const __CFBundleIdentifier: string;
	export const VAULT_REDIS_WAITROOM: string;
	export const PWD: string;
	export const VAULT_USERID_DB: string;
	export const VAULT_NOVA_DB: string;
	export const AMPLITUDE_USER: string;
	export const VAULT_REDIS_CEREBRO: string;
	export const VAULT_GOOGLE_ADS_CLIENT_ID: string;
	export const npm_lifecycle_event: string;
	export const VAULT_REDIS_ACCOUNTING: string;
	export const LANG: string;
	export const npm_package_types: string;
	export const npm_package_devDependencies__sveltejs_vite_plugin_svelte: string;
	export const npm_package_repository_type: string;
	export const npm_package_name: string;
	export const npm_package_scripts_generate_types: string;
	export const npm_package_scripts_test_integration: string;
	export const npm_package_devDependencies__types_connect: string;
	export const VAULT_REDIS_LOCK: string;
	export const VAULT_SKYLAB_FASTLY_API_TOKEN: string;
	export const npm_package_exports___node_polyfills_import: string;
	export const npm_package_exports___types: string;
	export const npm_config_version_commit_hooks: string;
	export const VAULT_GEO_DB: string;
	export const VAULT_FACEBOOK_ADS_APP_SECRET: string;
	export const XPC_FLAGS: string;
	export const npm_package_scripts_test_cross_platform_dev: string;
	export const npm_package_devDependencies_vitest: string;
	export const npm_package_dependencies_tiny_glob: string;
	export const npm_config_bin_links: string;
	export const VAULT_USERPROPSTTL_DB: string;
	export const VAULT_BROADCAST_DB: string;
	export const npm_package_engines_node: string;
	export const npm_package_dependencies_sirv: string;
	export const VAULT_VACUUM_API_KEY: string;
	export const VAULT_SLACK_TOKEN: string;
	export const XPC_SERVICE_NAME: string;
	export const npm_package_version: string;
	export const VAULT_REDIS_BROADCAST: string;
	export const VAULT_TEST_PROFILE_API_KEY: string;
	export const VAULT_KRONOS_API_KEY: string;
	export const PYENV_SHELL: string;
	export const VAULT_REDIS_NOVA_EXTERNAL: string;
	export const SHLVL: string;
	export const HOME: string;
	export const npm_package_type: string;
	export const VAULT_COREDATA_DB_READ: string;
	export const npm_package_scripts_generate_version: string;
	export const npm_package_scripts_test: string;
	export const npm_package_scripts_check_all: string;
	export const VAULT_REDIS_SKYLAB: string;
	export const npm_package_exports___vite_types: string;
	export const npm_package_exports___hooks_types: string;
	export const npm_config_save_prefix: string;
	export const npm_config_strict_ssl: string;
	export const HOMEBREW_PREFIX: string;
	export const VAULT_REDIS_NOVA_V4_BATCH_PROP_COUNTS: string;
	export const npm_config_version_git_message: string;
	export const LESS: string;
	export const VAULT_AMPLITUDE_API_KEY: string;
	export const LOGNAME: string;
	export const npm_package_scripts_format: string;
	export const npm_package_peerDependencies_vite: string;
	export const PREFIX: string;
	export const VAULT_TEST_FALCON_DATABRICKS_TOKEN: string;
	export const VAULT_MACHINE_LEARNING_DB: string;
	export const npm_lifecycle_script: string;
	export const npm_package_peerDependencies_svelte: string;
	export const VAULT_FISSION_DB: string;
	export const npm_config_ignore_path: string;
	export const VAULT_REDIS_VACUUM: string;
	export const VAULT_REDIS_NOVA_QUERY_PERF: string;
	export const npm_package_devDependencies__types_set_cookie_parser: string;
	export const NVM_BIN: string;
	export const VAULT_VACUUM_DB: string;
	export const VAULT_INTEGRATION_AES_KEY: string;
	export const VAULT_JOBS_DB: string;
	export const VAULT_GOOGLE_ADS_DEVELOPER_TOKEN: string;
	export const VAULT_FALCON_AES_KEY: string;
	export const npm_package_files_3: string;
	export const npm_package_dependencies__types_cookie: string;
	export const npm_config_version_git_sign: string;
	export const npm_config_ignore_scripts: string;
	export const npm_config_user_agent: string;
	export const PROMPT_EOL_MARK: string;
	export const INFOPATH: string;
	export const HOMEBREW_CELLAR: string;
	export const VAULT_SEND_GRID_API_KEY: string;
	export const VAULT_REWRITE_FALCON_HANDSHAKE_KEY: string;
	export const npm_package_files_2: string;
	export const npm_package_devDependencies__types_node: string;
	export const npm_package_devDependencies__playwright_test: string;
	export const npm_package_files_1: string;
	export const npm_package_devDependencies_dts_buddy: string;
	export const VAULT_SKYLAB_FASTLY_SERVICE_ID: string;
	export const VAULT_DEMO_DB: string;
	export const npm_package_files_0: string;
	export const CONDA_CHANGEPS1: string;
	export const VAULT_TEST_FALCON_SNOWFLAKE_PASSWORD: string;
	export const VAULT_NOVA_EXTERNAL_MERGE_DATA_DB: string;
	export const VAULT_INTERNAL_API_SECRET_KEY: string;
	export const VAULT_ACCOUNTS_DB_WRITE: string;
	export const npm_package_dependencies_mrmime: string;
	export const npm_package_dependencies_kleur: string;
	export const npm_config_init_version: string;
	export const npm_config_ignore_optional: string;
	export const DEBUG: string;
	export const VAULT_SWEEPER_DB: string;
	export const VAULT_REDIS_HEARTBEAT: string;
	export const VAULT_FALCON_DB: string;
	export const VAULT_CARGO_METRIC_API_KEY: string;
	export const VAULT_REDIS_INTEGRATION_TESTS: string;
	export const npm_package_exports___node_types: string;
	export const npm_package_files_6: string;
	export const npm_package_scripts_check: string;
	export const npm_package_files_5: string;
	export const VAULT_SALESFORCE_CLIENT_ID_V2: string;
	export const VAULT_REDIS_SESSION_REPLAY_METRICS: string;
	export const COLORTERM: string;
	export const npm_node_execpath: string;
	export const npm_package_scripts_test_unit: string;
	export const npm_package_files_4: string;
	export const npm_config_version_tag_prefix: string;
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
		NVM_INC: string;
		VAULT_AMPLITUDE_DATAIO_API_KEY: string;
		npm_package_exports___node_polyfills_types: string;
		DD_INSTRUMENTATION_TELEMETRY_ENABLED: string;
		VAULT_AMPLITUDE_API_KEY_NOVA_QUERY_PERF: string;
		VAULT_UNISEARCH_OPENSEARCH_PASSWORD: string;
		VAULT_REDIS_STARGATE: string;
		VAULT_REDIS_SESSION_REPLAY_TRANSIENT: string;
		VAULT_REDIS_METRICS: string;
		npm_package_scripts_test_cross_platform_build: string;
		TERM_PROGRAM: string;
		npm_package_exports___vite_import: string;
		npm_package_exports___hooks_import: string;
		NODE: string;
		VAULT_REDIS_EXPORT_HEARTBEAT: string;
		VAULT_REDIS_AMPID: string;
		npm_package_dependencies_sade: string;
		INIT_CWD: string;
		NVM_CD_FLAGS: string;
		PYENV_ROOT: string;
		VAULT_REDIS_ORBIT: string;
		npm_package_devDependencies_typescript: string;
		npm_package_homepage: string;
		npm_config_version_git_tag: string;
		VAULT_REDIS_NOVA_STATUS: string;
		VAULT_PROPERTIES_DB_MASTER: string;
		TERM: string;
		SHELL: string;
		npm_package_devDependencies_vite: string;
		VAULT_USERDATA_DB: string;
		VAULT_REDIS_UNISEARCH: string;
		npm_package_dependencies_devalue: string;
		DD_TRACE_ENABLED: string;
		HOMEBREW_REPOSITORY: string;
		VAULT_REDIS_PROPS_CACHE: string;
		VAULT_PROPERTIES_DB_REPLICA: string;
		VAULT_GOOGLE_ADS_CLIENT_SECRET: string;
		TMPDIR: string;
		npm_package_scripts_lint: string;
		npm_config_init_license: string;
		VAULT_VACUTRON_DB: string;
		TERM_PROGRAM_VERSION: string;
		npm_package_dependencies_set_cookie_parser: string;
		VAULT_ENGAGE_DB: string;
		npm_package_dependencies_cookie: string;
		ORIGINAL_XDG_CURRENT_DESKTOP: string;
		MallocNanoZone: string;
		VAULT_RECOMMEND_API_KEY: string;
		VAULT_ITERABLE_AUTH_KEY: string;
		npm_package_devDependencies_svelte_preprocess: string;
		npm_config_registry: string;
		ZSH: string;
		VAULT_TEST_SKYLAB_API_KEY: string;
		npm_package_dependencies_import_meta_resolve: string;
		npm_package_repository_url: string;
		VAULT_REDIS_INCREMENTAL_QUERY: string;
		VAULT_ACCOUNTS_DB: string;
		npm_package_readmeFilename: string;
		NVM_DIR: string;
		VAULT_PAGERDUTY_API_KEY: string;
		VAULT_FABULIST_SEGMENT_WRITE_KEY: string;
		USER: string;
		npm_package_exports___node_import: string;
		npm_package_description: string;
		LS_COLORS: string;
		VAULT_INGESTION_ROUTER_DB: string;
		VAULT_TEST_VACUUM_API_KEY: string;
		VAULT_SALESFORCE_CLIENT_SECRET_V2: string;
		VAULT_HUBSPOT_CLIENT_ID: string;
		npm_package_exports___package_json: string;
		npm_package_dependencies_esm_env: string;
		npm_package_license: string;
		VAULT_COREDATA_DB: string;
		COMMAND_MODE: string;
		AMP_REPO_ROOT: string;
		npm_package_exports___import: string;
		VAULT_REDIS_NOVA: string;
		VAULT_AMPLITUDE_API_KEY_NOVA_BATCH: string;
		npm_package_repository_directory: string;
		VAULT_EXPORT_DB: string;
		SSH_AUTH_SOCK: string;
		__CF_USER_TEXT_ENCODING: string;
		npm_package_bin_svelte_kit: string;
		VAULT_SKYLAB_DB: string;
		VAULT_SALESFORCE_TEST_ACCOUNT_CRED: string;
		VAULT_VACUUM_EXTERNAL_ID: string;
		npm_execpath: string;
		npm_package_devDependencies__types_sade: string;
		VIRTUAL_ENV_DISABLE_PROMPT: string;
		PAGER: string;
		VAULT_HUBSPOT_CLIENT_SECRET: string;
		VAULT_FALCON_API_KEY: string;
		npm_package_peerDependencies__sveltejs_vite_plugin_svelte: string;
		npm_package_devDependencies_svelte: string;
		LSCOLORS: string;
		YARN_IGNORE_PATH: string;
		VAULT_FACEBOOK_ADS_APP_ID: string;
		VAULT_ACCOUNTS_ETL_LOGINS_AES_KEY: string;
		VAULT_REDIS_TRANSIENT_COMMON: string;
		PATH: string;
		npm_config_argv: string;
		npm_package_scripts_postinstall: string;
		npm_package_devDependencies_rollup: string;
		npm_package_dependencies_magic_string: string;
		_: string;
		__CFBundleIdentifier: string;
		VAULT_REDIS_WAITROOM: string;
		PWD: string;
		VAULT_USERID_DB: string;
		VAULT_NOVA_DB: string;
		AMPLITUDE_USER: string;
		VAULT_REDIS_CEREBRO: string;
		VAULT_GOOGLE_ADS_CLIENT_ID: string;
		npm_lifecycle_event: string;
		VAULT_REDIS_ACCOUNTING: string;
		LANG: string;
		npm_package_types: string;
		npm_package_devDependencies__sveltejs_vite_plugin_svelte: string;
		npm_package_repository_type: string;
		npm_package_name: string;
		npm_package_scripts_generate_types: string;
		npm_package_scripts_test_integration: string;
		npm_package_devDependencies__types_connect: string;
		VAULT_REDIS_LOCK: string;
		VAULT_SKYLAB_FASTLY_API_TOKEN: string;
		npm_package_exports___node_polyfills_import: string;
		npm_package_exports___types: string;
		npm_config_version_commit_hooks: string;
		VAULT_GEO_DB: string;
		VAULT_FACEBOOK_ADS_APP_SECRET: string;
		XPC_FLAGS: string;
		npm_package_scripts_test_cross_platform_dev: string;
		npm_package_devDependencies_vitest: string;
		npm_package_dependencies_tiny_glob: string;
		npm_config_bin_links: string;
		VAULT_USERPROPSTTL_DB: string;
		VAULT_BROADCAST_DB: string;
		npm_package_engines_node: string;
		npm_package_dependencies_sirv: string;
		VAULT_VACUUM_API_KEY: string;
		VAULT_SLACK_TOKEN: string;
		XPC_SERVICE_NAME: string;
		npm_package_version: string;
		VAULT_REDIS_BROADCAST: string;
		VAULT_TEST_PROFILE_API_KEY: string;
		VAULT_KRONOS_API_KEY: string;
		PYENV_SHELL: string;
		VAULT_REDIS_NOVA_EXTERNAL: string;
		SHLVL: string;
		HOME: string;
		npm_package_type: string;
		VAULT_COREDATA_DB_READ: string;
		npm_package_scripts_generate_version: string;
		npm_package_scripts_test: string;
		npm_package_scripts_check_all: string;
		VAULT_REDIS_SKYLAB: string;
		npm_package_exports___vite_types: string;
		npm_package_exports___hooks_types: string;
		npm_config_save_prefix: string;
		npm_config_strict_ssl: string;
		HOMEBREW_PREFIX: string;
		VAULT_REDIS_NOVA_V4_BATCH_PROP_COUNTS: string;
		npm_config_version_git_message: string;
		LESS: string;
		VAULT_AMPLITUDE_API_KEY: string;
		LOGNAME: string;
		npm_package_scripts_format: string;
		npm_package_peerDependencies_vite: string;
		PREFIX: string;
		VAULT_TEST_FALCON_DATABRICKS_TOKEN: string;
		VAULT_MACHINE_LEARNING_DB: string;
		npm_lifecycle_script: string;
		npm_package_peerDependencies_svelte: string;
		VAULT_FISSION_DB: string;
		npm_config_ignore_path: string;
		VAULT_REDIS_VACUUM: string;
		VAULT_REDIS_NOVA_QUERY_PERF: string;
		npm_package_devDependencies__types_set_cookie_parser: string;
		NVM_BIN: string;
		VAULT_VACUUM_DB: string;
		VAULT_INTEGRATION_AES_KEY: string;
		VAULT_JOBS_DB: string;
		VAULT_GOOGLE_ADS_DEVELOPER_TOKEN: string;
		VAULT_FALCON_AES_KEY: string;
		npm_package_files_3: string;
		npm_package_dependencies__types_cookie: string;
		npm_config_version_git_sign: string;
		npm_config_ignore_scripts: string;
		npm_config_user_agent: string;
		PROMPT_EOL_MARK: string;
		INFOPATH: string;
		HOMEBREW_CELLAR: string;
		VAULT_SEND_GRID_API_KEY: string;
		VAULT_REWRITE_FALCON_HANDSHAKE_KEY: string;
		npm_package_files_2: string;
		npm_package_devDependencies__types_node: string;
		npm_package_devDependencies__playwright_test: string;
		npm_package_files_1: string;
		npm_package_devDependencies_dts_buddy: string;
		VAULT_SKYLAB_FASTLY_SERVICE_ID: string;
		VAULT_DEMO_DB: string;
		npm_package_files_0: string;
		CONDA_CHANGEPS1: string;
		VAULT_TEST_FALCON_SNOWFLAKE_PASSWORD: string;
		VAULT_NOVA_EXTERNAL_MERGE_DATA_DB: string;
		VAULT_INTERNAL_API_SECRET_KEY: string;
		VAULT_ACCOUNTS_DB_WRITE: string;
		npm_package_dependencies_mrmime: string;
		npm_package_dependencies_kleur: string;
		npm_config_init_version: string;
		npm_config_ignore_optional: string;
		DEBUG: string;
		VAULT_SWEEPER_DB: string;
		VAULT_REDIS_HEARTBEAT: string;
		VAULT_FALCON_DB: string;
		VAULT_CARGO_METRIC_API_KEY: string;
		VAULT_REDIS_INTEGRATION_TESTS: string;
		npm_package_exports___node_types: string;
		npm_package_files_6: string;
		npm_package_scripts_check: string;
		npm_package_files_5: string;
		VAULT_SALESFORCE_CLIENT_ID_V2: string;
		VAULT_REDIS_SESSION_REPLAY_METRICS: string;
		COLORTERM: string;
		npm_node_execpath: string;
		npm_package_scripts_test_unit: string;
		npm_package_files_4: string;
		npm_config_version_tag_prefix: string;
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
