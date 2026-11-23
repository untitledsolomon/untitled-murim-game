<script lang="ts">
    import AlertsFeed from "./components/AlertsFeed.svelte";
    import ModeSwitcher from "./components/ModeSwitcher.svelte";
    import Outliner from "./components/Outliner.svelte";
    import SaveLoad from "./components/SaveLoad.svelte";
    import TimeControls from "./components/TimeControls.svelte";
    import TopBar from "./components/TopBar.svelte";
    import TownMarkers from "./components/TownMarkers.svelte";
    import WindowManager from "./panels/WindowManager.svelte";
</script>

<div class="hud-root">
    <TopBar />
    <ModeSwitcher />
    <TownMarkers />
    <WindowManager />
    <TimeControls />
    <SaveLoad />
    <AlertsFeed />
    <Outliner />
</div>
