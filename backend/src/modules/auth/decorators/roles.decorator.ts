import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../../common/enums';

export const ROLES_KEY = 'roles';

/** Attach required roles to a route handler.
 *  Used together with RolesGuard.
 *  @example @Roles(UserRole.ADMIN)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
