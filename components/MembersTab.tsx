import React, { useState, useCallback, useMemo } from 'react';
import { Member } from '../types';
import Button from './Button';
import MemberForm from './MemberForm';
import Modal from './Modal';
import { Plus, Trash2, Pencil } from 'lucide-react';

interface MembersTabProps {
  members: Member[];
  tasks: string[]; // Pass only task IDs for default tasks (if needed)
  onSaveMember: (member: Member) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
}

const MembersTab: React.FC<MembersTabProps> = ({ members, tasks, onSaveMember, onDeleteMember }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const handleOpenCreateModal = useCallback(() => {
    setEditingMember(null);
    setIsModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((member: Member) => {
    setEditingMember(member);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingMember(null);
  }, []);

  const handleSave = useCallback(async (member: Member) => {
    await onSaveMember(member);
    handleCloseModal();
  }, [onSaveMember, handleCloseModal]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => a.name.localeCompare(b.name));
  }, [members]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-textdark">Team Members</h2>
        <Button onClick={handleOpenCreateModal} variant="primary">
          <Plus size={18} className="mr-2" /> Add New Member
        </Button>
      </div>

      <div className="bg-card shadow-lg rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role Tags</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fixed Commitments (min)</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  No members added yet. Click "Add New Member" to get started.
                </td>
              </tr>
            ) : (
              sortedMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-textdark">{member.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{member.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex flex-wrap gap-1">
                      {member.role_tags.map(tag => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{member.fixed_commitments_minutes}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(member)} title="Edit Member">
                        <Pencil size={16} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => onDeleteMember(member.id)} title="Delete Member">
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
        title={editingMember ? 'Edit Member' : 'Add New Member'}
      >
        <MemberForm
          member={editingMember}
          onSave={handleSave}
          onCancel={handleCloseModal}
          allTaskIds={tasks}
        />
      </Modal>
    </div>
  );
};

export default MembersTab;