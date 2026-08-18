import { EntityId } from "@/domain/common/entity-id";
import { Employee } from "../domain/employee";

export interface EmployeeRepository {
  findById(id: EntityId): Promise<Employee | null>;
  listByOrganization(organizationId: EntityId): Promise<readonly Employee[]>;
  save(employee: Employee): Promise<void>;
}
