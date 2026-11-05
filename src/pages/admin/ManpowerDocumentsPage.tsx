import React, { useCallback, useEffect, useState } from 'react';
import { FileCheck2, Plus, Trash2, Check, X, Edit2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { manpowerService, ManpowerRequirement, ManpowerRole, ManpowerRoleOption } from '@/services/manpowerService';
import { getErrorMessage } from '@/utils/errors';

/**
 * The documents each doctor, nurse and DMLT/phlebo must have before their
 * location counts as ready for licence applications.
 */
const ManpowerDocumentsPage: React.FC = () => {
  const toast = useToast();
  const [roles, setRoles] = useState<ManpowerRoleOption[]>([]);
  const [requirements, setRequirements] = useState<ManpowerRequirement[]>([]);
  const [minPerRole, setMinPerRole] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Adding: the role whose "add" row is open, and its text
  const [addingRole, setAddingRole] = useState<ManpowerRole | null>(null);
  const [newLabel, setNewLabel] = useState('');
  // Renaming
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toRemove, setToRemove] = useState<ManpowerRequirement | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await manpowerService.getRequirements();
      setRoles(data.roles);
      setRequirements(data.requirements);
      setMinPerRole(data.minPerRole);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load required documents'));
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setIsSaving(true);
    try {
      await action();
      toast.success(success);
      await load();
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save'));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = async (role: ManpowerRole) => {
    const label = newLabel.trim();
    if (!label) {
      toast.error('Enter the document name');
      return;
    }
    if (await run(() => manpowerService.createRequirement({ role, label, isMandatory: true }), 'Document added')) {
      setAddingRole(null);
      setNewLabel('');
    }
  };

  const handleRename = async (item: ManpowerRequirement) => {
    const label = editLabel.trim();
    if (!label) {
      toast.error('Enter the document name');
      return;
    }
    if (await run(() => manpowerService.updateRequirement(item._id, { label }), 'Document renamed')) {
      setEditingId(null);
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    if (await run(() => manpowerService.removeRequirement(toRemove._id), 'Document removed')) {
      setToRemove(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/40">
            <FileCheck2 size={20} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manpower Documents</h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          Every location needs at least {minPerRole} of each role below. A location is ready to apply for licences only
          when each of its staff has every <strong>required</strong> document uploaded, not rejected and not expired.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {roles.map((role) => {
            const items = requirements.filter((item) => item.role === role.code);
            return (
              <Card key={role.code} padding="lg">
                <Card.Header
                  title={role.label}
                  description={`${items.length} ${items.length === 1 ? 'document' : 'documents'}`}
                />
                <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                  {items.length === 0 && (
                    <li className="py-3 text-sm text-slate-500 dark:text-slate-400">
                      No documents yet. Staff in this role only need to be added.
                    </li>
                  )}
                  {items.map((item) => (
                    <li key={item._id} className="py-2.5 flex items-center gap-2">
                      {editingId === item._id ? (
                        <>
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename(item)}
                            autoFocus
                            fullWidth
                            maxLength={150}
                          />
                          <Button variant="ghost" size="sm" disabled={isSaving} onClick={() => handleRename(item)}>
                            <Check size={15} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                            <X size={15} />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-slate-800 dark:text-slate-200">{item.label}</span>
                          <label
                            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none"
                            title="Required documents decide whether the location is ready"
                          >
                            <input
                              type="checkbox"
                              checked={item.isMandatory}
                              disabled={isSaving}
                              onChange={(e) =>
                                run(
                                  () => manpowerService.updateRequirement(item._id, { isMandatory: e.target.checked }),
                                  e.target.checked ? 'Marked as required' : 'Marked as optional'
                                )
                              }
                              className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                            />
                            Required
                          </label>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Rename"
                            onClick={() => {
                              setEditingId(item._id);
                              setEditLabel(item.label);
                            }}
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Remove"
                            className="text-rose-600 dark:text-rose-400"
                            onClick={() => setToRemove(item)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>

                {addingRole === role.code ? (
                  <div className="flex items-center gap-2 mt-3">
                    <Input
                      placeholder="e.g. Experience certificate"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAdd(role.code)}
                      autoFocus
                      fullWidth
                      maxLength={150}
                    />
                    <Button variant="primary" size="sm" isLoading={isSaving} onClick={() => handleAdd(role.code)}>
                      Add
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setAddingRole(null)}>
                      <X size={15} />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    leftIcon={<Plus size={14} />}
                    onClick={() => {
                      setAddingRole(role.code);
                      setNewLabel('');
                    }}
                  >
                    Add document
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={!!toRemove}
        onClose={() => setToRemove(null)}
        title="Remove Required Document"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setToRemove(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemove} isLoading={isSaving}>
              Remove
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Stop requiring <strong>{toRemove?.label}</strong>? Files already uploaded are kept, and locations are
          re-checked without it.
        </p>
      </Modal>
    </div>
  );
};

export default ManpowerDocumentsPage;
