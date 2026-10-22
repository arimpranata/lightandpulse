import type { Tx } from './db';

export type Actor = { id: string | null; role: string };

export const SYSTEM: Actor = { id: null, role: 'system' };

/** Records a mutation with actor, source, and previous and new state (spec §23). */
export async function audit(
  tx: Tx,
  actor: Actor,
  entry: { source: string; action: string; entity: string; entityId: string; before?: unknown; after?: unknown },
): Promise<void> {
  await tx.query(
    `INSERT INTO audit_log (actor_id, actor_role, source, action, entity, entity_id, before, after)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      actor.id,
      actor.role,
      entry.source,
      entry.action,
      entry.entity,
      entry.entityId,
      entry.before === undefined ? null : JSON.stringify(entry.before),
      entry.after === undefined ? null : JSON.stringify(entry.after),
    ],
  );
}
