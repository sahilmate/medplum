/*
 * Generated by @medplum/generator
 * Do not edit manually.
 */

import { PoolClient } from 'pg';

export async function run(client: PoolClient): Promise<void> {
  await client.query(`ALTER TABLE "ServiceRequest" ADD COLUMN "orderDetail" TEXT[] NOT NULL DEFAULT '{}'::text[]`);
  await client.query('CREATE INDEX ON "ServiceRequest" ("orderDetail")');
}