import React, { useState, useMemo, useCallback } from 'react';
import { Assignment, DailyWorkload, Task, Member, ManagerSettings, ID, WeeklyScheduleDay } from '../types';
import Button from './Button';
import { Lock, Unlock, Zap, XCircle, AlertTriangle, Eye, EyeOff, Calendar, Pencil, ShieldAlert } from 'lucide-react';
import dayjs from 'dayjs';
import { calculateDuration, minutesToTime, timeToMinutes, assertUniqueKeys, getNextNDays } from '../utils/helpers';
import Input from './Input';
import Modal from './Modal';
import Select from './Select';
import Textarea from './Textarea';
import { getTaskDisplayName } from '../services/assignmentEngine';

interface AssignmentsTabProps {
  assignments: Assignment[];
  dailyWorkloads: DailyWorkload[];
  unassignedTasks: (Task & { unassignedReason: string })[];
  overCapacityMembers: { memberId: ID; name: string; date: string; overCapacity: number }[];
  members: Member[];
  tasks: Task[];
  settings: ManagerSettings;
  weeklySchedule: WeeklyScheduleDay[];
  onGenerateAssignments: (startDate: string, numberOfDays: number) => Promise<void>;
  onLockAssignment: (assignmentId: ID, locked: boolean) => Promise<void>;
  onSaveAssignmentChanges: (assignment: Assignment) => Promise<void>;
}

const AssignmentsTab: React.FC<AssignmentsTabProps> = ({
  assignments,
  dailyWorkloads,
  unassignedTasks,
  overCapacityMembers,
  members,
  tasks,
  settings,
  weeklySchedule,
  onGenerateAssignments,
  onLockAssignment,
  onSaveAssignmentChanges,
}) => {
  const [assignmentStartDate, setAssignmentStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [numberOfDays, setNumberOfDays] = useState(7);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [showLockedOnly, setShowLockedOnly] = useState(false);
  const [scheduleWarning, setScheduleWarning] = useState<string | null>(null);

  const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);
  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);

  const handleGenerateClick = useCallback(() => {
    const dates = getNextNDays(assignmentStartDate, numberOfDays);
    const scheduleForFirstDay = weeklySchedule.find(d => d.date === dates[0]);
    if (!scheduleForFirstDay || scheduleForFirstDay.shifts.length === 0) {
        setScheduleWarning(`No scheduled members for ${dates[0]}. Import a schedule or use the Planner. Generator paused.`);
        return;
    }
    setScheduleWarning(null); // Clear warning
    onGenerateAssignments(assignmentStartDate, numberOfDays);
  }, [onGenerateAssignments, assignmentStartDate, numberOfDays, weeklySchedule]);

  const getMemberName = useCallback((memberId: ID) => memberMap.get(memberId)?.name || 'N/A', [memberMap]);
  const getTaskName = useCallback((taskId: ID) => getTaskDisplayName(taskMap.get(taskId)), [taskMap]);
  const getTaskType = useCallback((taskId: ID) => taskMap.get(taskId)?.task_type || 'standard', [taskMap]);

  const sortedAssignments = useMemo(() => {
    const assignmentsToShow = showLockedOnly ? assignments.filter(a => a.locked) : assignments;
    if (process.env.NODE_ENV !== "production") {
      assertUniqueKeys(assignmentsToShow.map(a => a.id), "AssignmentsTab.sortedAssignments");
    }
    return assignmentsToShow.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.memberId !== b.memberId) return getMemberName(a.memberId).localeCompare(getMemberName(b.memberId));
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });
  }, [assignments, showLockedOnly, getMemberName]);

  const assignmentsByDateAndMember = useMemo(() => {
    const grouped = new Map<string, Map<ID, Assignment[]>>();
    sortedAssignments.forEach(assignment => {
      if (!grouped.has(assignment.date)) grouped.set(assignment.date, new Map());
      const memberAssignments = grouped.get(assignment.date)!;
      if (!memberAssignments.has(assignment.memberId)) memberAssignments.set(assignment.memberId, []);
      memberAssignments.get(assignment.memberId)!.push(assignment);
    });
    return grouped;
  }, [sortedAssignments]);

  const allDates = useMemo(() => Array.from(assignmentsByDateAndMember.keys()).sort(), [assignmentsByDateAndMember]);

  const handleEditAssignment = useCallback((assignment: Assignment) => {
    setEditingAssignment(assignment);
    setIsEditingModalOpen(true);
  }, []);

  const handleSaveEditedAssignment = useCallback(async (updatedAssignment: Assignment) => {
    await onSaveAssignmentChanges(updatedAssignment);
    setIsEditingModalOpen(false);
    setEditingAssignment(null);
  }, [onSaveAssignmentChanges]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingModalOpen(false);
    setEditingAssignment(null);
  }, []);

  const unassignedTasksSummary = useMemo(() => {
    const summary = new Map<ID, { task: Task, reasons: Set<string> }>();
    unassignedTasks.forEach(({ unassignedReason, ...task }) => {
        if (!summary.has(task.id)) {
            summary.set(task.id, { task, reasons: new Set() });
        }
        summary.get(task.id)!.reasons.add(unassignedReason);
    });
    return Array.from(summary.values());
  }, [unassignedTasks]);

  const getAdjustedTotalDuration = useCallback((workload: DailyWorkload) => {
    return workload.assignedTasks.reduce((sum, assign) => {
      const task = taskMap.get(assign.taskId);
      return sum + (task?.task_type === 'upkeep' ? 0 : assign.duration);
    }, 0);
  }, [taskMap]);

  const getMemberCapacityForDay = useCallback((memberId: ID, date: string) => {
    const workload = dailyWorkloads.find(dw => dw.memberId === memberId && dw.date === date);
    if (!workload) return 0;
    return workload.capacity;
  }, [dailyWorkloads]);
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-textdark">Daily Assignments</h2>
        <div className="flex items-center space-x-2">
          <Input id="assignmentStartDate" type="date" value={assignmentStartDate} onChange={(e) => setAssignmentStartDate(e.target.value)} className="w-auto p-1 text-sm" label="Start Date"/>
          <Input id="numberOfDays" type="number" value={numberOfDays} onChange={(e) => setNumberOfDays(parseInt(e.target.value, 10))} min="1" max="14" className="w-20 p-1 text-sm" label="Days"/>
          <Button onClick={handleGenerateClick} variant="primary" className="flex-shrink-0"><Zap size={18} className="mr-2" /> Generate Assignments</Button>
          <Button variant="outline" onClick={() => setShowLockedOnly(!showLockedOnly)} title={showLockedOnly ? "Show All" : "Show Locked Only"}>{showLockedOnly ? <EyeOff size={18} /> : <Eye size={18} />}</Button>
        </div>
      </div>

      {scheduleWarning && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <div className="flex items-center"><ShieldAlert size={20} className="mr-3" /><p className="font-bold">Schedule Missing</p></div>
            <p>{scheduleWarning}</p>
        </div>
      )}

      {(unassignedTasks.length > 0 || overCapacityMembers.length > 0) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-md">
          <div className="flex items-center"><AlertTriangle size={20} className="text-yellow-700 mr-3" /><h3 className="text-lg font-medium text-yellow-800">Assignment Warnings</h3></div>
          <ul className="mt-2 text-sm text-yellow-700 list-disc pl-5">
            {unassignedTasksSummary.length > 0 && (
              <li>
                <span className="font-semibold">Unassigned Tasks:</span>
                <ul className="list-inside">
                  {unassignedTasksSummary.map(({ task, reasons }) => (
                    <li key={task.id}>
                      {getTaskDisplayName(task)} - <span className="italic">Reasons: {Array.from(reasons).join(', ')}</span>
                    </li>
                  ))}
                </ul>
              </li>
            )}
            {overCapacityMembers.length > 0 && (
              <li>
                <span className="font-semibold">Over-Capacity Members:</span>
                <ul>{overCapacityMembers.map(ocm => (<li key={`${ocm.memberId}-${ocm.date}`}>{ocm.name} on {dayjs(ocm.date).format('MMM D')}: {ocm.overCapacity} mins over capacity.</li>))}</ul>
              </li>
            )}
          </ul>
        </div>
      )}

      {allDates.length === 0 ? (
        <div className="bg-card shadow-lg rounded-lg p-6 text-center text-gray-500">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" /><p className="text-lg">No assignments generated yet.</p><p className="text-sm mt-2">Use the "Generate Assignments" button to create a worklist.</p>
        </div>
      ) : (
        allDates.map(date => (
          <div key={date} className="mb-8">
            <h3 className="text-2xl font-bold text-textdark mb-4">{dayjs(date).format('dddd, MMMM D, YYYY')}</h3>
            <div className="bg-card shadow-lg rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.from(assignmentsByDateAndMember.get(date)?.keys() || []).sort((a, b) => getMemberName(a).localeCompare(getMemberName(b))).map(memberId => {
                    const memberAssignments = assignmentsByDateAndMember.get(date)?.get(memberId) || [];
                    const memberWorkload = dailyWorkloads.find(dw => dw.memberId === memberId && dw.date === date);
                    const totalAssignedDuration = memberWorkload ? getAdjustedTotalDuration(memberWorkload) : 0;
                    const memberCapacity = memberWorkload ? getMemberCapacityForDay(memberId, date) : 0;

                    if (process.env.NODE_ENV !== "production") assertUniqueKeys(memberAssignments.map(a => a.id), `AssignmentsTab.memberAssignments for ${getMemberName(memberId)}`);

                    return (
                      <React.Fragment key={`${date}-${memberId}`}>
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-6 py-2 text-sm font-semibold text-primary">{getMemberName(memberId)}
                            <span className="ml-4 font-normal text-gray-600">Workload: {totalAssignedDuration} / {memberCapacity} mins</span>
                          </td>
                        </tr>
                        {memberAssignments.map(assignment => (
                          <tr key={assignment.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4"></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-textdark">{getTaskName(assignment.taskId)}
                              {getTaskType(assignment.taskId) === 'upkeep' && (<span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Upkeep</span>)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{assignment.startTime} - {assignment.endTime}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{assignment.duration} min</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${assignment.status === 'assigned' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{assignment.status}</span></td>
                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{assignment.reason}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleEditAssignment(assignment)} title="Edit"><Pencil size={16} /></Button>
                                <Button variant={assignment.locked ? 'secondary' : 'outline'} size="sm" onClick={() => onLockAssignment(assignment.id, !assignment.locked)} title={assignment.locked ? "Unlock" : "Lock"}>{assignment.locked ? <Lock size={16} /> : <Unlock size={16} />}</Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {isEditingModalOpen && editingAssignment && (
        <Modal isOpen={isEditingModalOpen} onClose={handleCancelEdit} title={`Edit Assignment for ${getMemberName(editingAssignment.memberId)}`} footer={<><Button variant="outline" onClick={handleCancelEdit}>Cancel</Button><Button variant="primary" onClick={() => handleSaveEditedAssignment(editingAssignment)}>Save</Button></>}>
          <Input id="taskName" label="Task Name" value={getTaskName(editingAssignment.taskId)} disabled />
          <div className="grid grid-cols-2 gap-4">
            <Input id="startTime" label="Start Time" type="time" value={editingAssignment.startTime} onChange={(e) => setEditingAssignment(prev => prev ? { ...prev, startTime: e.target.value } : null)} />
            <Input id="endTime" label="End Time" type="time" value={editingAssignment.endTime} onChange={(e) => setEditingAssignment(prev => prev ? { ...prev, endTime: e.target.value, duration: calculateDuration(prev!.startTime, e.target.value) } : null)} />
          </div>
          <Input id="duration" label="Duration (minutes)" type="number" value={editingAssignment.duration} onChange={(e) => setEditingAssignment(prev => prev ? { ...prev, duration: Number(e.target.value), endTime: minutesToTime(timeToMinutes(prev.startTime) + Number(e.target.value)) } : null)} />
          <Textarea id="reason" label="Reason" value={editingAssignment.reason} onChange={(e) => setEditingAssignment(prev => prev ? { ...prev, reason: e.target.value } : null)} />
          <Select id="status" label="Status" value={editingAssignment.status} options={[{ value: 'assigned', label: 'Assigned' }, { value: 'over-capacity', label: 'Over Capacity' }]} onChange={(e) => setEditingAssignment(prev => prev ? { ...prev, status: e.target.value as Assignment['status'] } : null)} />
        </Modal>
      )}
    </div>
  );
};

export default AssignmentsTab;