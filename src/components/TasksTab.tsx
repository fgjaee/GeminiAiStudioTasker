// src/components/TasksTab.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Task, Area, OrderSet, OrderSetItem, ID } from '../types';
import Button from '../../components/Button';
import TaskForm from './TaskForm';
import Modal from '../../components/Modal';
import Select from '../../components/Select';
import { Plus, Trash2, Pencil, ClipboardList, ArrowUp, ArrowDown, Save, ShieldCheck } from 'lucide-react';
import { assertUniqueKeys } from '../../utils/helpers';
import { useToast } from '../../components/Toast';

interface TasksTabProps {
  tasks: Task[];
  areas: Area[]; // For passing to TaskForm
  orderSets: OrderSet[]; // For Order Set Manager
  orderSetItems: OrderSetItem[]; // For Order Set Manager
  onSaveTask: (task: Task | Task[]) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onSaveArea: (area: Area) => Promise<void>;
  onDeleteArea: (id: string) => Promise<void>;
  onSaveOrderSet: (orderSet: OrderSet) => Promise<void>;
  onDeleteOrderSet: (id: string) => Promise<void>;
  onSaveOrderSetItem: (orderSetItem: OrderSetItem | OrderSetItem[]) => Promise<void>;
  onDeleteOrderSetItem: (id: string) => Promise<void>;
}

const OrderSetManager: React.FC<Pick<TasksTabProps, 'tasks' | 'orderSets' | 'orderSetItems' | 'onSaveOrderSetItem'>> = ({ tasks, orderSets, orderSetItems, onSaveOrderSetItem }) => {
  const [selectedOrderSetId, setSelectedOrderSetId] = useState<ID | null>(orderSets[0]?.id || null);
  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);

  const itemsInSelectedSet = useMemo(() => {
    if (!selectedOrderSetId) return [];
    return orderSetItems
      .filter(item => item.order_set_id === selectedOrderSetId)
      .sort((a, b) => a.position - b.position);
  }, [selectedOrderSetId, orderSetItems]);

  const handleMoveItem = useCallback(async (itemToMove: OrderSetItem, direction: 'up' | 'down') => {
    const currentIndex = itemsInSelectedSet.findIndex(item => item.id === itemToMove.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= itemsInSelectedSet.length) return;
    
    const itemToSwapWith = itemsInSelectedSet[newIndex];
    
    // Swap positions
    const updatedItemToMove = { ...itemToMove, position: itemToSwapWith.position };
    const updatedItemToSwap = { ...itemToSwapWith, position: itemToMove.position };

    await onSaveOrderSetItem([updatedItemToMove, updatedItemToSwap]);
  }, [itemsInSelectedSet, onSaveOrderSetItem]);

  return (
    <div className="bg-card shadow-lg rounded-lg p-6 mb-8">
      <h3 className="text-xl font-semibold text-textdark mb-4 border-b pb-2">Task Order Manager</h3>
      <Select 
        id="order-set-select"
        label="Select Order Set to Manage"
        options={orderSets.map(os => ({ value: os.id, label: os.name }))}
        value={selectedOrderSetId || ''}
        onChange={e => setSelectedOrderSetId(e.target.value)}
      />
      {selectedOrderSetId && (
        <ul className="mt-4 space-y-2 max-h-96 overflow-y-auto">
          {itemsInSelectedSet.map((item, index) => (
            <li key={item.id} className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
              <span className="font-medium text-gray-800">{taskMap.get(item.task_id)?.name || 'Unknown Task'}</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Pos: {item.position}</span>
                <Button variant="outline" size="sm" onClick={() => handleMoveItem(item, 'up')} disabled={index === 0}><ArrowUp size={16}/></Button>
                <Button variant="outline" size="sm" onClick={() => handleMoveItem(item, 'down')} disabled={index === itemsInSelectedSet.length - 1}><ArrowDown size={16}/></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


const TasksTab: React.FC<TasksTabProps> = (props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTasks, setEditedTasks] = useState<Task[]>([]);
  const { addToast } = useToast();

  const areaMap = useMemo(() => new Map(props.areas.map(a => [a.id, a])), [props.areas]);

  const handleOpenCreateModal = useCallback(() => {
    setEditingTask(null);
    setIsModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingTask(null);
  }, []);

  const handleSave = useCallback(async (task: Task) => {
    await props.onSaveTask(task);
    handleCloseModal();
  }, [props.onSaveTask, handleCloseModal]);

  const sortedTasks = useMemo(() => {
    if (process.env.NODE_ENV !== "production") {
      assertUniqueKeys(props.tasks.map(t => t.id), "TasksTab.tasks");
    }
    return [...props.tasks].sort((a, b) => (a.priority_weight || 999) - (b.priority_weight || 999));
  }, [props.tasks]);

  useEffect(() => {
    if (isEditing) {
      setEditedTasks(JSON.parse(JSON.stringify(sortedTasks)));
    }
  }, [isEditing, sortedTasks]);

  const handleSaveChanges = useCallback(async () => {
    await props.onSaveTask(editedTasks);
    addToast({ message: 'Task updates saved successfully!', type: 'success' });
    setIsEditing(false);
  }, [editedTasks, props.onSaveTask, addToast]);

  const handleCancelEdits = useCallback(() => {
    setIsEditing(false);
    setEditedTasks([]);
  }, []);

  const handleInlineChange = useCallback((taskId: ID, field: keyof Task, value: any) => {
    setEditedTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, [field]: value } : task
      )
    );
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-textdark">Task Definitions</h2>
        {isEditing ? (
          <div className="flex space-x-2">
            <Button onClick={handleCancelEdits} variant="outline">Cancel</Button>
            <Button onClick={handleSaveChanges} variant="primary"><Save size={16} className="mr-2"/>Save Changes</Button>
          </div>
        ) : (
          <div className="flex space-x-2">
            <Button onClick={() => setIsEditing(true)} variant="secondary">Bulk Edit</Button>
            <Button onClick={handleOpenCreateModal} variant="primary">
              <Plus size={18} className="mr-2" /> Add New Task
            </Button>
          </div>
        )}
      </div>

      <OrderSetManager 
        tasks={props.tasks} 
        orderSets={props.orderSets} 
        orderSetItems={props.orderSetItems} 
        onSaveOrderSetItem={props.onSaveOrderSetItem} 
      />

      <div className="bg-card shadow-lg rounded-lg overflow-hidden mt-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (min)</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Must Run</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Coverage</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(isEditing ? editedTasks : sortedTasks).map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-500">
                  {isEditing ? (
                    <input
                      type="number"
                      value={task.priority_weight}
                      onChange={(e) => handleInlineChange(task.id, 'priority_weight', parseInt(e.target.value, 10) || 0)}
                      className="w-20 p-1 text-sm rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary bg-card"
                    />
                  ) : (
                    task.priority_weight
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-textdark">{task.code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{task.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{task.areaId ? areaMap.get(task.areaId)?.name || 'N/A' : 'None'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{task.task_type}</td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">
                  {isEditing ? (
                    <input
                      type="number"
                      value={task.estimated_duration}
                      onChange={(e) => handleInlineChange(task.id, 'estimated_duration', parseInt(e.target.value, 10) || 0)}
                      className="w-20 p-1 text-sm rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary bg-card"
                    />
                  ) : (
                    task.estimated_duration
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={task.is_must_run || false}
                      onChange={(e) => handleInlineChange(task.id, 'is_must_run', e.target.checked)}
                      className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  ) : (
                    task.is_must_run && <ShieldCheck size={18} className="text-green-600 mx-auto" title="Must Run" />
                  )}
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">
                   {isEditing ? (
                    <input
                      type="number"
                      value={task.min_coverage || 0}
                      onChange={(e) => handleInlineChange(task.id, 'min_coverage', parseInt(e.target.value, 10) || 0)}
                      className="w-20 p-1 text-sm rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary bg-card"
                      min="0"
                    />
                  ) : (
                    task.min_coverage || 0
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {!isEditing && (
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(task)} title="Edit Task">
                        <Pencil size={16} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => props.onDeleteTask(task.id)} title="Delete Task">
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
        title={editingTask ? 'Edit Task' : 'Add New Task'}
      >
        <TaskForm
          task={editingTask}
          onSave={handleSave}
          onCancel={handleCloseModal}
          existingTasks={props.tasks}
          areas={props.areas}
        />
      </Modal>
    </div>
  );
};

export default TasksTab;