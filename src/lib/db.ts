import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  Member,
  Unit,
  Payment,
  DocumentAttachment,
  DashboardStats,
} from './types';
import {
  initialMembers,
  initialUnits,
  initialPayments,
  initialDocuments,
} from './sample-data';

const LOCAL_DB_FILE = path.join(process.cwd(), 'data', 'local-db.json');

// Helper to determine if Neon Postgres is enabled
export function isNeonConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(
    url &&
      (url.startsWith('postgres://') || url.startsWith('postgresql://')) &&
      !url.includes('placeholder')
  );
}

function getNeonSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return neon(url);
}

// ----------------------------------------------------
// LOCAL JSON STORE IMPLEMENTATION
// ----------------------------------------------------
interface LocalDbStore {
  members: Member[];
  units: Unit[];
  payments: Payment[];
  documents: DocumentAttachment[];
}

function readLocalDb(): LocalDbStore {
  if (!fs.existsSync(path.dirname(LOCAL_DB_FILE))) {
    fs.mkdirSync(path.dirname(LOCAL_DB_FILE), { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DB_FILE)) {
    const initial: LocalDbStore = {
      members: initialMembers,
      units: initialUnits,
      payments: initialPayments,
      documents: initialDocuments,
    };
    writeLocalDb(initial);
    return initial;
  }
  const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<LocalDbStore>;
  if (!Array.isArray(parsed.members) || !Array.isArray(parsed.units) ||
      !Array.isArray(parsed.payments) || !Array.isArray(parsed.documents)) {
    throw new Error(`Local database at ${LOCAL_DB_FILE} has an invalid structure.`);
  }
  return parsed as LocalDbStore;
}

function writeLocalDb(data: LocalDbStore): void {
  if (!fs.existsSync(path.dirname(LOCAL_DB_FILE))) {
    fs.mkdirSync(path.dirname(LOCAL_DB_FILE), { recursive: true });
  }
  const temporaryFile = `${LOCAL_DB_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(temporaryFile, LOCAL_DB_FILE);
}

// ----------------------------------------------------
// NEON DATABASE INITIALIZATION / MIGRATION
// ----------------------------------------------------
let neonInitialized = false;

export async function initNeonDatabase(): Promise<{ success: boolean; message: string }> {
  if (!isNeonConfigured()) {
    return { success: false, message: 'DATABASE_URL is not configured.' };
  }
  try {
    const sql = getNeonSql();

    // 1. Members table
    await sql`
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        member_code TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        middle_name TEXT,
        last_name TEXT NOT NULL,
        full_name TEXT NOT NULL,
        contact_number TEXT NOT NULL,
        id_number TEXT,
        authorized_driver_ids TEXT,
        address TEXT NOT NULL,
        email TEXT,
        emergency_contact_name TEXT,
        emergency_contact_number TEXT,
        status TEXT NOT NULL DEFAULT 'Active',
        join_date TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Units table
    await sql`
      CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY,
        member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
        unit_name TEXT NOT NULL,
        plate_number TEXT NOT NULL,
        model_year TEXT,
        color TEXT,
        engine_number TEXT,
        chassis_number TEXT,
        seating_capacity INTEGER DEFAULT 14,
        franchise_case_number TEXT,
        route_details TEXT,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS id_number TEXT`;
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS authorized_driver_ids TEXT`;
    await sql`ALTER TABLE units ADD COLUMN IF NOT EXISTS mv_file_number TEXT`;
    await sql`ALTER TABLE units ADD COLUMN IF NOT EXISTS pami_renewal_date TEXT`;
    await sql`ALTER TABLE units ADD COLUMN IF NOT EXISTS lto_registration_renewal_date TEXT`;

    // 3. Payments table
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
        unit_id TEXT,
        payment_type TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        reference_number TEXT,
        coverage_period TEXT,
        payment_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Paid',
        notes TEXT,
        receipt_doc_id TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 4. Documents table
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
        unit_id TEXT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_data TEXT NOT NULL,
        expiry_date TEXT,
        notes TEXT,
        uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    neonInitialized = true;
    return { success: true, message: 'Neon PostgreSQL tables initialized successfully!' };
  } catch (error: any) {
    console.error('Failed to init Neon DB:', error);
    return { success: false, message: error.message || 'Error initializing Neon DB' };
  }
}

async function ensureNeonReady() {
  if (!neonInitialized && isNeonConfigured()) {
    await initNeonDatabase();
  }
}

// ----------------------------------------------------
// DATABASE SERVICE METHODS
// ----------------------------------------------------

// MEMBERS
export async function getMembers(): Promise<Member[]> {
  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      const rows = await sql`
        SELECT m.*,
               COALESCE(
                 (SELECT json_agg(u.*) FROM units u WHERE u.member_id = m.id),
                 '[]'::json
               ) as units,
               COALESCE(
                 (SELECT json_agg(json_build_object('id', d.id, 'member_id', d.member_id, 'unit_id', d.unit_id, 'title', d.title, 'category', d.category, 'file_name', d.file_name, 'file_type', d.file_type, 'file_size', d.file_size, 'expiry_date', d.expiry_date, 'notes', d.notes, 'uploaded_at', d.uploaded_at)) FROM documents d WHERE d.member_id = m.id),
                 '[]'::json
               ) as documents
        FROM members m
        ORDER BY m.created_at DESC
      `;
      return rows.map((r: any) => ({
        id: r.id,
        member_code: r.member_code,
        first_name: r.first_name,
        middle_name: r.middle_name || '',
        last_name: r.last_name,
        full_name: r.full_name,
        contact_number: r.contact_number,
        id_number: r.id_number || '',
        authorized_driver_ids: r.authorized_driver_ids || '',
        address: r.address,
        email: r.email || '',
        emergency_contact_name: r.emergency_contact_name || '',
        emergency_contact_number: r.emergency_contact_number || '',
        status: r.status,
        join_date: r.join_date,
        notes: r.notes || '',
        created_at: r.created_at,
        updated_at: r.updated_at,
        units: r.units || [],
        documents: r.documents || [],
      }));
    } catch (e) {
      console.error('Neon query error, falling back to local:', e);
    }
  }

  const db = readLocalDb();
  return db.members.map((m) => ({
    ...m,
    units: db.units.filter((u) => u.member_id === m.id),
    documents: db.documents.filter((d) => d.member_id === m.id).map(({ file_data, ...document }) => document),
  }));
}

export async function getMemberById(id: string): Promise<Member | null> {
  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      const rows = await sql`SELECT * FROM members WHERE id = ${id} LIMIT 1`;
      if (!rows || rows.length === 0) return null;

      const m = rows[0];
      const unitsRows = await sql`SELECT * FROM units WHERE member_id = ${id} ORDER BY created_at DESC`;
      const paymentsRows = await sql`SELECT * FROM payments WHERE member_id = ${id} ORDER BY payment_date DESC`;
      const docRows = await sql`SELECT id, member_id, unit_id, title, category, file_name, file_type, file_size, expiry_date, notes, uploaded_at FROM documents WHERE member_id = ${id} ORDER BY uploaded_at DESC`;

      return {
        id: m.id,
        member_code: m.member_code,
        first_name: m.first_name,
        middle_name: m.middle_name || '',
        last_name: m.last_name,
        full_name: m.full_name,
        contact_number: m.contact_number,
        id_number: m.id_number || '',
        authorized_driver_ids: m.authorized_driver_ids || '',
        address: m.address,
        email: m.email || '',
        emergency_contact_name: m.emergency_contact_name || '',
        emergency_contact_number: m.emergency_contact_number || '',
        status: m.status,
        join_date: m.join_date,
        notes: m.notes || '',
        created_at: m.created_at,
        updated_at: m.updated_at,
        units: unitsRows.map((u: any) => ({
          id: u.id,
          member_id: u.member_id,
          unit_name: u.unit_name,
          plate_number: u.plate_number,
          model_year: u.model_year,
          color: u.color,
          engine_number: u.engine_number,
          chassis_number: u.chassis_number,
          mv_file_number: u.mv_file_number || '',
          seating_capacity: u.seating_capacity,
          franchise_case_number: u.franchise_case_number,
          pami_renewal_date: u.pami_renewal_date || '',
          lto_registration_renewal_date: u.lto_registration_renewal_date || '',
          route_details: u.route_details,
          status: u.status,
          created_at: u.created_at,
          updated_at: u.updated_at,
        })),
        payments: paymentsRows.map((p: any) => ({
          id: p.id,
          member_id: p.member_id,
          unit_id: p.unit_id,
          payment_type: p.payment_type,
          payment_method: p.payment_method,
          amount: Number(p.amount),
          reference_number: p.reference_number,
          coverage_period: p.coverage_period,
          payment_date: p.payment_date,
          status: p.status,
          notes: p.notes,
          receipt_doc_id: p.receipt_doc_id,
          created_at: p.created_at,
        })),
        documents: docRows.map((d: any) => ({
          id: d.id,
          member_id: d.member_id,
          unit_id: d.unit_id,
          title: d.title,
          category: d.category,
          file_name: d.file_name,
          file_type: d.file_type,
          file_size: d.file_size,
          expiry_date: d.expiry_date,
          notes: d.notes,
          uploaded_at: d.uploaded_at,
        })),
      };
    } catch (e) {
      console.error('Neon query error, falling back to local:', e);
    }
  }

  const db = readLocalDb();
  const member = db.members.find((m) => m.id === id);
  if (!member) return null;

  return {
    ...member,
    units: db.units.filter((u) => u.member_id === id),
    payments: db.payments.filter((p) => p.member_id === id),
    documents: db.documents.filter((d) => d.member_id === id).map(({ file_data, ...document }) => document),
  };
}

export async function createMember(
  data: Partial<Omit<Member, 'id' | 'created_at' | 'updated_at'>> & Pick<Member, 'full_name'>
): Promise<Member> {
  const id = 'mem-' + Date.now();
  const now = new Date().toISOString();
  const fullName = data.full_name.trim();
  const nameParts = fullName.split(/\s+/);
  const firstName = data.first_name || nameParts[0] || '';
  const lastName = data.last_name || nameParts.slice(1).join(' ') || firstName;

  const newMember: Member = {
    ...data,
    id,
    member_code: data.member_code || `KM-${new Date().getFullYear()}-${Date.now()}`,
    first_name: firstName,
    middle_name: data.middle_name || '',
    last_name: lastName,
    full_name: fullName,
    contact_number: data.contact_number || '',
    address: data.address || '',
    status: data.status || 'Active',
    join_date: data.join_date || now.slice(0, 10),
    created_at: now,
    updated_at: now,
  };

  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      await sql`
        INSERT INTO members (
          id, member_code, first_name, middle_name, last_name, full_name,
          contact_number, address, email, emergency_contact_name, emergency_contact_number,
          id_number, authorized_driver_ids, status, join_date, notes
        ) VALUES (
          ${newMember.id}, ${newMember.member_code}, ${newMember.first_name},
          ${newMember.middle_name || ''}, ${newMember.last_name}, ${newMember.full_name},
          ${newMember.contact_number}, ${newMember.address}, ${newMember.email || ''},
          ${newMember.emergency_contact_name || ''}, ${newMember.emergency_contact_number || ''},
          ${newMember.id_number || ''}, ${newMember.authorized_driver_ids || ''},
          ${newMember.status}, ${newMember.join_date}, ${newMember.notes || ''}
        )
      `;
      return newMember;
    } catch (e) {
      console.error('Neon error on createMember, saving locally:', e);
    }
  }

  const db = readLocalDb();
  db.members.unshift(newMember);
  writeLocalDb(db);
  return newMember;
}

export async function updateMember(id: string, data: Partial<Member>): Promise<Member | null> {
  const now = new Date().toISOString();
  const fullName = data.first_name && data.last_name
    ? `${data.first_name} ${data.middle_name ? data.middle_name + ' ' : ''}${data.last_name}`.trim()
    : undefined;

  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      await sql`
        UPDATE members SET
          member_code = COALESCE(${data.member_code}, member_code),
          first_name = COALESCE(${data.first_name}, first_name),
          middle_name = COALESCE(${data.middle_name}, middle_name),
          last_name = COALESCE(${data.last_name}, last_name),
          full_name = COALESCE(${data.full_name}, ${fullName}, full_name),
          contact_number = COALESCE(${data.contact_number}, contact_number),
          id_number = COALESCE(${data.id_number}, id_number),
          authorized_driver_ids = COALESCE(${data.authorized_driver_ids}, authorized_driver_ids),
          address = COALESCE(${data.address}, address),
          email = COALESCE(${data.email}, email),
          emergency_contact_name = COALESCE(${data.emergency_contact_name}, emergency_contact_name),
          emergency_contact_number = COALESCE(${data.emergency_contact_number}, emergency_contact_number),
          status = COALESCE(${data.status}, status),
          join_date = COALESCE(${data.join_date}, join_date),
          notes = COALESCE(${data.notes}, notes),
          updated_at = NOW()
        WHERE id = ${id}
      `;
      return getMemberById(id);
    } catch (e) {
      console.error('Neon updateMember error:', e);
    }
  }

  const db = readLocalDb();
  const index = db.members.findIndex((m) => m.id === id);
  if (index === -1) return null;

  db.members[index] = {
    ...db.members[index],
    ...data,
    ...(data.full_name ? { full_name: data.full_name } : fullName ? { full_name: fullName } : {}),
    updated_at: now,
  };
  writeLocalDb(db);
  return db.members[index];
}

export async function deleteMember(id: string): Promise<boolean> {
  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      await sql`DELETE FROM members WHERE id = ${id}`;
      return true;
    } catch (e) {
      console.error('Neon delete error:', e);
    }
  }

  const db = readLocalDb();
  db.members = db.members.filter((m) => m.id !== id);
  db.units = db.units.filter((u) => u.member_id !== id);
  db.payments = db.payments.filter((p) => p.member_id !== id);
  db.documents = db.documents.filter((d) => d.member_id !== id);
  writeLocalDb(db);
  return true;
}

// UNITS / VANS
export async function getUnits(): Promise<Unit[]> {
  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      const rows = await sql`
        SELECT u.*, m.full_name as member_name, m.contact_number as member_contact
        FROM units u
        LEFT JOIN members m ON u.member_id = m.id
        ORDER BY u.created_at DESC
      `;
      return rows.map((u: any) => ({
        id: u.id,
        member_id: u.member_id,
        unit_name: u.unit_name,
        plate_number: u.plate_number,
        model_year: u.model_year,
        color: u.color,
        engine_number: u.engine_number,
        chassis_number: u.chassis_number,
        mv_file_number: u.mv_file_number || '',
        seating_capacity: u.seating_capacity,
        franchise_case_number: u.franchise_case_number,
        pami_renewal_date: u.pami_renewal_date || '',
        lto_registration_renewal_date: u.lto_registration_renewal_date || '',
        route_details: u.route_details,
        status: u.status,
        created_at: u.created_at,
        updated_at: u.updated_at,
        member_name: u.member_name,
        member_contact: u.member_contact,
      }));
    } catch (e) {
      console.error('Neon getUnits error:', e);
    }
  }

  const db = readLocalDb();
  return db.units.map((u) => {
    const member = db.members.find((m) => m.id === u.member_id);
    return {
      ...u,
      member_name: member?.full_name,
      member_contact: member?.contact_number,
    };
  });
}

export async function createUnit(data: Omit<Unit, 'id' | 'created_at' | 'updated_at'>): Promise<Unit> {
  const id = 'unit-' + Date.now();
  const now = new Date().toISOString();
  const newUnit: Unit = { ...data, id, created_at: now, updated_at: now };

  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      await sql`
        INSERT INTO units (
          id, member_id, unit_name, plate_number, model_year, color,
          engine_number, chassis_number, seating_capacity, franchise_case_number,
          mv_file_number, pami_renewal_date, lto_registration_renewal_date, route_details, status
        ) VALUES (
          ${newUnit.id}, ${newUnit.member_id}, ${newUnit.unit_name}, ${newUnit.plate_number},
          ${newUnit.model_year || ''}, ${newUnit.color || ''}, ${newUnit.engine_number || ''},
          ${newUnit.chassis_number || ''}, ${newUnit.seating_capacity || 14},
          ${newUnit.franchise_case_number || ''}, ${newUnit.mv_file_number || ''},
          ${newUnit.pami_renewal_date || null}, ${newUnit.lto_registration_renewal_date || null},
          ${newUnit.route_details || ''},
          ${newUnit.status}
        )
      `;
      return newUnit;
    } catch (e) {
      console.error('Neon createUnit error:', e);
    }
  }

  const db = readLocalDb();
  db.units.unshift(newUnit);
  writeLocalDb(db);
  return newUnit;
}

export async function updateUnit(id: string, data: Partial<Unit>): Promise<Unit | null> {
  const now = new Date().toISOString();
  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      await sql`
        UPDATE units SET
          unit_name = COALESCE(${data.unit_name}, unit_name),
          plate_number = COALESCE(${data.plate_number}, plate_number),
          model_year = COALESCE(${data.model_year}, model_year),
          color = COALESCE(${data.color}, color),
          engine_number = COALESCE(${data.engine_number}, engine_number),
          chassis_number = COALESCE(${data.chassis_number}, chassis_number),
          mv_file_number = COALESCE(${data.mv_file_number}, mv_file_number),
          seating_capacity = COALESCE(${data.seating_capacity}, seating_capacity),
          franchise_case_number = COALESCE(${data.franchise_case_number}, franchise_case_number),
          pami_renewal_date = COALESCE(${data.pami_renewal_date}, pami_renewal_date),
          lto_registration_renewal_date = COALESCE(${data.lto_registration_renewal_date}, lto_registration_renewal_date),
          route_details = COALESCE(${data.route_details}, route_details),
          status = COALESCE(${data.status}, status),
          updated_at = NOW()
        WHERE id = ${id}
      `;
    } catch (e) {
      console.error('Neon updateUnit error:', e);
    }
  }

  const db = readLocalDb();
  const index = db.units.findIndex((u) => u.id === id);
  if (index === -1) return null;
  db.units[index] = { ...db.units[index], ...data, updated_at: now };
  writeLocalDb(db);
  return db.units[index];
}

export async function deleteUnit(id: string): Promise<boolean> {
  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      await sql`DELETE FROM units WHERE id = ${id}`;
      return true;
    } catch (e) {
      console.error('Neon deleteUnit error:', e);
    }
  }
  const db = readLocalDb();
  db.units = db.units.filter((u) => u.id !== id);
  writeLocalDb(db);
  return true;
}

// PAYMENTS
export async function getPayments(): Promise<Payment[]> {
  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      const rows = await sql`
        SELECT p.*, m.full_name as member_name, u.plate_number as unit_plate, u.unit_name
        FROM payments p
        LEFT JOIN members m ON p.member_id = m.id
        LEFT JOIN units u ON p.unit_id = u.id
        ORDER BY p.payment_date DESC, p.created_at DESC
      `;
      return rows.map((p: any) => ({
        id: p.id,
        member_id: p.member_id,
        unit_id: p.unit_id,
        payment_type: p.payment_type,
        payment_method: p.payment_method,
        amount: Number(p.amount),
        reference_number: p.reference_number,
        coverage_period: p.coverage_period,
        payment_date: p.payment_date,
        status: p.status,
        notes: p.notes,
        receipt_doc_id: p.receipt_doc_id,
        created_at: p.created_at,
        member_name: p.member_name,
        unit_name: p.unit_name ? `${p.unit_name} (${p.unit_plate})` : undefined,
      }));
    } catch (e) {
      console.error('Neon getPayments error:', e);
    }
  }

  const db = readLocalDb();
  return db.payments.map((p) => {
    const member = db.members.find((m) => m.id === p.member_id);
    const unit = db.units.find((u) => u.id === p.unit_id);
    return {
      ...p,
      member_name: member?.full_name,
      unit_name: unit ? `${unit.unit_name} (${unit.plate_number})` : undefined,
    };
  });
}

export async function createPayment(data: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
  const id = 'pay-' + Date.now();
  const now = new Date().toISOString();
  const newPayment: Payment = { ...data, id, created_at: now };

  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      await sql`
        INSERT INTO payments (
          id, member_id, unit_id, payment_type, payment_method, amount,
          reference_number, coverage_period, payment_date, status, notes, receipt_doc_id
        ) VALUES (
          ${newPayment.id}, ${newPayment.member_id}, ${newPayment.unit_id || null},
          ${newPayment.payment_type}, ${newPayment.payment_method}, ${newPayment.amount},
          ${newPayment.reference_number || ''}, ${newPayment.coverage_period || ''},
          ${newPayment.payment_date}, ${newPayment.status}, ${newPayment.notes || ''},
          ${newPayment.receipt_doc_id || null}
        )
      `;
      return newPayment;
    } catch (e) {
      console.error('Neon createPayment error:', e);
    }
  }

  const db = readLocalDb();
  db.payments.unshift(newPayment);
  writeLocalDb(db);
  return newPayment;
}

export async function deletePayment(id: string): Promise<boolean> {
  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      await sql`DELETE FROM payments WHERE id = ${id}`;
      return true;
    } catch (e) {
      console.error('Neon deletePayment error:', e);
    }
  }
  const db = readLocalDb();
  db.payments = db.payments.filter((p) => p.id !== id);
  writeLocalDb(db);
  return true;
}

// DOCUMENTS
export async function getDocuments(): Promise<DocumentAttachment[]> {
  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      const rows = await sql`
        SELECT d.id, d.member_id, d.unit_id, d.title, d.category, d.file_name,
               d.file_type, d.file_size, d.expiry_date, d.notes, d.uploaded_at,
               m.full_name as member_name
        FROM documents d
        LEFT JOIN members m ON d.member_id = m.id
        ORDER BY d.uploaded_at DESC
      `;
      return rows.map((d: any) => ({
        id: d.id,
        member_id: d.member_id,
        unit_id: d.unit_id,
        title: d.title,
        category: d.category,
        file_name: d.file_name,
        file_type: d.file_type,
        file_size: d.file_size,
        expiry_date: d.expiry_date,
        notes: d.notes,
        uploaded_at: d.uploaded_at,
        member_name: d.member_name,
      }));
    } catch (e) {
      console.error('Neon getDocuments error:', e);
    }
  }

  const db = readLocalDb();
  return db.documents.map((d) => {
    const member = db.members.find((m) => m.id === d.member_id);
    const { file_data, ...metadata } = d;
    return {
      ...metadata,
      member_name: member?.full_name,
    };
  });
}

export async function getMemberDocuments(memberId: string): Promise<DocumentAttachment[]> {
  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      const rows = await sql`
        SELECT id, member_id, unit_id, title, category, file_name, file_type, file_size,
               expiry_date, notes, uploaded_at
        FROM documents WHERE member_id = ${memberId} ORDER BY uploaded_at DESC
      `;
      return rows.map((document: any) => ({
        id: document.id,
        member_id: document.member_id,
        unit_id: document.unit_id,
        title: document.title,
        category: document.category,
        file_name: document.file_name,
        file_type: document.file_type,
        file_size: document.file_size,
        expiry_date: document.expiry_date,
        notes: document.notes,
        uploaded_at: document.uploaded_at,
      }));
    } catch (error) {
      console.error('Neon getMemberDocuments error:', error);
    }
  }
  return readLocalDb().documents
    .filter((document) => document.member_id === memberId)
    .map(({ file_data, ...document }) => document);
}

export async function getMemberDocument(
  memberId: string,
  documentId: string
): Promise<DocumentAttachment | null> {
  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      const rows = await sql`
        SELECT * FROM documents WHERE id = ${documentId} AND member_id = ${memberId} LIMIT 1
      `;
      if (!rows.length) return null;
      const document = rows[0];
      return {
        id: document.id,
        member_id: document.member_id,
        unit_id: document.unit_id,
        title: document.title,
        category: document.category,
        file_name: document.file_name,
        file_type: document.file_type,
        file_size: document.file_size,
        file_data: document.file_data,
        expiry_date: document.expiry_date,
        notes: document.notes,
        uploaded_at: document.uploaded_at,
      };
    } catch (error) {
      console.error('Neon getMemberDocument error:', error);
    }
  }

  return readLocalDb().documents.find(
    (document) => document.id === documentId && document.member_id === memberId
  ) || null;
}

export async function createDocument(
  data: Omit<DocumentAttachment, 'id' | 'uploaded_at'>
): Promise<DocumentAttachment> {
  const id = 'doc-' + randomUUID();
  const now = new Date().toISOString();
  const newDoc: DocumentAttachment = { ...data, id, uploaded_at: now };

  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      await sql`
        INSERT INTO documents (
          id, member_id, unit_id, title, category, file_name, file_type,
          file_size, file_data, expiry_date, notes
        ) VALUES (
          ${newDoc.id}, ${newDoc.member_id}, ${newDoc.unit_id || null},
          ${newDoc.title}, ${newDoc.category}, ${newDoc.file_name},
          ${newDoc.file_type}, ${newDoc.file_size}, ${newDoc.file_data},
          ${newDoc.expiry_date || null}, ${newDoc.notes || ''}
        )
      `;
      const { file_data, ...metadata } = newDoc;
      return metadata;
    } catch (e) {
      console.error('Neon createDocument error:', e);
    }
  }

  const db = readLocalDb();
  db.documents.unshift(newDoc);
  writeLocalDb(db);
  const { file_data, ...metadata } = newDoc;
  return metadata;
}

export async function deleteDocument(id: string, memberId: string): Promise<boolean> {
  if (isNeonConfigured()) {
    try {
      await ensureNeonReady();
      const sql = getNeonSql();
      const rows = await sql`
        DELETE FROM documents WHERE id = ${id} AND member_id = ${memberId} RETURNING id
      `;
      return rows.length > 0;
    } catch (e) {
      console.error('Neon deleteDocument error:', e);
    }
  }
  const db = readLocalDb();
  const exists = db.documents.some((document) => document.id === id && document.member_id === memberId);
  if (!exists) return false;
  db.documents = db.documents.filter((d) => d.id !== id);
  writeLocalDb(db);
  return true;
}

// DASHBOARD STATS
export async function getDashboardStats(): Promise<DashboardStats> {
  const members = await getMembers();
  const units = await getUnits();
  const payments = await getPayments();
  const renewalDates = units.flatMap((unit) => [
    unit.pami_renewal_date,
    unit.lto_registration_renewal_date,
  ]);

  const currentMonthYear = new Date().toISOString().slice(0, 7); // e.g. "2026-11"
  const totalCollectedThisMonth = payments
    .filter((p) => p.status === 'Paid' && p.payment_date?.startsWith(currentMonthYear))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const pendingPaymentsCount = payments.filter((p) => p.status === 'Pending').length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in45Days = new Date();
  in45Days.setDate(in45Days.getDate() + 45);

  const upcomingRenewalsCount = renewalDates.filter((date) => {
    if (!date) return false;
    const renewal = new Date(date);
    return renewal >= today && renewal <= in45Days;
  }).length;

  return {
    totalMembers: members.length,
    totalUnits: units.length,
    totalCollectedThisMonth,
    pendingPaymentsCount,
    upcomingRenewalsCount,
  };
}

// SYNC / SEED LOCAL DATA TO NEON
export async function seedOrMigrateToNeon(): Promise<{ success: boolean; count: number; message: string }> {
  if (!isNeonConfigured()) {
    return { success: false, count: 0, message: 'DATABASE_URL is not set. Please add your Neon connection string in .env.local' };
  }

  await ensureNeonReady();
  const sql = getNeonSql();
  const db = readLocalDb();

  let insertedCount = 0;

  for (const m of db.members) {
    await sql`
      INSERT INTO members (
        id, member_code, first_name, middle_name, last_name, full_name,
        contact_number, address, email, emergency_contact_name, emergency_contact_number,
        id_number, authorized_driver_ids, status, join_date, notes
      ) VALUES (
        ${m.id}, ${m.member_code}, ${m.first_name}, ${m.middle_name || ''}, ${m.last_name},
        ${m.full_name}, ${m.contact_number}, ${m.address}, ${m.email || ''},
        ${m.emergency_contact_name || ''}, ${m.emergency_contact_number || ''},
        ${m.id_number || ''}, ${m.authorized_driver_ids || ''},
        ${m.status}, ${m.join_date}, ${m.notes || ''}
      )
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
    `;
    insertedCount++;
  }

  for (const u of db.units) {
    await sql`
      INSERT INTO units (
        id, member_id, unit_name, plate_number, model_year, color,
        engine_number, chassis_number, seating_capacity, franchise_case_number,
        mv_file_number, pami_renewal_date, lto_registration_renewal_date, route_details, status
      ) VALUES (
        ${u.id}, ${u.member_id}, ${u.unit_name}, ${u.plate_number}, ${u.model_year || ''},
        ${u.color || ''}, ${u.engine_number || ''}, ${u.chassis_number || ''},
        ${u.seating_capacity || 14}, ${u.franchise_case_number || ''}, ${u.mv_file_number || ''},
        ${u.pami_renewal_date || null}, ${u.lto_registration_renewal_date || null},
        ${u.route_details || ''},
        ${u.status}
      )
      ON CONFLICT (id) DO NOTHING;
    `;
  }

  for (const p of db.payments) {
    await sql`
      INSERT INTO payments (
        id, member_id, unit_id, payment_type, payment_method, amount,
        reference_number, coverage_period, payment_date, status, notes, receipt_doc_id
      ) VALUES (
        ${p.id}, ${p.member_id}, ${p.unit_id || null}, ${p.payment_type}, ${p.payment_method},
        ${p.amount}, ${p.reference_number || ''}, ${p.coverage_period || ''},
        ${p.payment_date}, ${p.status}, ${p.notes || ''}, ${p.receipt_doc_id || null}
      )
      ON CONFLICT (id) DO NOTHING;
    `;
  }

  for (const d of db.documents) {
    await sql`
      INSERT INTO documents (
        id, member_id, unit_id, title, category, file_name, file_type,
        file_size, file_data, expiry_date, notes
      ) VALUES (
        ${d.id}, ${d.member_id}, ${d.unit_id || null}, ${d.title}, ${d.category},
        ${d.file_name}, ${d.file_type}, ${d.file_size}, ${d.file_data},
        ${d.expiry_date || null}, ${d.notes || ''}
      )
      ON CONFLICT (id) DO NOTHING;
    `;
  }

  return {
    success: true,
    count: insertedCount,
    message: `Successfully synchronized ${insertedCount} member records and all related units, payments, and documents to NeonDB!`,
  };
}
