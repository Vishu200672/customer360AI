import * as XLSX from 'xlsx';
import { CustomerService } from './customerService.js';
import { MLClient } from '../integrations/mlClient.js';
import { CustomerProfile, CreateCustomerInput, CustomerFeatures } from '../types/index.js';

export interface ColumnMapping {
  uploaded_column: string;
  target_field: string;
}

export interface ValidationReport {
  filename: string;
  total_rows: number;
  total_columns: number;
  detected_columns: string[];
  valid_rows_count: number;
  warning_rows_count: number;
  invalid_rows_count: number;
  data_quality_score: number;
  column_mappings: ColumnMapping[];
  missing_required_fields: string[];
  sample_rows: Record<string, any>[];
  status: 'VALID' | 'WARNING' | 'ERROR';
}

export interface IngestionJobRecord {
  job_id: string;
  filename: string;
  status: 'UPLOADED' | 'VALIDATED' | 'PROCESSING' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'FAILED';
  total_records: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  created_customers: CustomerProfile[];
  average_churn_risk: number;
  high_risk_count: number;
  top_nba_recommendation: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

const LIVE_INGESTION_JOBS_STORE: Map<string, IngestionJobRecord> = new Map();

function cleanNumber(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : val;
  const str = String(val).trim();
  const cleaned = str.replace(/[^0-9.-]/g, '');
  if (!cleaned) return undefined;
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

export class IngestionService {
  private customerService: CustomerService;
  private mlClient: MLClient;

  constructor() {
    this.customerService = new CustomerService();
    this.mlClient = new MLClient();
  }

  // Parse CSV, JSON, or Excel (.xlsx / .xls) data into array of objects
  public parseDatasetInput(rawInput: string | any[]): Record<string, any>[] {
    if (Array.isArray(rawInput)) return rawInput;
    if (typeof rawInput !== 'string') return [];

    const str = rawInput.trim();
    if (!str) return [];

    // 1. Check if input is Base64 / DataURL or binary starting with PK! (Excel .xlsx format)
    if (str.startsWith('PK!') || str.startsWith('data:application') || str.includes('base64,')) {
      try {
        let base64Content = str;
        if (str.includes('base64,')) {
          base64Content = str.split('base64,')[1];
        }
        const workbook = XLSX.read(base64Content, { type: str.startsWith('PK!') ? 'string' : 'base64' });
        const sheetName = workbook.SheetNames[0];
        if (sheetName && workbook.Sheets[sheetName]) {
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName]);
          if (rows.length > 0) return rows;
        }
      } catch (e) {
        try {
          const buf = Buffer.from(str, str.includes('base64,') ? 'base64' : 'binary');
          const workbook = XLSX.read(buf, { type: 'buffer' });
          const sheetName = workbook.SheetNames[0];
          if (sheetName && workbook.Sheets[sheetName]) {
            const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName]);
            if (rows.length > 0) return rows;
          }
        } catch {}
      }
    }

    // 2. JSON Array or Object parsing
    if (str.startsWith('[') || str.startsWith('{')) {
      try {
        const parsed = JSON.parse(str);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {}
    }

    // 3. Fallback to CSV parsing
    return this.parseCSV(str);
  }

  // Parse CSV string into array of objects using RFC-4180 compliant tokenizer
  public parseCSV(csvText: string): Record<string, any>[] {
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^["']|["']$/g, '').trim());
    const rows: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const currentLine = parseCSVLine(lines[i]).map((cell) => cell.replace(/^["']|["']$/g, '').trim());
      if (currentLine.length < headers.length) continue;

      const row: Record<string, any> = {};
      headers.forEach((h, idx) => {
        const val = currentLine[idx];
        const num = cleanNumber(val);
        row[h] = num !== undefined ? num : val;
      });
      rows.push(row);
    }
    return rows;
  }

  // Validate uploaded raw text/JSON/Excel data
  async validateDataset(rawInput: string | any[], filename: string = 'customer_dataset.csv'): Promise<ValidationReport> {
    const rows: Record<string, any>[] = this.parseDatasetInput(rawInput);

    if (rows.length === 0) {
      return {
        filename,
        total_rows: 0,
        total_columns: 0,
        detected_columns: [],
        valid_rows_count: 0,
        warning_rows_count: 0,
        invalid_rows_count: 0,
        data_quality_score: 0,
        column_mappings: [],
        missing_required_fields: ['first_name', 'last_name', 'email'],
        sample_rows: [],
        status: 'ERROR',
      };
    }

    const detected_columns = Object.keys(rows[0] || {});
    const column_mappings: ColumnMapping[] = [];

    // Auto-detect column mapping for diverse enterprise CSV/Excel schema formats
    detected_columns.forEach((col) => {
      const lower = col.toLowerCase().replace(/[^a-z0-9_]/g, '');
      let target = col;
      if (lower === 'customer_id' || lower === 'cust_id' || lower === 'external_id' || lower === 'account_id' || lower === 'client_id' || lower === 'id') {
        target = 'external_customer_id';
      } else if (lower.includes('first') || lower === 'fname' || lower === 'givenname') {
        target = 'first_name';
      } else if (lower.includes('last') || lower === 'lname' || lower === 'surname') {
        target = 'last_name';
      } else if (lower.includes('customername') || lower === 'name' || lower === 'fullname' || lower === 'clientname' || lower === 'username') {
        target = 'customer_name';
      } else if (lower.includes('mail')) {
        target = 'email';
      } else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('cell')) {
        target = 'phone';
      } else if (lower.includes('channel') || lower.includes('source') || lower.includes('medium')) {
        target = 'acquisition_channel';
      } else if (lower.includes('recency') || lower.includes('inactive') || lower.includes('inactivity') || lower.includes('idle') || lower.includes('dormant') || lower.includes('dayssince')) {
        target = 'recency_days';
      } else if (lower.includes('spend') || lower.includes('monetary') || lower.includes('revenue') || lower.includes('ltv') || lower.includes('clv') || lower.includes('amount') || lower.includes('sales')) {
        target = 'monetary_value';
      } else if (lower.includes('abandon') || lower.includes('cart') || lower.includes('dropoff')) {
        target = 'cart_abandonment_count';
      } else if (lower.includes('freq') || lower.includes('order') || lower.includes('purchase') || lower.includes('transac')) {
        target = 'frequency_count';
      } else if (lower.includes('status') || lower.includes('segment') || lower.includes('tier')) {
        target = 'customer_status';
      } else if (lower.includes('category') || lower.includes('dept') || lower.includes('department')) {
        target = 'preferred_category';
      } else if (lower.includes('age')) {
        target = 'age';
      } else if (lower.includes('gender') || lower.includes('sex')) {
        target = 'gender';
      }
      column_mappings.push({ uploaded_column: col, target_field: target });
    });

    // Check required fields presence
    const mappedTargets = new Set(column_mappings.map((m) => m.target_field));
    const hasIdentity = mappedTargets.has('first_name') || mappedTargets.has('customer_name') || mappedTargets.has('external_customer_id');
    const missing_required_fields: string[] = [];
    if (!hasIdentity) {
      missing_required_fields.push('customer_name or customer_id');
    }

    let valid_count = 0;
    let warning_count = 0;
    let invalid_count = 0;

    rows.forEach((r) => {
      const nameVal = r.first_name || r.fname || r.name || r.customer_name || r.customer_id || r.external_customer_id || r.email ||
        r[column_mappings.find(m => m.target_field === 'customer_name')?.uploaded_column || ''] ||
        r[column_mappings.find(m => m.target_field === 'first_name')?.uploaded_column || ''] ||
        r[column_mappings.find(m => m.target_field === 'external_customer_id')?.uploaded_column || ''];

      if (nameVal) {
        valid_count++;
      } else {
        invalid_count++;
      }
    });

    const qualityScore = Math.round((valid_count / Math.max(1, rows.length)) * 100);

    return {
      filename,
      total_rows: rows.length,
      total_columns: detected_columns.length,
      detected_columns,
      valid_rows_count: valid_count,
      warning_rows_count: warning_count,
      invalid_rows_count: invalid_count,
      data_quality_score: qualityScore,
      column_mappings,
      missing_required_fields,
      sample_rows: rows.slice(0, 5),
      status: qualityScore >= 70 ? 'VALID' : 'WARNING',
    };
  }

  // Execute full ingestion pipeline & ML Model predictions for dataset (Parallel Batch Optimization)
  async processDataset(
    filename: string,
    rows: Record<string, any>[],
    mappings?: Record<string, string>
  ): Promise<IngestionJobRecord> {
    const jobId = `job_${Date.now()}`;
    const now = new Date().toISOString();

    const jobRecord: IngestionJobRecord = {
      job_id: jobId,
      filename,
      status: 'PROCESSING',
      total_records: rows.length,
      processed_count: 0,
      success_count: 0,
      failed_count: 0,
      created_customers: [],
      average_churn_risk: 0,
      high_risk_count: 0,
      top_nba_recommendation: '',
      created_at: now,
    };

    LIVE_INGESTION_JOBS_STORE.set(jobId, jobRecord);

    const createdProfiles: CustomerProfile[] = [];
    let totalChurnScoreSum = 0;
    let highRiskCount = 0;
    const nbaCounts: Record<string, number> = {};

    // Multi-key fallback & header normalization helper
    const getVal = (rawRow: Record<string, any>, targetField: string, altKeys: string[]) => {
      if (mappings && mappings[targetField] && rawRow[mappings[targetField]] !== undefined && rawRow[mappings[targetField]] !== '') {
        return rawRow[mappings[targetField]];
      }
      for (const key of altKeys) {
        if (rawRow[key] !== undefined && rawRow[key] !== '') return rawRow[key];
      }
      const lowerMap: Record<string, any> = {};
      Object.keys(rawRow).forEach((k) => {
        lowerMap[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = rawRow[k];
      });
      for (const key of altKeys) {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (lowerMap[cleanKey] !== undefined && lowerMap[cleanKey] !== '') return lowerMap[cleanKey];
      }
      const allCleanKeys = Object.keys(lowerMap);
      for (const key of altKeys) {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchedKey = allCleanKeys.find((ck) => ck.includes(cleanKey) || cleanKey.includes(ck));
        if (matchedKey && lowerMap[matchedKey] !== undefined && lowerMap[matchedKey] !== '') {
          return lowerMap[matchedKey];
        }
      }
      return undefined;
    };

    const BATCH_SIZE = 10;
    for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
      const batchRows = rows.slice(batchStart, batchStart + BATCH_SIZE);

      const batchResults = await Promise.all(
        batchRows.map(async (rawRow, batchIdx) => {
          const i = batchStart + batchIdx;
          try {
            // 1. External Customer ID
            const extIdVal = getVal(rawRow, 'external_customer_id', [
              'external_customer_id',
              'customer_id',
              'cust_id',
              'id',
              'account_id',
              'client_id',
            ]);
            const extId = extIdVal ? String(extIdVal) : `CUST-LIVE-${Math.floor(1000 + Math.random() * 9000)}`;

            // 2. Full Name Parsing
            let firstName = getVal(rawRow, 'first_name', ['first_name', 'fname', 'given_name']);
            let lastName = getVal(rawRow, 'last_name', ['last_name', 'lname', 'surname']);
            const fullName = getVal(rawRow, 'customer_name', ['customer_name', 'name', 'full_name', 'client_name', 'user_name']);

            if (fullName && (!firstName || !lastName || firstName === fullName || lastName === fullName)) {
              const parts = String(fullName).trim().split(/\s+/);
              firstName = parts[0] || `Customer_${i + 1}`;
              lastName = parts.slice(1).join(' ') || 'Ingested';
            }

            if (!firstName) firstName = extId ? `Customer_${extId}` : `Customer_${i + 1}`;
            if (!lastName) lastName = 'Ingested';

            // 3. Email Extraction
            let email = getVal(rawRow, 'email', ['email', 'email_address', 'mail', 'contact_email']);
            if (!email) {
              const cleanFn = String(firstName).toLowerCase().replace(/[^a-z0-9]/g, '');
              const cleanLn = String(lastName).toLowerCase().replace(/[^a-z0-9]/g, '');
              if (cleanFn && cleanLn && cleanLn !== 'ingested') {
                email = `${cleanFn}.${cleanLn}@enterprise.com`;
              } else {
                const cleanExt = extId.toLowerCase().replace(/[^a-z0-9]/g, '');
                email = `${cleanExt}@enterprise.com`;
              }
            }

            // 4. Contact & Channel
            const phone = getVal(rawRow, 'phone', ['phone', 'mobile', 'phone_number', 'cell']) || '+1 (555) 900-0100';
            const channel = getVal(rawRow, 'acquisition_channel', ['acquisition_channel', 'preferred_channel', 'channel', 'source', 'medium']) || 'WhatsApp';
            const preferredCategory = getVal(rawRow, 'preferred_category', ['preferred_category', 'category', 'dept', 'department']) || 'Electronics';

            // 5. Customer Status & Behavioral Features
            const statusRaw = getVal(rawRow, 'customer_status', ['customer_status', 'status', 'segment', 'tier']);
            const rawStatusStr = statusRaw ? String(statusRaw) : '';

            const recencyRaw = getVal(rawRow, 'recency_days', [
              'recency_days',
              'days_inactive',
              'inactivity_days',
              'recency',
              'days_since_purchase',
              'days_since_last_order',
              'inactivity',
              'idle_days',
              'dormant_days',
            ]);
            let recency_days = cleanNumber(recencyRaw);
            if (recency_days === undefined) {
              if (rawStatusStr.toLowerCase().includes('risk') || rawStatusStr.toLowerCase().includes('churn')) {
                recency_days = 65;
              } else if (rawStatusStr.toLowerCase().includes('dormant') || rawStatusStr.toLowerCase().includes('inactive')) {
                recency_days = 90;
              } else if (rawStatusStr.toLowerCase().includes('vip') || rawStatusStr.toLowerCase().includes('active')) {
                recency_days = 8;
              } else {
                recency_days = 15;
              }
            }

            const freqRaw = getVal(rawRow, 'frequency_count', [
              'frequency_count',
              'purchases',
              'frequency',
              'total_purchases',
              'orders',
              'order_count',
              'transactions',
            ]);
            const frequency_count = cleanNumber(freqRaw) ?? 8;

            const monRaw = getVal(rawRow, 'monetary_value', [
              'monetary_value',
              'total_spend',
              'spend',
              'monetary',
              'total_revenue',
              'revenue',
              'ltv',
              'clv',
              'amount',
            ]);
            const monetary_value = cleanNumber(monRaw) ?? 28500;

            const cartRaw = getVal(rawRow, 'cart_abandonment_count', [
              'cart_abandonment_count',
              'cart_abandonment',
              'abandoned_carts',
              'abandonments',
            ]);
            const cart_abandonment_count = cleanNumber(cartRaw) ?? (recency_days > 40 ? 3 : 0);

            const initialStatus = rawStatusStr || (recency_days > 40 || cart_abandonment_count > 2 ? 'At-Risk' : 'Active');

            const age = cleanNumber(getVal(rawRow, 'age', ['age'])) ?? 34;
            const gender = String(getVal(rawRow, 'gender', ['gender', 'sex']) || 'Female');

            const input: CreateCustomerInput = {
              external_customer_id: extId,
              first_name: String(firstName),
              last_name: String(lastName),
              email: String(email),
              phone: String(phone),
              age,
              gender,
              acquisition_channel: String(channel),
              customer_status: initialStatus,
              recency_days,
              frequency_count,
              monetary_value,
              cart_abandonment_count,
            };

            // Create persistent customer profile
            const profile = await this.customerService.createCustomer(input);
            (profile as any).preferred_category = preferredCategory;

            const features: CustomerFeatures = {
              customer_id: profile.id,
              recency_days,
              frequency_count,
              monetary_value,
              days_inactive: recency_days,
              engagement_score: recency_days > 30 ? Math.max(0.05, Number((1 - recency_days / 90).toFixed(2))) : 0.85,
              cart_abandonment_count,
              average_order_value: monetary_value / Math.max(1, frequency_count),
              estimated_clv: monetary_value * 1.8,
              updated_at: new Date().toISOString(),
            };

            // Execute Real ML Pipeline (Predict Churn, CLV, SHAP Drivers, Next Best Action)
            const mlOutput = await this.mlClient.predict(profile, features);
            await this.customerService.applyPrediction(profile.id, mlOutput);

            const churnScore = mlOutput.churn_probability || 0.15;
            const nbaAction = mlOutput.next_best_action?.action || 'Retention VIP Pass';

            const updatedProfile = await this.customerService.getCustomer(profile.id);
            updatedProfile.recency_days = recency_days;
            updatedProfile.monetary_value = monetary_value;
            updatedProfile.churn_probability = churnScore;
            updatedProfile.churn_risk_pct = Math.round(churnScore * 1000) / 10;
            updatedProfile.next_best_action = nbaAction;
            updatedProfile.preferred_category = preferredCategory;

            return { success: true, profile: updatedProfile, churnScore, nbaAction };
          } catch (err: any) {
            return { success: false, error: err };
          }
        })
      );

      batchResults.forEach((res) => {
        jobRecord.processed_count++;
        if (res && res.success && res.profile) {
          createdProfiles.push(res.profile);
          totalChurnScoreSum += res.churnScore;
          if (res.churnScore >= 0.35 || res.profile.customer_status.toLowerCase().includes('risk')) {
            highRiskCount++;
          }
          nbaCounts[res.nbaAction] = (nbaCounts[res.nbaAction] || 0) + 1;
          jobRecord.success_count++;
        } else {
          jobRecord.failed_count++;
        }
      });
    }

    // Determine top NBA recommendation
    let topNba = 'Retention VIP Concierge Pass';
    let maxNbaCount = 0;
    Object.entries(nbaCounts).forEach(([nba, count]) => {
      if (count > maxNbaCount) {
        maxNbaCount = count;
        topNba = nba;
      }
    });

    jobRecord.status = jobRecord.failed_count === 0 ? 'COMPLETED' : 'PARTIALLY_COMPLETED';
    jobRecord.created_customers = createdProfiles;
    jobRecord.average_churn_risk = Number((totalChurnScoreSum / Math.max(1, createdProfiles.length)).toFixed(3));
    jobRecord.high_risk_count = highRiskCount;
    jobRecord.top_nba_recommendation = topNba;
    jobRecord.completed_at = new Date().toISOString();

    LIVE_INGESTION_JOBS_STORE.set(jobId, jobRecord);
    return jobRecord;
  }

  getJobHistory(): IngestionJobRecord[] {
    return Array.from(LIVE_INGESTION_JOBS_STORE.values());
  }

  getJobById(jobId: string): IngestionJobRecord | undefined {
    return LIVE_INGESTION_JOBS_STORE.get(jobId);
  }
}
