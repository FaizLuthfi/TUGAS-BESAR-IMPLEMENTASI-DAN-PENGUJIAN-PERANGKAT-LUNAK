// src/utils/routes.js
import { ROLES } from "../models/constant";

export const homePath = (role) => (role === ROLES.EMPLOYEE ? "/pegawai" : "/menu");