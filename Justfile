dev-web-extension:
	@yarn install
	@yarn dev:web-extension

build-web-extension:
    @yarn workspace @rrweb/web-extension build
