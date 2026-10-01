/**
 * Frontend Authentication and Authorization Types
 */

export type RoleCode =
  | 'super_admin'
  | 'admin'
  | 'entity_admin'
  | 'location_manager'
  | 'compliance_officer'
  | 'viewer';

export interface UserRole {
  _id: string;
  name: string;
  code: RoleCode;
  description?: string;
}

export interface UserEntity {
  _id: string;
  name: string;
  code: string;
}

export interface AuthUser {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  entity?: UserEntity | null;
  assignedLocations?: Array<{ _id: string; name: string; code: string }>;
  department?: string;
  designation?: string;
  status: 'active' | 'inactive' | 'archived';
  lastLoginAt?: string;
}

export interface LoginResponseData {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  permissions: string[];
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: string[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roleOrRoles: RoleCode | RoleCode[] | string | string[]) => boolean;
  hasPermission: (permissionCode: string) => boolean;
  can: (resource: string, action: string) => boolean;
}
