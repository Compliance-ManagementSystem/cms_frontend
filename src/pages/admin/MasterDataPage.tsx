import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  CornerDownRight,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Table, { Column } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import {
  adminService,
  MasterDataItem,
  MasterDataCategory,
} from '@/services/adminService';

const MasterDataPage: React.FC = () => {
  const toast = useToast();

  const [categories, setCategories] = useState<MasterDataCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('entity_type');
  const [items, setItems] = useState<MasterDataItem[]>([]);
  const [availableParents, setAvailableParents] = useState<MasterDataItem[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MasterDataItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    label: '',
    description: '',
    parent: '' as string | null,
    sortOrder: 0,
    status: 'active' as 'active' | 'inactive',
  });

  // 1. Fetch Categories dynamically from backend
  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const data = await adminService.getCategories();
      setCategories(data);
      if (data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch master data categories');
    } finally {
      setIsLoadingCategories(false);
    }
  }, [selectedCategory, toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // 2. Fetch Master Data Items for Selected Category
  const fetchItems = useCallback(async () => {
    if (!selectedCategory) return;
    setIsLoadingItems(true);
    try {
      const data = await adminService.getMasterData({
        category: selectedCategory,
        status: selectedStatus || undefined,
        search: search || undefined,
      });
      setItems(data.items);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch master data items');
    } finally {
      setIsLoadingItems(false);
    }
  }, [selectedCategory, selectedStatus, search, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 3. If selected category is 'district', fetch 'state' items to populate parent dropdown dynamically
  useEffect(() => {
    if (selectedCategory === 'district') {
      adminService
        .getMasterData({ category: 'state' })
        .then((data) => setAvailableParents(data.items))
        .catch(() => {});
    } else {
      setAvailableParents([]);
    }
  }, [selectedCategory]);

  const activeCategoryMeta = categories.find((c) => c.id === selectedCategory);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      code: '',
      label: '',
      description: '',
      parent: availableParents[0]?._id || null,
      sortOrder: items.length + 1,
      status: 'active',
    });
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: MasterDataItem) => {
    setSelectedItem(item);
    setFormData({
      code: item.code,
      label: item.label,
      description: item.description || '',
      parent: item.parent?._id || null,
      sortOrder: item.sortOrder || 0,
      status: item.status === 'archived' ? 'inactive' : item.status,
    });
    setIsEditOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (item: MasterDataItem) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.label) {
      toast.error('Code and Label are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminService.createMasterData({
        category: selectedCategory,
        code: formData.code.toUpperCase(),
        label: formData.label,
        description: formData.description,
        parent: formData.parent || null,
        sortOrder: Number(formData.sortOrder) || 0,
        status: formData.status,
      });
      toast.success('Master data item created successfully');
      setIsCreateOpen(false);
      fetchItems();
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create item');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setIsSubmitting(true);
    try {
      await adminService.updateMasterData(selectedItem._id, {
        label: formData.label,
        description: formData.description,
        parent: formData.parent || null,
        sortOrder: Number(formData.sortOrder) || 0,
        status: formData.status,
      });
      toast.success('Master data item updated successfully');
      setIsEditOpen(false);
      fetchItems();
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update item');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (item: MasterDataItem) => {
    const nextStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      await adminService.toggleMasterDataStatus(item._id, nextStatus);
      toast.success(`Marked '${item.label}' as ${nextStatus}`);
      fetchItems();
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  // Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    try {
      await adminService.deleteMasterData(selectedItem._id);
      toast.success('Item deleted successfully');
      setIsDeleteOpen(false);
      fetchItems();
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<MasterDataItem>[] = [
    {
      key: 'code',
      header: 'Code Slug',
      cell: (item) => (
        <code className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-400">
          {item.code}
        </code>
      ),
    },
    {
      key: 'label',
      header: 'Label / Name',
      cell: (item) => (
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
          {item.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{item.description}</p>
          )}
        </div>
      ),
    },
    ...(selectedCategory === 'district'
      ? [
          {
            key: 'parent',
            header: 'Parent State',
            cell: (item: MasterDataItem) => (
              <span className="flex items-center gap-1.5 text-xs text-indigo-300">
                <CornerDownRight size={13} className="text-slate-500" />
                {item.parent?.label || 'None'}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'sortOrder',
      header: 'Order',
      align: 'center',
      cell: (item) => (
        <span className="text-xs font-medium text-slate-400">{item.sortOrder ?? 0}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => (
        <Badge variant={item.status === 'active' ? 'success' : 'warning'} size="sm" dot>
          {item.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleStatus(item)}
            title={item.status === 'active' ? 'Deactivate' : 'Reactivate'}
            className={
              item.status === 'active'
                ? 'text-amber-400 hover:text-amber-300'
                : 'text-emerald-400 hover:text-emerald-300'
            }
          >
            {item.status === 'active' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(item)}
            title="Edit item"
            className="text-slate-300 hover:text-white"
          >
            <Edit2 size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDelete(item)}
            title="Delete item"
            className="text-rose-400 hover:text-rose-300"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/40">
              <Database size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Master Data Management</h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Dynamic statutory classifications, geographic entities, frequencies, and status catalogs.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleOpenCreate}
          className="flex items-center gap-2"
          id="btn-create-master-data"
        >
          <Plus size={16} /> Add {activeCategoryMeta?.name?.slice(0, -1) || 'Item'}
        </Button>
      </div>

      {/* Category Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Category Navigation Cards */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider px-2">
            Classification Domains (11)
          </p>
          <div className="flex flex-col gap-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {isLoadingCategories ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 animate-pulse" />
              ))
            ) : (
              categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSearch('');
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-900 dark:text-white shadow-md'
                      : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm dark:shadow-none'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold truncate">{cat.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{cat.description}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })
            )}
          </div>
        </div>

        {/* Right: Data Table & Filters */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <Card padding="sm" className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[260px]">
              <Input
                placeholder={`Search ${activeCategoryMeta?.name || 'items'} by code or label...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftAddon={<Search size={16} />}
                className="w-full"
                id="search-master-data-input"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-sm dark:shadow-none"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                aria-label="Filter status"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              <Button
                variant="ghost"
                size="sm"
                onClick={fetchItems}
                title="Refresh items"
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <RefreshCw size={15} />
              </Button>
            </div>
          </Card>

          {/* Active Domain Info Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 shadow-sm dark:shadow-none">
            <span>
              Managing domain: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{activeCategoryMeta?.name}</strong> &middot;{' '}
              {items.length} records loaded live from API
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">Category: {selectedCategory}</span>
          </div>

          <Table
            id="master-data-table"
            columns={columns}
            data={items}
            keyExtractor={(i) => i._id}
            isLoading={isLoadingItems}
            emptyMessage={`No items found in ${activeCategoryMeta?.name || 'this category'}.`}
          />
        </div>
      </div>

      {/* ── CREATE MASTER DATA MODAL ───────────────────────────────────────── */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={`Add New ${activeCategoryMeta?.name?.slice(0, -1) || 'Item'}`}
        description={`Register a new lookup entry in category '${selectedCategory}'.`}
        size="md"
        id="create-master-data-modal"
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
          <Input
            label="Item Code (Slug)"
            required
            placeholder="e.g. MH, FSSAI_CENTRAL, QUARTERLY"
            value={formData.code}
            onChange={(e) =>
              setFormData({
                ...formData,
                code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
              })
            }
            hint="Unique identifier within this category (uppercase alphanumeric)."
          />

          <Input
            label="Display Label / Name"
            required
            placeholder="e.g. Maharashtra, Food Safety Licence"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          />

          {selectedCategory === 'district' && (
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                Parent State <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
                value={formData.parent || ''}
                onChange={(e) => setFormData({ ...formData, parent: e.target.value || null })}
                required
              >
                <option value="" disabled>
                  Select Parent State
                </option>
                {availableParents.map((state) => (
                  <option key={state._id} value={state._id}>
                    {state.label} ({state.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Description"
            placeholder="Brief explanation or regulatory statutory reference..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sort Sequence Order"
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
            />

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Status</label>
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
            <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Create Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── EDIT MASTER DATA MODAL ─────────────────────────────────────────── */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit ${selectedItem?.code}`}
        description={`Update label and configuration for '${selectedItem?.label}'.`}
        size="md"
        id="edit-master-data-modal"
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <Input label="Item Code" value={formData.code} disabled hint="Code cannot be modified." />

          <Input
            label="Display Label / Name"
            required
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          />

          {selectedCategory === 'district' && (
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Parent State</label>
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
                value={formData.parent || ''}
                onChange={(e) => setFormData({ ...formData, parent: e.target.value || null })}
              >
                <option value="">No Parent</option>
                {availableParents.map((state) => (
                  <option key={state._id} value={state._id}>
                    {state.label} ({state.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sort Sequence Order"
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
            />

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">Status</label>
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:shadow-none"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
            <Button variant="ghost" type="button" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── DELETE MASTER DATA MODAL ───────────────────────────────────────── */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Deletion"
        size="sm"
        id="delete-master-data-modal"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to delete <strong className="text-slate-900 dark:text-slate-100">{selectedItem?.label}</strong> (
            <code className="text-rose-600 dark:text-rose-400 font-mono text-xs">{selectedItem?.code}</code>)?
          </p>
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-300">
            ⚠️ Dependent records using this classification will need manual reassignment if deleted.
          </div>
          <div className="flex items-center justify-end gap-3 mt-2">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} isLoading={isSubmitting}>
              Delete Item
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MasterDataPage;
