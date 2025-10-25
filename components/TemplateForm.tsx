import React, { useState, useEffect, useCallback } from 'react';
import { Template } from '../types';
import Input from './Input';
import Textarea from './Textarea';
import Button from './Button';
import { uuid } from '../utils/helpers'; // Import uuid

interface TemplateFormProps {
  template?: Template | null;
  onSave: (template: Template) => void;
  onCancel: () => void;
}

const TemplateForm: React.FC<TemplateFormProps> = ({ template, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Template>(template || {
    id: uuid(), // Use uuid
    name: '',
    content: '',
  });

  useEffect(() => {
    if (template) {
      setFormData(template);
    } else {
      setFormData({
        id: uuid(), // Use uuid
        name: '',
        content: '',
      });
    }
  }, [template]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value,
    }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
        alert('Template Name is required.');
        return;
    }
    if (!formData.content.trim()) {
        alert('Template Content is required.');
        return;
    }
    onSave(formData);
  }, [formData, onSave]);

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-card rounded-lg">
      <Input
        id="name"
        label="Template Name"
        type="text"
        value={formData.name}
        onChange={handleChange}
        required
      />
      <Textarea
        id="content"
        label="Template Content (Markdown/Text with placeholders)"
        value={formData.content}
        onChange={handleChange}
        rows={15}
        required
      />
      {/* Corrected Handlebars-like placeholder rendering in JSX */}
      <p className="text-xs text-gray-500 mt-1">
        Use placeholders like <code>{'{{date}}'}</code>, <code>{'{{store}}'}</code>, <code>{'{{department}}'}</code>, <code>{'{{floorSlaTime}}'}</code>.<br/>
        For assignment tables, use Handlebars-like syntax: <br/>
        <code>{'{{#each assignmentsByMember}}'}</code><br/>
        <code>{'| **{{this.memberName}}** | | | | | | |'}</code><br/>
        <code>{'{{#each this.tasks}}'}</code><br/>
        <code>{'| | {{this.taskName}} | {{this.duration}} mins | {{this.startTime}} | {{this.endTime}} | {{this.status}} | {{this.reason}} |'}</code><br/>
        <code>{'{{/each}}'}</code><br/>
        <code>{'| | **Total Assigned Workload:** | **{{this.totalDuration}} mins** | | | | |'}</code><br/>
        <code>{'{{#if (gt this.capacity 0)}}'}</code><br/>
        <code>{'| | **Available Capacity:** | **{{minus this.capacity this.totalDuration}} mins** | | | | |'}</code><br/>
        <code>{'{{/if}}'}</code><br/>
        <code>{'{{/each}}'}</code><br/>
        <br/>
        <code>{'{{#if unassignedTasks.length}}'}</code><br/>
        <code>{'### Unassigned Tasks:'}</code><br/>
        <code>{'{{#each unassignedTasks}}'}</code><br/>
        <code>{'*   {{this.taskName}} ({{this.duration}} mins) - Due by: {{this.dueBy}}'}</code><br/>
        <code>{'{{/each}}'}</code><br/>
        <code>{'{{/if}}'}</code><br/>
        <br/>
        <code>{'{{#if overCapacityMembers.length}}'}</code><br/>
        <code>{'### Over-Capacity Members:'}</code><br/>
        <code>{'{{#each overCapacityMembers}}'}</code><br/>
        <code>{'*   {{this.name}}: {{this.overCapacity}} mins over capacity'}</code><br/>
        <code>{'{{/each}}'}</code><br/>
        <code>{'{{/if}}'}</code>
      </p>

      <div className="flex justify-end space-x-2 mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save Template
        </Button>
      </div>
    </form>
  );
};

export default TemplateForm;
