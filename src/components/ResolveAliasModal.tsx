
// components/ResolveAliasModal.tsx
import React, { useState, useMemo } from 'react';
import { Member, ID } from '../types';
import Modal from '../../components/Modal';
import Select from '../../components/Select';
import Button from '../../components/Button';

interface ResolveAliasModalProps {
  isOpen: boolean;
  unresolvedName: string;
  members: Member[];
  onResolve: (unresolvedName: string, memberId: ID) => void;
  onSkip: (unresolvedName: string) => void;
}

const ResolveAliasModal: React.FC<ResolveAliasModalProps> = ({
  isOpen,
  unresolvedName,
  members,
  onResolve,
  onSkip,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<ID>('');

  const memberOptions = useMemo(() =>
    [{ value: '', label: 'Select a member to map to...' }, ...members.map(m => ({ value: m.id, label: m.name }))]
  , [members]);

  const handleResolveClick = () => {
    if (selectedMemberId) {
      onResolve(unresolvedName, selectedMemberId);
    } else {
      alert('Please select a member.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onSkip(unresolvedName)}
      title="Resolve Unrecognized Member Name"
      footer={
        <>
          <Button variant="outline" onClick={() => onSkip(unresolvedName)}>
            Skip this Member
          </Button>
          <Button variant="primary" onClick={handleResolveClick} disabled={!selectedMemberId}>
            Create Alias and Assign
          </Button>
        </>
      }
    >
      <div className="p-4">
        <p className="mb-4">
          The name <strong className="text-primary">{unresolvedName}</strong> from the imported schedule could not be found.
        </p>
        <p className="mb-4">
          Please map it to an existing member. This will create an alias so you won't be asked again for this name.
        </p>
        <Select
          id="resolve-alias-select"
          label={`Map "${unresolvedName}" to:`}
          options={memberOptions}
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          required
        />
      </div>
    </Modal>
  );
};

export default ResolveAliasModal;
