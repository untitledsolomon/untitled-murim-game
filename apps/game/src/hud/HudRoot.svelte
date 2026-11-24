<script lang="ts">
    import BottomNav from "./components/BottomNav.svelte";
    import DebugPanel from "./components/DebugPanel.svelte";
    import MapChrome from "./components/MapChrome.svelte";
    import Onboarding from "./components/Onboarding.svelte";
    import Outliner from "./components/Outliner.svelte";
    import StandaloneMap from "./components/StandaloneMap.svelte";
    import Toasts from "./components/Toasts.svelte";
    import TopBar from "./components/TopBar.svelte";
    import TownMarkers from "./components/TownMarkers.svelte";
    import UiPrefsPersistence from "./components/UiPrefsPersistence.svelte";
    import DockPanel from "./panels/DockPanel.svelte";
    import { game } from "./lib/game-state.svelte";
</script>

<svelte:window
    onkeydown={(event) => {
        if (event.key === "Escape" && game.openPanel) {
            game.closePanel();
        } else if (event.key === "F2") {
            event.preventDefault();
            game.showDebug = !game.showDebug;
        }
    }}
/>

<div class="hud-root">
    <UiPrefsPersistence />
    {#if game.isStandalone}
        <StandaloneMap />
    {:else}
        <TownMarkers />
    {/if}
    <TopBar />
    <MapChrome />
    <Outliner />
    <Onboarding />
    <DebugPanel />
    <DockPanel />
    <BottomNav />
    <Toasts />
</div>
