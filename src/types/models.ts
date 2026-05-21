import type { Timestamp } from "firebase/firestore";

/** ID de miembro de la familia. Estable (no cambia entre logins ni mails). */
export type MemberId = "juanpablo" | "maria" | "sofia" | "federico";

/** Rol del miembro (informativo, no afecta permisos en esta etapa). */
export type MemberRole = "padre" | "madre" | "hija" | "hijo" | "invitado";

/** Un miembro de la familia tal como vive en /config/familia.miembros[memberId]. */
export interface MemberInfo {
  nombre: string;
  rol: MemberRole;
  mails: string[];
}

/** Shape del doc /config/familia. */
export interface FamiliaConfig {
  miembros: Record<string, MemberInfo>;
  owner: string;
  timezone: string;
  semanaArrancaEn: string;
}

/** Shape del doc /users/{uid}. */
export interface UserDoc {
  uid: string;
  email: string;
  memberId: MemberId;
  nombre: string;
  rol: MemberRole;
  ultimoLogin: Timestamp;
  fechaPrimerLogin: Timestamp;
}
