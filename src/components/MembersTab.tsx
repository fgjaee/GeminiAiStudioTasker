
// components/MembersTab.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Member, Skill, MemberAlias, MemberSkill, ID } from '../types';
import Button from './Button';
import MemberForm from './MemberForm';
import Modal from './Modal';
import Input from './Input';
import { Plus, Trash2, Pencil, Users, Star, Link2 } from 'lucide-react';
// FIX: Import uuid and Select
import { assertUniqueKeys, normName, uuid } from '../services/utils';
import Select from './Select';
import { useToast } from './Toast';

interface MembersTabProps {
  members: Member[];
  skills: Skill[];
  memberSkills: MemberSkill[];
  memberAliases: MemberAlias[];
  onSaveMember: (member: Member) => Promise<void>;
  onDeleteMember: (id: ID) => Promise<void>;
  onSaveSkill: (skill: Skill) => Promise<void>;
  onDeleteSkill: (id: ID) => Promise<void>;
  onSaveMemberSkill: (ms: MemberSkill | MemberSkill[]) => Promise<void>;
  onDeleteMemberSkill: (memberId: ID, skillId: ID) => Promise<void>;
  onSaveAlias: (alias: MemberAlias) => Promise<void>;
  onDeleteAlias: (id: ID) => Promise<void>;
}

const MembersTab: React.FC<MembersTabProps> = (props) => {
  const [activeSubTab, setActiveSubTab] = useState<'people' | 'skills' | 'aliases'>('people');

  const renderContent = () => {
    switch (activeSubTab) {
      case 'skills':
        return <SkillsEditor skills={props.skills} onSave={props.onSaveSkill} onDelete={props.onDeleteSkill} />;
      case 'aliases':
        return <AliasesEditor aliases={props.memberAliases} members={props.members} onSave={props.onSaveAlias} onDelete={props.onDeleteAlias} />;
      case 'people':
      default:
        return <PeopleManager {...props} />;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-textdark">Team Management</h2>
      </div>
      <div className="flex border-b mb-6">
        <button className={`flex items-center px-4 py-2 ${activeSubTab === 'people' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`} onClick={() => setActiveSubTab('people')}><Users size={16} className="mr-2" /> People</button>
        <button className={`flex items-center px-4 py-2 ${activeSubTab === 'skills' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`} onClick={() => setActiveSubTab('skills')}><Star size={16} className="mr-2" /> Skills</button>
        <button className={`flex items-center px-4 py-2 ${activeSubTab === 'aliases' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`} onClick={() => setActiveSubTab('aliases')}><Link2 size={16} className="mr-2" /> Aliases</button>
      </div>
      {renderContent()}
    </div>
  );
};

// ... PeopleManager, SkillsEditor, AliasesEditor components defined below ...

const PeopleManager: React.FC<MembersTabProps> = ({ members, skills, memberSkills, onSaveMember, onDeleteMember, onSaveMemberSkill, onDeleteMemberSkill }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const handleOpenCreateModal = () => { setEditingMember(null); setIsModalOpen(true); };
  const handleOpenEditModal = (member: Member) => { setEditingMember(member); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingMember(null); };

  const handleSave = async (member: Member) => {
    // Separate member data from skills data
    const { skill_ids, ...memberData } = member;
    await onSaveMember(memberData);

    // Get existing skills for the member
    const existingSkillIds = new Set(memberSkills.filter(ms => ms.member_id === member.id).map(ms => ms.skill_id));
    const newSkillIds = new Set(skill_ids || []);

    // Find skills to add and remove
    const skillsToAdd = (skill_ids || []).filter(id => !existingSkillIds.has(id));
    const skillsToRemove = Array.from(existingSkillIds).filter(id => !newSkillIds.has(id));

    // Perform DB operations
    if (skillsToAdd.length > 0) {
      await onSaveMemberSkill(skillsToAdd.map(skill_id => ({ member_id: member.id, skill_id })));
    }
    for (const skillId of skillsToRemove) {
      await onDeleteMemberSkill(member.id, skillId);
    }
    
    handleCloseModal();
  };

  const sortedMembers = useMemo(() => [...members].sort((a, b) => a.name.localeCompare(b.name)), [members]);
  const skillMap = useMemo(() => new Map(skills.map(s => [s.id, s.name])), [skills]);

  return (
    <div>
        <Button onClick={handleOpenCreateModal} variant="primary"><Plus size={18} className="mr-2" /> Add Member</Button>
        <div className="bg-card shadow-lg rounded-lg overflow-hidden mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skills</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedMembers.map(member => {
                  const memberSkillIds = new Set(memberSkills.filter(ms => ms.member_id === member.id).map(ms => ms.skill_id));
                  return (
                    <tr key={member.id}>
                      <td className="px-6 py-4">{member.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {Array.from(memberSkillIds).map(skillId => (
                            <span key={skillId} className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">{skillMap.get(skillId) || '...'}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(member)}><Pencil size={16} /></Button>
                        <Button variant="danger" size="sm" onClick={() => onDeleteMember(member.id)} className="ml-2"><Trash2 size={16} /></Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        </div>
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingMember ? 'Edit Member' : 'Add Member'}>
            <MemberForm
                member={editingMember}
                onSave={handleSave}
                onCancel={handleCloseModal}
                existingMembers={members}
                allSkills={skills}
                memberSkills={memberSkills}
            />
        </Modal>
    </div>
  );
};


const SkillsEditor: React.FC<{skills: Skill[], onSave: (s: Skill) => void, onDelete: (id: ID) => void}> = ({ skills, onSave, onDelete }) => {
    const [editingSkill, setEditingSkill] = useState<Partial<Skill>>({});
    const inputRef = React.useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    const handleSave = () => {
        if (!editingSkill.name?.trim()) {
            addToast({ message: 'Skill name cannot be empty', type: 'error' });
            return;
        }
        onSave({ id: editingSkill.id || uuid(), name: editingSkill.name });
        setEditingSkill({});
        inputRef.current?.focus();
    };

    return (
        <div>
            <div className="flex gap-2 mb-4">
                <Input ref={inputRef} id="skill-name" label="Skill Name" value={editingSkill.name || ''} onChange={e => setEditingSkill(s => ({...s, name: e.target.value}))} />
                <Button onClick={handleSave} className="self-end mb-4">{editingSkill.id ? 'Update Skill' : 'Add Skill'}</Button>
            </div>
            <ul className="space-y-2">
                {skills.map(skill => (
                    <li key={skill.id} className="flex justify-between items-center p-2 border rounded-md">
                        {skill.name}
                        <div className="space-x-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingSkill(skill)}><Pencil size={14}/></Button>
                            <Button size="sm" variant="danger" onClick={() => onDelete(skill.id)}><Trash2 size={14}/></Button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};


const AliasesEditor: React.FC<{aliases: MemberAlias[], members: Member[], onSave: (a: MemberAlias) => void, onDelete: (id: ID) => void}> = ({ aliases, members, onSave, onDelete }) => {
    const [newAlias, setNewAlias] = useState({ member_id: '', alias: '' });
    const { addToast } = useToast();

    const memberMap = useMemo(() => new Map(members.map(m => [m.id, m.name])), [members]);

    const handleSave = () => {
        if (!newAlias.member_id || !newAlias.alias.trim()) {
            addToast({ message: 'Please select a member and provide an alias.', type: 'error'});
            return;
        }
        onSave({ ...newAlias, id: uuid(), alias: normName(newAlias.alias).toLowerCase() });
        setNewAlias({ member_id: '', alias: '' });
    };

    return (
        <div>
            <div className="grid grid-cols-3 gap-2 mb-4 items-end">
                <Select id="alias-member" label="Member" value={newAlias.member_id} options={members.map(m => ({value: m.id, label: m.name}))} onChange={e => setNewAlias(a => ({...a, member_id: e.target.value}))} />
                <Input id="alias-name" label="Alias (from schedule)" value={newAlias.alias} onChange={e => setNewAlias(a => ({...a, alias: e.target.value}))} />
                <Button onClick={handleSave}>Add Alias</Button>
            </div>
             <ul className="space-y-2">
                {aliases.map(alias => (
                    <li key={alias.id} className="flex justify-between items-center p-2 border rounded-md">
                        <span><strong>{alias.alias}</strong> maps to <strong>{memberMap.get(alias.member_id)}</strong></span>
                        <Button size="sm" variant="danger" onClick={() => onDelete(alias.id)}><Trash2 size={14}/></Button>
                    </li>
                ))}
            </ul>
        </div>
    );
};


export default MembersTab;