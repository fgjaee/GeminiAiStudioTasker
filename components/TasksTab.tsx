import React, { useState, useCallback, useMemo } from 'react';
import { Task, Area, OrderSet, OrderSetItem } from '../types';
import Button from './Button';
import TaskForm from './TaskForm';
import Modal from './Modal';
import { Plus, Trash2, Pencil, ListOrdered, Code } from 'lucide-react';
import { assertUniqueKeys } from '../utils/helpers'; // Import assertUniqueKeys

interface TasksTabProps {
  tasks: Task[];
  areas: Area[];
  orderSets: OrderSet[];
  orderSetItems: OrderSetItem[];
  onSaveTask: (task: Task) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onSaveOrderSet: (orderSet: OrderSet) => Promise<void>;
  onSaveOrderSetItem: (orderSetItem: OrderSetItem[]) => Promise<void>;
  onDeleteOrderSet: (id: string) => Promise<void>;
  onDeleteOrderSetItem: (order_set_id: string, task_id: string) => Promise<void>;
}

const TasksTab: React.FC<TasksTabProps> = ({
  tasks,
  areas,
  orderSets,
  orderSetItems,
  onSaveTask,
  onDeleteTask,
  onSaveOrderSet,
  onSaveOrderSetItem,
  onDeleteOrderSet,
  onDeleteOrderSetItem,
}) => {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isOrderSetModalOpen, setIsOrderSetModalOpen] = useState(false); // For Phase 2

  const areaMap = useMemo(() => new Map(areas.map(a => [a.id, a])), [areas]);

  const handleOpenCreateTaskModal = useCallback(() => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  }, []);

  const handleOpenEditTaskModal = useCallback((task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const handleCloseTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  }, []);

  const handleSaveTaskInternal = useCallback(async (task: Task) => {
    await onSaveTask(task);
    handleCloseTaskModal();
  }, [onSaveTask, handleCloseTaskModal]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => a.code.localeCompare(b.code));
  }, [tasks]);

  // Assert unique keys for tasks list (dev mode only)
  if (process.env.NODE_ENV !== "production") {
    assertUniqueKeys(tasks.map(t => t.id), "TasksTab.tasks");
  }

  // Placeholder for Order Set Manager (Phase 2)
  const OrderSetManagerPlaceholder: React.FC = () => (
    <div className="bg-card shadow-lg rounded-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-xl font-semibold text-textdark flex items-center">
          <ListOrdered size={20} className="mr-2" /> Order Set Manager
        </h3>
        <Button onClick={() => alert("Order Set Manager functionality coming soon!")} variant="secondary" size="sm">
          <Plus size={18} className="mr-2" /> Manage Order Sets
        </Button>
      </div>
      <p className="text-gray-700">
        This section will allow you to define and manage custom task ordering for different days or scenarios.
        Tasks will appear as "CODE: Name" (e.g., T1: Tropical Table).
      </p>
    </div>
  );


  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-textdark">Task Definitions</h2>
        <Button onClick={handleOpenCreateTaskModal} variant="primary">
          <Plus size={18} className="mr-2" /> Add New Task
        </Button>
      </div>

      <OrderSetManagerPlaceholder /> {/* Phase 2 placeholder */}

      <div className="bg-card shadow-lg rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (min)</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due By</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  No tasks defined yet. Click "Add New Task" to get started.
                </td>
              </tr>
            ) : (
              sortedTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-textdark flex items-center">
                    <Code size={16} className="mr-2 text-gray-500" /> {task.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{task.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{areaMap.get(task.areaId || '')?.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{task.task_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{task.estimated_duration}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{task.due_by}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEditTaskModal(task)} title="Edit Task">
                        <Pencil size={16} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => onDeleteTask(task.id)} title="Delete Task">
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
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        title={editingTask ? 'Edit Task' : 'Add New Task'}
      >
        <TaskForm
          task={editingTask}
          onSave={handleSaveTaskInternal}
          onCancel={handleCloseTaskModal}
          existingTasks={tasks}
          areas={areas}
        />
      </Modal>
    </div>
  );
};

export default TasksTab;