# Murim Merchant Sim

A grounded simulation game in murim-era China. The player is one individual in a living, connected world of sects, merchant houses, banks, and government.

This repository currently contains the first playable build: the UI shell (map, camera, minimap, time controls, and panels) running on the Shallot WebGPU engine, with a minimal headless simulation core behind it.

## Requirements

- [Bun](https://bun.sh) >= 1.4.5
- A WebGPU-capable browser (for example Chrome or Edge 113 or newer)

## Run

```sh
bun install
bun run dev
```

Open the printed URL in the browser.

## Tests

```sh
bun test
```

Runs the headless simulation core tests, including the determinism check.
