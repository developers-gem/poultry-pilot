import mongoose from "mongoose";
import { afterAll, describe, expect, it } from "vitest";
import { MembershipModel, SyncChangeModel } from "../adapters/mongo/models.js";

/** Runs without a database: the plugin throws in pre-hooks before any command is sent. */
describe("requireFarmScope mongoose plugin", () => {
  afterAll(() => mongoose.set("bufferCommands", true));
  mongoose.set("bufferCommands", false);

  it("refuses farm-scoped queries without farmId", async () => {
    await expect(MembershipModel.find({ userId: "u1" }).exec()).rejects.toThrow(/Tenancy violation: find on Membership/);
    await expect(SyncChangeModel.countDocuments({ seq: { $gt: 0 } }).exec()).rejects.toThrow(/Tenancy violation/);
    await expect(MembershipModel.updateMany({ role: "worker" }, { $set: { role: "owner" } }).exec()).rejects.toThrow(/Tenancy violation/);
  });

  it("lets scoped queries through to the driver", async () => {
    await expect(MembershipModel.find({ farmId: "f1" }).exec()).rejects.not.toThrow(/Tenancy violation/);
  });
});
