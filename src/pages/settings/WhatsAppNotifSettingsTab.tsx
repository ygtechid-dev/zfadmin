import { useState, useEffect } from 'react';
import {
  Save, Loader2, ChevronDown, ChevronUp,
  MessageSquare, RefreshCw, AlertCircle, CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { waApi } from '../../services/api';
import { Toggle } from '../../components/common';

const SYSTEM_VARS = [
  { key: 'therapist_name', label: 'Nama Terapis' },
  { key: 'customer_name',  label: 'Nama Pelanggan' },
  { key: 'service_name',   label: 'Nama Layanan' },
  { key: 'booking_date',   label: 'Tanggal Booking' },
  { key: 'booking_time',   label: 'Waktu Booking' },
  { key: 'branch_name',    label: 'Nama Cabang' },
  { key: 'booking_ref',    label: 'Booking Ref' },
  { key: 'refund_amount',  label: 'Nominal Refund' },
  { key: 'review_link',    label: 'Link Review' },
  { key: 'payment_link',   label: 'Link Pembayaran' },
];

const NOTIF_EVENTS = [
  {
    group: 'Staff',
    color: 'blue',
    events: [
      { key: 'staff_booking_new',  label: 'Booking Baru',  desc: 'Dikirim ke terapis saat ada booking baru' },
      { key: 'staff_reschedule',   label: 'Reschedule',    desc: 'Dikirim ke terapis saat booking dijadwal ulang' },
      { key: 'staff_cancellation', label: 'Cancellation',  desc: 'Dikirim ke terapis saat booking dibatalkan' },
    ]
  },
  {
    group: 'Customer',
    color: 'green',
    events: [
            { key: 'customer_register',     label: 'Pendaftaran Berhasil', desc: 'Dikirim ke pelanggan baru setelah registrasi berhasil' }, // ← tambah ini
      { key: 'customer_confirmation', label: 'Konfirmasi Booking', desc: 'Dikirim ke pelanggan saat booking dikonfirmasi' },
      { key: 'customer_reminder_h1',  label: 'Reminder H-1',       desc: 'Dikirim H-1 sebelum jadwal' },
      { key: 'customer_reminder_2h',  label: 'Reminder 2 Jam',     desc: 'Dikirim 2 jam sebelum jadwal' },
      { key: 'customer_reschedule',   label: 'Reschedule',         desc: 'Dikirim ke pelanggan saat jadwal diubah' },
      { key: 'customer_cancellation', label: 'Cancellation',       desc: 'Dikirim ke pelanggan saat booking dibatalkan' },
      { key: 'customer_review',       label: 'Review Request',     desc: 'Dikirim setelah booking selesai' },
      { key: 'customer_refund',       label: 'Refund',             desc: 'Dikirim ke pelanggan saat refund diproses' },
    ]
  }
];

interface EventSetting {
  template_name: string;
  template_id: string;
  mapping: string[];
  enabled: boolean;
}

// ─── Helper: ambil body text dari template (support Cekat flat & Meta components) ──
function extractBodyText(tpl: any): string {
  if (!tpl) return '';
  // Cekat format: field body langsung
  if (tpl.body) return tpl.body;
  // Meta format: components array
  if (Array.isArray(tpl.components)) {
    return tpl.components.find((c: any) => c.type === 'BODY')?.text || '';
  }
  return '';
}

// ─── Helper: hitung jumlah variabel {{n}} dari body text ──────────────────────
function countVariables(bodyText: string): number {
  const matches = bodyText.match(/\{\{\d+\}\}/g);
  if (!matches) return 0;
  return Math.max(...matches.map((m: string) => parseInt(m.replace(/\D/g, ''))));
}

export default function WhatsAppNotifSettingsTab() {
  const [templates, setTemplates]           = useState<any[]>([]);
  const [settings, setSettings]             = useState<Record<string, EventSetting>>({});
  const [loading, setLoading]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [expandedEvent, setExpandedEvent]   = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tplRes, settingsRes] = await Promise.all([
        waApi.getTemplates('APPROVED'),
        waApi.getNotifSettings(),
      ]);

      // Support berbagai format response
      const tplList = tplRes.templates || tplRes.data || (Array.isArray(tplRes) ? tplRes : []);
      setTemplates(tplList);

      // Init defaults untuk semua event
      const allEvents = NOTIF_EVENTS.flatMap(g => g.events);
      const defaults: Record<string, EventSetting> = {};
      allEvents.forEach(e => {
        defaults[e.key] = { template_name: '', template_id: '', mapping: [], enabled: true };
      });

      // Merge dengan data dari wrapper
      const fromDb = settingsRes.settings || {};
      const merged = { ...defaults };
      Object.keys(fromDb).forEach(k => {
        if (merged[k] !== undefined) {
          merged[k] = { ...merged[k], ...fromDb[k] };
        }
      });

      setSettings(merged);
    } catch (err) {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  // ─── Ambil body text dari template berdasarkan nama ─────────────────────────
  const getTemplateBody = (templateName: string): string => {
    if (!templateName) return '';
    const tpl = templates.find(t => t.name === templateName);
    return extractBodyText(tpl);
  };

  // ─── Hitung jumlah variabel dari template berdasarkan nama ──────────────────
  const getVarCount = (templateName: string): number => {
    const bodyText = getTemplateBody(templateName);
    return countVariables(bodyText);
  };

  // ─── Saat pilih template → update setting + reset mapping ───────────────────
  const handleSelectTemplate = (eventKey: string, templateName: string) => {
    if (!templateName) {
      // Reset ke default
      setSettings(prev => ({
        ...prev,
        [eventKey]: {
          ...prev[eventKey],
          template_name: '',
          template_id:   '',
          mapping:       [],
        }
      }));
      return;
    }

    const tpl      = templates.find(t => t.name === templateName);
    const bodyText = extractBodyText(tpl);
    const varCount = countVariables(bodyText);

    setSettings(prev => ({
      ...prev,
      [eventKey]: {
        ...prev[eventKey],
        template_name: templateName,
        // Cekat pakai wa_template_id sebagai id, fallback ke id biasa
        template_id:   tpl?.wa_template_id || tpl?.id || '',
        mapping:       Array(varCount).fill(''),
      }
    }));
  };

  const handleMapping = (eventKey: string, idx: number, sysVarKey: string) => {
    setSettings(prev => {
      const mapping = [...(prev[eventKey]?.mapping || [])];
      mapping[idx]  = sysVarKey;
      return { ...prev, [eventKey]: { ...prev[eventKey], mapping } };
    });
  };

  const handleToggle = (eventKey: string, val: boolean) => {
    setSettings(prev => ({ ...prev, [eventKey]: { ...prev[eventKey], enabled: val } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await waApi.saveNotifSettings(settings);
      toast.success('Pengaturan notifikasi berhasil disimpan');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const isMappingComplete = (eventKey: string): boolean => {
    const s = settings[eventKey];
    if (!s?.template_name) return true;
    const varCount = getVarCount(s.template_name);
    if (varCount === 0) return true;
    return s.mapping.slice(0, varCount).every(m => !!m);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center">
        <Loader2 size={32} className="animate-spin mx-auto text-gray-300 mb-3" />
        <p className="text-gray-400 font-medium">Memuat pengaturan...</p>
      </div>
    );
  }

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
              <h3 className="text-xl font-bold text-gray-900">Pengaturan Notifikasi WhatsApp</h3>
              <p className="text-sm text-gray-500">Tentukan template WA untuk setiap event notifikasi.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadAll}
              className="p-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-all"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Menyimpan...' : 'Simpan Semua'}
            </button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Hanya template <strong>APPROVED</strong> yang tampil. Jika tidak dipilih, sistem pakai pesan teks default.
            Kelola template di tab <strong>Template WhatsApp</strong>.
          </p>
        </div>

        {/* Debug: tampilkan jumlah template loaded */}
        {templates.length > 0 && (
          <p className="mt-3 text-xs text-green-600 font-bold">
            ✓ {templates.length} template APPROVED berhasil dimuat
          </p>
        )}
      </div>

      {/* Event Groups */}
      {NOTIF_EVENTS.map(group => (
        <div key={group.group} className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${
              group.color === 'blue'
                ? 'bg-blue-50 text-blue-600 border-blue-100'
                : 'bg-green-50 text-green-600 border-green-100'
            }`}>
              {group.group}
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {group.events.map(event => {
            const s           = settings[event.key] || { template_name: '', template_id: '', mapping: [], enabled: true };
            const isExpanded  = expandedEvent === event.key;
            const bodyText    = getTemplateBody(s.template_name);
            const varCount    = s.template_name ? countVariables(bodyText) : 0;
            const hasTemplate = !!s.template_name;
            const mappingOk   = isMappingComplete(event.key);

            return (
              <div
                key={event.key}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  !s.enabled ? 'opacity-60' : 'border-gray-100'
                }`}
              >
                {/* Row Header */}
                <div className="p-5 flex items-center gap-4">
                  <Toggle checked={s.enabled} onChange={(val) => handleToggle(event.key, val)} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm">{event.label}</span>
                      {hasTemplate ? (
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          mappingOk
                            ? 'bg-green-50 text-green-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          <CheckCircle size={10} />
                          {s.template_name}
                          {!mappingOk && ' — mapping belum lengkap'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full text-[10px] font-bold">
                          Teks Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{event.desc}</p>
                  </div>

                  <button
                    onClick={() => setExpandedEvent(isExpanded ? null : event.key)}
                    className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-all"
                  >
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>

                {/* Expanded Config */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-6 bg-gray-50/50 space-y-5 animate-in slide-in-from-top-2 duration-200">

                    {/* Pilih Template */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                        Pilih Template
                      </label>
                      <select
                        value={s.template_name}
                        onChange={(e) => handleSelectTemplate(event.key, e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 text-sm font-bold"
                      >
                        <option value="">-- Gunakan teks default --</option>
                        {templates.map(t => (
                          <option key={t.id || t.wa_template_id} value={t.name}>
                            {t.name} ({t.category})
                          </option>
                        ))}
                      </select>

                      {/* Tampilkan template_id yang tersimpan untuk debug */}
                      {hasTemplate && s.template_id && (
                        <p className="text-[10px] text-gray-400 mt-1 font-mono">
                          WA Template ID: {s.template_id}
                        </p>
                      )}
                    </div>

                    {/* Preview Body */}
                    {hasTemplate && bodyText && (
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                          Preview Template
                        </label>
                        <div className="p-4 bg-[#ECE5DD] rounded-xl">
                          <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-sm max-w-sm">
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{bodyText}</p>
                            <p className="text-[9px] text-gray-300 text-right mt-1">12:00 ✓✓</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mapping Variabel */}
                    {hasTemplate && varCount > 0 && (
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                          Mapping Variabel ({varCount} variabel ditemukan)
                        </label>
                        <div className="space-y-2">
                          {Array.from({ length: varCount }, (_, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-xs font-bold text-green-600 font-mono w-10 shrink-0 text-center bg-green-50 py-2 rounded-lg">
                                {`{{${i + 1}}}`}
                              </span>
                              <span className="text-gray-300 text-xs">→</span>
                              <select
                                value={s.mapping[i] || ''}
                                onChange={(e) => handleMapping(event.key, i, e.target.value)}
                                className={`flex-1 px-3 py-2 bg-white border rounded-xl outline-none focus:border-green-500 text-xs font-bold ${
                                  !s.mapping[i] ? 'border-amber-300' : 'border-gray-200'
                                }`}
                              >
                                <option value="">-- Pilih variabel --</option>
                                {SYSTEM_VARS.map(v => (
                                  <option key={v.key} value={v.key}>{v.label}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>

                        {/* Summary Mapping */}
                        {s.mapping.some(m => m) && (
                          <div className="mt-3 p-3 bg-white border border-gray-100 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                              Hasil Mapping
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {s.mapping.map((m, i) => m ? (
                                <span
                                  key={i}
                                  className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-600"
                                >
                                  <span className="text-green-600 font-mono">{`{{${i + 1}}}`}</span>
                                  = {SYSTEM_VARS.find(v => v.key === m)?.label || m}
                                </span>
                              ) : null)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Info: template tanpa variabel */}
                    {hasTemplate && bodyText && varCount === 0 && (
                      <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex gap-2">
                        <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-green-700 font-medium">
                          Template ini tidak memiliki variabel — langsung bisa dipakai tanpa mapping.
                        </p>
                      </div>
                    )}

                    {/* No template info */}
                    {!hasTemplate && (
                      <div className="p-4 bg-gray-100 rounded-xl flex gap-3">
                        <AlertCircle size={16} className="text-gray-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-500">
                          Tidak ada template dipilih — sistem akan menggunakan pesan teks default dari backend.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Bottom Save */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
        </button>
      </div>
    </div>
  );
}