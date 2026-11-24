// src/models/Employee.js
export function createEmployee({ id, name, username, password, role = "Kasir" }) {
    return { id, name, username, password, role };
  }
  
  export function getRole(employee) {
    return employee.role;
  }
  
  export function changePassword(employee, oldPwd, newPwd) {
    if (employee.password !== oldPwd) return { ok: false, employee };
    return { ok: true, employee: { ...employee, password: newPwd } };
  }