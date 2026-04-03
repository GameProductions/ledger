export const pccMiddleware = async (c, next) => {
    const role = c.get('globalRole');
    if (role !== 'super_admin') {
        console.warn(`[PCC Access Denied] User ${c.get('userId')} attempted access with role ${role}`);
        return c.json({ error: 'Forbidden: Super Admin access required' }, 403);
    }
    await next();
};
