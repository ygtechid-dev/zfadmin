import { useState, useEffect } from 'react';
import {
  Plus, RefreshCw, Trash2, Edit2, Eye, X, Save, Loader2,
  CheckCircle, XCircle, Clock, MessageSquare, ChevronDown, ChevronUp, Copy
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { waApi } from '../../services/api';

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: string;
  text?: string;
  buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>;
  add_security_recommendation?: boolean;
  example?: { body_text?: string[][]; header_text?: string[] };
}

// Support both Cekat flat format & Meta components format
interface WaTemplate {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED';
  category: string;
  language: string;
  // Cekat flat fields
  body?: string;
  body_placeholder?: string[];
  header?: string;
  header_type?: string;
  footer?: string;
  wa_template_id?: string;
  inbox_id?: string;
  // Meta components format (optional)
  components?: TemplateComponent[];
}

interface Props {
  apiBaseUrl?: string;
}

const STATUS_CONFIG = {
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
  PENDING:  { label: 'Pending',  color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={12} /> },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700',    icon: <XCircle size={12} /> },
  PAUSED:   { label: 'Paused',   color: 'bg-gray-100 text-gray-600',  icon: <XCircle size={12} /> },
};

const CATEGORY_OPTIONS = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
const LANGUAGE_OPTIONS = [
  { value: 'id',    label: 'Bahasa Indonesia' },
  { value: 'en_US', label: 'English (US)' },
];

const emptyForm = {
  name: '',
  category: 'MARKETING',
  language: 'id',
  headerType: 'none' as 'none' | 'TEXT',
  headerText: '',
  bodyText: '',
  footerText: '',
  hasButton: false,
  buttons: [{ type: 'URL', text: '', url: '' }] as Array<{ type: string; text: string; url: string }>,
  bodyExamples: [] as string[],
  headerExample: '',
};

function detectVariables(text: string): number {
  const matches = text.match(/\{\{\d+\}\}/g);
  if (!matches) return 0;
  const nums = matches.map(m => parseInt(m.replace(/\D/g, '')));
  return Math.max(...nums);
}

// ─── Helper: ambil body text dari template (support Cekat & Meta format) ──────
function getBodyText(tpl: WaTemplate): string {
  if (tpl.body) return tpl.body;
  if (tpl.components) return tpl.components.find(c => c.type === 'BODY')?.text || '';
  return '';
}

// ─── Helper: ambil header text ────────────────────────────────────────────────
function getHeaderText(tpl: WaTemplate): string {
  if (tpl.header) return tpl.header;
  if (tpl.components) return tpl.components.find(c => c.type === 'HEADER')?.text || '';
  return '';
}

// ─── Helper: ambil footer text ────────────────────────────────────────────────
function getFooterText(tpl: WaTemplate): string {
  if (tpl.footer) return tpl.footer;
  if (tpl.components) return tpl.components.find(c => c.type === 'FOOTER')?.text || '';
  return '';
}

export default function WhatsAppTemplatesTab({ apiBaseUrl }: Props) {
  const [templates, setTemplates]           = useState<WaTemplate[]>([]);
  const [loading, setLoading]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [filterStatus, setFilterStatus]     = useState<string>('ALL');
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [showModal, setShowModal]           = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WaTemplate | null>(null);
  const [form, setForm]                     = useState({ ...emptyForm });
  const [previewMode, setPreviewMode]       = useState(false);
const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => { fetchTemplates(); }, []);

  useEffect(() => {
    const count = detectVariables(form.bodyText);
    setForm(prev => {
      const current = [...prev.bodyExamples];
      while (current.length < count) current.push('');
      return { ...prev, bodyExamples: current.slice(0, count) };
    });
  }, [form.bodyText]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await waApi.getTemplates();
      // Support { templates: [] } dan { data: [] } dan array langsung
      const list = res.templates || res.data || (Array.isArray(res) ? res : []);
      setTemplates(list);
    } catch (err) {
      toast.error('Gagal memuat template');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setForm({ ...emptyForm });
    setPreviewMode(false);
    setShowModal(true);
  };

  const openEditModal = (tpl: WaTemplate) => {
    setEditingTemplate(tpl);

    const bodyText = getBodyText(tpl);
    const count    = detectVariables(bodyText);

    // Coba ambil existing examples dari components (Meta format)
    const bodyComp        = tpl.components?.find(c => c.type === 'BODY');
    const existingExamples = bodyComp?.example?.body_text?.[0]
      || tpl.body_placeholder
      || [];
    const bodyExamples = Array.from({ length: count }, (_, i) => existingExamples[i] || '');

    const headerComp = tpl.components?.find(c => c.type === 'HEADER');
    const footerComp = tpl.components?.find(c => c.type === 'FOOTER');
    const btnsComp   = tpl.components?.find(c => c.type === 'BUTTONS');

    setForm({
      name:         tpl.name,
      category:     tpl.category,
      language:     tpl.language,
      headerType:   (tpl.header_type === 'TEXT' || headerComp?.format === 'TEXT') ? 'TEXT' : 'none',
      headerText:   getHeaderText(tpl),
      headerExample: headerComp?.example?.header_text?.[0] || '',
      bodyText,
      bodyExamples,
      footerText:   getFooterText(tpl),
      hasButton:    !!btnsComp,
      buttons:      btnsComp?.buttons?.map(b => ({
        type: b.type,
        text: b.text,
        url:  b.url || b.phone_number || ''
      })) || [{ type: 'URL', text: '', url: '' }],
    });
    setPreviewMode(false);
    setShowModal(true);
  };

  const buildComponents = (): TemplateComponent[] => {
    const comps: TemplateComponent[] = [];

    if (form.headerType === 'TEXT' && form.headerText) {
      const headerHasVar = detectVariables(form.headerText) > 0;
      comps.push({
        type: 'HEADER',
        format: 'TEXT',
        text: form.headerText,
        ...(headerHasVar && form.headerExample
          ? { example: { header_text: [form.headerExample] } }
          : {})
      });
    }

    if (form.bodyText) {
      const varCount = detectVariables(form.bodyText);
      comps.push({
        type: 'BODY',
        text: form.bodyText,
        ...(varCount > 0 ? {
          example: {
            body_text: [form.bodyExamples.slice(0, varCount).map((v, i) => v || `Contoh ${i + 1}`)]
          }
        } : {})
      });
    }

    if (form.footerText) {
      comps.push({ type: 'FOOTER', text: form.footerText });
    }

    if (form.hasButton && form.buttons.length > 0) {
      comps.push({
        type: 'BUTTONS',
        buttons: form.buttons.map(b => ({
          type: b.type,
          text: b.text,
          ...(b.type === 'URL'          && { url:          b.url }),
          ...(b.type === 'PHONE_NUMBER' && { phone_number: b.url }),
        }))
      });
    }

    return comps;
  };

  const renderPreviewText = (text: string, examples: string[]) =>
    text.replace(/\{\{(\d+)\}\}/g, (_, num) => examples[parseInt(num) - 1] || `{{${num}}}`);

  const handleSave = async () => {
    if (!form.name || !form.bodyText) {
      toast.error('Nama template dan body wajib diisi');
      return;
    }
    const varCount = detectVariables(form.bodyText);
    if (varCount > 0 && form.bodyExamples.slice(0, varCount).some(v => !v.trim())) {
      toast.error('Semua contoh nilai variabel wajib diisi');
      return;
    }

    try {
      setSaving(true);
      const components = buildComponents();
      if (editingTemplate) {
        await waApi.editTemplate(editingTemplate.id, components);
        toast.success('Template berhasil diperbarui');
      } else {
        await waApi.createTemplate({
          name:       form.name.toLowerCase().replace(/\s+/g, '_'),
          category:   form.category,
          language:   form.language,
          components,
        });
        toast.success('Template berhasil dibuat, menunggu approval Meta');
      }
      setShowModal(false);
      fetchTemplates();
    } catch (err: any) {
    const errMsg = err?.response?.data?.message 
    || err?.response?.data?.error 
    || err?.error?.message 
    || err?.message 
    || JSON.stringify(err?.response?.data || err) 
    || 'Gagal menyimpan template';
toast.error(errMsg);
console.error('Template save error:', err);
    } finally {
      setSaving(false);
    }
  };

 const handleDelete = async (id: string) => {
  try {
    await waApi.deleteTemplate(id);   // ← kirim id
    toast.success('Template berhasil dihapus');
    setDeleteConfirm(null);
    fetchTemplates();
  } catch (err: any) {
    toast.error(err?.message || 'Gagal menghapus template');
  }
};

  const filtered = filterStatus === 'ALL'
    ? templates
    : templates.filter(t => t.status === filterStatus);

  const bodyVarCount   = detectVariables(form.bodyText);
  const headerVarCount = detectVariables(form.headerText);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Template WhatsApp</h3>
              <p className="text-sm text-gray-500">Kelola template pesan untuk notifikasi otomatis.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTemplates}
              disabled={loading}
              className="p-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-all"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 text-sm"
            >
              <Plus size={18} />
              Buat Template
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mt-6 flex-wrap">
          {['ALL', 'APPROVED', 'PENDING', 'REJECTED'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                filterStatus === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {s === 'ALL' ? 'Semua' : s} ({s === 'ALL' ? templates.length : templates.filter(t => t.status === s).length})
            </button>
          ))}
        </div>
      </div>

      {/* Template List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center">
          <Loader2 size={32} className="animate-spin mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium">Memuat template...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center">
          <MessageSquare size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">Belum ada template</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(tpl => {
            const statusCfg = STATUS_CONFIG[tpl.status] || STATUS_CONFIG.PENDING;
            const isExpanded = expandedId === tpl.id;
            const bodyText   = getBodyText(tpl);
            const headerText = getHeaderText(tpl);
            const footerText = getFooterText(tpl);
            const bodyPlaceholders = tpl.body_placeholder
              || tpl.components?.find(c => c.type === 'BODY')?.example?.body_text?.[0]
              || [];

            return (
              <div key={tpl.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 flex items-center gap-4">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                    className="flex-1 flex items-center gap-4 text-left min-w-0"
                  >
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shrink-0">
                      <MessageSquare size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 font-mono text-sm">{tpl.name}</span>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusCfg.color}`}>
                          {statusCfg.icon} {statusCfg.label}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold">
                          {tpl.category}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full text-[10px] font-bold">
                          {tpl.language}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {bodyText.substring(0, 80)}{bodyText.length > 80 ? '...' : ''}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    {tpl.status === 'APPROVED' && (
                      <button
                        onClick={() => openEditModal(tpl)}
                        className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                      >
                        <Edit2 size={15} />
                      </button>
                    )}
                    <button
onClick={() => setDeleteConfirm({ id: tpl.wa_template_id ?? tpl.id, name: tpl.name })}

                      className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                      className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-all"
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Preview */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 bg-gray-50/50 animate-in slide-in-from-top-2 duration-200">
                    <div className="max-w-sm mx-auto bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                      <div className="bg-[#075E54] px-4 py-2.5 flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                          <MessageSquare size={14} className="text-white" />
                        </div>
                        <span className="text-white font-bold text-sm">WhatsApp Business</span>
                      </div>

                      <div className="p-4 space-y-2 bg-[#ECE5DD]">
                        <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-sm space-y-2 max-w-[90%]">
                          {/* Header */}
                          {headerText && (
                            <p className="font-bold text-sm text-gray-900">{headerText}</p>
                          )}
                          {/* Body */}
                          {bodyText && (
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {renderPreviewText(bodyText, bodyPlaceholders)}
                            </p>
                          )}
                          {/* Footer */}
                          {footerText && (
                            <p className="text-[10px] text-gray-400">{footerText}</p>
                          )}
                          {/* Buttons dari components (Meta format) */}
                          {tpl.components?.find(c => c.type === 'BUTTONS')?.buttons?.map((btn, bi) => (
                            <div key={bi} className="border-t border-gray-100 pt-2 text-center py-1.5 text-xs font-bold text-blue-500 border border-blue-100 rounded-lg mt-1">
                              {btn.text}
                            </div>
                          ))}
                          <p className="text-[9px] text-gray-300 text-right">12:00 ✓✓</p>
                        </div>
                      </div>

                      {/* JSON debug collapsible */}
                      <details className="border-t border-gray-100">
                        <summary className="px-4 py-2 text-[10px] font-bold text-gray-400 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
                          <Copy size={10} /> Lihat Data Mentah
                        </summary>
                        <pre className="px-4 pb-4 text-[9px] text-gray-500 overflow-x-auto leading-relaxed">
                          {JSON.stringify(tpl, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">

            <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {editingTemplate ? 'Edit Template' : 'Buat Template Baru'}
                </h3>
                <p className="text-xs text-green-600 font-bold uppercase tracking-widest mt-1">
                  {editingTemplate ? `ID: ${editingTemplate.id}` : 'Harus di-approve Meta terlebih dahulu'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${previewMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <Eye size={14} /> Preview
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {previewMode ? (
                <div className="p-8 flex justify-center">
                  <div className="w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <MessageSquare size={14} className="text-white" />
                      </div>
                      <span className="text-white font-bold text-sm">WhatsApp Business</span>
                    </div>
                    <div className="p-4 bg-[#ECE5DD]">
                      <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-sm space-y-2 max-w-[90%]">
                        {form.headerType === 'TEXT' && form.headerText && (
                          <p className="font-bold text-sm text-gray-900">
                            {renderPreviewText(form.headerText, [form.headerExample])}
                          </p>
                        )}
                        {form.bodyText && (
                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {renderPreviewText(form.bodyText, form.bodyExamples)}
                          </p>
                        )}
                        {form.footerText && (
                          <p className="text-[10px] text-gray-400">{form.footerText}</p>
                        )}
                        {form.hasButton && form.buttons.map((btn, i) => (
                          <div key={i} className="border-t border-gray-100 pt-2 text-center text-xs font-bold text-blue-500">
                            {btn.text || 'Button Text'}
                          </div>
                        ))}
                        <p className="text-[9px] text-gray-300 text-right">12:00 ✓✓</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 space-y-6">
                  {!editingTemplate && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nama Template</label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 font-mono text-sm"
                          placeholder="nama_template"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Huruf kecil, angka, underscore</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Kategori</label>
                        <select
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-green-500 font-bold text-sm"
                        >
                          {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bahasa</label>
                        <select
                          value={form.language}
                          onChange={(e) => setForm({ ...form, language: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-green-500 font-bold text-sm"
                        >
                          {LANGUAGE_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Header */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Header (Opsional)</label>
                    <div className="flex gap-2 mb-3">
                      {(['none', 'TEXT'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setForm({ ...form, headerType: t })}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${form.headerType === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {t === 'none' ? 'Tidak Ada' : 'Teks'}
                        </button>
                      ))}
                    </div>
                    {form.headerType === 'TEXT' && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={form.headerText}
                          onChange={(e) => setForm({ ...form, headerText: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 text-sm font-bold"
                          placeholder="Judul pesan, bisa pakai {{1}}"
                        />
                        {headerVarCount > 0 && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2">Contoh Nilai Header (Wajib)</p>
                            <input
                              type="text"
                              value={form.headerExample}
                              onChange={(e) => setForm({ ...form, headerExample: e.target.value })}
                              placeholder="Contoh nilai untuk {{1}} di header"
                              className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs outline-none focus:border-amber-400"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Body *</label>
                      <span className="text-[10px] text-gray-400 font-bold">Gunakan {`{{1}}`} {`{{2}}`} dst untuk variabel</span>
                    </div>
                    <textarea
                      rows={5}
                      value={form.bodyText}
                      onChange={(e) => setForm({ ...form, bodyText: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 text-sm resize-none leading-relaxed"
                      placeholder={"Halo {{1}},\n\nAnda mendapatkan booking baru!\n\nPelanggan: {{2}}\nLayanan: {{3}}"}
                    />
                    {bodyVarCount > 0 && (
                      <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Contoh Nilai Variabel (Wajib diisi)</span>
                          <span className="text-[9px] text-amber-500 font-medium">— diperlukan Meta untuk review template</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {Array.from({ length: bodyVarCount }, (_, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-xs font-bold text-amber-600 font-mono w-8 shrink-0">{`{{${i + 1}}}`}</span>
                              <input
                                type="text"
                                value={form.bodyExamples[i] || ''}
                                onChange={(e) => {
                                  const updated = [...form.bodyExamples];
                                  updated[i] = e.target.value;
                                  setForm({ ...form, bodyExamples: updated });
                                }}
                                placeholder={`Contoh nilai untuk {{${i + 1}}}`}
                                className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs outline-none focus:border-amber-400 transition-all"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Footer (Opsional)</label>
                    <input
                      type="text"
                      value={form.footerText}
                      onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 text-sm"
                      placeholder="Teks kecil di bawah pesan"
                    />
                  </div>

                  {/* Buttons */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Tombol (Opsional)</label>
                      <button
                        onClick={() => setForm({ ...form, hasButton: !form.hasButton })}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${form.hasButton ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {form.hasButton ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </div>
                    {form.hasButton && (
                      <div className="space-y-3">
                        {form.buttons.map((btn, i) => (
                          <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                            <select
                              value={btn.type}
                              onChange={(e) => {
                                const newBtns = [...form.buttons];
                                newBtns[i] = { ...newBtns[i], type: e.target.value };
                                setForm({ ...form, buttons: newBtns });
                              }}
                              className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold bg-white outline-none"
                            >
                              <option value="URL">URL</option>
                              <option value="PHONE_NUMBER">Phone</option>
                              <option value="QUICK_REPLY">Quick Reply</option>
                            </select>
                            <input
                              type="text"
                              value={btn.text}
                              onChange={(e) => {
                                const newBtns = [...form.buttons];
                                newBtns[i] = { ...newBtns[i], text: e.target.value };
                                setForm({ ...form, buttons: newBtns });
                              }}
                              placeholder="Teks tombol"
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white outline-none"
                            />
                            {(btn.type === 'URL' || btn.type === 'PHONE_NUMBER') && (
                              <input
                                type="text"
                                value={btn.url}
                                onChange={(e) => {
                                  const newBtns = [...form.buttons];
                                  newBtns[i] = { ...newBtns[i], url: e.target.value };
                                  setForm({ ...form, buttons: newBtns });
                                }}
                                placeholder={btn.type === 'URL' ? 'https://...' : '+62...'}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white outline-none"
                              />
                            )}
                            {form.buttons.length > 1 && (
                              <button
                                onClick={() => setForm({ ...form, buttons: form.buttons.filter((_, bi) => bi !== i) })}
                                className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                        {form.buttons.length < 3 && (
                          <button
                            onClick={() => setForm({ ...form, buttons: [...form.buttons, { type: 'URL', text: '', url: '' }] })}
                            className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:border-green-400 hover:text-green-600 transition-all w-full justify-center"
                          >
                            <Plus size={14} /> Tambah Tombol
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {editingTemplate && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-sm text-amber-800">
                      <span className="shrink-0">⚠️</span>
                      <p>Edit template hanya bisa mengubah <strong>body</strong>. Nama & kategori tidak dapat diubah setelah dibuat.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-8 border-t border-gray-100 flex gap-4 shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all"
              >
                BATAL
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-6 py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {saving ? 'Menyimpan...' : editingTemplate ? 'UPDATE TEMPLATE' : 'BUAT TEMPLATE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
    {deleteConfirm && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-4">
        <Trash2 size={28} />
      </div>
      <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Hapus Template?</h3>
      <p className="text-center text-gray-500 text-sm mb-6">
        Template <strong className="font-mono">{deleteConfirm.name}</strong> akan dihapus permanen.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => setDeleteConfirm(null)}
          className="flex-1 py-3 border-2 border-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
        >
          Batal
        </button>
        <button
          onClick={() => handleDelete(deleteConfirm.id)}
          className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all"
        >
          Ya, Hapus
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}