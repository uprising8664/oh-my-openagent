# Local Fork Installation

This guide is for LLM agents setting up the `uprising8664/oh-my-openagent` fork as the locally-loaded plugin instead of the npm-published package. After following this guide, OpenCode will load the plugin directly from the cloned repository, so any changes you make are reflected immediately after a rebuild.

## Prerequisites

Verify these are available before starting:

```bash
command -v opencode && opencode --version   # must be 1.0.150 or higher
command -v git && git --version
command -v bun || echo "bun not found"
```

If `bun` is not in PATH, check `~/.bun/bin/bun`. If missing, install it:

```bash
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
```

## Step 1: Clone the Fork

```bash
git clone https://github.com/uprising8664/oh-my-openagent.git ~/oh-my-openagent
cd ~/oh-my-openagent
```

If you want to clone to a different location, adjust all paths in subsequent steps accordingly.

## Step 2: Install Dependencies and Build

```bash
export PATH="$HOME/.bun/bin:$PATH"
bun install
bun run build
```

The build produces `dist/index.js` — the compiled plugin OpenCode loads.

## Step 3: Back Up the npm-Installed Plugin

OpenCode caches plugins at `~/.cache/opencode/node_modules/`. Back up the existing package before replacing it:

```bash
mv ~/.cache/opencode/node_modules/oh-my-openagent \
   ~/.cache/opencode/node_modules/oh-my-openagent.bak
```

If the directory does not exist yet (plugin was never installed via npm), skip this step.

## Step 4: Symlink the Fork into OpenCode's Cache

```bash
ln -s ~/oh-my-openagent ~/.cache/opencode/node_modules/oh-my-openagent
```

Verify the symlink:

```bash
ls -la ~/.cache/opencode/node_modules/oh-my-openagent
# Should show: oh-my-openagent -> /Users/<you>/oh-my-openagent
```

From this point on, OpenCode loads the plugin from your local clone.

## Step 5: Register the Plugin with OpenCode

If `oh-my-openagent` is not already in your OpenCode config, register it:

```bash
cat ~/.config/opencode/opencode.json
```

The `plugin` array must contain `"oh-my-openagent"`. If it does not:

```bash
# Using jq — add if missing
jq '.plugin = ((.plugin // []) + ["oh-my-openagent"] | unique)' \
    ~/.config/opencode/opencode.json > /tmp/oc.json && \
    mv /tmp/oc.json ~/.config/opencode/opencode.json
```

## Step 6: Make the CLI Available (Optional)

To use `bunx oh-my-opencode` commands (installer, doctor) from the fork:

```bash
export PATH="$HOME/.bun/bin:$PATH"
cd ~/oh-my-openagent
bun link
```

Verify:

```bash
bunx oh-my-opencode doctor
```

## Step 7: Run the Standard Installer

Now run the normal installation flow to configure agents and model subscriptions. Fetch the installation guide and follow it:

```bash
curl -fsSL https://raw.githubusercontent.com/uprising8664/oh-my-openagent/refs/heads/dev/docs/guide/installation.md
```

Follow the steps in that guide starting from **Step 0** (subscription questions) through **Step 4** (authentication). The installer will write config to `~/.config/opencode/opencode.json` and the plugin config file.

## Step 8: Verify Everything Loads

```bash
bunx oh-my-opencode doctor
opencode --version
```

Doctor output should show no errors. If it reports the plugin is not registered, re-check Step 5.

## Keeping the Fork Up to Date

The fork tracks `https://github.com/code-yeongyu/oh-my-openagent` as `upstream`. To pull in the latest upstream changes:

```bash
export PATH="$HOME/.bun/bin:$PATH"
cd ~/oh-my-openagent
git fetch upstream
git rebase upstream/dev   # use -c commit.gpgsign=false if GPG signing is on
bun install               # in case dependencies changed
bun run build             # rebuild dist
```

> **GPG signing**: If your git config has `commit.gpgsign=true`, prefix rebase commands with `git -c commit.gpgsign=false`.

## Workflow: Making Changes

After editing source files, rebuild to pick up the changes:

```bash
export PATH="$HOME/.bun/bin:$PATH"
cd ~/oh-my-openagent
bun run build
```

No restart or relinking is needed — OpenCode reads from `dist/index.js` on each session start.

## Reverting to the npm Package

To restore the original npm-installed plugin:

```bash
rm ~/.cache/opencode/node_modules/oh-my-openagent
mv ~/.cache/opencode/node_modules/oh-my-openagent.bak \
   ~/.cache/opencode/node_modules/oh-my-openagent
```
