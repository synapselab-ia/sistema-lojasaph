import { describe, expect, it } from "vitest";
import { asEntityId, EntityId } from "@/domain/common/entity-id";
import { Employee } from "../domain/employee";
import { EmployeeRepository } from "../repositories/employee-repository";
import { EmployeeService } from "./employee-service";

class InMemoryEmployeeRepository implements EmployeeRepository {
  private readonly rows = new Map<EntityId, Employee>();

  async findById(id: EntityId): Promise<Employee | null> {
    return this.rows.get(id) ?? null;
  }

  async listByOrganization(organizationId: EntityId): Promise<readonly Employee[]> {
    return [...this.rows.values()].filter((employee) => employee.organizationId === organizationId);
  }

  async save(employee: Employee): Promise<void> {
    this.rows.set(employee.id, employee);
  }
}

describe("EmployeeService", () => {
  it("keeps operational employee identity separate from authentication", async () => {
    const service = new EmployeeService(new InMemoryEmployeeRepository());
    const organizationId = asEntityId("org-test");
    const unitId = asEntityId("unit-test");

    const employee = await service.create({
      organizationId,
      name: " Funcionário Demo ",
      code: " EMP-01 ",
      defaultUnitId: unitId,
    });

    expect(employee.name).toBe("Funcionário Demo");
    expect(employee.code).toBe("EMP-01");
    expect(employee.linkedUserId).toBeUndefined();
    expect(employee.active).toBe(true);

    const linked = await service.update(employee.id, {
      name: employee.name,
      code: employee.code,
      active: true,
      defaultUnitId: unitId,
      linkedUserId: asEntityId("auth-user-test"),
    });
    expect(linked.linkedUserId).toBe("auth-user-test");

    const inactive = await service.inactivate(employee.id);
    expect(inactive.active).toBe(false);
    expect(inactive.linkedUserId).toBe("auth-user-test");
    expect(await service.listByOrganization(organizationId)).toHaveLength(1);
  });

  it("rejects blank employee names", async () => {
    const service = new EmployeeService(new InMemoryEmployeeRepository());
    await expect(service.create({ organizationId: asEntityId("org-test"), name: "   " })).rejects.toMatchObject({
      code: "INVALID_EMPLOYEE_NAME",
    });
  });
});
