import { describe, expect, it } from "vitest";
import { EntityId } from "@/domain/common/entity-id";
import { administrationScopeValue, parseAdministrationScope } from "./administration-scope";

const id = "00000000-0000-4000-8000-000000000100" as EntityId;

describe("administration access scope", () => {
  it("parses the Organization-wide scope", () => {
    expect(parseAdministrationScope("organization")).toEqual({});
  });

  it("parses canonical Business, Unit and Sector scopes", () => {
    expect(parseAdministrationScope(`business:${id}`)).toEqual({ businessId: id });
    expect(parseAdministrationScope(`unit:${id}`)).toEqual({ unitId: id });
    expect(parseAdministrationScope(`sector:${id}`)).toEqual({ sectorId: id });
  });

  it("rejects malformed scope values", () => {
    expect(parseAdministrationScope("business:not-a-uuid")).toBeNull();
    expect(parseAdministrationScope(`unknown:${id}`)).toBeNull();
    expect(parseAdministrationScope("")).toBeNull();
  });

  it("serializes the most specific scope", () => {
    expect(administrationScopeValue({})).toBe("organization");
    expect(administrationScopeValue({ businessId: id })).toBe(`business:${id}`);
    expect(administrationScopeValue({ unitId: id })).toBe(`unit:${id}`);
    expect(administrationScopeValue({ sectorId: id })).toBe(`sector:${id}`);
  });
});
