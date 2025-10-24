import React, { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

interface ChipInputProps {
  label: string;
  chips: string[];
  onAddChip: (chip: string) => void;
  onRemoveChip: (chip: string) => void;
  placeholder?: string;
  id: string;
}

const ChipInput: React.FC<ChipInputProps> = ({
  label,
  chips,
  onAddChip,
  onRemoveChip,
  placeholder,
  id,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      onAddChip(inputValue.trim());
      setInputValue('');
    }
  };

  const addChipOnClick = () => {
    if (inputValue.trim()) {
      onAddChip(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-textdark mb-1">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md bg-card min-h-[40px]">
        {chips.map((chip) => ( // Removed index from map
          <div
            key={chip} // Changed key from index to chip value
            className="flex items-center bg-primary text-white text-xs px-2 py-1 rounded-full"
          >
            {chip}
            <button
              type="button"
              onClick={() => onRemoveChip(chip)}
              className="ml-1 text-white hover:text-gray-200 focus:outline-none"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || `Add ${label.toLowerCase()}... (Press Enter)`}
          className="flex-grow min-w-0 bg-transparent outline-none text-textdark placeholder-gray-400"
        />
        <Button
          type="button"
          onClick={addChipOnClick}
          variant="secondary"
          size="sm"
          className="ml-auto flex-shrink-0"
        >
          Add
        </Button>
      </div>
    </div>
  );
};

export default ChipInput;