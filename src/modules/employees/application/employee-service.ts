import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import {
  CreateEmployeeInput,
  Employee,
  UpdateEmployeeInput,
  createEmployee,
  updateEmployee,
} from "../domain/employee";
import { EmployeeRepository } from "../repositories/employee-repository";

export class EmployeeService {
  constructor(private readonly employees: EmployeeRepository) {}

  listByOrganization(organizationId: EntityId): Promise<readonly Employee[]> {
    return this.employees.listByOrganization(organizationId);
  }

  async create(input: CreateEmployeeInput): Promise<Employee> {
    const employee = createEmployee(input);
    await this.employees.save(employee);
    return employee;
  }

  async update(id: EntityId, input: UpdateEmployeeInput): Promise<Employee> {
    const current = await this.employees.findById(id);
    if (!current) {
      throw new DomainError("EMPLOYEE_NOT_FOUND", "Employee not found.");
    }
    const employee = updateEmployee(current, input);
    await this.employees.save(employee);
    return employee;
  }

  async inactivate(id: EntityId): Promise<Employee> {
    const current = await this.employees.findById(id);
    if (!current) {
      throw new DomainError("EMPLOYEE_NOT_FOUND", "Employee not found.");
    }
    const employee = updateEmployee(current, {
      name: current.name,
      code: current.code,
      active: false,
      defaultUnitId: current.defaultUnitId,
      defaultSectorId: current.defaultSectorId,
      linkedUserId: current.linkedUserId,
    });
    await this.employees.save(employee);
    return employee;
  }
}
