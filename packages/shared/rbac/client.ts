/**
 * 🛡️ Shared Fleet RBAC Client (Rule 13.19)
 * High-performance edge evaluation of user & discord permissions backed by FLEET_SECURITY_CACHE.
 */

export interface PermissionEvaluationContext {
  kv?: any;
  userId?: string;
  discordId?: string;
}

/**
 * Standard fleet-wide permission nodes
 */
export const FLEET_PERMISSIONS = {
  // Security & Infrastructure
  SECURITY_MANAGE: 'fleet:security:manage',
  MAINTENANCE_TOGGLE: 'maintenance:toggle',
  AUDIT_READ: 'audit:read',
  PORTAINER_MANAGE: 'portainer:manage',

  // Bot & Community Management
  COMMUNITY_ADMIN: 'bot:community:admin',
  ROLES_MANAGE: 'roles:manage',
  USERS_MANAGE: 'users:manage',

  // Policy & Auth Overrides
  PASSWORD_POLICY_OVERRIDE: 'auth:password:override_rules',
} as const;

export type FleetPermission = typeof FLEET_PERMISSIONS[keyof typeof FLEET_PERMISSIONS] | string;

/**
 * Evaluates whether a user or Discord member has a specific permission node.
 * Evaluates locally from FLEET_SECURITY_CACHE with sub-millisecond speed.
 */
export async function hasPermission(
  ctx: PermissionEvaluationContext,
  requiredPermission: FleetPermission
): Promise<boolean> {
  const { kv, userId, discordId } = ctx;
  if (!kv) return false;

  const permissions = new Set<string>();

  // 1. Fetch permissions by Discord ID if provided
  if (discordId) {
    try {
      const cached = await kv.get(`fs:perms:discord:${discordId}`, 'json');
      if (Array.isArray(cached)) {
        for (const p of cached) permissions.add(p);
      }
    } catch {}
  }

  // 2. Fetch permissions by Foundation User ID if provided
  if (userId) {
    try {
      const cached = await kv.get(`fs:perms:user:${userId}`, 'json');
      if (Array.isArray(cached)) {
        for (const p of cached) permissions.add(p);
      }
    } catch {}
  }

  // Wildcard admin match or exact match
  return permissions.has('*') || permissions.has('admin') || permissions.has(requiredPermission);
}

/**
 * Syncs user permissions to FLEET_SECURITY_CACHE for edge consumption.
 */
export async function syncUserPermissionsToKv(
  kv: any,
  identifier: { userId?: string; discordId?: string },
  permissionList: string[],
  ttlSeconds = 86400
): Promise<void> {
  if (!kv) return;

  if (identifier.discordId) {
    await kv.put(
      `fs:perms:discord:${identifier.discordId}`,
      JSON.stringify(permissionList),
      { expirationTtl: ttlSeconds }
    );
  }

  if (identifier.userId) {
    await kv.put(
      `fs:perms:user:${identifier.userId}`,
      JSON.stringify(permissionList),
      { expirationTtl: ttlSeconds }
    );
  }
}
