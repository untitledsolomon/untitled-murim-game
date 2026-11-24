<script lang="ts">
    /** Writes UI-only preferences to localStorage whenever they change. Sim
     * state lives in the save file; this never touches it. */
    import { game } from "../lib/game-state.svelte";

    $effect(() => {
        const { onboardingDismissed, lastGood, startTownId } = game.uiPrefs;
        // The reads above subscribe this effect to every pref field.
        void onboardingDismissed;
        void lastGood;
        void startTownId;
        game.persistUiPrefs();
    });
</script>
