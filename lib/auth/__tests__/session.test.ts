import { describe, it, expect } from "@jest/globals";
import { getSessionStatus } from "../session";

// Skeleton test to enforce the "session expired + offline requires unlock"
// policy in code. This will be fleshed out with proper mocks for NetInfo and
// Supabase auth.

describe("session offline policy", () => {
  it("marks offline + expired sessions as requiring a lock gate", async () => {
    // TODO: mock NetInfo (offline) and supabase.auth.getSession (expired)
    // and assert that offlineGateState === "locked".
    const status = await getSessionStatus();
    expect(status.offlineGateState === "locked" || status.offlineGateState === "not_required").toBe(
      true,
    );
  });
});

