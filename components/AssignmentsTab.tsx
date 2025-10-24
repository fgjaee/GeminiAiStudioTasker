import React, { useState, useMemo, useCallback } from 'react';
import { Assignment, DailyWorkload, Task, Member, ManagerSettings } from '../types';
import Button from './Button';
import { Lock, Unlock, Zap, XCircle, AlertTriangle, Eye, EyeOff, Calendar, Pencil } from 'lucide-react';
import dayjs from 'dayjs';
import { calculateDuration, minutesToTime, timeToMinutes, assertUniqueKeys } from '../utils/helpers';
import Input from './Input';
import Modal from './Modal';
import Select from './Select';
import Textarea from './Textarea';
import { getTaskDisplayName } from '../services/assignmentEngine';

interface AssignmentsTabProps {
  assignments: Assignment[];
  dailyWorkloads: DailyWorkload[];
  unassignedTasks: Task[];
  overCapacityMembers: { memberId: string; name: string; date: string; overCapacity: number }[];
  members: Member[];
  tasks: Task[];
  settings: ManagerSettings;
  onGenerateAssignments: (startDate: string, numberOfDays: number) => Promise<void>;
  onLockAssignment: (assignmentId: string, locked: boolean) => Promise<void>;
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
  onGenerateAssignments,
  onLockAssignment,
  onSaveAssignmentChanges,
}) => {
  const [assignmentStartDate, setAssignmentStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [numberOfDays, setNumberOfDays] = useState(7);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [showLockedOnly, setShowLockedOnly] = useState(false);

  const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);
  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);

  const handleGenerateClick = useCallback(() => {
    onGenerateAssignments(assignmentStartDate, numberOfDays);
  }, [onGenerateAssignments, assignmentStartDate, numberOfDays]);

  const getMemberName = useCallback((memberId: string) => memberMap.get(memberId)?.name || 'N/A', [memberMap]);
  // Use getTaskDisplayName from assignmentEngine for consistency
  const getTaskName = useCallback((taskId: string) => getTaskDisplayName(taskMap.get(taskId)), [taskMap]);
  const getTaskType = useCallback((taskId: string) => taskMap.get(taskId)?.task_type || 'standard', [taskMap]);

  const sortedAssignments = useMemo(() => {
    const assignmentsToShow = showLockedOnly ? assignments.filter(a => a.locked) : assignments;
    // Assert unique keys for assignmentsToShow (dev mode only)
    if (process.env.NODE_ENV !== "production") {
      assertUniqueKeys(assignmentsToShow.map(a => a.id), "AssignmentsTab.sortedAssignments");
    }
    return assignmentsToShow.sort((a, b) => {
      // Sort by date, then member, then start time
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.memberId !== b.memberId) return getMemberName(a.memberId).localeCompare(getMemberName(b.memberId));
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });
  }, [assignments, showLockedOnly, getMemberName]);

  const assignmentsByDateAndMember = useMemo(() => {
    const grouped = new Map<string, Map<string, Assignment[]>>();
    sortedAssignments.forEach(assignment => {
      if (!grouped.has(assignment.date)) {
        grouped.set(assignment.date, new Map());
      }
      const memberAssignments = grouped.get(assignment.date)!;
      if (!memberAssignments.has(assignment.memberId)) {
        memberAssignments.set(assignment.memberId, []);
      }
      memberAssignments.get(assignment.memberId)!.push(assignment);
    });
    return grouped;
  }, [sortedAssignments]);

  const allDates = useMemo(() => {
    return Array.from(assignmentsByDateAndMember.keys()).sort();
  }, [assignmentsByDateAndMember]);

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

  // Filter out upkeep tasks from totalDuration for workload calculation
  const getAdjustedTotalDuration = useCallback((workload: DailyWorkload) => {
    return workload.assignedTasks.reduce((sum, assign) => {
      const task = taskMap.get(assign.taskId);
      return sum + (task?.task_type === 'upkeep' ? 0 : assign.duration);
    }, 0);
  }, [taskMap]);

  const getMemberCapacityForDay = useCallback((memberId: string, date: string) => {
    const workload = dailyWorkloads.find(dw => dw.memberId === memberId && dw.date === date);
    if (!workload) return 0;
    // Fix: Access fixed_commitments_minutes from the Member object, not DailyWorkload
    const member = memberMap.get(memberId);
    const totalShiftMinutes = workload.capacity + (member ? member.fixed_commitments_minutes : 0); // Re-add fixed commitments to get total shift time
    return totalShiftMinutes;
  }, [dailyWorkloads, memberMap]);

  const calculateMemberNetCapacity = useCallback((memberId: string, date: string) => {
    const workload = dailyWorkloads.find(dw => dw.memberId === memberId && dw.date === date);
    if (!workload) return 0;
    return workload.capacity - workload.totalDuration;
  }, [dailyWorkloads]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-textdark">Daily Assignments</h2>
        <div className="flex items-center space-x-2">
          <Input
            id="assignmentStartDate"
            type="date"
            value={assignmentStartDate}
            onChange={(e) => setAssignmentStartDate(e.target.value)}
            className="w-auto p-1 text-sm"
            label="Start Date"
          />
          <Input
            id="numberOfDays"
            type="number"
            value={numberOfDays}
            onChange={(e) => setNumberOfDays(parseInt(e.target.value, 10))}
            min="1"
            max="14"
            className="w-20 p-1 text-sm"
            label="Days"
          />
          <Button onClick={handleGenerateClick} variant="primary" className="flex-shrink-0">
            <Zap size={18} className="mr-2" /> Generate Assignments
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowLockedOnly(!showLockedOnly)}
            title={showLockedOnly ? "Show All Assignments" : "Show Locked Assignments Only"}
          >
            {showLockedOnly ? <EyeOff size={18} /> : <Eye size={18} />}
          </Button>
        </div>
      </div>

      {/* Warnings Section */}
      {(unassignedTasks.length > 0 || overCapacityMembers.length > 0) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-md">
          <div className="flex items-center">
            <AlertTriangle size={20} className="text-yellow-700 mr-3" />
            <h3 className="text-lg font-medium text-yellow-800">Assignment Warnings</h3>
          </div>
          <ul className="mt-2 text-sm text-yellow-700 list-disc pl-5">
            {unassignedTasks.length > 0 && (
              <li>
                <span className="font-semibold">Unassigned Tasks:</span> {unassignedTasks.map(t => getTaskDisplayName(t)).join(', ')}
                <p>Consider adjusting rules, member skills, or task durations.</p>
              </li>
            )}
            {overCapacityMembers.length > 0 && (
              <li>
                <span className="font-semibold">Over-Capacity Members:</span>
                <ul>
                  {overCapacityMembers.map(ocm => (
                    <li key={`${ocm.memberId}-${ocm.date}`}>
                      {ocm.name} on {dayjs(ocm.date).format('MMM D')}: {ocm.overCapacity} mins over capacity.
                      <p>Assignments with status "over-capacity" contributed to this.</p>
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
        </div>
      )}


      {allDates.length === 0 ? (
        <div className="bg-card shadow-lg rounded-lg p-6 text-center text-gray-500">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-lg">No assignments generated yet.</p>
          <p className="text-sm mt-2">Use the "Generate Assignments" button to create a worklist for the selected dates.</p>
        </div>
      ) : (
        allDates.map(date => (
          <div key={date} className="mb-8">
            <h3 className="text-2xl font-bold text-textdark mb-4 flex items-center">
              <span className="mr-2">{dayjs(date).format('dddd, MMMM D, YYYY')}</span>
            </h3>
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
                    const totalShiftDuration = memberWorkload ? getMemberCapacityForDay(memberId, date) : 0;
                    const netCapacity = memberWorkload ? calculateMemberNetCapacity(memberId, date) : 0;

                    return (
                      <React.Fragment key={`${date}-${memberId}`}>
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-6 py-2 text-sm font-semibold text-primary">
                            {getMemberName(memberId)}
                            <span className="ml-4 font-normal text-gray-600">
                              Workload: {totalAssignedDuration} mins / Shift: {totalShiftDuration} mins
                              {netCapacity < 0 && (
                                <span className="text-red-600 ml-2">({Math.abs(netCapacity)} mins over capacity)</span>
                              )}
                            </span>
                          </td>
                        </tr>
                        {memberAssignments.map(assignment => (
                          <tr key={assignment.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"></td> {/* Empty for member grouping */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-textdark">
                              {getTaskName(assignment.taskId)}
                              {getTaskType(assignment.taskId) === 'upkeep' && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Upkeep</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{assignment.startTime} - {assignment.endTime}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{assignment.duration} min</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                assignment.status === 'assigned' ? 'bg-green-100 text-green-800' :
                                assignment.status === 'over-capacity' ? 'bg-red-100 text-red-800' :
                                assignment.status === 'unassigned' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {assignment.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{assignment.reason}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleEditAssignment(assignment)} title="Edit Assignment">
                                  <Pencil size={16} />
                                </Button>
                                <Button
                                  variant={assignment.locked ? 'secondary' : 'outline'}
                                  size="sm"
                                  onClick={() => onLockAssignment(assignment.id, !assignment.locked)}
                                  title={assignment.locked ? "Unlock Assignment" : "Lock Assignment"}
                                >
                                  {assignment.locked ? <Lock size={16} /> : <Unlock size={16} />}
                                </Button>
                                {/* <Button variant="danger" size="sm" onClick={() => onDeleteAssignment(assignment.id)} title="Delete Assignment">
                                  <Trash2 size={16} />
                                </Button> */}
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
        <Modal
          isOpen={isEditingModalOpen}
          onClose={handleCancelEdit}
          title={`Edit Assignment for ${getMemberName(editingAssignment.memberId)}`}
          footer={
            <>
              <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
              <Button variant="primary" onClick={() => handleSaveEditedAssignment(editingAssignment)}>Save Changes</Button>
            </>
          }
        >
          <Input
            id="taskName"
            label="Task Name"
            value={getTaskName(editingAssignment.taskId)}
            disabled
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="startTime"
              label="Start Time"
              type="time"
              value={editingAssignment.startTime}
              onChange={(e) => setEditingAssignment(prev => prev ? { ...prev, startTime: e.target.value } : null)}
            />
            <Input
              id="endTime"
              label="End Time"
              type="time"
              value={editingAssignment.endTime}
              onChange={(e) => {
                const newEndTime = e.target.value;
                const newDuration = calculateDuration(editingAssignment.startTime, newEndTime);
                setEditingAssignment(prev => prev ? { ...prev, endTime: newEndTime, duration: newDuration } : null);
              }}
            />
          </div>
          <Input
            id="duration"
            label="Duration (minutes)"
            type="number"
            value={editingAssignment.duration}
            onChange={(e) => {
              const newDuration = parseFloat(e.target.value) || 0;
              const newEndTimeMinutes = timeToMinutes(editingAssignment.startTime) + newDuration;
              const newEndTime = minutesToTime(newEndTimeMinutes);
              setEditingAssignment(prev => prev ? { ...prev, duration: newDuration, endTime: newEndTime } : null);
            }}
          />
          <Textarea
            id="reason"
            label="Reason for Assignment"
            value={editingAssignment.reason}
            onChange={(e) => setEditingAssignment(prev => prev ? { ...prev, reason: e.target.value } : null)}
          />
          {/* Status field, perhaps as a select if it can be changed manually */}
          <Select
            id="status"
            label="Status"
            value={editingAssignment.status}
            options={[
              { value: 'assigned', label: 'Assigned' },
              { value: 'over-capacity', label: 'Over Capacity' },
              { value: 'unassigned', label: 'Unassigned' },
              { value: 'conflict', label: 'Conflict' },
            ]}
            onChange={(e) => setEditingAssignment(prev => prev ? { ...prev, status: e.target.value as Assignment['status'] } : null)}
          />
        </Modal>
      )}
    </div>
  );
};

export default AssignmentsTab;