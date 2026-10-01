import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Shield,
  Clock,
  HardDrive,
  Save,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Plus,
  X,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { adminService, SystemSettings } from '@/services/adminService';

const SettingsPage: React.FC = () => {
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Form states
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState<number[]>([90, 60, 30, 7]);
  const [newDayInput, setNewDayInput] = useState('');

  const [systemName, setSystemName] = useState('Compliance Management System');
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [maxUploadSize, setMaxUploadSize] = useState(25);
  const [taskSlaDays, setTaskSlaDays] = useState(7);
  const [escalationGraceDays, setEscalationGraceDays] = useState(3);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getSettings();
      setSettings(data);
      if (data.notifications) {
        setEmailEnabled(data.notifications.emailEnabled ?? true);
        setWhatsappEnabled(data.notifications.whatsappEnabled ?? false);
        setSmsEnabled(data.notifications.smsEnabled ?? false);
        setReminderDays(data.notifications.defaultReminderDays ?? [90, 60, 30, 7]);
      }
      if (data.config) {
        setSystemName(data.config.systemName || 'Compliance Management System');
        setSessionTimeout(data.config.sessionTimeoutMinutes ?? 60);
        setMaxUploadSize(data.config.maxFileUploadSizeMB ?? 25);
        setTaskSlaDays(data.config.taskSlaDays ?? 7);
        setEscalationGraceDays(data.config.escalationGraceDays ?? 3);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch settings');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleAddReminderDay = () => {
    const val = parseInt(newDayInput.trim());
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid positive number of days');
      return;
    }
    if (reminderDays.includes(val)) {
      toast.error('This day interval is already added');
      return;
    }
    setReminderDays([...reminderDays, val].sort((a, b) => b - a));
    setNewDayInput('');
  };

  const handleRemoveReminderDay = (day: number) => {
    if (reminderDays.length <= 1) {
      toast.error('At least one reminder interval is required');
      return;
    }
    setReminderDays(reminderDays.filter((d) => d !== day));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await adminService.updateSettings({
        notifications: {
          emailEnabled,
          whatsappEnabled,
          smsEnabled,
          defaultReminderDays: reminderDays,
        },
        config: {
          systemName,
          sessionTimeoutMinutes: Number(sessionTimeout),
          maxFileUploadSizeMB: Number(maxUploadSize),
          taskSlaDays: Number(taskSlaDays),
          escalationGraceDays: Number(escalationGraceDays),
        },
      });
      toast.success('System settings saved and applied successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="animate-spin text-indigo-500" size={32} />
          <p className="text-sm">Loading system governance configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveSettings} className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/40">
              <Sliders size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">System Settings & Policies</h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Global governance controls, notification channels, renewal reminder schedules, and operational thresholds.
            {settings?.updatedAt && (
              <span className="block text-xs text-indigo-600 dark:text-indigo-400/80 mt-0.5">
                Last modified: {new Date(settings.updatedAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" type="button" onClick={fetchSettings} title="Reset changes" className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            <RefreshCw size={15} />
          </Button>
          <Button variant="primary" type="submit" isLoading={isSaving} className="flex items-center gap-2">
            <Save size={16} /> Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── CARD 1: NOTIFICATION DISPATCH CHANNELS ────────────────────────── */}
        <Card>
          <Card.Header
            title="Notification Dispatch Channels"
            description="Enable delivery pipelines for task assignments, expiration warnings, and sign-offs."
            icon={<Bell size={18} />}
          />

          <div className="flex flex-col gap-4 mt-2">
            {/* Email Channel */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400">
                  <Mail size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Email Notifications (SMTP)</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Dispatch statutory renewal notifications to user email inboxes.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* WhatsApp Channel */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">WhatsApp Business API</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Send urgent escalation alerts to location manager mobile numbers.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsappEnabled}
                  onChange={(e) => setWhatsappEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* SMS Channel */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">SMS Gateway Alerts</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Fallback statutory alerts via Telecom DLT approved templates.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsEnabled}
                  onChange={(e) => setSmsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </Card>

        {/* ── CARD 2: ADVANCE RENEWAL REMINDER SCHEDULE ─────────────────────── */}
        <Card>
          <Card.Header
            title="Advance Expiry Reminder SLAs"
            description="Trigger automatic notices at designated intervals prior to compliance expiration."
            icon={<Calendar size={18} />}
          />

          <div className="flex flex-col gap-4 mt-2">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Active countdown checkpoints (in days before statutory deadline):
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {reminderDays.map((day) => (
                <div
                  key={day}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-700/60 text-indigo-800 dark:text-indigo-200 text-xs font-semibold shadow-sm"
                >
                  <span>{day} Days Before</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveReminderDay(day)}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-white transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Input
                placeholder="Add days (e.g. 15)"
                type="number"
                value={newDayInput}
                onChange={(e) => setNewDayInput(e.target.value)}
                className="max-w-[180px]"
              />
              <Button variant="secondary" size="sm" type="button" onClick={handleAddReminderDay}>
                <Plus size={14} className="mr-1" /> Add Interval
              </Button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2 mt-2">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                Automated scheduler will generate notification queue records and dispatch alerts according to these milestone thresholds.
              </span>
            </div>
          </div>
        </Card>

        {/* ── CARD 3: SECURITY & SESSION CONTROL ───────────────────────────── */}
        <Card>
          <Card.Header
            title="Security & Session Policies"
            description="Control user session idle lifespans and document storage caps."
            icon={<Shield size={18} />}
          />

          <div className="flex flex-col gap-4 mt-2">
            <Input
              label="Application Brand Title"
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              hint="Shown on top navigation bar and compliance PDF headers."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Session Inactivity Timeout (Minutes)"
                type="number"
                leftAddon={<Clock size={16} />}
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 15)}
                hint="Auto-logout after idle window."
              />

              <Input
                label="Max File Upload Limit (MB)"
                type="number"
                leftAddon={<HardDrive size={16} />}
                value={maxUploadSize}
                onChange={(e) => setMaxUploadSize(parseInt(e.target.value) || 10)}
                hint="Max size per PDF/evidence document."
              />
            </div>
          </div>
        </Card>

        {/* ── CARD 4: OPERATIONAL TASK & ESCALATION SLA ─────────────────────── */}
        <Card>
          <Card.Header
            title="Task SLA & Escalation Governance"
            description="Default turnaround times for renewals, document uploads, and administrative approvals."
            icon={<Clock size={18} />}
          />

          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Default Task Turnaround SLA (Days)"
                type="number"
                value={taskSlaDays}
                onChange={(e) => setTaskSlaDays(parseInt(e.target.value) || 1)}
                hint="Standard SLA allocated to unit assignees."
              />

              <Input
                label="Overdue Escalation Grace Window (Days)"
                type="number"
                value={escalationGraceDays}
                onChange={(e) => setEscalationGraceDays(parseInt(e.target.value) || 1)}
                hint="Days before escalating to Entity Admin."
              />
            </div>

            <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 text-xs text-indigo-700 dark:text-indigo-300">
              ⚡ Prepared for Phase 13 full Audit Trail integration — every change committed here produces an immutable AuditLog event.
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-3 mt-4">
        <Button variant="primary" type="submit" isLoading={isSaving} className="flex items-center gap-2">
          <Save size={16} /> Save Changes
        </Button>
      </div>
    </form>
  );
};

export default SettingsPage;
