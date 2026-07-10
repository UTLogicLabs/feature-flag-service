import { describe, expect, it } from 'vitest'
import { updateFlagWithAudit } from '../../app/lib/audit.server'
import { createFlag, getFlagById } from '../../app/lib/repositories/flags.server'
import { pool } from '../../app/lib/db.server'

describe('audit log transactional write', () => {
  it('rolls back the flags update if the audit_log insert fails', async () => {
    const flag = await createFlag({ key: 'rollback-flag', environment: 'production', enabled: false })

    const bogusActorId = '00000000-0000-0000-0000-000000000000'

    await expect(
      updateFlagWithAudit(flag, { enabled: true }, { email: 'ghost@test.local', id: bogusActorId }),
    ).rejects.toThrow()

    const after = await getFlagById(flag.id)
    expect(after!.enabled).toBe(false)

    const auditRows = await pool.query('select * from audit_log where flag_key = $1', [flag.key])
    expect(auditRows.rowCount).toBe(0)
  })
})
