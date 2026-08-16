import { eq, and, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { 
  users as usersTable
} from '#';

export interface UpdateProfileInput {
  username?: string;
  email?: string;
  displayName?: string;
  locale?: string;
  theme?: string;
}

export class UserManagementService {
  constructor(private db: any, private env: any) {}

  async updateProfile(userId: string, input: UpdateProfileInput, actorId?: string) {
    const existing = await this.db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .then((r: any[]) => r[0]);

    if (!existing) {
      throw new HTTPException(404, { message: 'User not found' });
    }

    if (input.username && input.username.trim() !== existing.username) {
      const trimmedUsername = input.username.trim();
      const conflict = await this.db.select({ id: usersTable.id })
        .from(usersTable)
        .where(and(eq(sql`LOWER(${usersTable.username})`, trimmedUsername.toLowerCase()), sql`${usersTable.id} != ${userId}`))
        .limit(1)
        .then((r: any[]) => r[0]);

      if (conflict) {
        throw new HTTPException(409, { message: `Username '${trimmedUsername}' is already in use.` });
      }
    }

    const updates: any = {};
    if (input.username) updates.username = input.username.trim();
    if (input.displayName !== undefined) updates.displayName = input.displayName;

    await this.db.update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, userId));

    return { success: true, message: 'Profile successfully updated.' };
  }

  async deleteAccount(userId: string, actorId: string = 'system') {
    const user = await this.db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .then((r: any[]) => r[0]);

    if (!user) {
      throw new HTTPException(404, { message: 'User not found' });
    }

    await this.db.delete(usersTable).where(eq(usersTable.id, userId));
    return { success: true, message: 'Account safely deleted and purged.' };
  }
}
