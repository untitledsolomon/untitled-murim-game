import type { World } from "@dylanebert/shallot";
import { BASE_DAYS_PER_SECOND, MAX_DAYS_PER_FRAME } from "@murim/sim";
import { Simulation } from "../components";

/** Drives the headless simulation from the engine's scaled clock. Runs first in
 * the simulation group so the map and HUD read a snapshot from this frame.
 */
export const SimulateSystem = {
    name: "murim-simulate",
    group: "simulation" as const,
    first: true,
    update(world: World): void {
        const sim = world.resource(Simulation);
        if (!sim.game) return;

        // Scaled seconds become partial days; BASE_DAYS_PER_SECOND is the 1x rate.
        sim.accumulator += world.time.deltaTime * BASE_DAYS_PER_SECOND;

        let steps = 0;
        while (sim.accumulator >= 1 && steps < MAX_DAYS_PER_FRAME) {
            sim.game.step();
            sim.accumulator -= 1;
            steps += 1;
        }
        // Drop the backlog after a long paused-off frame, like the scheduler does.
        if (steps === MAX_DAYS_PER_FRAME) sim.accumulator = 0;

        // Rebuild the UI snapshot on a day change, or when forced (debug
        // skips and the reveal-all toggle).
        if (sim.publishedDay !== sim.game.world.day || sim.forcePublish) {
            sim.publishedDay = sim.game.world.day;
            sim.forcePublish = false;
            sim.snapshot = sim.game.snapshot({ revealAll: sim.revealAll });
        }
    },
};
