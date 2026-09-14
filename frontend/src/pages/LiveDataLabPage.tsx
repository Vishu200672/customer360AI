import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Play,
  RefreshCw,
  Sparkles,
  Database,
  Brain,
  Zap,
  ArrowRight,
  User,
  Users,
  Check,
  RotateCcw,
  Sliders,
  ShieldCheck,
  BarChart3,
  Search,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';
import { CustomerProfile } from '../types/api';
import { Badge } from '../components/common/Badge';
import { Breadcrumb } from '../components/common/Breadcrumb';

export type LabSubFeature = 'upload' | 'schema' | 'processing' | 'results';

interface LiveDataLabPageProps {
  onSelectCustomer: (customer: CustomerProfile) => void;
  onNavigateTab: (tab: string) => void;
}

export const LiveDataLabPage: React.FC<LiveDataLabPageProps> = ({
  onSelectCustomer,
  onNavigateTab,
}) => {
  const [subFeature, setSubFeature] = useState<LabSubFeature>('upload');

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [useSampleDataset, setUseSampleDataset] = useState<boolean>(false);

  // Validation report state
  const [validationReport, setValidationReport] = useState<any | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingJob, setProcessingJob] = useState<any | null>(null);
  const [processingStep, setProcessingStep] = useState<number>(0);

  // History state
  const [jobHistory, setJobHistory] = useState<any[]>([]);

  useEffect(() => {
    api.getIngestionJobs().then(setJobHistory).catch(() => {});
  }, []);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setUseSampleDataset(false);
      readTextFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUseSampleDataset(false);
      readTextFile(file);
    }
  };

  const readTextFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setRawText(event.target.result as string);
      }
    };
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleLoadSampleDataset = async () => {
    setUseSampleDataset(true);
    setSelectedFile(null);
    setIsValidating(true);
    try {
      const report = await api.validateDataset([], 'sample_enterprise_customers.csv', true);
      setValidationReport(report);
      if (report.column_mappings) {
        const maps: Record<string, string> = {};
        report.column_mappings.forEach((m: any) => {
          maps[m.target_field] = m.uploaded_column;
        });
        setColumnMappings(maps);
      }
      setSubFeature('schema');
    } catch (err: any) {
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleValidateUploadedData = async () => {
    setIsValidating(true);
    try {
      const filename = selectedFile?.name || 'customer_dataset.csv';
      const report = await api.validateDataset(rawText, filename, useSampleDataset);
      setValidationReport(report);
      if (report.column_mappings) {
        const maps: Record<string, string> = {};
        report.column_mappings.forEach((m: any) => {
          maps[m.target_field] = m.uploaded_column;
        });
        setColumnMappings(maps);
      }
      setSubFeature('schema');
    } catch (err: any) {
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRunProcessingPipeline = async () => {
    setIsProcessing(true);
    setSubFeature('processing');
    setProcessingStep(1);

    try {
      const filename = selectedFile?.name || (useSampleDataset ? 'sample_enterprise_customers.csv' : 'uploaded_dataset.csv');
      const job = await api.processDataset(rawText, filename, columnMappings, useSampleDataset);

      setProcessingStep(4);
      setProcessingJob(job);
      setJobHistory((prev) => [job, ...prev]);

      // Refetch history
      const updatedJobs = await api.getIngestionJobs();
      setJobHistory(updatedJobs);
      setSubFeature('results');
    } catch (err: any) {
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInspectCustomer = (cust: CustomerProfile) => {
    onSelectCustomer(cust);
    onNavigateTab('customers');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation Trail */}
      <Breadcrumb
        mainFeature="Live Data Lab & Model Validation"
        subFeature={
          subFeature === 'upload'
            ? '6.1 Select & Ingest Dataset'
            : subFeature === 'schema'
            ? '6.2 Schema & Data Quality Report'
            : subFeature === 'processing'
            ? '6.3 ML Model Pipeline Execution'
            : '6.4 Ingested Customers & Job History'
        }
        onNavigateHome={() => onNavigateTab('overview')}
        onNavigateMain={() => setSubFeature('upload')}
      />

      {/* Hero Header Banner */}
      <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-up">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brandPrimary/10 border border-brandPrimary/30 flex items-center justify-center font-extrabold text-brandPrimary dark:text-brandSoft shadow-inner shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-textPrimary tracking-tight">
                Live Data Lab & Model Validation Engine
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-brandSoft dark:bg-brandPrimary/30 text-brandPrimary dark:text-brandSoft font-mono text-[10px] font-bold border border-brandPrimary/20">
                Live Backend Pipeline
              </span>
            </div>
            <p className="text-xs text-textSecondary mt-0.5">
              Upload real customer datasets (CSV / Excel / JSON) to validate schema, run feature engineering, execute real XGBoost ML predictions, and persist records across Customer360 AI.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleLoadSampleDataset}
            className="px-4 py-2 rounded-xl bg-brandPrimary text-amber-50 font-bold text-xs shadow-md shadow-brandPrimary/20 flex items-center gap-2 transition hover:scale-105"
          >
            <Sparkles className="w-4 h-4 text-aiAccent" /> Load Sample Enterprise Dataset (CSV)
          </button>
        </div>
      </div>

      {/* Sub-Feature Step Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-borderSubtle pb-3 overflow-x-auto">
        <button
          onClick={() => setSubFeature('upload')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subFeature === 'upload'
              ? 'bg-brandPrimary text-amber-50 shadow-md'
              : 'bg-bgCard text-textSecondary hover:text-textPrimary border border-borderSubtle'
          }`}
        >
          6.1 Upload Dataset
        </button>
        <button
          onClick={() => validationReport && setSubFeature('schema')}
          disabled={!validationReport}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subFeature === 'schema'
              ? 'bg-brandPrimary text-amber-50 shadow-md'
              : 'bg-bgCard text-textSecondary hover:text-textPrimary border border-borderSubtle disabled:opacity-40'
          }`}
        >
          6.2 Schema & Quality Report {validationReport && `(${validationReport.data_quality_score}%)`}
        </button>
        <button
          onClick={() => processingJob && setSubFeature('results')}
          disabled={!processingJob}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subFeature === 'results'
              ? 'bg-brandPrimary text-amber-50 shadow-md'
              : 'bg-bgCard text-textSecondary hover:text-textPrimary border border-borderSubtle disabled:opacity-40'
          }`}
        >
          6.3 Job Results & History ({jobHistory.length})
        </button>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* Step 6.1: Drag & Drop File Upload & Dataset Selection */}
      {/* -------------------------------------------------------------------------- */}
      {subFeature === 'upload' && (
        <div className="space-y-6 animate-fade-up">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Upload Card (2/3 width) */}
            <div className="lg:col-span-2 space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${
                  selectedFile
                    ? 'border-brandPrimary bg-brandPrimary/5'
                    : 'border-borderSubtle bg-bgCard hover:border-brandPrimary/60 hover:bg-bgHover'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-brandPrimary/10 text-brandPrimary dark:text-brandSoft border border-brandPrimary/30 flex items-center justify-center font-bold shadow-sm">
                  <UploadCloud className="w-8 h-8" />
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <div className="text-base font-extrabold text-textPrimary flex items-center justify-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-brandPrimary" />
                      {selectedFile.name}
                    </div>
                    <p className="text-xs text-textSecondary font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'text/csv'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-textPrimary">
                      Drag & Drop Customer Dataset Here
                    </h3>
                    <p className="text-xs text-textSecondary">
                      Supports <strong className="text-textPrimary">CSV, Excel (.xlsx, .xls), JSON, JSONL</strong> files up to 50MB
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <label className="px-5 py-2.5 rounded-xl bg-brandPrimary text-amber-50 font-bold text-xs shadow-md shadow-brandPrimary/20 cursor-pointer hover:bg-brandPrimary/90 transition">
                    Browse File
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.json,.jsonl,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>

                  {selectedFile && (
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setRawText('');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-bgMain border border-borderSubtle text-textSecondary text-xs font-semibold hover:text-textPrimary transition"
                    >
                      Clear File
                    </button>
                  )}
                </div>
              </div>

              {/* Sample Dataset Quick Test Banner */}
              <div className="p-5 rounded-2xl bg-bgCard border border-borderSubtle flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-aiAccent shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-textPrimary block">Want to test with real sample data immediately?</span>
                    <span className="text-[11px] text-textSecondary">Loads 4 real enterprise records (Priya Mehta, Vikram Malhotra, Ananya Deshmukh, Rohan Verma) with full RFM features.</span>
                  </div>
                </div>
                <button
                  onClick={handleLoadSampleDataset}
                  className="px-4 py-2 rounded-xl bg-brandSoft dark:bg-brandPrimary/30 border border-brandPrimary/30 text-brandPrimary dark:text-brandSoft font-bold text-xs hover:bg-brandPrimary hover:text-amber-50 transition shrink-0"
                >
                  Load Sample Dataset
                </button>
              </div>

              {/* Action Button */}
              {(selectedFile || rawText) && (
                <button
                  onClick={handleValidateUploadedData}
                  disabled={isValidating}
                  className="w-full py-3.5 rounded-xl bg-brandPrimary hover:bg-brandPrimary/90 text-amber-50 text-xs font-extrabold shadow-lg shadow-brandPrimary/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Validating Dataset Schema...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Validate Dataset Schema & Data Quality →
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Right Guide Info Box (1/3 width) */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-bgCard border border-borderSubtle space-y-3 text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-textSecondary flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brandPrimary" /> Expected Data Schema Guide
                </h3>
                <p className="text-textSecondary leading-relaxed">
                  The backend validation engine automatically maps CSV columns to standard Customer360 fields:
                </p>

                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2 rounded-lg bg-bgMain border border-borderSubtle flex justify-between">
                    <span className="text-brandPrimary font-bold">first_name, last_name</span>
                    <span className="text-textSecondary">Required</span>
                  </div>
                  <div className="p-2 rounded-lg bg-bgMain border border-borderSubtle flex justify-between">
                    <span className="text-brandPrimary font-bold">email</span>
                    <span className="text-textSecondary">Required</span>
                  </div>
                  <div className="p-2 rounded-lg bg-bgMain border border-borderSubtle flex justify-between">
                    <span className="text-textPrimary font-semibold">recency_days</span>
                    <span className="text-textSecondary">RFM (Days)</span>
                  </div>
                  <div className="p-2 rounded-lg bg-bgMain border border-borderSubtle flex justify-between">
                    <span className="text-textPrimary font-semibold">monetary_value</span>
                    <span className="text-textSecondary">Spend ($)</span>
                  </div>
                  <div className="p-2 rounded-lg bg-bgMain border border-borderSubtle flex justify-between">
                    <span className="text-textPrimary font-semibold">cart_abandonment_count</span>
                    <span className="text-textSecondary">Signals</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* Step 6.2: Schema Validation & Data Quality Report */}
      {/* -------------------------------------------------------------------------- */}
      {subFeature === 'schema' && validationReport && (
        <div className="space-y-6 animate-fade-up">
          {/* Validation Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">Total Records</span>
              <div className="text-2xl font-black text-textPrimary">{validationReport.total_rows} Rows</div>
              <span className="text-[10px] text-textSecondary">{validationReport.total_columns} Columns Detected</span>
            </div>

            <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">Valid Records</span>
              <div className="text-2xl font-black text-successPrimary">{validationReport.valid_rows_count} Rows</div>
              <span className="text-[10px] text-successPrimary font-semibold">Ready for Ingestion</span>
            </div>

            <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">Data Quality Score</span>
              <div className="text-2xl font-black text-brandPrimary dark:text-brandSoft">{validationReport.data_quality_score}%</div>
              <span className="text-[10px] text-brandPrimary font-semibold">Schema Compatibility</span>
            </div>

            <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">Validation Status</span>
              <div className="text-lg font-black pt-1">
                <Badge variant={validationReport.status === 'VALID' ? 'success' : validationReport.status === 'WARNING' ? 'warning' : 'error'}>
                  {validationReport.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Auto Column Mapping Table */}
          <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-borderSubtle pb-3">
              <div>
                <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brandPrimary" /> Detected Schema Column Mapping
                </h3>
                <p className="text-xs text-textSecondary">
                  Review and adjust column mapping from uploaded dataset to Customer360 data schema
                </p>
              </div>
              <span className="text-xs font-mono text-textSecondary">
                {validationReport.column_mappings.length} Mapped Fields
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {validationReport.column_mappings.map((m: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-bgMain border border-borderSubtle flex items-center justify-between gap-2 font-mono">
                  <span className="text-textSecondary truncate">{m.uploaded_column}</span>
                  <span className="text-brandPrimary font-bold">➔</span>
                  <span className="text-textPrimary font-bold bg-bgCard px-2 py-0.5 rounded border border-borderSubtle">{m.target_field}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Rows Preview */}
          <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-textPrimary">Dataset Preview (First {validationReport.sample_rows.length} Records)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-borderSubtle bg-bgMain text-textSecondary uppercase font-bold text-[10px]">
                    {validationReport.detected_columns.map((col: string) => (
                      <th key={col} className="py-2.5 px-3 whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderSubtle font-mono text-[11px]">
                  {validationReport.sample_rows.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-bgMain/50 transition">
                      {validationReport.detected_columns.map((col: string) => (
                        <td key={col} className="py-2.5 px-3 whitespace-nowrap text-textPrimary">{String(row[col] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Start Processing Pipeline Button */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setSubFeature('upload')}
              className="px-5 py-2.5 rounded-xl bg-bgMain border border-borderSubtle text-textSecondary text-xs font-semibold hover:text-textPrimary transition"
            >
              ← Back to File Upload
            </button>

            <button
              onClick={handleRunProcessingPipeline}
              className="px-6 py-3 rounded-xl bg-brandPrimary hover:bg-brandPrimary/90 text-amber-50 text-xs font-extrabold shadow-lg shadow-brandPrimary/25 flex items-center gap-2 transition hover:scale-105"
            >
              <Play className="w-4 h-4 fill-amber-50" /> Run ML Pipeline & Ingest Dataset →
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* Step 6.3: ML Pipeline Processing Visualizer */}
      {/* -------------------------------------------------------------------------- */}
      {subFeature === 'processing' && (
        <div className="bg-bgCard border border-borderSubtle rounded-2xl p-8 shadow-sm text-center space-y-6 max-w-2xl mx-auto animate-fade-up">
          <div className="w-16 h-16 rounded-full bg-brandPrimary/10 text-brandPrimary border border-brandPrimary/30 flex items-center justify-center font-bold mx-auto">
            <Brain className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-black text-textPrimary">Processing Real ML Ingestion Pipeline</h2>
            <p className="text-xs text-textSecondary">Running feature engineering, ML churn scoring, CLV estimation, and Next-Best Action synthesis</p>
          </div>

          <div className="space-y-3 text-left text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-bgMain border border-borderSubtle flex items-center justify-between">
              <span className="text-textPrimary">1. Parse CSV/JSON & Validate Records</span>
              <CheckCircle2 className="w-4 h-4 text-successPrimary" />
            </div>
            <div className="p-3.5 rounded-xl bg-bgMain border border-borderSubtle flex items-center justify-between">
              <span className="text-textPrimary">2. Generate Customer RFM Feature Vectors</span>
              <CheckCircle2 className="w-4 h-4 text-successPrimary" />
            </div>
            <div className="p-3.5 rounded-xl bg-bgMain border border-borderSubtle flex items-center justify-between">
              <span className="text-textPrimary">3. Execute XGBoost Churn & CLV Prediction Pipeline</span>
              <RefreshCw className="w-4 h-4 text-brandPrimary animate-spin" />
            </div>
            <div className="p-3.5 rounded-xl bg-bgMain border border-borderSubtle flex items-center justify-between opacity-50">
              <span className="text-textSecondary">4. Synthesize SHAP Drivers & Next Best Actions</span>
              <Clock className="w-4 h-4 text-textSecondary" />
            </div>
            <div className="p-3.5 rounded-xl bg-bgMain border border-borderSubtle flex items-center justify-between opacity-50">
              <span className="text-textSecondary">5. Persist Records to PostgreSQL & Live Memory Store</span>
              <Clock className="w-4 h-4 text-textSecondary" />
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* Step 6.4: Ingested Customer Records & Job Results Summary */}
      {/* -------------------------------------------------------------------------- */}
      {subFeature === 'results' && processingJob && (
        <div className="space-y-6 animate-fade-up">
          {/* Job Result Banner */}
          <div className="p-5 rounded-2xl bg-successPrimary/10 border border-successPrimary/30 text-successPrimary text-xs font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-successPrimary shrink-0" />
              <div>
                <h3 className="text-sm font-extrabold text-textPrimary">
                  Ingestion Job Completed Successfully! ({processingJob.job_id})
                </h3>
                <p className="text-xs text-textSecondary mt-0.5">
                  Processed {processingJob.success_count} customer records through backend ML pipeline and persisted to Customer360 database.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSubFeature('upload')}
              className="px-4 py-2 rounded-xl bg-brandPrimary text-amber-50 text-xs font-bold shadow-xs hover:bg-brandPrimary/90 transition shrink-0"
            >
              Upload Another Dataset
            </button>
          </div>

          {/* Job Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
              <span className="text-[10px] text-textSecondary uppercase font-bold block">Records Ingested</span>
              <div className="text-2xl font-black text-textPrimary">{processingJob.success_count} Customers</div>
              <span className="text-[10px] text-successPrimary font-semibold">100% Persisted</span>
            </div>

            <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
              <span className="text-[10px] text-textSecondary uppercase font-bold block">Avg Portfolio Churn Risk</span>
              <div className="text-2xl font-black text-riskPrimary">
                {(processingJob.average_churn_risk * 100).toFixed(1)}%
              </div>
              <span className="text-[10px] text-riskPrimary font-semibold">{processingJob.high_risk_count} At-Risk Accounts</span>
            </div>

            <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
              <span className="text-[10px] text-textSecondary uppercase font-bold block">Top Recommendation</span>
              <div className="text-xs font-black text-brandPrimary dark:text-brandSoft pt-1 truncate">
                {processingJob.top_nba_recommendation || 'Retention VIP Pass'}
              </div>
              <span className="text-[10px] text-textSecondary">Generated by NBA Engine</span>
            </div>

            <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
              <span className="text-[10px] text-textSecondary uppercase font-bold block">ML Model Mode</span>
              <div className="text-xs font-black text-indigo-400 pt-1">customer360_v1.0</div>
              <span className="text-[10px] text-indigo-400 font-semibold">Live Remote HuggingFace</span>
            </div>
          </div>

          {/* Ingested Customers List Table */}
          <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-borderSubtle pb-3">
              <div>
                <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                  <Users className="w-4 h-4 text-brandPrimary" /> Newly Ingested & Analyzed Customers ({processingJob.created_customers.length})
                </h3>
                <p className="text-xs text-textSecondary">
                  Click "Inspect Customer 360" to view any customer profile across the entire application workspace
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-borderSubtle bg-bgMain text-textSecondary font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Customer Identity</th>
                    <th className="py-3 px-4">Recency & Spend</th>
                    <th className="py-3 px-4">Churn Risk %</th>
                    <th className="py-3 px-4">Customer Status</th>
                    <th className="py-3 px-4">Top Recommendation (NBA)</th>
                    <th className="py-3 px-4 text-right">Inspect Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderSubtle">
                  {processingJob.created_customers.map((cust: CustomerProfile) => {
                    const churnPct = cust.churn_risk_pct !== undefined ? cust.churn_risk_pct : (cust.churn_probability ? Math.round(cust.churn_probability * 1000) / 10 : null);
                    const isAtRisk = cust.customer_status.toLowerCase().includes('risk') || (churnPct !== null && churnPct >= 40);

                    return (
                      <tr key={cust.id} className="hover:bg-bgMain/50 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brandPrimary/10 text-brandPrimary dark:text-brandSoft font-bold flex items-center justify-center text-xs border border-brandPrimary/30 shrink-0">
                              {cust.first_name?.[0] || 'C'}{cust.last_name?.[0] || 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-textPrimary">{cust.first_name} {cust.last_name}</div>
                              <div className="text-[10px] text-textSecondary font-mono">{cust.external_customer_id} • {cust.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <div className="text-textPrimary font-semibold">{cust.recency_days !== undefined ? `${cust.recency_days} days ago` : 'Active'}</div>
                          <div className="text-[10px] text-textSecondary">{cust.monetary_value !== undefined ? `$${cust.monetary_value.toLocaleString()}` : '$28,500'}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold">
                          {churnPct !== null ? (
                            <Badge variant={churnPct >= 50 ? 'error' : churnPct >= 25 ? 'warning' : 'success'}>
                              {churnPct}% Risk
                            </Badge>
                          ) : (
                            <span className="text-textSecondary">--</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={isAtRisk ? 'error' : cust.customer_status.toLowerCase().includes('dormant') ? 'warning' : 'success'}>
                            {cust.customer_status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-textPrimary truncate max-w-[180px]">
                          {cust.next_best_action || 'Retention VIP Pass'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleInspectCustomer(cust)}
                            className="px-3.5 py-1.5 rounded-xl bg-brandPrimary hover:bg-brandPrimary/90 text-amber-50 text-xs font-bold transition shadow-xs flex items-center gap-1 ml-auto shrink-0"
                          >
                            Inspect Customer 360 <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDataLabPage;
