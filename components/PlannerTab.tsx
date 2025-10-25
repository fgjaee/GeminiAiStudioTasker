// components/PlannerTab.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { Member, Area, StaffingTarget, Availability, ShiftTemplate, PlannedShift, PlannerConflict, ManagerSettings, ID } from '../types';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import { Plus, Trash2, Calendar, Zap, UploadCloud, AlertTriangle } from 'lucide-react';
import { SHORT_WEEKDAY_NAMES, DATE_FORMAT } from '../constants';
import { uuid, getNextNDays, formatDate } from '../utils/helpers';
import dayjs from 'dayjs';

interface PlannerTabProps {
  members: Member[];
  areas: Area[];
  staffingTargets: StaffingTarget[];
  availability: Availability[];
  shiftTemplates: ShiftTemplate[];
  plannedShifts: PlannedShift[];
  conflicts: PlannerConflict[];
  settings: ManagerSettings;
  onSaveStaffingTarget: (target: StaffingTarget) => Promise<void>;
  onDeleteStaffingTarget: (id: ID) => Promise<void>;
  onSaveAvailability: (av: Availability) => Promise<void>;
  onDeleteAvailability: (id: ID) => Promise<void>;
  onSaveShiftTemplate: (template: ShiftTemplate) => Promise<void>;
  onDeleteShiftTemplate: (id: ID) => Promise<void>;
  onSavePlannedShift: (shift: PlannedShift | PlannedShift[]) => Promise<void>;
  onDeletePlannedShift: (id: ID) => Promise<void>;
  onDeletePlannedShiftsByDate: (date: string) => Promise<void>;
  onAutoFillWeek: (startDate: string, numberOfDays: number) => Promise<void>;
  onRepairCoverage: (date: string, areaId?: ID, timeslot?: string) => Promise<void>;
  onPublish: (startDate: string, numberOfDays: number) => Promise<void>;
}

const PlannerTab: React.FC<PlannerTabProps> = (props) => {
  const [plannerStartDate, setPlannerStartDate] = useState(dayjs().format(DATE_FORMAT));
  const [numberOfDays, setNumberOfDays] = useState(props.settings.defaultPlanningPeriod || 7);
  const [viewMode, setViewMode] = useState<'timeline' | 'targets' | 'conflicts'>('timeline');

  const { onAutoFillWeek, onPublish } = props;

  const handleAutoFill = useCallback(() => {
    onAutoFillWeek(plannerStartDate, numberOfDays);
  }, [onAutoFillWeek, plannerStartDate, numberOfDays]);
  
  const handlePublish = useCallback(() => {
    if (window.confirm(`This will replace the official schedule for ${numberOfDays} days starting ${plannerStartDate}. Are you sure?`)) {
      onPublish(plannerStartDate, numberOfDays);
    }
  }, [onPublish, plannerStartDate, numberOfDays]);

  const renderContent = () => {
    switch(viewMode) {
        case 'conflicts':
            return <ConflictsPanel conflicts={props.conflicts} onRepairCoverage={props.onRepairCoverage} />;
        case 'targets':
            return <StaffingTargetsEditor staffingTargets={props.staffingTargets} areas={props.areas} onSave={props.onSaveStaffingTarget} onDelete={props.onDeleteStaffingTarget} />;
        case 'timeline':
        default:
            return <TimelineGridPlaceholder />;
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-textdark">Planner</h2>
        <div className="flex items-center space-x-2">
            <Input id="plannerStartDate" type="date" value={plannerStartDate} onChange={e => setPlannerStartDate(e.target.value)} label="Start Date" />
            <Input id="plannerDays" type="number" value={numberOfDays} onChange={e => setNumberOfDays(parseInt(e.target.value))} min="1" max="14" label="Days" />
            <Button onClick={handleAutoFill} variant="primary"><Zap size={18} className="mr-2" /> Auto-Fill Week</Button>
            <Button onClick={handlePublish} variant="secondary"><UploadCloud size={18} className="mr-2" /> Publish to Schedule</Button>
        </div>
      </div>
      
      <div className="bg-card shadow-lg rounded-lg p-6">
        <div className="flex border-b mb-4">
            <button className={`px-4 py-2 ${viewMode === 'timeline' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`} onClick={() => setViewMode('timeline')}>Timeline View</button>
            <button className={`px-4 py-2 ${viewMode === 'targets' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`} onClick={() => setViewMode('targets')}>Staffing Targets</button>
            <button className={`px-4 py-2 flex items-center ${viewMode === 'conflicts' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`} onClick={() => setViewMode('conflicts')}>
                Conflicts {props.conflicts.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{props.conflicts.length}</span>}
            </button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

const TimelineGridPlaceholder: React.FC = () => (
    <div className="text-center py-16">
        <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700">Timeline Grid</h3>
        <p className="text-sm text-gray-500">A visual timeline for manual shift planning is under development.</p>
    </div>
);

const StaffingTargetsEditor: React.FC<{staffingTargets: StaffingTarget[], areas: Area[], onSave: (t: StaffingTarget) => void, onDelete: (id: ID) => void}> = ({staffingTargets, areas, onSave, onDelete}) => {
    // A simplified form to add/edit staffing targets
    return (
        <div>
            <h3 className="text-lg font-semibold text-textdark mb-2">Manage Staffing Targets</h3>
            {/* Table of existing targets */}
            <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    {/* ... table headers ... */}
                    <tbody>
                        {staffingTargets.map(t => (
                            <tr key={t.id}>
                                <td className="px-2 py-1 text-sm">{t.day}</td>
                                <td className="px-2 py-1 text-sm">{areas.find(a=>a.id === t.area_id)?.name}</td>
                                <td className="px-2 py-1 text-sm">{t.start} - {t.end}</td>
                                <td className="px-2 py-1 text-sm">{t.required_count}</td>
                                <td className="px-2 py-1 text-sm"><Button size="sm" variant="danger" onClick={() => onDelete(t.id)}><Trash2 size={14}/></Button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             {/* Form to add a new target would go here */}
        </div>
    );
}

const ConflictsPanel: React.FC<{conflicts: PlannerConflict[], onRepairCoverage: (date: string, areaId?: ID, timeslot?: string) => void}> = ({conflicts, onRepairCoverage}) => {
    return (
        <div>
            <h3 className="text-lg font-semibold text-textdark mb-2">Detected Conflicts</h3>
            {conflicts.length === 0 ? <p className="text-gray-500">No conflicts found.</p> : (
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                    {conflicts.map(c => (
                        <li key={c.id} className="p-2 border rounded-md bg-yellow-50 border-yellow-200 flex justify-between items-center">
                            <div className="flex items-center">
                                <AlertTriangle className="text-yellow-600 mr-2" size={18}/>
                                <div>
                                    <p className="font-semibold text-sm text-yellow-800">{c.type.replace('-', ' ')} on {c.date}</p>
                                    <p className="text-xs text-yellow-700">{c.details}</p>
                                </div>
                            </div>
                            {c.type === 'under-coverage' && <Button size="sm" onClick={() => onRepairCoverage(c.date!, c.area_id, c.timeslot)}>Auto-Repair</Button>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}


export default PlannerTab;