import { describe, expect, it } from "vitest";

import { JOURNEY_LOCAL_UPDATED_EVENT } from "@/lib/qalb-journey-events";

describe("qalb-journey-events", () => {
  it("exports a stable custom event name", () => {
    expect(JOURNEY_LOCAL_UPDATED_EVENT).toBe("qalb_journey_local_updated");
  });
});
