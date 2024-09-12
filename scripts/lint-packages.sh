script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
packages_dir="$script_dir/../packages"

for dir in "$packages_dir"/*/ "$packages_dir/plugins"/*/ ; do
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        (
            cd "$dir" || exit
            npx publint --strict
            attw --pack . --exclude-entrypoints dist/style.css
        )
    fi
done