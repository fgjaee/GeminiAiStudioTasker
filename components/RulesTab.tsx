import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ExplicitRule, Member, Task, PrimarySelector, ID } from '../types';
import Button from './Button';
import ExplicitRuleForm from './ExplicitRuleForm';
import Modal from './Modal';
import { Plus, Trash2, Pencil, Save } from 'lucide-react';
import { assertUniqueKeys } from '../utils/helpers';
import { getTaskDisplayName } from '../services/assignmentEngine';
import { useToast } from './Toast';
import { SHORT_WEEKDAY_NAMES } from '../constants';

interface RulesTabProps {
  explicitRules: ExplicitRule[];
  members: Member[];
  tasks: Task[];
  onSaveRule: (rule: ExplicitRule | ExplicitRule[]) => Promise<void>;
  onDeleteRule: (id: ID) => Promise<void>;
}

const RulesTab: React.FC<RulesTabProps> = ({ explicitRules, members, tasks, onSaveRule, onDeleteRule }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ExplicitRule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRules, setEditedRules] = useState<ExplicitRule[]>([]);
  const { addToast } = useToast();

  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);
  const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);
  const memberOptions = useMemo(() => members.map(m => ({ value: m.id, label: m.name })).sort((a,b) => a.label.localeCompare(b.label)), [members]);

  const sortedRules = useMemo(() => {
    if (process.env.NODE_ENV !== "production") {
      assertUniqueKeys(explicitRules.map(r => r.id), "RulesTab.explicitRules");
    }
    return [...explicitRules].sort((a, b) => {
      const taskA = taskMap.get(a.task_id);
      const taskB = taskMap.get(b.task_id);
      if (taskA && taskB) {
        return getTaskDisplayName(taskA).localeCompare(getTaskDisplayName(taskB));
      }
      return 0;
    });
  }, [explicitRules, taskMap]);
  
  useEffect(() => {
    if (isEditing) {
      setEditedRules(JSON.parse(JSON.stringify(sortedRules)));
    }
  }, [isEditing, sortedRules]);

  const handleOpenCreateModal = useCallback(() => {
    setEditingRule(null);
    setIsModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((rule: ExplicitRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingRule(null);
  }, []);

  const handleSave = useCallback(async (rule: ExplicitRule) => {
    await onSaveRule(rule);
    handleCloseModal();
  }, [onSaveRule, handleCloseModal]);
  
  const handleSaveChanges = async () => {
    await onSaveRule(editedRules);
    addToast({ message: 'Bulk changes saved!', type: 'success' });
    setIsEditing(false);
  };

  const handleCancelEdits = () => {
    setIsEditing(false);
    setEditedRules([]);
  };
  
  const handleInlineChange = (ruleId: ID, field: keyof ExplicitRule, value: any) => {
    setEditedRules(prevRules =>
        prevRules.map(rule =>
            rule.id === ruleId ? { ...rule, [field]: value } : rule
        )
    );
  };
  
  const handlePrimaryAssigneeChange = (ruleId: ID, memberId: string) => {
    setEditedRules(prevRules =>
        prevRules.map(rule => {
            if (rule.id === ruleId) {
                return {
                    ...rule,
                    primary_selector: {
                        ...rule.primary_selector,
                        value: memberId,
                    },
                };
            }
            return rule;
        })
    );
  };

  const getSelectorLabel = useCallback((selector: PrimarySelector) => {
    if (selector.mode === 'member') {
      return memberMap.get(selector.value)?.name || `Unknown Member (${selector.value})`;
    }
    return selector.value;
  }, [memberMap]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-textdark">Explicit Assignment Rules</h2>
        {isEditing ? (
            <div className="flex space-x-2">
                <Button onClick={handleCancelEdits} variant="outline">Cancel</Button>
                <Button onClick={handleSaveChanges} variant="primary"><Save size={16} className="mr-2"/>Save Changes</Button>
            </div>
        ) : (
            <div className="flex space-x-2">
                <Button onClick={() => setIsEditing(true)} variant="secondary">Bulk Edit</Button>
                <Button onClick={handleOpenCreateModal} variant="primary">
                    <Plus size={18} className="mr-2" /> Add New Rule
                </Button>
            </div>
        )}
      </div>

      <div className="bg-card shadow-lg rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Assignee</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fallbacks</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Excl. Days</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(isEditing ? editedRules : sortedRules).map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-textdark">
                    {getTaskDisplayName(taskMap.get(rule.task_id))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {isEditing && rule.primary_selector.mode === 'member' ? (
                        <select
                            value={rule.primary_selector.value}
                            onChange={(e) => handlePrimaryAssigneeChange(rule.id, e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 bg-card"
                        >
                            {memberOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getSelectorLabel(rule.primary_selector)}
                        </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex flex-wrap gap-1">
                      {(rule.fallback_selectors || []).map(fb => (
                        <span key={fb.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {getSelectorLabel(fb)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {isEditing ? (
                        <select
                            multiple
                            value={rule.exclude_day || []}
                            onChange={(e) => {
                                // FIX: Explicitly type 'option' to resolve 'unknown' type error.
                                const selectedDays = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
                                handleInlineChange(rule.id, 'exclude_day', selectedDays);
                            }}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-1 bg-card h-24"
                        >
                            {SHORT_WEEKDAY_NAMES.map(day => <option key={day} value={day}>{day}</option>)}
                        </select>
                    ) : (
                        rule.exclude_day && rule.exclude_day.length > 0 ? rule.exclude_day.join(', ') : 'None'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!isEditing && (
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(rule)} title="Edit Rule">
                            <Pencil size={16} />
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => onDeleteRule(rule.id)} title="Delete Rule">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingRule ? 'Edit Explicit Rule' : 'Add New Explicit Rule'}
      >
        <ExplicitRuleForm
          rule={editingRule}
          onSave={handleSave}
          onCancel={handleCloseModal}
          members={members}
          tasks={tasks}
        />
      </Modal>
    </div>
  );
};

export default RulesTab;