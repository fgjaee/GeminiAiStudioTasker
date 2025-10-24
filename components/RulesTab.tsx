import React, { useState, useCallback, useMemo } from 'react';
import { ExplicitRule, Member, Task, PrimarySelector } from '../types'; // Fix: Import PrimarySelector
import Button from './Button';
import ExplicitRuleForm from './ExplicitRuleForm';
import Modal from './Modal';
import { Plus, Trash2, Pencil, Gavel } from 'lucide-react'; // Gavel for rules
import { assertUniqueKeys } from '../utils/helpers'; // Ensure assertUniqueKeys is imported
import { getTaskDisplayName } from '../services/assignmentEngine'; // Import getTaskDisplayName

interface RulesTabProps {
  explicitRules: ExplicitRule[];
  members: Member[];
  tasks: Task[];
  onSaveRule: (rule: ExplicitRule) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
}

const RulesTab: React.FC<RulesTabProps> = ({ explicitRules, members, tasks, onSaveRule, onDeleteRule }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ExplicitRule | null>(null);

  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);
  const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);

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

  const getSelectorLabel = useCallback((selector: PrimarySelector) => {
    if (selector.mode === 'member') {
      return memberMap.get(selector.value)?.name || `Unknown Member (${selector.value})`;
    }
    return selector.value; // It's a tag
  }, [memberMap]);

  const sortedRules = useMemo(() => {
    return [...explicitRules].sort((a, b) => {
      const taskA = taskMap.get(a.taskId);
      const taskB = taskMap.get(b.taskId);
      if (taskA && taskB) {
        return getTaskDisplayName(taskA).localeCompare(getTaskDisplayName(taskB));
      }
      return 0;
    });
  }, [explicitRules, taskMap]);

  // Assert unique keys for rules list (dev mode only)
  if (process.env.NODE_ENV !== "production") {
    assertUniqueKeys(explicitRules.map(r => r.id), "RulesTab.explicitRules");
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-textdark">Explicit Assignment Rules</h2>
        <Button onClick={handleOpenCreateModal} variant="primary">
          <Plus size={18} className="mr-2" /> Add New Rule
        </Button>
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
            {sortedRules.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  No explicit rules defined yet.
                </td>
              </tr>
            ) : (
              sortedRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-textdark">
                    {getTaskDisplayName(taskMap.get(rule.taskId))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getSelectorLabel(rule.primary_selector)}
                    </span>
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
                    {rule.exclude_day && rule.exclude_day.length > 0 ? rule.exclude_day.join(', ') : 'None'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(rule)} title="Edit Rule">
                        <Pencil size={16} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => onDeleteRule(rule.id)} title="Delete Rule">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
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