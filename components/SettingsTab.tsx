import React, { useState, useEffect, useCallback } from 'react';
import { ManagerSettings, Template } from '../types';
import Input from './Input';
import Button from './Button';
import TemplateForm from './TemplateForm';
import Modal from './Modal';
import { Plus, Trash2, Pencil, Download, Upload, Eraser } from 'lucide-react';
import { assertUniqueKeys } from '../utils/helpers'; // Import assertUniqueKeys

interface SettingsTabProps {
  settings: ManagerSettings;
  templates: Template[];
  onSaveSettings: (settings: ManagerSettings) => Promise<void>;
  onSaveTemplate: (template: Template) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  onImportData: () => void;
  onExportData: () => void;
  onClearAllData: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  templates,
  onSaveSettings,
  onSaveTemplate,
  onDeleteTemplate,
  onImportData,
  onExportData,
  onClearAllData,
}) => {
  const [formData, setFormData] = useState<ManagerSettings>(settings);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  }, []);

  const handleSaveSettingsSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings(formData);
  }, [formData, onSaveSettings]);

  const handleOpenCreateTemplateModal = useCallback(() => {
    setEditingTemplate(null);
    setIsTemplateModalOpen(true);
  }, []);

  const handleOpenEditTemplateModal = useCallback((template: Template) => {
    setEditingTemplate(template);
    setIsTemplateModalOpen(true);
  }, []);

  const handleCloseTemplateModal = useCallback(() => {
    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
  }, []);

  const handleSaveTemplateInternal = useCallback(async (template: Template) => {
    await onSaveTemplate(template);
    handleCloseTemplateModal();
  }, [onSaveTemplate, handleCloseTemplateModal]);

  // Call assertUniqueKeys outside of JSX to avoid rendering issues.
  if (process.env.NODE_ENV !== "production") {
    assertUniqueKeys(templates.map(t => t.id), "SettingsTab.templates");
  }

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-textdark mb-6">Manager Settings & Tools</h2>

      {/* General Settings */}
      <div className="bg-card shadow-lg rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold text-textdark mb-4 border-b pb-2">General Settings</h3>
        <form onSubmit={handleSaveSettingsSubmit}>
          <Input
            id="floorSlaTime"
            label="Floor SLA Time (total minutes for all tasks)"
            type="number"
            value={formData.floorSlaTime}
            onChange={handleChange}
            min="0"
            required
          />
          <Input
            id="tieBreakSeed"
            label="Assignment Tie-Break Seed (number for deterministic results)"
            type="number"
            value={formData.tieBreakSeed}
            onChange={handleChange}
            required
          />
          <Input
            id="overCapacityThreshold"
            label="Over Capacity Warning Threshold (minutes)"
            type="number"
            value={formData.overCapacityThreshold}
            onChange={handleChange}
            min="0"
            required
          />
          <Input
            id="assignmentStartTime"
            label="Default Assignment Start Time (HH:mm)"
            type="time"
            value={formData.assignmentStartTime}
            onChange={handleChange}
            required
          />
          <div className="flex justify-end mt-4">
            <Button type="submit" variant="primary">
              Save Settings
            </Button>
          </div>
        </form>
      </div>

      {/* Template Editor */}
      <div className="bg-card shadow-lg rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-xl font-semibold text-textdark">Export Templates</h3>
            <Button onClick={handleOpenCreateTemplateModal} variant="primary" size="sm">
                <Plus size={18} className="mr-2" /> Add New Template
            </Button>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template Name</th>
                        <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {templates.length === 0 ? (
                        <tr>
                            <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                No templates defined yet.
                            </td>
                        </tr>
                    ) : (
                        templates.map(template => (
                            <tr key={template.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-textdark">{template.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenEditTemplateModal(template)} title="Edit Template">
                                            <Pencil size={16} />
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => onDeleteTemplate(template.id)} title="Delete Template">
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
      </div>

      {/* Data Import/Export */}
      <div className="bg-card shadow-lg rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold text-textdark mb-4 border-b pb-2">Data Management</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={onExportData} variant="secondary" size="lg" className="flex-1">
            <Download size={18} className="mr-2" /> Export All Data (JSON)
          </Button>
          <Button onClick={onImportData} variant="secondary" size="lg" className="flex-1">
            <Upload size={18} className="mr-2" /> Import All Data (JSON)
          </Button>
          <Button onClick={onClearAllData} variant="danger" size="lg" className="flex-1">
            <Eraser size={18} className="mr-2" /> Clear All Data
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-4">
            Export/Import allows you to backup and restore your entire application state.
            "Clear All Data" will reset the application to its initial sample data.
        </p>
      </div>

      <Modal
        isOpen={isTemplateModalOpen}
        onClose={handleCloseTemplateModal}
        title={editingTemplate ? 'Edit Export Template' : 'Add New Export Template'}
      >
        <TemplateForm
          template={editingTemplate}
          onSave={handleSaveTemplateInternal}
          onCancel={handleCloseTemplateModal}
        />
      </Modal>
    </div>
  );
};

export default SettingsTab;